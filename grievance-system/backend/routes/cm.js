const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getDepartmentPerformance,
  getCategoryDistribution,
  getMonthlyTrends,
  getAllComplaints,
  getExpenseReport,
  exportExcelReport
} = require('../controllers/cmController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('cm_admin'));

router.get('/stats', getDashboardStats);
router.get('/department-performance', getDepartmentPerformance);
router.get('/category-distribution', getCategoryDistribution);
router.get('/monthly-trends', getMonthlyTrends);
router.get('/complaints', getAllComplaints);
router.get('/expense-report', getExpenseReport);
router.get('/export-excel', exportExcelReport);

module.exports = router;