const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['message', 'user', 'group'],
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reportedGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    messageText: {
      type: String,
      maxlength: 1000,
    },
    reason: {
      type: String,
      enum: ['abuse', 'spam', 'harassment', 'inappropriate', 'other'],
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
    },
    adminNote: {
      type: String,
      maxlength: 500,
    },
    actionTaken: {
      type: String,
      enum: ['none', 'warned', 'blocked'],
      default: 'none',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
