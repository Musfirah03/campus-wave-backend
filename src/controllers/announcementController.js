const Announcement = require('../models/Announcement');
const User         = require('../models/User');

const isTeacher = (user) => user.role === 'teacher' || user.role === 'admin';

// GET /api/announcements
exports.list = async (req, res) => {
  const { department } = req.user;
  const filter = department ? { department } : {};
  const announcements = await Announcement.find(filter)
    .populate('author', 'fullName role department')
    .sort({ pinned: -1, createdAt: -1 })
    .limit(100);
  res.json({ announcements });
};

// POST /api/announcements
exports.create = async (req, res) => {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: 'Only teachers can post announcements' });
  }
  const { title, body, category } = req.body;
  if (!title?.trim() || !body?.trim() || !category) {
    return res.status(400).json({ message: 'title, body, and category are required' });
  }
  const announcement = await Announcement.create({
    title:      title.trim(),
    body:       body.trim(),
    category,
    author:     req.user._id,
    department: req.user.department,
  });
  await announcement.populate('author', 'fullName role department');

  // Push real-time event to all users in the same department (excluding the author)
  const io = req.app.locals.io;
  if (io && req.user.department) {
    const users = await User.find({ department: req.user.department }).select('_id');
    for (const u of users) {
      if (u._id.toString() !== req.user._id.toString()) {
        io.to(`user_${u._id}`).emit('newAnnouncement', { announcement });
      }
    }
  }

  res.status(201).json({ announcement });
};

// PATCH /api/announcements/:id/pin
exports.togglePin = async (req, res) => {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: 'Only teachers can pin announcements' });
  }
  const ann = await Announcement.findById(req.params.id);
  if (!ann) return res.status(404).json({ message: 'Announcement not found' });
  if (ann.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only pin your own announcements' });
  }
  ann.pinned = !ann.pinned;
  await ann.save();
  res.json({ announcement: ann });
};

// DELETE /api/announcements/:id
exports.remove = async (req, res) => {
  if (!isTeacher(req.user)) {
    return res.status(403).json({ message: 'Only teachers can delete announcements' });
  }
  const ann = await Announcement.findById(req.params.id);
  if (!ann) return res.status(404).json({ message: 'Announcement not found' });
  if (ann.author.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only delete your own announcements' });
  }
  await ann.deleteOne();
  res.json({ message: 'Deleted' });
};
