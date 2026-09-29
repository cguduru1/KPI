// server/seed.js
const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const User = require('./models/User');
const KPI = require('./models/KPI');
const PerformanceReview = require('./models/PerformanceReview');
require('dotenv').config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kpi-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await Employee.deleteMany({});
    await KPI.deleteMany({});
    await PerformanceReview.deleteMany({});
    await User.deleteMany({});

    // Create sample employees with reporting chain
    const hr = await Employee.create({ name: 'HR', role: 'HR', department: 'HR' });
    const supervisor1 = await Employee.create({ name: 'supervisor1', role: 'Supervisor', department: 'Sales' });
    const deptHead1 = await Employee.create({ name: 'depthead1', role: 'DeptHead', department: 'Sales' });
    const supervisor2 = await Employee.create({ name: 'supervisor2', role: 'Supervisor', department: 'Marketing' });
    const deptHead2 = await Employee.create({ name: 'depthead2', role: 'DeptHead', department: 'Marketing' });

    const emp1 = await Employee.create({
      name: 'employee1',
      role: 'Employee',
      department: 'Sales',
      supervisorId: supervisor1._id,
      deptHeadId: deptHead1._id
    });

    const emp2 = await Employee.create({
      name: 'employee2',
      role: 'Employee',
      department: 'Marketing',
      supervisorId: supervisor2._id,
      deptHeadId: deptHead2._id
    });

    // Create sample users (passwords will be hashed by pre-save hook)
    await User.create([
      { name: 'HR', email: 'hr@example.com', password: 'psft123', role: 'HR', department: 'HR' },
      { name: 'supervisor1', email: 'supervisor1@example.com', password: 'psft123', role: 'Supervisor', department: 'Sales' },
      { name: 'depthead1', email: 'depthead1@example.com', password: 'psft123', role: 'DeptHead', department: 'Sales' },
      { name: 'supervisor2', email: 'supervisor2@example.com', password: 'psft123', role: 'Supervisor', department: 'Marketing' },
      { name: 'depthead2', email: 'depthead2@example.com', password: 'psft123', role: 'DeptHead', department: 'Marketing' },
      { name: 'employee1', email: 'employee1@example.com', password: 'psft123', role: 'Employee', department: 'Sales' },
      { name: 'employee2', email: 'employee2@example.com', password: 'psft123', role: 'Employee', department: 'Marketing' }
    ]);

    // Create sample KPIs
    await KPI.create([
      {
        employeeId: emp1._id,
        supervisorId: supervisor1._id,
        deptHeadId: deptHead1._id,
        title: 'Increase Sales',
        description: 'Increase overall company sales by 10%',
        target: 'Improve sales performance',
        timeline: 'Achieve by Q1',
        department: 'Sales',
        year: '2026',
        status: 'Submitted'
      },
      {
        employeeId: emp2._id,
        supervisorId: supervisor2._id,
        deptHeadId: deptHead2._id,
        title: 'Customer Satisfaction',
        description: 'Achieve 90% positive feedback',
        target: 'Customer satisfaction rate',
        timeline: 'Achieve by Q3',
        department: 'Marketing',
        year: '2026',
        status: 'SupervisorApproved',
        approvals: [{ role: 'Supervisor', approved: true, date: new Date(), comments: 'Looks good' }]
      },
      {
        employeeId: emp1._id,
        supervisorId: supervisor1._id,
        deptHeadId: deptHead1._id,
        title: 'Reduce Support Tickets',
        description: 'Lower ticket volume by 15%',
        target: 'Reduce tickets',
        timeline: 'Achieve by Q4',
        department: 'Sales',
        year: '2026',
        status: 'DeptHeadApproved',
        approvals: [
          { role: 'Supervisor', approved: true, date: new Date(), comments: 'Approved' },
          { role: 'DeptHead', approved: true, date: new Date(), comments: 'Approved by Dept Head' }
        ]
      },
      {
        employeeId: emp2._id,
        supervisorId: supervisor2._id,
        deptHeadId: deptHead2._id,
        title: 'Increase Marketing Throughput',
        description: 'Increase marketing strategy by 10%',
        target: 'Improve marketing performance',
        timeline: 'Achieve by Q1',
        department: 'Marketing',
        year: '2026',
        status: 'Submitted'
      }
    ]);

    console.log('Seed data inserted successfully');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
