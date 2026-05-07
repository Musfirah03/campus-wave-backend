const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/announcementController');

const router = express.Router();

router.get('/',          protect, ctrl.list);
router.post('/',         protect, ctrl.create);
router.patch('/:id/pin', protect, ctrl.togglePin);
router.delete('/:id',    protect, ctrl.remove);

module.exports = router;
