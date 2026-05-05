const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    group:  { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    text:   { type: String, trim: true },
    attachment: {
      url:      String,
      name:     String,
      size:     Number,
      mimeType: String,
    },
  },
  { timestamps: true }
);

messageSchema.pre('validate', function () {
  if (!this.text && !this.attachment?.url) {
    throw new Error('Message must have text or an attachment');
  }
});

module.exports = mongoose.model('Message', messageSchema);
