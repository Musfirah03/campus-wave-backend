const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UNIVERSITY_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.(edu|edu\.pk)$/i;

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => UNIVERSITY_EMAIL_REGEX.test(v),
        message: 'Must be a valid university email address',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
    },
    department: {
      type: String,
      trim: true,
    },
    semester: {
      type: String,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
    },
    profileImage: {
      type: String,
    },
    coursesSetupDone: {
      type: Boolean,
      default: false,
    },
    expoPushToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
