const Department = require('../models/Department');

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

exports.getPublicDepartments = async (req, res) => {
  const departments = await Department.find({}, 'name code').sort({ name: 1 });
  res.json({ departments });
};

exports.createDepartment = async (req, res) => {
  const { name, code, description, head } = req.body;

  if (!name || !code) {
    return res.status(400).json({ message: 'name and code are required' });
  }

  const existing = await Department.findOne({ code: code.toUpperCase() });
  if (existing) {
    return res.status(409).json({ message: 'Department code already exists' });
  }

  const department = await Department.create({ name, code, description, head });

  res.status(201).json({ department });
};

exports.getAllDepartments = async (req, res) => {
  const departments = await Department.find().populate('head');
  res.json({ departments });
};

exports.getDepartmentById = async (req, res) => {
  const department = await Department.findById(req.params.departmentId).populate(
    'head',
    'fullName email'
  );

  if (!department) {
    return res.status(404).json({ message: 'Department not found' });
  }

  res.json({ department });
};

exports.updateDepartment = async (req, res) => {
  const { name, code, description, head } = req.body;

  const department = await Department.findById(req.params.departmentId);

  if (!department) {
    return res.status(404).json({ message: 'Department not found' });
  }

  if (code && code.toUpperCase() !== department.code) {
    const existing = await Department.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({ message: 'Department code already exists' });
    }
    department.code = code.toUpperCase();
  }

  if (name) department.name = name;
  if (description !== undefined) department.description = description;
  if (head) department.head = head;

  await department.save();

  res.json({ department });
};

exports.deleteDepartment = async (req, res) => {
  const department = await Department.findByIdAndDelete(req.params.departmentId);
  if (!department) return res.status(404).json({ message: 'Department not found' });
  res.json({ message: 'Department deleted successfully' });
};

exports.importCSV = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No CSV file provided' });

  const rows = parseCSV(req.file.buffer);
  if (rows.length === 0) return res.status(400).json({ message: 'CSV is empty or has no data rows' });

  const created = [];
  const skipped = [];
  const errors  = [];

  for (const row of rows) {
    const { name, code, description } = row;
    if (!name || !code) {
      errors.push({ code: code || '?', reason: 'name and code are required' });
      continue;
    }
    const exists = await Department.findOne({ code: code.toUpperCase() });
    if (exists) { skipped.push(code.toUpperCase()); continue; }
    try {
      const dept = await Department.create({ name, code, description: description || undefined });
      created.push(dept);
    } catch (err) {
      errors.push({ code, reason: err.message });
    }
  }

  res.json({ imported: created.length, skipped: skipped.length, errors: errors.length, errorDetails: errors });
};
