const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const courseController = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, userController.getAllUsers);
router.get('/:userId', protect, userController.getUserById);
router.put('/:userId', protect, userController.updateUser);
router.get('/:userId/courses', protect, courseController.getUserCourses);

module.exports = router;
