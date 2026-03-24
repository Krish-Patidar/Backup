const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    uppercase: true
  },
  description: String,
  categories: [{
    type: String,
    enum: ['road', 'garbage', 'water', 'electricity', 'sanitation', 'public_safety', 'parks', 'other']
  }],
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  totalComplaints: { type: Number, default: 0 },
  resolved: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  inProgress: { type: Number, default: 0 },
  totalExpense: { type: Number, default: 0 },
  avgResolutionTime: { type: Number, default: 0 },
  performanceScore: { type: Number, default: 100 },
  isActive: { type: Boolean, default: true },
  contactEmail: String,
  contactPhone: String,
  headName: String
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
