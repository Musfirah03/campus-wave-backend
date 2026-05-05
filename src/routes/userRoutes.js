const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const courseController = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/', protect, userController.getAllUsers);
router.get('/:userId', protect, userController.getUserById);
router.put('/:userId', protect, userController.updateUser);
router.post('/:userId/avatar', protect, upload.single('avatar'), userController.uploadAvatar);
router.get('/:userId/courses', protect, courseController.getUserCourses);

module.exports = router;
