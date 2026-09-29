const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  kpiId: { type: mongoose.Schema.Types.ObjectId, ref: 'KPI', index: true }, // index for KPI lookups
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // index for user lookups
  role: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true }, // index for date range queries and sorting
  details: { type: String }
});

// Compound index for common queries: filter by KPI and sort by timestamp
auditLogSchema.index({ kpiId: 1, timestamp: -1 });

// Compound index for user queries: filter by performedBy and sort by timestamp
auditLogSchema.index({ performedBy: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
