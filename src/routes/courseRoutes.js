const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');

router.post('/',             protect, courseController.createCourse);
router.get('/',              protect, courseController.getAllCourses);
router.post('/enroll',       protect, courseController.enrollInCourse);
router.post('/enroll-bulk',  protect, courseController.enrollBulk);
router.get('/:courseId',     protect, courseController.getCourseById);

module.exports = router;
