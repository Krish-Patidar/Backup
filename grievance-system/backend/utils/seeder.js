const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 🧹 Clear existing data (IMPORTANT)
    await Promise.all([
      User.deleteMany(),
      Department.deleteMany(),
      Complaint.deleteMany()
    ]);
    console.log('🧹 Cleared existing data');

    // Departments
    const departments = await Department.insertMany([
      { name: 'Roads & Infrastructure', code: 'ROAD', categories: ['road'] },
      { name: 'Sanitation & Waste', code: 'SAN', categories: ['garbage', 'sanitation'] },
      { name: 'Water Supply', code: 'WATER', categories: ['water'] },
      { name: 'Electricity Board', code: 'ELEC', categories: ['electricity'] },
      { name: 'Public Safety', code: 'SAFE', categories: ['public_safety'] },
      { name: 'Parks & Recreation', code: 'PARK', categories: ['parks'] },
    ]);

    console.log('✅ Departments created');

    const password = 'Admin@123'; // auto hashed

    // CM Admin
    await User.create({
      name: 'CM Office Admin',
      email: 'cm@grievance.gov.in',
      password,
      role: 'cm_admin',
      isVerified: true
    });

    // Department Admins
    const deptAdmins = await Promise.all(
      departments.map((dept) =>
        User.create({
          name: `Admin ${dept.name}`,
          email: `admin.${dept.code.toLowerCase()}@grievance.gov.in`,
          password,
          role: 'department_admin',
          departmentId: dept._id,
          isVerified: true
        })
      )
    );

    // Link admin to department
    await Promise.all(
      departments.map((dept, i) =>
        Department.findByIdAndUpdate(dept._id, {
          adminId: deptAdmins[i]._id
        })
      )
    );

    // Workers
    await Promise.all([
      User.create({
        name: 'Worker 1',
        email: 'worker1@grievance.gov.in',
        password,
        role: 'worker',
        departmentId: departments[0]._id,
        isVerified: true
      }),
      User.create({
        name: 'Worker 2',
        email: 'worker2@grievance.gov.in',
        password,
        role: 'worker',
        departmentId: departments[1]._id,
        isVerified: true
      })
    ]);

    // ✅ Citizens WITH password (IMPORTANT FIX)
    await Promise.all([
      User.create({
        name: 'Citizen 1',
        email: 'citizen1@example.com',
        password: 'User@123',
        role: 'citizen',
        isVerified: true
      }),
      User.create({
        name: 'Citizen 2',
        email: 'citizen2@example.com',
        password: 'User@123',
        role: 'citizen',
        isVerified: true
      })
    ]);

    console.log('✅ Users created');

    console.log('\n🎉 SEED COMPLETED SUCCESSFULLY');
    console.log('--------------------------------');
    console.log('CM Admin:    cm@grievance.gov.in / Admin@123');
    console.log('Dept Admin:  admin.road@grievance.gov.in / Admin@123');
    console.log('Worker:      worker1@grievance.gov.in / Admin@123');
    console.log('Citizen:     citizen1@example.com / User@123');
    console.log('--------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seed();