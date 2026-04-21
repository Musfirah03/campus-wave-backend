const User = require('../models/Auth');

exports.getAllUsers = async (req, res) => {
  const users = await User.find();
  res.json({ users });
};

exports.getUserById = async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({ user });
};

exports.updateUser = async (req, res) => {
  const { fullName, department, semester, section, profileImage } = req.body;

  if (req.user._id.toString() !== req.params.userId) {
    return res.status(403).json({ message: 'You can only update your own profile' });
  }

  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { fullName, department, semester, section, profileImage },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({ user });
};
