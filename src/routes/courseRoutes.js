const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const uploadCSV = require('../middleware/uploadCSV');

router.get('/',              protect,            courseController.getAllCourses);
router.post('/import-csv',   protect, adminOnly, uploadCSV.single('file'), courseController.importCSV);
router.post('/enroll',       protect,            courseController.enrollInCourse);
router.post('/enroll-bulk',  protect,            courseController.enrollBulk);
router.post('/',             protect, adminOnly, courseController.createCourse);
router.get('/:courseId',     protect,            courseController.getCourseById);
router.put('/:courseId',     protect, adminOnly, courseController.updateCourse);
router.delete('/:courseId',  protect, adminOnly, courseController.deleteCourse);

module.exports = router;
