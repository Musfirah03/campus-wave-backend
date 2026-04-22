const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const formatUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  department: user.department,
  semester: user.semester,
  section: user.section,
  profileImage: user.profileImage,
});

exports.signup = async (req, res) => {
  const { fullName, email, password, role, department, semester, section } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'fullName, email, and password are required' });
  }

  const existing = await User.findOne({ email: email });
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const user = await User.create({ fullName, email, password, role, department, semester, section });

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
