const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, courseController.createCourse);
router.get('/', protect, courseController.getAllCourses);
router.get('/:courseId', protect, courseController.getCourseById);
router.post('/enroll', protect, courseController.enrollInCourse);

module.exports = router;
