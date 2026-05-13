const express  = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getStats,
  getAdminUsers,
  updateUserRole,
  toggleBlockUser,
  assignTeacherCourses,
  assignStudentInfo,
} = require('../controllers/leaveRequestController');
const { getReports, resolveReport } = require('../controllers/reportController');

const router = express.Router();

router.use(protect, adminOnly);

router.get('/stats',                        getStats);
router.get('/users',                        getAdminUsers);
router.put('/users/:userId/role',           updateUserRole);
router.put('/users/:userId/block',          toggleBlockUser);
router.put('/users/:userId/assign-courses', assignTeacherCourses);
router.put('/users/:userId/assign-student', assignStudentInfo);
router.get('/leave-requests',               getLeaveRequests);
router.put('/leave-requests/:id/approve',   approveLeaveRequest);
router.put('/leave-requests/:id/reject',    rejectLeaveRequest);
router.get('/reports',                      getReports);
router.put('/reports/:id/resolve',          resolveReport);

module.exports = router;
