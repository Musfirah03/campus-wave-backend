const { v2: cloudinary } = require('cloudinary');
const User = require('../models/User');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

exports.uploadAvatar = async (req, res) => {
  if (req.user._id.toString() !== req.params.userId) {
    return res.status(403).json({ message: 'You can only update your own profile' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        'campus-connect/avatars',
          public_id:     `avatar_${req.params.userId}`,
          overwrite:     true,
          resource_type: 'image',
        },
        (err, res) => (err ? reject(err) : resolve(res)),
      );
      stream.end(req.file.buffer);
    });

    const imageUrl = result.secure_url;
    await User.findByIdAndUpdate(req.params.userId, { profileImage: imageUrl });
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ message: `Upload failed: ${err?.message ?? 'Unknown error'}` });
  }
};

exports.savePushToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'token required' });
  await User.findByIdAndUpdate(req.user._id, { expoPushToken: token });
  res.json({ ok: true });
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
