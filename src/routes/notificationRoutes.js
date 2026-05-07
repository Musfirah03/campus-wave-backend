const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { list, markRead, markAllRead, remove } = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);

router.get('/',               list);
router.patch('/read-all',     markAllRead);
router.patch('/:id/read',     markRead);
router.delete('/:id',         remove);

module.exports = router;
