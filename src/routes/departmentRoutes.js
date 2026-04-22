const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-department', protect, departmentController.createDepartment);
router.get('/get-departments', protect, departmentController.getAllDepartments);
router.get('/get-department/:departmentId', protect, departmentController.getDepartmentById);
router.put('/update-department/:departmentId', protect, departmentController.updateDepartment);

module.exports = router;
