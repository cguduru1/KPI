//server/models/PerformanceReview.js

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  kpiId: { type: mongoose.Schema.Types.ObjectId, ref: 'KPI' },
  supervisorRating: Number,
  deptHeadRating: Number,
  employeeResponse: { type: String, enum: ['Accepted', 'Rejected', 'Pending'], default: 'Pending' },
  forcedAcceptance: { type: Boolean, default: false },
  comments: String
}, { timestamps: true });

module.exports = mongoose.model('PerformanceReview', reviewSchema);

