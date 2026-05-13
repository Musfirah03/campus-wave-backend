const Group        = require('../models/Group');
const User         = require('../models/User');
const Course       = require('../models/Course');
const Message      = require('../models/Message');
const LeaveRequest = require('../models/LeaveRequest');

// POST /api/groups/:groupId/leave-request
// Student or teacher submits a request to leave an auto-enrolled group
exports.requestLeave = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  const group = await Group.findById(groupId);
  if (!group) return res.status(404).json({ message: 'Group not found' });

  if (!group.autoEnrolled) {
    return res.status(400).json({ message: 'This group does not require a leave request' });
  }

  const isMember = group.members.some((m) => m.toString() === userId.toString());
  if (!isMember) return res.status(403).json({ message: 'You are not a member of this group' });

  const existing = await LeaveRequest.findOne({ group: groupId, user: userId, status: 'pending' });
  if (existing) {
    return res.status(409).json({ message: 'You already have a pending leave request for this group' });
  }

  const request = await LeaveRequest.create({ group: groupId, user: userId });
  res.status(201).json({ request });
};

// GET /api/admin/leave-requests
// Admin fetches all pending (or filtered) leave requests
exports.getLeaveRequests = async (req, res) => {
  const { status = 'pending' } = req.query;

  const filter = {};
  if (status !== 'all') filter.status = status;

  const requests = await LeaveRequest.find(filter)
    .populate('user',  'fullName email role department semester section profileImage')
    .populate('group', 'name type department semester section autoEnrolled')
    .sort({ createdAt: -1 });

  res.json({ requests });
};

// PUT /api/admin/leave-requests/:id/approve
// Admin approves — user is removed from the group
exports.approveLeaveRequest = async (req, res) => {
  const request = await LeaveRequest.findById(req.params.id)
    .populate('group')
    .populate('user', 'fullName');

  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'Request has already been processed' });
  }

  await Group.findByIdAndUpdate(request.group._id, {
    $pull: { members: request.user._id },
  });

  request.status = 'approved';
  await request.save();

  res.json({ message: `${request.user.fullName} has been removed from ${request.group.name}`, request });
};

// PUT /api/admin/leave-requests/:id/reject
// Admin rejects — user stays in group
exports.rejectLeaveRequest = async (req, res) => {
  const { adminNote } = req.body;

  const request = await LeaveRequest.findById(req.params.id)
    .populate('user', 'fullName');

  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'Request has already been processed' });
  }

  request.status    = 'rejected';
  request.adminNote = adminNote ?? '';
  await request.save();

  res.json({ message: `Leave request from ${request.user.fullName} has been rejected`, request });
};

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  const [totalUsers, totalGroups, pendingRequests, totalMessages] = await Promise.all([
    User.countDocuments(),
    Group.countDocuments({ type: { $ne: 'dm' } }),
    LeaveRequest.countDocuments({ status: 'pending' }),
    Message.countDocuments(),
  ]);

  const usersByRole = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);

  const roleMap = Object.fromEntries(usersByRole.map((r) => [r._id, r.count]));

  res.json({
    stats: {
      totalUsers,
      totalGroups,
      pendingRequests,
      totalMessages,
      students: roleMap.student ?? 0,
      teachers: roleMap.teacher ?? 0,
      admins:   roleMap.admin   ?? 0,
    },
  });
};

// GET /api/admin/users
exports.getAdminUsers = async (req, res) => {
  const { search, role } = req.query;

  const filter = {};
  if (role && role !== 'all') filter.role = role;
  if (search) {
    filter.$or = [
      { fullName:   { $regex: search, $options: 'i' } },
      { email:      { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter)
    .select('fullName email role department semester section profileImage blocked createdAt')
    .sort({ createdAt: -1 });

  res.json({ users });
};

// PUT /api/admin/users/:userId/block
exports.toggleBlockUser = async (req, res) => {
  if (req.params.userId === req.user._id.toString()) {
    return res.status(400).json({ message: 'Cannot block your own account' });
  }
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.blocked = !user.blocked;
  await user.save();

  res.json({ message: user.blocked ? 'User blocked' : 'User unblocked', blocked: user.blocked });
};

// PUT /api/admin/users/:userId/assign-courses
// Admin assigns department and course groups to a teacher
exports.assignTeacherCourses = async (req, res) => {
  const { department, courseIds } = req.body;

  const targetUser = await User.findById(req.params.userId);
  if (!targetUser) return res.status(404).json({ message: 'User not found' });
  if (targetUser.role !== 'teacher') return res.status(400).json({ message: 'User is not a teacher' });

  const oldDepartment = targetUser.department;

  if (department) targetUser.department = department;
  targetUser.coursesSetupDone = true;
  await targetUser.save();

  // Remove from old department group if department changed
  if (oldDepartment && oldDepartment !== targetUser.department) {
    await Group.findOneAndUpdate(
      { type: 'department', department: oldDepartment },
      { $pull: { members: targetUser._id } }
    );
  }

  // Add to department group
  if (targetUser.department) {
    await Group.findOneAndUpdate(
      { type: 'department', department: targetUser.department },
      {
        $setOnInsert: {
          name:           `${targetUser.department} Department`,
          description:    `Department-wide group for ${targetUser.department}`,
          type:           'department',
          department:     targetUser.department,
          autoEnrolled:   true,
          membersCanPost: true,
          isPublic:       false,
        },
        $addToSet: { members: targetUser._id },
      },
      { upsert: true, new: true }
    );
  }

  // Add to course groups
  if (Array.isArray(courseIds) && courseIds.length > 0) {
    for (const courseId of courseIds) {
      const course = await Course.findById(courseId);
      if (!course) continue;
      await Group.findOneAndUpdate(
        { type: 'course', courseId: course._id },
        {
          $setOnInsert: {
            name:         `${course.code} – ${course.title}`,
            description:  `Chat group for ${course.title}`,
            type:         'course',
            courseId:     course._id,
            department:   targetUser.department || course.department,
            semester:     course.semester,
            autoEnrolled: true,
          },
          $addToSet: { members: targetUser._id },
        },
        { upsert: true, new: true }
      );
    }
  }

  res.json({
    message: 'Courses assigned successfully',
    user: { _id: targetUser._id, fullName: targetUser.fullName, department: targetUser.department },
  });
};

// PUT /api/admin/users/:userId/assign-student
exports.assignStudentInfo = async (req, res) => {
  const { department, semester, section, courseIds } = req.body;

  const targetUser = await User.findById(req.params.userId);
  if (!targetUser) return res.status(404).json({ message: 'User not found' });
  if (targetUser.role !== 'student') return res.status(400).json({ message: 'User is not a student' });

  const oldDepartment = targetUser.department;

  if (department !== undefined) targetUser.department = department;
  if (semester  !== undefined) targetUser.semester   = semester;
  if (section   !== undefined) targetUser.section    = section;
  targetUser.coursesSetupDone = true;
  await targetUser.save();

  // Remove from old department group if department changed
  if (oldDepartment && oldDepartment !== targetUser.department) {
    await Group.findOneAndUpdate(
      { type: 'department', department: oldDepartment },
      { $pull: { members: targetUser._id } }
    );
  }

  // Add to department group
  if (targetUser.department) {
    await Group.findOneAndUpdate(
      { type: 'department', department: targetUser.department },
      {
        $setOnInsert: {
          name:           `${targetUser.department} Department`,
          description:    `Department-wide group for ${targetUser.department}`,
          type:           'department',
          department:     targetUser.department,
          autoEnrolled:   true,
          membersCanPost: true,
          isPublic:       false,
        },
        $addToSet: { members: targetUser._id },
      },
      { upsert: true, new: true }
    );
  }

  // Enroll in courses
  if (Array.isArray(courseIds) && courseIds.length > 0) {
    for (const courseId of courseIds) {
      const course = await Course.findById(courseId);
      if (!course) continue;

      await Course.updateOne({ _id: courseId }, { $addToSet: { students: targetUser._id } });

      await Group.findOneAndUpdate(
        { type: 'course', courseId: course._id },
        {
          $setOnInsert: {
            name:         `${course.code} – ${course.title}`,
            description:  `Chat group for ${course.title}`,
            type:         'course',
            courseId:     course._id,
            department:   targetUser.department || course.department,
            semester:     course.semester,
            autoEnrolled: true,
          },
          $addToSet: { members: targetUser._id },
        },
        { upsert: true, new: true }
      );
    }
  }

  res.json({
    message: 'Student profile assigned successfully',
    user: {
      _id:        targetUser._id,
      fullName:   targetUser.fullName,
      department: targetUser.department,
      semester:   targetUser.semester,
      section:    targetUser.section,
    },
  });
};

// PUT /api/admin/users/:userId/role
exports.updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (req.params.userId === req.user._id.toString()) {
    return res.status(400).json({ message: 'Cannot change your own role' });
  }

  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { role },
    { new: true }
  ).select('fullName email role department');

  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json({ user });
};
