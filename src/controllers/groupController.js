const Group   = require('../models/Group');
const Message = require('../models/Message');

// GET /api/groups/my  — all groups the current user belongs to
exports.getMyGroups = async (req, res) => {
  const raw = await Group.find({ members: req.user._id })
    .populate('courseId', 'title code')
    .populate('members', 'fullName profileImage')
    .sort({ type: 1, name: 1 });

  // Bulk-fetch the most recent message for each group in one aggregation
  const groupIds = raw.map((g) => g._id);
  const lastMsgs = await Message.aggregate([
    { $match: { group: { $in: groupIds } } },
    { $sort:  { createdAt: -1 } },
    { $group: {
      _id:        '$group',
      text:       { $first: '$text' },
      attachment: { $first: '$attachment' },
      invite:     { $first: '$invite' },
      sender:     { $first: '$sender' },
      createdAt:  { $first: '$createdAt' },
    }},
    { $lookup: { from: 'users', localField: 'sender', foreignField: '_id', as: 'senderArr' } },
    { $addFields: { sender: { $arrayElemAt: ['$senderArr', 0] } } },
    { $project: { senderArr: 0, 'sender.password': 0 } },
  ]);
  const lastMsgMap = Object.fromEntries(lastMsgs.map((m) => [m._id.toString(), m]));

  const groups = raw.map((g) => {
    const obj = g.toObject();
    if (g.type === 'dm') {
      const other = g.members.find((m) => m._id.toString() !== req.user._id.toString());
      obj.otherUser = other
        ? { _id: other._id, fullName: other.fullName, profileImage: other.profileImage }
        : null;
    }
    delete obj.members;

    const lm = lastMsgMap[g._id.toString()];
    if (lm) {
      obj.lastMessage = {
        text:       lm.text,
        attachment: lm.attachment ? { name: lm.attachment.name, mimeType: lm.attachment.mimeType } : undefined,
        invite:     lm.invite     ? { groupName: lm.invite.groupName } : undefined,
        sender:     lm.sender     ? { _id: lm.sender._id, fullName: lm.sender.fullName } : undefined,
        createdAt:  lm.createdAt,
      };
    }

    return obj;
  });

  res.json({ groups });
};

// GET /api/groups/discover  — public groups user hasn't joined
// Structured groups (course/class/department) are scoped to the user's department.
// Community groups (study/club/announcement) are shown for all.
exports.discoverGroups = async (req, res) => {
  const { department } = req.user;

  const baseFilter = {
    isPublic: true,
    type:     { $nin: ['dm'] },
    members:  { $ne: req.user._id },
  };

  if (department) {
    baseFilter.$or = [
      { type: { $in: ['course', 'class', 'department'] }, department },
      { type: { $in: ['study', 'club', 'announcement'] } },
    ];
  }

  const raw = await Group.find(baseFilter)
    .populate('courseId', 'code title')
    .sort({ type: 1, semester: 1, createdAt: -1 });

  const groups = raw.map((g) => ({
    _id:         g._id,
    name:        g.name,
    description: g.description,
    type:        g.type,
    isPublic:    g.isPublic,
    autoEnrolled: g.autoEnrolled,
    membersCanPost: g.membersCanPost,
    createdBy:   g.createdBy,
    memberCount: g.members.length,
    department:  g.department,
    semester:    g.semester,
    section:     g.section,
    courseId:    g.courseId,
    createdAt:   g.createdAt,
    updatedAt:   g.updatedAt,
  }));

  res.json({ groups });
};

// POST /api/groups  — create a manual group
exports.createGroup = async (req, res) => {
  const { name, description, type, isPublic } = req.body;

  const allowed = ['study', 'club', 'announcement'];
  if (!name || !type || !allowed.includes(type)) {
    return res.status(400).json({ message: 'name and valid type (study/club/announcement) are required' });
  }

  if (type === 'announcement' && req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only teachers can create announcement groups' });
  }

  const group = await Group.create({
    name,
    description,
    type,
    isPublic:       isPublic !== false,
    membersCanPost: type !== 'announcement',
    createdBy:      req.user._id,
    members:        [req.user._id],
    autoEnrolled:   false,
  });

  res.status(201).json({ group });
};

// POST /api/groups/:groupId/join
exports.joinGroup = async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ message: 'Group not found' });
  if (!group.isPublic) return res.status(403).json({ message: 'This group is private' });

  const already = group.members.some((m) => m.toString() === req.user._id.toString());
  if (already) return res.status(409).json({ message: 'Already a member' });

  await Group.findByIdAndUpdate(group._id, { $addToSet: { members: req.user._id } });
  res.json({ message: 'Joined successfully' });
};

// POST /api/groups/:groupId/join-via-invite — bypasses isPublic; invite card acts as permission
exports.joinViaInvite = async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ message: 'Group not found' });

  const already = group.members.some((m) => m.toString() === req.user._id.toString());
  if (already) return res.status(409).json({ message: 'Already a member' });

  await Group.findByIdAndUpdate(group._id, { $addToSet: { members: req.user._id } });
  res.json({ message: 'Joined successfully' });
};

// POST /api/groups/:groupId/leave
exports.leaveGroup = async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ message: 'Group not found' });
  if (group.autoEnrolled) return res.status(403).json({ message: 'Cannot leave auto-enrolled groups' });

  await Group.findByIdAndUpdate(group._id, { $pull: { members: req.user._id } });
  res.json({ message: 'Left successfully' });
};

// GET /api/groups/:groupId  — group detail + member list
exports.getGroupById = async (req, res) => {
  const group = await Group.findById(req.params.groupId)
    .populate('members', 'fullName email department semester section profileImage')
    .populate('courseId', 'title code');

  if (!group) return res.status(404).json({ message: 'Group not found' });

  const isMember = group.members.some(
    (m) => m._id.toString() === req.user._id.toString()
  );
  if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

  res.json({ group });
};

// POST /api/groups/dm  — find or create a 1:1 DM conversation
exports.findOrCreateDM = async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ message: 'targetUserId is required' });
  if (targetUserId === req.user._id.toString()) {
    return res.status(400).json({ message: 'Cannot start a DM with yourself' });
  }

  const existing = await Group.findOne({
    type: 'dm',
    members: { $all: [req.user._id, targetUserId], $size: 2 },
  });
  if (existing) return res.json({ group: existing });

  const User = require('../models/User');
  const target = await User.findById(targetUserId).select('fullName');
  if (!target) return res.status(404).json({ message: 'User not found' });

  const group = await Group.create({
    name:           `dm:${req.user._id}:${targetUserId}`,
    type:           'dm',
    isPublic:       false,
    membersCanPost: true,
    members:        [req.user._id, targetUserId],
    autoEnrolled:   false,
  });

  res.status(201).json({ group });
};

// GET /api/groups  — all groups (admin use)
exports.getAllGroups = async (req, res) => {
  const groups = await Group.find()
    .select('-members')
    .sort({ type: 1, name: 1 });

  res.json({ groups });
};
