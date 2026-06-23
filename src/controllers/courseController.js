const Course = require('../models/Course');
const Group  = require('../models/Group');
const User   = require('../models/User');

function parseCSVLine(line) {
  const vals = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      vals.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  vals.push(cur.trim());
  return vals;
}

function parseCSV(buffer) {
  const lines = buffer.toString('utf-8')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  }).filter((r) => Object.values(r).some((v) => v));
}

exports.createCourse = async (req, res) => {
  const { title, code, description, department, semester, section, teacher: teacherId } = req.body;

  if (!title || !code) {
    return res.status(400).json({ message: 'title and code are required' });
  }

  const existing = await Course.findOne({ code: code.toUpperCase() });
  if (existing) {
    return res.status(409).json({ message: 'Course code already exists' });
  }

  // Admin can assign any teacher; others default to self
  const teacherRef = (req.user.role === 'admin' && teacherId) ? teacherId : req.user._id;

  const course = await Course.create({
    title, code, description, department, semester, section,
    teacher: teacherRef,
  });

  const populated = await Course.findById(course._id)
    .populate('teacher', 'fullName email department')
    .populate('students', '_id');

  res.status(201).json({ course: populated });
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
  const { department, semester, role } = req.user;
  const isTeacher  = role === 'teacher' || role === 'admin';

  for (const courseId of courseIds) {
    const course = await Course.findById(courseId);
    if (!course) continue;

    // Students are added to Course.students; teachers just join the group chat
    if (!isTeacher) {
      await Course.updateOne({ _id: courseId }, { $addToSet: { students: userId } });
    }

    await Group.findOneAndUpdate(
      { type: 'course', courseId: course._id },
      {
        $setOnInsert: {
          name:         `${course.code} – ${course.title}`,
          description:  `Chat group for ${course.title}`,
          type:         'course',
          courseId:     course._id,
          department:   department || course.department,
          semester:     semester   || course.semester,
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

// PUT /api/courses/:courseId  — admin only
exports.updateCourse = async (req, res) => {
  const { title, code, description, department, semester, section, teacher: teacherId } = req.body;

  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ message: 'Course not found' });

  if (code && code.toUpperCase() !== course.code) {
    const existing = await Course.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(409).json({ message: 'Course code already exists' });
    course.code = code.toUpperCase();
  }

  if (title)                course.title       = title;
  if (description !== undefined) course.description = description;
  if (department  !== undefined) course.department  = department;
  if (semester    !== undefined) course.semester    = semester;
  if (section     !== undefined) course.section     = section;
  if (teacherId)                 course.teacher     = teacherId;

  await course.save();

  const populated = await Course.findById(course._id)
    .populate('teacher', 'fullName email department')
    .populate('students', '_id');

  res.json({ course: populated });
};

// DELETE /api/courses/:courseId  — admin only
exports.deleteCourse = async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.courseId);
  if (!course) return res.status(404).json({ message: 'Course not found' });

  await Group.findOneAndDelete({ type: 'course', courseId: course._id });

  res.json({ message: 'Course deleted successfully' });
};

// POST /api/courses/import-csv  — admin only
exports.importCSV = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No CSV file provided' });

  const rows = parseCSV(req.file.buffer);
  if (rows.length === 0) return res.status(400).json({ message: 'CSV is empty or has no data rows' });

  const created = [];
  const skipped = [];
  const errors  = [];

  for (const row of rows) {
    const { title, code, description, department, semester, section, teacherEmail } = row;
    if (!title || !code) {
      errors.push({ code: code || '?', reason: 'title and code are required' });
      continue;
    }

    // teacherEmail is optional — fall back to the importing admin
    let teacherId = req.user._id;
    if (teacherEmail && teacherEmail.trim()) {
      const teacher = await User.findOne({ email: teacherEmail.trim().toLowerCase(), role: { $in: ['teacher', 'admin'] } }).select('_id');
      if (teacher) {
        teacherId = teacher._id;
      }
      // if not found, silently fall back to the admin and continue importing
    }

    const exists = await Course.findOne({ code: code.toUpperCase() });
    if (exists) { skipped.push(code.toUpperCase()); continue; }
    try {
      const course = await Course.create({
        title, code, description: description || undefined,
        department: department || undefined,
        semester:   semester   || undefined,
        section:    section    || undefined,
        teacher: teacherId,
      });
      created.push(course);
    } catch (err) {
      errors.push({ code, reason: err.message });
    }
  }

  res.json({ imported: created.length, skipped: skipped.length, errors: errors.length, errorDetails: errors });
};
