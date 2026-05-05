const { v2: cloudinary } = require('cloudinary');
const Message = require('../models/Message');

exports.getGroupMessages = async (req, res) => {
  const messages = await Message.find({ group: req.params.groupId })
    .populate('sender', 'fullName profileImage')
    .sort({ createdAt: 1 })
    .limit(100);
  res.json({ messages });
};

exports.uploadAttachment = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file provided' });

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  console.log('[upload] cloudinary config:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY ? '✓ set' : '✗ missing',
    api_secret: process.env.CLOUDINARY_API_SECRET ? '✓ set' : '✗ missing',
  });

  const isImage = req.file.mimetype.startsWith('image/');

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:          'campus-connect/attachments',
          resource_type:   isImage ? 'image' : 'raw',
          use_filename:    true,
          unique_filename: true,
          overwrite:       false,
        },
        (err, result) => {
          if (err) {
            console.error('[upload] cloudinary error:', JSON.stringify(err));
            reject(err);
          } else {
            resolve(result);
          }
        },
      );
      stream.end(req.file.buffer);
    });

    res.json({
      url:      result.secure_url,
      name:     req.file.originalname,
      size:     result.bytes,
      mimeType: req.file.mimetype,
    });
  } catch (err) {
    const message = err?.message || err?.error?.message || JSON.stringify(err);
    console.error('[upload] failed:', message);
    res.status(500).json({ message: `Upload failed: ${message}` });
  }
};
