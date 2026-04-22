const Department = require('../models/Department');

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
  if (description) department.description = description;
  if (head) department.head = head;

  await department.save();

  res.json({ department });
}
