const Notification = require('../models/Notification');

async function list(req, res) {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort({ createdAt: -1 })
    .limit(60)
    .lean();
  res.json({ notifications });
}

async function markRead(req, res) {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { read: true },
  );
  res.json({ ok: true });
}

async function markAllRead(req, res) {
  await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
  res.json({ ok: true });
}

async function remove(req, res) {
  await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
  res.json({ ok: true });
}

module.exports = { list, markRead, markAllRead, remove };
