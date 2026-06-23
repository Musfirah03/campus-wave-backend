const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { submitReport } = require('../controllers/reportController');

const router = express.Router();

router.post('/', protect, submitReport);

module.exports = router;
