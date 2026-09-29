//server/services/pdfService.js

const PDFDocument = require('pdfkit');
const fs = require('fs');

function generateKPIReport(kpi, review) {
  const doc = new PDFDocument();
  const filePath = `reports/${kpi._id}.pdf`;
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(20).text(`KPI Report: ${kpi.title}`);
  doc.text(`Status: ${kpi.status}`);
  doc.text(`Supervisor Rating: ${review.supervisorRating || 'N/A'}`);
  doc.text(`Dept Head Rating: ${review.deptHeadRating || 'N/A'}`);
  doc.text(`Employee Response: ${review.employeeResponse}`);
  doc.end();

  return filePath;
}

module.exports = { generateKPIReport };

