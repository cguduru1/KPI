//server/services/analyticsService.js
function analyzeKPIs(kpis) {
  const total = kpis.length;
  const approved = kpis.filter(k => k.status === 'DeptHeadApproved').length;
  const rejected = kpis.filter(k => k.status === 'Rejected').length;

  return {
    total,
    approved,
    rejected,
    approvalRate: total ? (approved / total * 100).toFixed(2) + '%' : '0%'
  };
}

module.exports = { analyzeKPIs };
