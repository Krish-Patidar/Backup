const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const ExcelJS = require('exceljs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

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

exports.exportExcelReport = async (req, res) => {
  try {
    const [
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      completedComplaints,
      totalCitizens,
      totalDepartments,
      complaints,
      departments,
      categoryDistribution,
      monthlyTrends
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'pending' }),
      Complaint.countDocuments({ status: 'in_progress' }),
      Complaint.countDocuments({ status: 'completed' }),
      User.countDocuments({ role: 'citizen' }),
      Department.countDocuments({ isActive: true }),
      Complaint.find({})
        .populate('citizenId', 'name email')
        .populate('departmentId', 'name code')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 }),
      Department.find({ isActive: true }),
      Complaint.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      (() => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return Complaint.aggregate([
          { $match: { createdAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              total: { $sum: 1 },
              resolved: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
                }
              }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
      })()
    ]);

    const totalExpenseAgg = await Complaint.aggregate([
      { $group: { _id: null, total: { $sum: '$expense' } } }
    ]);
    const totalExpense = totalExpenseAgg[0]?.total || 0;

    const completed = complaints.filter(
      (c) => c.status === 'completed' && c.resolutionTime !== null && c.resolutionTime !== undefined
    );

    const avgResolutionHours =
      completed.length > 0
        ? Math.round(
            completed.reduce((sum, c) => sum + (c.resolutionTime || 0), 0) / completed.length
          )
        : 0;

    const resolutionRate =
      totalComplaints > 0
        ? Math.round((completedComplaints / totalComplaints) * 100)
        : 0;

    const departmentPerformance = await Promise.all(
      departments.map(async (dept) => {
        const deptComplaints = complaints.filter(
          (c) => c.departmentId && String(c.departmentId._id) === String(dept._id)
        );
        const deptCompleted = deptComplaints.filter((c) => c.status === 'completed');
        const avgTime =
          deptCompleted.length > 0
            ? Math.round(
                deptCompleted.reduce((sum, c) => sum + (c.resolutionTime || 0), 0) /
                  deptCompleted.length
              )
            : 0;

        return {
          name: dept.name,
          code: dept.code,
          total: deptComplaints.length,
          resolved: deptCompleted.length,
          pending: deptComplaints.filter((c) => c.status === 'pending').length,
          inProgress: deptComplaints.filter((c) => c.status === 'in_progress').length,
          resolutionRate:
            deptComplaints.length > 0
              ? Math.round((deptCompleted.length / deptComplaints.length) * 100)
              : 0,
          avgResolutionHours: avgTime,
          totalExpense: deptComplaints.reduce((sum, c) => sum + (c.expense || 0), 0)
        };
      })
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NagarSeva';
    workbook.created = new Date();

    // ================= Summary =================
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    summarySheet.addRows([
      { metric: 'Total Complaints', value: totalComplaints },
      { metric: 'Resolved Complaints', value: completedComplaints },
      { metric: 'Pending Complaints', value: pendingComplaints },
      { metric: 'In Progress Complaints', value: inProgressComplaints },
      { metric: 'Total Citizens', value: totalCitizens },
      { metric: 'Total Departments', value: totalDepartments },
      { metric: 'Total Expense', value: totalExpense },
      { metric: 'Average Resolution Hours', value: avgResolutionHours },
      { metric: 'Resolution Rate (%)', value: resolutionRate }
    ]);

    // ================= All Complaints =================
    const complaintsSheet = workbook.addWorksheet('All Complaints');
    complaintsSheet.columns = [
      { header: 'Complaint No', key: 'complaintNumber', width: 18 },
      { header: 'Title', key: 'title', width: 35 },
      { header: 'Description', key: 'description', width: 45 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Citizen Name', key: 'citizenName', width: 22 },
      { header: 'Citizen Email', key: 'citizenEmail', width: 28 },
      { header: 'Assigned Worker', key: 'assignedWorker', width: 22 },
      { header: 'Address', key: 'address', width: 35 },
      { header: 'Latitude', key: 'lat', width: 12 },
      { header: 'Longitude', key: 'lng', width: 12 },
      { header: 'Expense', key: 'expense', width: 12 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Completed At', key: 'completedAt', width: 22 },
      { header: 'Resolution Time (hrs)', key: 'resolutionTime', width: 20 }
    ];

    complaints.forEach((c) => {
      complaintsSheet.addRow({
        complaintNumber: c.complaintNumber || '',
        title: c.title || '',
        description: c.description || '',
        category: c.category || '',
        priority: c.priority || '',
        status: c.status || '',
        department: c.departmentId?.name || '',
        citizenName: c.citizenId?.name || '',
        citizenEmail: c.citizenId?.email || '',
        assignedWorker: c.assignedTo?.name || '',
        address: c.location?.address || '',
        lat: c.location?.lat ?? '',
        lng: c.location?.lng ?? '',
        expense: c.expense || 0,
        createdAt: c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
        completedAt: c.completedAt ? new Date(c.completedAt).toLocaleString() : '',
        resolutionTime: c.resolutionTime ?? ''
      });
    });

    // ================= Department Performance =================
    const deptSheet = workbook.addWorksheet('Department Performance');
    deptSheet.columns = [
      { header: 'Department', key: 'name', width: 28 },
      { header: 'Code', key: 'code', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Resolved', key: 'resolved', width: 12 },
      { header: 'Pending', key: 'pending', width: 12 },
      { header: 'In Progress', key: 'inProgress', width: 14 },
      { header: 'Resolution Rate (%)', key: 'resolutionRate', width: 18 },
      { header: 'Avg Resolution Hours', key: 'avgResolutionHours', width: 20 },
      { header: 'Total Expense', key: 'totalExpense', width: 16 }
    ];
    deptSheet.addRows(departmentPerformance);

    // ================= Category Distribution =================
    const categorySheet = workbook.addWorksheet('Category Distribution');
    categorySheet.columns = [
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Count', key: 'count', width: 12 }
    ];
    categoryDistribution.forEach((item) => {
      categorySheet.addRow({
        category: item._id || 'Unknown',
        count: item.count || 0
      });
    });

    // ================= Monthly Trends =================
    const trendsSheet = workbook.addWorksheet('Monthly Trends');
    trendsSheet.columns = [
      { header: 'Month', key: 'month', width: 16 },
      { header: 'Total Complaints', key: 'total', width: 18 },
      { header: 'Resolved Complaints', key: 'resolved', width: 20 }
    ];
    monthlyTrends.forEach((item) => {
      trendsSheet.addRow({
        month: `${item._id.month}/${item._id.year}`,
        total: item.total || 0,
        resolved: item.resolved || 0
      });
    });

    // ================= Map Coordinates =================
    const coordinatesSheet = workbook.addWorksheet('Complaint Map Coordinates');
    coordinatesSheet.columns = [
      { header: 'Complaint No', key: 'complaintNumber', width: 18 },
      { header: 'Title', key: 'title', width: 35 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Address', key: 'address', width: 35 },
      { header: 'Latitude', key: 'lat', width: 15 },
      { header: 'Longitude', key: 'lng', width: 15 }
    ];

    complaints.forEach((c) => {
      coordinatesSheet.addRow({
        complaintNumber: c.complaintNumber || '',
        title: c.title || '',
        status: c.status || '',
        category: c.category || '',
        priority: c.priority || '',
        department: c.departmentId?.name || '',
        address: c.location?.address || '',
        lat: c.location?.lat ?? '',
        lng: c.location?.lng ?? ''
      });
    });

    // ================= Charts Sheet =================
    const chartsSheet = workbook.addWorksheet('Charts');

    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 1000,
      height: 500,
      backgroundColour: 'white'
    });

    // Chart 1: Category Distribution
    const categoryLabels = categoryDistribution.map((x) => x._id || 'Unknown');
    const categoryCounts = categoryDistribution.map((x) => x.count || 0);

    const categoryChartBuffer = await chartJSNodeCanvas.renderToBuffer({
      type: 'bar',
      data: {
        labels: categoryLabels,
        datasets: [
          {
            label: 'Complaints by Category',
            data: categoryCounts,
            backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6']
          }
        ]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Category Distribution'
          },
          legend: {
            display: false
          }
        }
      }
    });

    const categoryChartId = workbook.addImage({
      buffer: categoryChartBuffer,
      extension: 'png'
    });

    chartsSheet.addImage(categoryChartId, {
      tl: { col: 0, row: 0 },
      ext: { width: 800, height: 350 }
    });

    // Chart 2: Monthly Trends
    const trendLabels = monthlyTrends.map((x) => `${x._id.month}/${x._id.year}`);
    const trendTotal = monthlyTrends.map((x) => x.total || 0);
    const trendResolved = monthlyTrends.map((x) => x.resolved || 0);

    const trendsChartBuffer = await chartJSNodeCanvas.renderToBuffer({
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [
          {
            label: 'Total',
            data: trendTotal,
            borderColor: '#6366f1',
            backgroundColor: '#6366f1',
            tension: 0.3
          },
          {
            label: 'Resolved',
            data: trendResolved,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Monthly Complaint Trends'
          }
        }
      }
    });

    const trendsChartId = workbook.addImage({
      buffer: trendsChartBuffer,
      extension: 'png'
    });

    chartsSheet.addImage(trendsChartId, {
      tl: { col: 0, row: 20 },
      ext: { width: 800, height: 350 }
    });

    // Header styling
    workbook.eachSheet((sheet) => {
      const row = sheet.getRow(1);
      row.font = { bold: true, color: { argb: '1F2937' } };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'DDEBF7' }
      };
      row.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const fileName = `CM_Dashboard_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};