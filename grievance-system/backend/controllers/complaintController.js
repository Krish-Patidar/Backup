const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const axios = require('axios');
const { sendComplaintSubmittedEmail, sendComplaintCompletedEmail } = require('../utils/email');

// Helper to call AI service
const classifyWithAI = async (description) => {
  try {
    const response = await axios.post(`${process.env.AI_SERVICE_URL}/predict`, {
      text: description
    }, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.log('AI service unavailable, using fallback classification');
    return fallbackClassify(description);
  }
};

const fallbackClassify = (text) => {
  const lower = text.toLowerCase();
  const categories = {
    road: ['road', 'pothole', 'street', 'highway', 'bridge', 'footpath', 'pavement'],
    garbage: ['garbage', 'waste', 'trash', 'dump', 'litter', 'sewage', 'dirty'],
    water: ['water', 'pipe', 'leakage', 'flood', 'drain', 'tap', 'supply'],
    electricity: ['electricity', 'power', 'light', 'electric', 'wire', 'outage', 'pole'],
    sanitation: ['toilet', 'sanitation', 'hygiene', 'clean', 'bathroom', 'latrine'],
    public_safety: ['crime', 'safety', 'accident', 'danger', 'illegal', 'encroachment'],
    parks: ['park', 'garden', 'tree', 'playground', 'greenery', 'bench']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(k => lower.includes(k))) {
      const priority = lower.includes('urgent') || lower.includes('emergency') || lower.includes('danger') ? 'high'
        : lower.includes('minor') || lower.includes('small') ? 'low' : 'medium';
      return { category, priority };
    }
  }
  return { category: 'other', priority: 'medium' };
};

// @desc Create complaint
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, lat, lng, address } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    // AI Classification
    const aiResult = await classifyWithAI(description);

    // Find department based on category
    const department = await Department.findOne({
      categories: { $in: [aiResult.category] },
      isActive: true
    });

    const complaint = await Complaint.create({
      title,
      description,
      image,
      location: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0, address },
      category: aiResult.category,
      priority: aiResult.priority,
      citizenId: req.user._id,
      departmentId: department ? department._id : null,
      aiClassified: true
    });

    // Update department stats
    if (department) {
      await Department.findByIdAndUpdate(department._id, {
        $inc: { totalComplaints: 1, pending: 1 }
      });
    }

    // Send email notification
    try {
      await sendComplaintSubmittedEmail(req.user.email, req.user.name, complaint);
    } catch (emailErr) {
      console.log('Email send failed:', emailErr.message);
    }

    const populated = await Complaint.findById(complaint._id).populate('departmentId', 'name').populate('citizenId', 'name email');

    res.status(201).json({ success: true, complaint: populated, message: 'Complaint submitted successfully' });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all complaints (with filters)
exports.getComplaints = async (req, res) => {
  try {
    const { status, category, priority, departmentId, citizenId, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (req.user.role === 'citizen') filter.citizenId = req.user._id;
    else if (req.user.role === 'department_admin') filter.departmentId = req.user.departmentId;
    else if (req.user.role === 'worker') filter.assignedTo = req.user._id;

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (departmentId && req.user.role === 'cm_admin') filter.departmentId = departmentId;
    if (citizenId) filter.citizenId = citizenId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .populate('citizenId', 'name email')
      .populate('departmentId', 'name code')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      complaints,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get single complaint
exports.getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizenId', 'name email phone')
      .populate('departmentId', 'name code contactEmail')
      .populate('assignedTo', 'name email');

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update complaint status
exports.updateComplaint = async (req, res) => {
  try {
    const { status, assignedTo, expense, workerNotes, adminNotes } = req.body;
    const proofImage = req.file ? `/uploads/${req.file.filename}` : undefined;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const prevStatus = complaint.status;

    if (status) complaint.status = status;
    if (assignedTo) complaint.assignedTo = assignedTo;
    if (expense !== undefined) complaint.expense = expense;
    if (workerNotes) complaint.workerNotes = workerNotes;
    if (adminNotes) complaint.adminNotes = adminNotes;
    if (proofImage) complaint.proofImage = proofImage;

    if (status === 'completed' && prevStatus !== 'completed') {
      complaint.completedAt = new Date();
      const resolutionMs = complaint.completedAt - complaint.createdAt;
      complaint.resolutionTime = Math.round(resolutionMs / (1000 * 60 * 60));

      // Award credits
      if (complaint.isGenuine && !complaint.creditAwarded) {
        complaint.creditAwarded = true;
        await User.findByIdAndUpdate(complaint.citizenId, {
          $inc: { credits: 10 },
          $push: { creditHistory: { amount: 10, reason: `Complaint ${complaint.complaintNumber} resolved` } }
        });
      }

      // Update department stats
      if (complaint.departmentId) {
        await Department.findByIdAndUpdate(complaint.departmentId, {
          $inc: { resolved: 1, pending: -1, totalExpense: expense || 0 }
        });
      }

      // Send completion email
      try {
        const citizen = await User.findById(complaint.citizenId);
        if (citizen) {
          await sendComplaintCompletedEmail(citizen.email, citizen.name, complaint);
        }
      } catch (emailErr) {
        console.log('Email send failed:', emailErr.message);
      }
    }

    if (status === 'in_progress' && prevStatus === 'pending' && complaint.departmentId) {
      await Department.findByIdAndUpdate(complaint.departmentId, {
        $inc: { inProgress: 1, pending: -1 }
      });
    }

    await complaint.save();
    const updated = await Complaint.findById(complaint._id)
      .populate('citizenId', 'name email')
      .populate('departmentId', 'name')
      .populate('assignedTo', 'name email');

    res.json({ success: true, complaint: updated, message: 'Complaint updated successfully' });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get complaint stats for citizen
exports.getCitizenStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const [total, pending, inProgress, completed] = await Promise.all([
      Complaint.countDocuments({ citizenId: userId }),
      Complaint.countDocuments({ citizenId: userId, status: 'pending' }),
      Complaint.countDocuments({ citizenId: userId, status: 'in_progress' }),
      Complaint.countDocuments({ citizenId: userId, status: 'completed' })
    ]);
    const user = await User.findById(userId);
    res.json({ success: true, stats: { total, pending, inProgress, completed, credits: user.credits } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
