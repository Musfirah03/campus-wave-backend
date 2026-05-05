const Course = require('../models/Course');
const Group  = require('../models/Group');
const User   = require('../models/User');

exports.createCourse = async (req, res) => {
  const { title, code, description, department, semester, section } = req.body;

  if (!title || !code) {
    return res.status(400).json({ message: 'title and code are required' });
  }

  const existing = await Course.findOne({ code });
  if (existing) {
    return res.status(409).json({ message: 'Course code already exists' });
  }

  const course = await Course.create({
    title,
    code,
    description,
    department,
    semester,
    section,
    teacher: req.user._id,
  });

  res.status(201).json({ course });
};

exports.getAllCourses = async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.semester)   filter.semester   = req.query.semester;

  const courses = await Course.find(filter)
    .populate('teacher', 'fullName email department')
    .populate('students', 'fullName email');

  res.json({ courses });
};

exports.enrollBulk = async (req, res) => {
  const { courseIds } = req.body;
  if (!Array.isArray(courseIds)) {
    return res.status(400).json({ message: 'courseIds must be an array' });
  }

  const userId     = req.user._id;
  const { department, semester } = req.user;

  for (const courseId of courseIds) {
    const course = await Course.findById(courseId);
    if (!course) continue;

    await Course.updateOne({ _id: courseId }, { $addToSet: { students: userId } });

    await Group.findOneAndUpdate(
      { type: 'course', courseId: course._id },
      {
        $setOnInsert: {
          name:         `${course.code} – ${course.title}`,
          description:  `Chat group for ${course.title}`,
          type:         'course',
          courseId:     course._id,
          department,
          semester,
          autoEnrolled: true,
        },
        $addToSet: { members: userId },
      },
      { upsert: true, new: true }
    );
  }

  await User.findByIdAndUpdate(userId, { coursesSetupDone: true });

  res.json({ message: 'Enrolled successfully' });
};

exports.getCourseById = async (req, res) => {
  const course = await Course.findById(req.params.courseId)
    .populate('teacher', 'fullName email department')
    .populate('students', 'fullName email semester section');

  if (!course) {
    return res.status(404).json({ message: 'Course not found' });
  }

  res.json({ course });
};

exports.enrollInCourse = async (req, res) => {
  const { courseId } = req.body;

  if (!courseId) {
    return res.status(400).json({ message: 'courseId is required' });
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({ message: 'Course not found' });
  }

  const alreadyEnrolled = course.students.some(
    (id) => id.toString() === req.user._id.toString()
  );
  if (alreadyEnrolled) {
    return res.status(409).json({ message: 'Already enrolled in this course' });
  }

  course.students.push(req.user._id);
  await course.save();

  res.json({ message: 'Enrolled successfully', course });
};

exports.getUserCourses = async (req, res) => {
  const { userId } = req.params;

  const courses = await Course.find({ students: userId }).populate(
    'teacher',
    'fullName email'
  );

  res.json({ courses });
};
