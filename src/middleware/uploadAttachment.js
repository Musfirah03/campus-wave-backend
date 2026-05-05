const multer = require('multer');

// Store file in memory so we can stream it to Cloudinary
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
