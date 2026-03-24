const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      completedComplaints,
      totalCitizens,
      totalDepartments
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'pending' }),
      Complaint.countDocuments({ status: 'in_progress' }),
      Complaint.countDocuments({ status: 'completed' }),
      User.countDocuments({ role: 'citizen' }),
      Department.countDocuments({ isActive: true })
    ]);

    const totalExpense = await Complaint.aggregate([
      { $group: { _id: null, total: { $sum: '$expense' } } }
    ]);

    const completed = await Complaint.find({ status: 'completed', resolutionTime: { $exists: true, $ne: null } });
    const avgResolution = completed.length > 0
      ? completed.reduce((sum, c) => sum + c.resolutionTime, 0) / completed.length
      : 0;

    res.json({
      success: true,
      stats: {
        totalComplaints,
        pendingComplaints,
        inProgressComplaints,
        completedComplaints,
        totalCitizens,
        totalDepartments,
        totalExpense: totalExpense[0]?.total || 0,
        avgResolutionHours: Math.round(avgResolution),
        resolutionRate: totalComplaints > 0 ? Math.round(completedComplaints / totalComplaints * 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDepartmentPerformance = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true });
    const performance = await Promise.all(departments.map(async (dept) => {
      const complaints = await Complaint.find({ departmentId: dept._id });
      const completed = complaints.filter(c => c.status === 'completed');
      const avgTime = completed.length > 0
        ? completed.reduce((sum, c) => sum + (c.resolutionTime || 0), 0) / completed.length
        : 0;
      return {
        id: dept._id,
        name: dept.name,
        code: dept.code,
        total: complaints.length,
        resolved: completed.length,
        pending: complaints.filter(c => c.status === 'pending').length,
        inProgress: complaints.filter(c => c.status === 'in_progress').length,
        resolutionRate: complaints.length > 0 ? Math.round(completed.length / complaints.length * 100) : 0,
        avgResolutionHours: Math.round(avgTime),
        totalExpense: complaints.reduce((sum, c) => sum + (c.expense || 0), 0)
      };
    }));
    res.json({ success: true, performance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategoryDistribution = async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ success: true, distribution: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMonthlyTrends = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trends = await Complaint.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    res.json({ success: true, trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllComplaints = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, departmentId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (departmentId) filter.departmentId = departmentId;

    const total = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .populate('citizenId', 'name email')
      .populate('departmentId', 'name')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({ success: true, complaints, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExpenseReport = async (req, res) => {
  try {
    const report = await Complaint.aggregate([
      { $match: { expense: { $gt: 0 } } },
      {
        $group: {
          _id: '$departmentId',
          totalExpense: { $sum: '$expense' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department'
        }
      },
      { $unwind: { path: '$department', preserveNullAndEmpty: true } }
    ]);
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
