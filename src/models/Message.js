const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    group:  { type: mongoose.Schema.Types.ObjectId, ref: 'Group',   required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    text:   { type: String, trim: true },
    attachment: {
      url:      String,
      name:     String,
      size:     Number,
      mimeType: String,
    },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    invite: {
      groupId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
      groupName: String,
      groupType: String,
    },
  },
  { timestamps: true },
);

messageSchema.pre('validate', function () {
  if (!this.text && !this.attachment?.url && !this.invite?.groupId) {
    throw new Error('Message must have text, an attachment, or an invite');
  }
});

module.exports = mongoose.model('Message', messageSchema);
