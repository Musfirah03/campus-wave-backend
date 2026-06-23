const multer = require('multer');

module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'text/csv'
      || file.mimetype === 'application/vnd.ms-excel'
      || file.originalname.endsWith('.csv');
    if (ok) cb(null, true);
    else cb(new Error('Only CSV files are allowed'), false);
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});
