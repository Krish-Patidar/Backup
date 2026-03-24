const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Department = require('../models/Department');

const addWorkers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const departments = await Department.find();

    if (!departments.length) {
      console.log('❌ No departments found. Seed departments first.');
      process.exit(1);
    }

    const workerData = [
      { name: 'Road Worker 2', email: 'roadworker2@grievance.gov.in', deptCode: 'ROAD' },
      { name: 'Sanitation Worker 2', email: 'sanworker2@grievance.gov.in', deptCode: 'SAN' },
      { name: 'Water Worker 1', email: 'waterworker1@grievance.gov.in', deptCode: 'WATER' },
      { name: 'Electric Worker 1', email: 'electricworker1@grievance.gov.in', deptCode: 'ELEC' },
      { name: 'Safety Worker 1', email: 'safetyworker1@grievance.gov.in', deptCode: 'SAFE' },
      { name: 'Park Worker 1', email: 'parkworker1@grievance.gov.in', deptCode: 'PARK' }
    ];

    for (const worker of workerData) {
      const dept = departments.find(d => d.code === worker.deptCode);
      if (!dept) {
        console.log(`⚠️ Department not found for ${worker.name}`);
        continue;
      }

      const existing = await User.findOne({ email: worker.email });
      if (existing) {
        console.log(`⏭️ Worker already exists: ${worker.email}`);
        continue;
      }

      await User.create({
        name: worker.name,
        email: worker.email,
        password: 'Admin@123',
        role: 'worker',
        departmentId: dept._id,
        isVerified: true
      });

      console.log(`✅ Added worker: ${worker.email}`);
    }

    console.log('\n🎉 Workers added without deleting old data');
    process.exit(0);
  } catch (err) {
    console.error('❌ Add workers error:', err);
    process.exit(1);
  }
};

addWorkers();