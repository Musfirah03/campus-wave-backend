const jwt  = require('jsonwebtoken');
const User   = require('../models/User');
const Course = require('../models/Course');
const Group  = require('../models/Group');

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

// Enrolls a newly-registered student into matching courses and groups.
// Silently skips steps that aren't applicable (e.g. no courses exist yet).
const autoEnrollUser = async (user) => {
  const { _id, department, semester, section } = user;
  if (!department || !semester || !section) return;

  // ── 1. Create/find semester group (dept + semester) ───────────────────────
  await Group.findOneAndUpdate(
    { type: 'semester', department, semester },
    {
      $setOnInsert: {
        name:           `${department} · Semester ${semester}`,
        description:    `Semester ${semester} group for ${department}`,
        type:           'semester',
        department,
        semester,
        autoEnrolled:   true,
        membersCanPost: true,
        isPublic:       false,
      },
      $addToSet: { members: _id },
    },
    { upsert: true, new: true }
  );

  // ── 2. Create/find class group (dept + semester + section) ─────────────────
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

  // ── 3. Create/find department group ────────────────────────────────────────
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

  const user = await User.create({ fullName, email, password, role, department, semester, section });

  // Auto-assign class, enroll in courses, and add to groups
  await autoEnrollUser(user);

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

  const token = signToken(user._id);
  res.json({ token, user: formatUser(user) });
};

exports.logout = (req, res) => {
  res.json({ message: 'Logged out successfully!' });
};

exports.getMe = (req, res) => {
  res.json({ user: formatUser(req.user) });
};
