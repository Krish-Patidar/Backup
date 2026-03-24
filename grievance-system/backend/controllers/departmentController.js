const Department = require('../models/Department');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).populate('adminId', 'name email');
    res.json({ success: true, departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id).populate('adminId', 'name email');
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, department: dept });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json({ success: true, department: dept });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, department: dept });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDepartmentWorkers = async (req, res) => {
  try {
    const deptId = req.params.id || req.user.departmentId;
    const workers = await User.find({ departmentId: deptId, role: 'worker', isActive: true }).select('-password');
    res.json({ success: true, workers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const deptId = req.params.id || req.user.departmentId;
    const complaints = await Complaint.find({ departmentId: deptId });

    const byStatus = complaints.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    const byCategory = complaints.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {});

    const byPriority = complaints.reduce((acc, c) => {
      acc[c.priority] = (acc[c.priority] || 0) + 1;
      return acc;
    }, {});

    const completed = complaints.filter(c => c.status === 'completed');
    const avgResolution = completed.length > 0
      ? completed.reduce((sum, c) => sum + (c.resolutionTime || 0), 0) / completed.length
      : 0;

    const totalExpense = complaints.reduce((sum, c) => sum + (c.expense || 0), 0);

    res.json({
      success: true,
      analytics: {
        total: complaints.length,
        byStatus,
        byCategory,
        byPriority,
        avgResolutionHours: Math.round(avgResolution),
        totalExpense,
        resolutionRate: complaints.length > 0 ? Math.round((byStatus.completed || 0) / complaints.length * 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
