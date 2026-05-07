const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['message', 'dm', 'reply', 'system'],
      default: 'message',
    },
    title: { type: String, required: true },
    body:  { type: String, required: true },
    data: {
      groupId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
      groupName: { type: String },
      senderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Notification', notificationSchema);
