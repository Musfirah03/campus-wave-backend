const Report = require('../models/Report');
const User   = require('../models/User');

// POST /api/reports  — any authenticated user submits a report
exports.submitReport = async (req, res) => {
  const { type, reportedUser, reportedGroup, message, messageText, reason, description } = req.body;

  if (!type || !reason) {
    return res.status(400).json({ message: 'type and reason are required' });
  }
  if (type === 'group' && !reportedGroup) {
    return res.status(400).json({ message: 'reportedGroup is required for group reports' });
  }
  if (type !== 'group' && !reportedUser) {
    return res.status(400).json({ message: 'reportedUser is required for user and message reports' });
  }

  if (reportedUser && reportedUser === req.user._id.toString()) {
    return res.status(400).json({ message: 'You cannot report yourself' });
  }

  // Prevent duplicate pending reports on the same message by the same user
  if (message) {
    const existing = await Report.findOne({ reportedBy: req.user._id, message, status: 'pending' });
    if (existing) {
      return res.status(409).json({ message: 'You have already reported this message' });
    }
  }

  // Prevent duplicate pending group reports from the same user
  if (reportedGroup) {
    const existing = await Report.findOne({ reportedBy: req.user._id, reportedGroup, status: 'pending' });
    if (existing) {
      return res.status(409).json({ message: 'You have already reported this group' });
    }
  }

  const report = await Report.create({
    type,
    reportedBy: req.user._id,
    ...(reportedUser  ? { reportedUser }  : {}),
    ...(reportedGroup ? { reportedGroup } : {}),
    message, messageText, reason, description,
  });

  res.status(201).json({ report, message: 'Report submitted. Our team will review it shortly.' });
};

// GET /api/admin/reports?status=pending|resolved|dismissed|all
exports.getReports = async (req, res) => {
  const { status = 'pending' } = req.query;
  const filter = status !== 'all' ? { status } : {};

  const reports = await Report.find(filter)
    .populate('reportedBy',    'fullName email profileImage')
    .populate('reportedUser',  'fullName email profileImage blocked')
    .populate('reportedGroup', 'name type')
    .sort({ createdAt: -1 })
    .limit(200);

  const pendingCount = await Report.countDocuments({ status: 'pending' });

  res.json({ reports, pendingCount });
};

// PUT /api/admin/reports/:id/resolve
// action: 'warn' | 'block' | 'dismiss'
exports.resolveReport = async (req, res) => {
  const { action, adminNote } = req.body;

  if (!['warn', 'block', 'dismiss'].includes(action)) {
    return res.status(400).json({ message: "action must be 'warn', 'block', or 'dismiss'" });
  }

  const report = await Report.findById(req.params.id)
    .populate('reportedUser', 'fullName blocked');
  if (!report) return res.status(404).json({ message: 'Report not found' });
  if (report.status !== 'pending') {
    return res.status(400).json({ message: 'Report has already been processed' });
  }

  report.status      = action === 'dismiss' ? 'dismissed' : 'resolved';
  report.adminNote   = adminNote ?? '';
  report.actionTaken = action === 'warn' ? 'warned' : action === 'block' ? 'blocked' : 'none';
  await report.save();

  let actionMessage = 'Report dismissed';

  if (action === 'block' && report.reportedUser) {
    const user = await User.findById(report.reportedUser._id);
    if (user && !user.blocked) {
      user.blocked = true;
      await user.save();
    }
    actionMessage = `${report.reportedUser.fullName} has been blocked`;
  } else if (action === 'warn' && report.reportedUser) {
    actionMessage = `Warning noted for ${report.reportedUser.fullName}`;
  } else if (action === 'block' && !report.reportedUser) {
    actionMessage = 'Group report resolved';
  } else if (action === 'warn' && !report.reportedUser) {
    actionMessage = 'Group report noted';
  }

  await report.populate([
    { path: 'reportedBy',    select: 'fullName email' },
    { path: 'reportedUser',  select: 'fullName email blocked' },
    { path: 'reportedGroup', select: 'name type' },
  ]);

  res.json({ report, message: actionMessage });
};
