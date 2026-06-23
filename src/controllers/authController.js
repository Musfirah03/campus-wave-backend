const crypto     = require('crypto');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User       = require('../models/User');
const Course     = require('../models/Course');
const Group      = require('../models/Group');

const createMailer = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const formatUser = (user) => ({
  id:               user._id,
  fullName:         user.fullName,
  email:            user.email,
  role:             user.role,
  department:       user.department,
  semester:         user.semester,
  section:          user.section,
  profileImage:     user.profileImage,
  coursesSetupDone: user.coursesSetupDone ?? false,
});

// Enrolls a newly-registered user into matching auto-enrolled groups.
// Teachers get the department group only; students get semester + class + department.
const autoEnrollUser = async (user) => {
  const { _id, role, department, semester, section } = user;
  if (!department) return;

  const isTeacher = role === 'teacher' || role === 'admin';

  if (!isTeacher && semester && section) {
    // ── 1. Create/find class group (dept + semester + section) ───────────────
    await Group.findOneAndUpdate(
      { type: 'class', department, semester, section },
      {
        $setOnInsert: {
          name:           `${department} · Sem ${semester} · ${section}`,
          description:    `Class group for ${department}, Semester ${semester}, Section ${section}`,
          type:           'class',
          department,
          semester,
          section,
          autoEnrolled:   true,
          membersCanPost: true,
          isPublic:       false,
        },
        $addToSet: { members: _id },
      },
      { upsert: true, new: true }
    );
  }

  // ── 3. Create/find department group (all roles with a department) ──────────
  await Group.findOneAndUpdate(
    { type: 'department', department },
    {
      $setOnInsert: {
        name:           `${department} Department`,
        description:    `Department-wide group for ${department}`,
        type:           'department',
        department,
        autoEnrolled:   true,
        membersCanPost: true,
        isPublic:       false,
      },
      $addToSet: { members: _id },
    },
    { upsert: true, new: true }
  );
};

exports.signup = async (req, res) => {
  const { fullName, email, password, role, department, semester, section } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'fullName, email, and password are required' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const isTeacher = role === 'teacher';
  const user = await User.create({
    fullName, email, password, role,
    department:       isTeacher ? undefined : department,
    semester:         isTeacher ? undefined : semester,
    section:          isTeacher ? undefined : section,
    coursesSetupDone: isTeacher,
  });

  // Auto-enroll students/admins; teachers are assigned by admin later
  if (!isTeacher) await autoEnrollUser(user);

  const token = signToken(user._id);
  res.status(201).json({ token, user: formatUser(user) });
};

exports.signin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (user.blocked) {
    return res.status(403).json({ message: 'Your account has been blocked. Please contact an admin.' });
  }

  const token = signToken(user._id);
  res.json({ token, user: formatUser(user) });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+resetOtp +resetOtpExpire');
  if (!user) return res.json({ message: 'If that email is registered, a reset code has been sent.' });

  const otp     = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  user.resetOtp       = otpHash;
  user.resetOtpExpire = new Date(Date.now() + 10 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  try {
    await createMailer().sendMail({
      from:    `"CampusWave" <${process.env.SMTP_USER}>`,
      to:      user.email,
      subject: 'Your CampusWave Password Reset Code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
          <h2 style="color:#381B7C;margin-bottom:8px;">Reset your password</h2>
          <p style="color:#555;">Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
          <div style="font-size:40px;font-weight:800;letter-spacing:10px;color:#381B7C;padding:24px 0;">${otp}</div>
          <p style="color:#999;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>`,
    });
    res.json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch {
    user.resetOtp       = undefined;
    user.resetOtpExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({ message: 'Failed to send email. Please try again.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({ message: 'Email, OTP, and new password are required' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const otpHash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');

  const user = await User.findOne({
    email:          email.toLowerCase().trim(),
    resetOtp:       otpHash,
    resetOtpExpire: { $gt: Date.now() },
  }).select('+resetOtp +resetOtpExpire +password');

  if (!user) return res.status(400).json({ message: 'Invalid or expired reset code' });

  user.password       = newPassword;
  user.resetOtp       = undefined;
  user.resetOtpExpire = undefined;
  await user.save();

  res.json({ message: 'Password reset successfully' });
};

exports.logout = (req, res) => {
  res.json({ message: 'Logged out successfully!' });
};

exports.getMe = (req, res) => {
  res.json({ user: formatUser(req.user) });
};
