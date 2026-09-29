//server/models/KPI.js

const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deptHeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  description: String,
  target: String,
  timeline: String,
  department: String,
  year: { type: Number, required: true },
  archived: { type: Boolean, default: false },
  status: { type: String, enum: ['Submitted', 'SupervisorApproved', 'DeptHeadApproved', 'Rejected','Closed'], default: 'Submitted' },
  approvals: [
    {
      role: { type: String, enum: ['Employee', 'Supervisor', 'DeptHead', 'HR'] },
      approved: Boolean,
      date: Date,
      comments: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('KPI', kpiSchema);

