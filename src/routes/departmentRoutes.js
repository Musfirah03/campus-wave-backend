const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const uploadCSV = require('../middleware/uploadCSV');

router.get('/get-departments',                     protect,            departmentController.getAllDepartments);
router.get('/get-department/:departmentId',        protect,            departmentController.getDepartmentById);
router.post('/create-department',                  protect, adminOnly, departmentController.createDepartment);
router.post('/import-csv',                         protect, adminOnly, uploadCSV.single('file'), departmentController.importCSV);
router.put('/update-department/:departmentId',     protect, adminOnly, departmentController.updateDepartment);
router.delete('/delete-department/:departmentId',  protect, adminOnly, departmentController.deleteDepartment);

module.exports = router;
