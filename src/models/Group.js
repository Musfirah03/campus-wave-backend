const mongoose = require('mongoose');
const { Schema } = mongoose;

const groupSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type:     String,
      enum:     ['course', 'department', 'class', 'study', 'club', 'announcement', 'dm'],
      required: true,
    },
    members:        [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy:      { type: Schema.Types.ObjectId, ref: 'User' },
    isPublic:       { type: Boolean, default: true },
    membersCanPost: { type: Boolean, default: true },
    // set for course groups
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    // set for department / class groups
    department: { type: String, trim: true },
    semester:   { type: String, trim: true },
    section:    { type: String, trim: true, uppercase: true },
    // true = created automatically during student registration
    autoEnrolled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent duplicate auto-enrolled groups (partial indexes so DMs with courseId=null are excluded)
groupSchema.index({ type: 1, courseId: 1 },
  { unique: true, partialFilterExpression: { type: 'course' } });
groupSchema.index({ type: 1, department: 1 },
  { unique: true, partialFilterExpression: { type: 'department' } });
groupSchema.index({ type: 1, department: 1, semester: 1, section: 1 },
  { unique: true, partialFilterExpression: { type: 'class' } });

module.exports = mongoose.model('Group', groupSchema);
