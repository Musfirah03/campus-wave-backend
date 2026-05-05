const express          = require('express');
const router           = express.Router();
const { protect }      = require('../middleware/authMiddleware');
const uploadAttachment = require('../middleware/uploadAttachment');
const { getGroupMessages, uploadAttachment: uploadHandler } = require('../controllers/messageController');

router.post('/upload', protect, uploadAttachment.single('file'), uploadHandler);
router.get('/:groupId', protect, getGroupMessages);

module.exports = router;
