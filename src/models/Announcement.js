const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title:    { type: String, required: true, maxlength: 200 },
    body:     { type: String, required: true, maxlength: 2000 },
    category: {
      type: String,
      enum: ['Timetable', 'Exams', 'Notices', 'Holiday', 'Emergency', 'Event'],
      required: true,
    },
    scope:      { type: String, enum: ['campus', 'department'], default: 'department' },
    author:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String },
    pinned:     { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Announcement', announcementSchema);
