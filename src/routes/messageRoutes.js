const express          = require('express');
const router           = express.Router();
const { protect }      = require('../middleware/authMiddleware');
const uploadAttachment = require('../middleware/uploadAttachment');
const { getGroupMessages, clearGroupMessages, uploadAttachment: uploadHandler } = require('../controllers/messageController');

router.post('/upload', protect, uploadAttachment.single('file'), uploadHandler);
router.get('/:groupId', protect, getGroupMessages);
router.delete('/:groupId', protect, clearGroupMessages);

module.exports = router;
