//server/models/Employee.js

const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  id: Number,
  name: String,
  role: { type: String, enum: ['Employee', 'Supervisor', 'DeptHead', 'HR'] },
  department: String,
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  deptHeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);

