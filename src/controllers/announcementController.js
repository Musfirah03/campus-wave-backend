const Announcement = require('../models/Announcement');
const User         = require('../models/User');

const isTeacher = (user) => user.role === 'teacher' || user.role === 'admin';
const isAdmin   = (user) => user.role === 'admin';

// GET /api/announcements  — campus-wide + user's department (admins see all)
exports.list = async (req, res) => {
  const { department, role } = req.user;

  const filter = role === 'admin'
    ? {}
    : department
      ? { $or: [{ scope: 'campus' }, { department }] }
      : { scope: 'campus' };

  const announcements = await Announcement.find(filter)
    .populate('author', 'fullName role department')
    .sort({ pinned: -1, createdAt: -1 })
    .limit(100);

  res.json({ announcements });
};

// GET /api/announcements/all  — admin: all announcements across all departments
exports.listAll = async (req, res) => {
  const announcements = await Announcement.find({})
    .populate('author', 'fullName role department')
    .sort({ pinned: -1, createdAt: -1 })
    .limit(500);
  res.json({ announcements });
};

// POST /api/announcements
exports.create = async (req, res) => {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: 'Only teachers and admins can post announcements' });
  }

  const { title, body, category, scope, department: deptOverride } = req.body;

  if (!title?.trim() || !body?.trim() || !category) {
    return res.status(400).json({ message: 'title, body, and category are required' });
  }

  const resolvedScope = isAdmin(req.user) && scope === 'campus' ? 'campus' : 'department';

  // Campus-wide has no department; department-scoped uses override (admin) or author's dept
  const resolvedDept = resolvedScope === 'campus'
    ? undefined
    : (isAdmin(req.user) && deptOverride) ? deptOverride : req.user.department;

  const announcement = await Announcement.create({
    title: title.trim(),
    body:  body.trim(),
    category,
    scope: resolvedScope,
    author:     req.user._id,
    department: resolvedDept,
  });

  await announcement.populate('author', 'fullName role department');

  // Push real-time notification
  const io = req.app.locals.io;
  if (io) {
    if (resolvedScope === 'campus') {
      io.emit('newAnnouncement', { announcement });
    } else if (resolvedDept) {
      const users = await User.find({ department: resolvedDept }).select('_id');
      for (const u of users) {
        if (u._id.toString() !== req.user._id.toString()) {
          io.to(`user_${u._id}`).emit('newAnnouncement', { announcement });
        }
      }
    }
  }

  res.status(201).json({ announcement });
};

// PATCH /api/announcements/:id/pin
exports.togglePin = async (req, res) => {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: 'Only teachers and admins can pin announcements' });
  }
  const ann = await Announcement.findById(req.params.id);
  if (!ann) return res.status(404).json({ message: 'Announcement not found' });

  if (!isAdmin(req.user) && ann.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only pin your own announcements' });
  }

  ann.pinned = !ann.pinned;
  await ann.save();
  res.json({ announcement: ann });
};

// DELETE /api/announcements/:id
exports.remove = async (req, res) => {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: 'Only teachers and admins can delete announcements' });
  }
  const ann = await Announcement.findById(req.params.id);
  if (!ann) return res.status(404).json({ message: 'Announcement not found' });

  if (!isAdmin(req.user) && ann.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only delete your own announcements' });
  }

  await ann.deleteOne();
  res.json({ message: 'Deleted' });
};
