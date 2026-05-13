const mongoose = require('mongoose');
const { Schema } = mongoose;

const leaveRequestSchema = new Schema(
  {
    group:  { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    user:   { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    status: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNote: { type: String, trim: true },
  },
  { timestamps: true }
);

// One pending request per user per group
leaveRequestSchema.index({ group: 1, user: 1, status: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
