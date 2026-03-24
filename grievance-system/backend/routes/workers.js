const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Complaint = require('../models/Complaint');

router.use(protect);

// Get worker's assigned complaints
router.get('/tasks', async (req, res) => {
  try {
    const complaints = await Complaint.find({ assignedTo: req.user._id })
      .populate('citizenId', 'name email')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Worker updates task progress
router.put('/tasks/:id', async (req, res) => {
  try {
    const { status, workerNotes } = req.body;
    const complaint = await Complaint.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!complaint) return res.status(404).json({ success: false, message: 'Task not found' });
    if (status) complaint.status = status;
    if (workerNotes) complaint.workerNotes = workerNotes;
    await complaint.save();
    res.json({ success: true, complaint, message: 'Task updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
