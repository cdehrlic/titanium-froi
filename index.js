const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

const CONFIG = {
  CLAIMS_EMAIL: 'Chad@Titaniumdg.com',
  SMTP: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  }
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024, files: 20 } });

const transporter = nodemailer.createTransport(CONFIG.SMTP);

function generateClaimPDF(formData) {
  return new Promise(function(resolve, reject) {
    var doc = new PDFDocument({ margin: 50 });
    var chunks = [];
    doc.on('data', function(chunk) { chunks.push(chunk); });
    doc.on('end', function() { resolve(Buffer.concat(chunks)); });
    doc.on('error', reject);
    doc.fontSize(20).font('Helvetica-Bold').text('TITANIUM DEFENSE GROUP', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('First Report of Work-Related Injury/Illness', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text('Generated: ' + new Date().toLocaleString(), { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica-Bold').text('Employee: ' + (formData.firstName || '') + ' ' + (formData.lastName || ''));
    doc.fontSize(10).font('Helvetica');
    doc.text('Date of Injury: ' + (formData.dateOfInjury || 'N/A'));
    doc.text('Nature of Injury: ' + (formData.natureOfInjury || 'N/A'));
    doc.text('Body Part Injured: ' + (formData.bodyPartInjured || 'N/A'));
    doc.text('Cause: ' + (formData.causeOfInjury || 'N/A'));
    doc.moveDown();
    doc.text('Description: ' + (formData.accidentDescription || 'N/A'));
    doc.end();
  });
}

function generateReferenceNumber() {
  var date = new Date();
  var y = date.getFullYear().toString().slice(-2);
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  var r = Math.random().toString(36).substring(2, 6).toUpperCase();
  return 'TDG-' + y + m + d + '-' + r;
}

app.post('/submit-claim', upload.array('files', 20), async function(req, res) {
  try {
    var formData = JSON.parse(req.body.formData);
    var referenceNumber = generateReferenceNumber();
    var pdfBuffer = await generateClaimPDF(formData);
    var attachments = [{ filename: 'FROI_' + referenceNumber + '.pdf', content: pdfBuffer }];
    if (req.files) {
      req.files.forEach(function(file) {
        attachments.push({ filename: file.originalname, content: file.buffer });
      });
    }
    var emailHtml = '<h2>New Workers Compensation Claim</h2>';
    emailHtml += '<p><strong>Reference:</strong> ' + referenceNumber + '</p>';
    emailHtml += '<p><strong>Employee:</strong> ' + (formData.firstName || '') + ' ' + (formData.lastName || '') + '</p>';
    emailHtml += '<p><strong>Date of Injury:</strong> ' + (formData.dateOfInjury || 'N/A') + '</p>';
    emailHtml += '<p><strong>Nature:</strong> ' + (formData.natureOfInjury || 'N/A') + '</p>';
    emailHtml += '<p><strong>Body Part:</strong> ' + (formData.bodyPartInjured || 'N/A') + '</p>';
    emailHtml += '<p><strong>Cause:</strong> ' + (formData.causeOfInjury || 'N/A') + '</p>';
    emailHtml += '<p><strong>Description:</strong> ' + (formData.accidentDescription || 'N/A') + '</p>';
    emailHtml += '<p><strong>Submitted by:</strong> ' + (formData.submitterName || 'N/A') + ' (' + (formData.submitterEmail || 'N/A') + ')</p>';
    await transporter.sendMail({
      from: CONFIG.SMTP.auth.user,
      to: CONFIG.CLAIMS_EMAIL,
      subject: 'New WC Claim: ' + (formData.firstName || '') + ' ' + (formData.lastName || '') + ' - ' + referenceNumber,
      html: emailHtml,
      attachments: attachments
    });
    if (formData.submitterEmail) {
      await transporter.sendMail({
        from: CONFIG.SMTP.auth.user,
        to: formData.submitterEmail,
        subject: 'Claim Confirmation - ' + referenceNumber,
        html: '<h2>Claim Submitted</h2><p>Reference: ' + referenceNumber + '</p><p>Employee: ' + (formData.firstName || '') + ' ' + (formData.lastName || '') + '</p>'
      });
    }
    res.json({ success: true, referenceNumber: referenceNumber });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

var HTML = '<!DOCTYPE html>\
<html lang="en">\
<head>\
<meta charset="UTF-8">\
<meta name="viewport" content="width=device-width, initial-scale=1.0">\
<title>Titanium Defense Group - WC Claims Portal</title>\
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\
<script src="https://cdn.tailwindcss.com"><\/script>\
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"><\/script>\
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>\
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>\
<script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"><\/script>\
<style>\
body { font-family: "Inter", sans-serif; }\
.tab-active { background: #334155; color: white; }\
.tab-inactive { background: #e2e8f0; color: #475569; }\
</style>\
</head>\
<body class="bg-slate-100 min-h-screen">\
<header class="bg-slate-700 text-white p-4">\
<div class="max-w-6xl mx-auto flex justify-between items-center">\
<img src="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Titanium%20logo.webp" alt="Logo" class="h-20">\
<div class="text-center text-lg font-bold">Report a Workers<br>Compensation Claim</div>\
</div>\
</header>\
<div class="max-w-6xl mx-auto p-4">\
<div class="flex gap-2 mb-4 flex-wrap">\
<button type="button" id="tab-forms" class="px-6 py-3 rounded-t-lg font-semibold tab-active">Download Forms</button>\
<button type="button" id="tab-claim" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">Submit a Claim</button>\
<button type="button" id="tab-analytics" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">Loss Run Analytics</button>\
<button type="button" id="tab-c240" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">C-240 Form</button>\
</div>\
<div id="section-forms" class="bg-white rounded-xl shadow p-6">\
<h3 class="text-xl font-bold text-slate-700 mb-4">Downloadable Forms</h3>\
<div class="flex gap-4 flex-wrap">\
<a href="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Employee%20Incident%20Report_Titanium_2026.pdf" target="_blank" class="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800">Employee Incident Report</a>\
<a href="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Witness%20Statement%20Form_Titanium_2026.pdf" target="_blank" class="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800">Witness Statement Form</a>\
</div>\
</div>\
<div id="section-claim" class="bg-white rounded-xl shadow p-6 hidden">\
<div id="form-container"></div>\
</div>\
<div id="section-analytics" class="hidden">\
<div class="bg-white rounded-xl shadow p-6 mb-4">\
<h3 class="text-xl font-bold text-slate-700 mb-2">Loss Run Analytics</h3>\
<p class="text-slate-600 mb-4">Upload your loss run Excel file to get insights and recommendations.</p>\
<div class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">\
<p class="text-lg font-medium text-slate-700 mb-2">Drop your Loss Run Excel file here</p>\
<input type="file" id="lossRunFile" accept=".xlsx,.xls,.csv" class="hidden">\
<button type="button" id="btn-upload-loss" class="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800">Select Excel File</button>\
</div>\
</div>\
<div id="analytics-results" class="hidden">\
<div class="bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl shadow-lg p-6 mb-4">\
<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold text-white">Executive Summary</h3><button type="button" id="btn-pdf-report" class="px-4 py-2 bg-white text-slate-800 rounded-lg text-sm font-medium">Download PDF Report</button></div>\
<div class="grid grid-cols-2 md:grid-cols-4 gap-4">\
<div class="bg-white/10 rounded-lg p-4 text-center"><div class="text-3xl font-bold text-white" id="stat-total-claims">0</div><div class="text-slate-300">Total Claims</div></div>\
<div class="bg-white/10 rounded-lg p-4 text-center"><div class="text-3xl font-bold text-white" id="stat-total-incurred">$0</div><div class="text-slate-300">Total Incurred</div></div>\
<div class="bg-white/10 rounded-lg p-4 text-center"><div class="text-3xl font-bold text-white" id="stat-avg-claim">$0</div><div class="text-slate-300">Avg Cost/Claim</div></div>\
<div class="bg-white/10 rounded-lg p-4 text-center"><div class="text-3xl font-bold text-white" id="stat-open-claims">0</div><div class="text-slate-300">Open Claims</div></div>\
</div>\
</div>\
<div class="bg-white rounded-xl shadow p-6 mb-4"><h4 class="font-bold text-slate-700 mb-4">Cost Breakdown by Accident Year</h4><div id="cost-breakdown"></div></div>\
<div class="grid md:grid-cols-2 gap-4 mb-4">\
<div class="bg-white rounded-xl shadow p-6"><h4 class="font-bold text-slate-700 mb-4">Claim Status</h4><canvas id="statusChart"></canvas></div>\
<div class="bg-white rounded-xl shadow p-6"><h4 class="font-bold text-slate-700 mb-4">Top Injury Types</h4><canvas id="injuryChart"></canvas></div>\
</div>\
<div class="grid md:grid-cols-2 gap-4 mb-4">\
<div class="bg-white rounded-xl shadow p-6"><h4 class="font-bold text-slate-700 mb-4">Body Parts Affected</h4><canvas id="bodyPartChart"></canvas></div>\
<div class="bg-white rounded-xl shadow p-6"><h4 class="font-bold text-slate-700 mb-4">Root Cause Analysis</h4><canvas id="causeChart"></canvas></div>\
</div>\
<div class="bg-white rounded-xl shadow p-6 mb-4"><h4 class="font-bold text-slate-700 mb-4">Claims Detail</h4><div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-100"><tr><th class="px-4 py-3 text-left">Date</th><th class="px-4 py-3 text-left">Claimant</th><th class="px-4 py-3 text-left">Injury</th><th class="px-4 py-3 text-left">Body Part</th><th class="px-4 py-3 text-left">Status</th><th class="px-4 py-3 text-right">Total Incurred</th></tr></thead><tbody id="claims-table-body"></tbody></table></div></div>\
<div class="bg-white rounded-xl shadow p-6 mb-4"><h4 class="font-bold text-slate-700 mb-4">Top 5 Highest Cost Claims</h4><div id="top-claims"></div></div>\
<div class="bg-gradient-to-r from-green-600 to-green-500 rounded-xl shadow p-6"><h4 class="font-bold text-white mb-4">Prevention Recommendations</h4><div id="recommendations" class="text-white"></div></div>\
</div>\
</div>\
<div id="section-c240" class="hidden">\
<div class="bg-white rounded-xl shadow p-6 mb-4">\
<h3 class="text-xl font-bold text-slate-700 mb-2">C-240 Form - Wage Statement</h3>\
<p class="text-slate-600 mb-4">Upload payroll data to auto-populate the 52-week payroll table (Page 2).</p>\
<div class="grid lg:grid-cols-2 gap-6">\
<div class="space-y-4">\
<h4 class="font-bold text-slate-700 border-b pb-2">Injured Worker Info</h4>\
<div class="grid grid-cols-2 gap-3">\
<div><label class="block text-xs font-medium text-slate-600 mb-1">Worker Name</label><input type="text" id="c240-workerName" placeholder="Last, First MI" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"></div>\
<div><label class="block text-xs font-medium text-slate-600 mb-1">Date of Injury</label><input type="date" id="c240-injuryDate" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"></div>\
</div>\
<div><label class="block text-xs font-medium text-slate-600 mb-1">WCB Case #</label><input type="text" id="c240-wcbCase" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"></div>\
<h4 class="font-bold text-slate-700 border-b pb-2 pt-4">Upload Payroll</h4>\
<div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">\
<p class="text-slate-700 font-medium mb-2">Upload Payroll File</p>\
<p class="text-slate-500 text-sm mb-3">Excel (.xlsx, .xls, .csv)</p>\
<input type="file" id="c240-payrollFile" accept=".xlsx,.xls,.csv" class="hidden">\
<button type="button" id="btn-upload-payroll" class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm">Select File</button>\
</div>\
<div id="c240-fileStatus" class="hidden p-3 bg-green-50 border border-green-200 rounded-lg"><p class="text-green-800 text-sm font-medium"><span id="c240-fileName"></span> loaded</p></div>\
</div>\
<div class="space-y-4">\
<h4 class="font-bold text-slate-700 border-b pb-2">Payroll Summary</h4>\
<div id="c240-payrollSummary" class="bg-slate-50 rounded-lg p-4 text-sm"><p class="text-slate-500">No payroll data loaded.</p></div>\
</div>\
</div>\
</div>\
<div id="c240-payrollPreview" class="bg-white rounded-xl shadow p-6 mb-4 hidden">\
<h4 class="font-bold text-slate-700 mb-4">Payroll Preview (52 Weeks)</h4>\
<div class="overflow-x-auto max-h-96"><table class="w-full text-sm border"><thead class="bg-slate-100 sticky top-0"><tr><th class="px-3 py-2 text-left border">Week #</th><th class="px-3 py-2 text-left border">Week Ending</th><th class="px-3 py-2 text-center border">Days Paid</th><th class="px-3 py-2 text-right border">Gross Amount</th></tr></thead><tbody id="c240-payrollTableBody"></tbody><tfoot class="bg-slate-200 font-bold"><tr><td class="px-3 py-2 border" colspan="2">TOTALS</td><td class="px-3 py-2 border text-center" id="c240-totalDays">0</td><td class="px-3 py-2 border text-right" id="c240-totalGross">$0.00</td></tr></tfoot></table></div>\
</div>\
<div class="bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl shadow-lg p-6 text-center">\
<button type="button" id="btn-generate-c240" class="px-8 py-3 bg-white text-slate-800 rounded-lg hover:bg-slate-100 font-bold text-lg disabled:opacity-50" disabled>Generate C-240 PDF</button>\
<p class="text-slate-300 text-sm mt-2">Generates Page 2 with payroll data</p>\
</div>\
</div>\
</div>\
<footer class="bg-slate-800 text-slate-400 py-6 mt-8 text-center text-sm"><p>2025 Titanium Defense Group. All rights reserved.</p></footer>\
<script>\
var currentTab = "forms";\
var chartInstances = {};\
var analyticsData = null;\
var yearDataGlobal = null;\
var c240PayrollData = [];\
\
document.getElementById("tab-forms").addEventListener("click", function() { showTab("forms"); });\
document.getElementById("tab-claim").addEventListener("click", function() { showTab("claim"); });\
document.getElementById("tab-analytics").addEventListener("click", function() { showTab("analytics"); });\
document.getElementById("tab-c240").addEventListener("click", function() { showTab("c240"); });\
document.getElementById("btn-upload-loss").addEventListener("click", function() { document.getElementById("lossRunFile").click(); });\
document.getElementById("lossRunFile").addEventListener("change", function(e) { if(e.target.files[0]) processLossRun(e.target.files[0]); });\
document.getElementById("btn-upload-payroll").addEventListener("click", function() { document.getElementById("c240-payrollFile").click(); });\
document.getElementById("c240-payrollFile").addEventListener("change", function(e) { if(e.target.files[0]) processPayrollFile(e.target.files[0]); });\
document.getElementById("btn-generate-c240").addEventListener("click", generateC240);\
document.getElementById("btn-pdf-report").addEventListener("click", generatePDFReport);\
\
function showTab(tab) {\
  currentTab = tab;\
  document.getElementById("section-forms").classList.add("hidden");\
  document.getElementById("section-claim").classList.add("hidden");\
  document.getElementById("section-analytics").classList.add("hidden");\
  document.getElementById("section-c240").classList.add("hidden");\
  document.getElementById("tab-forms").classList.remove("tab-active");\
  document.getElementById("tab-forms").classList.add("tab-inactive");\
  document.getElementById("tab-claim").classList.remove("tab-active");\
  document.getElementById("tab-claim").classList.add("tab-inactive");\
  document.getElementById("tab-analytics").classList.remove("tab-active");\
  document.getElementById("tab-analytics").classList.add("tab-inactive");\
  document.getElementById("tab-c240").classList.remove("tab-active");\
  document.getElementById("tab-c240").classList.add("tab-inactive");\
  document.getElementById("section-" + tab).classList.remove("hidden");\
  document.getElementById("tab-" + tab).classList.add("tab-active");\
  document.getElementById("tab-" + tab).classList.remove("tab-inactive");\
  if (tab === "claim") renderClaimForm();\
}\
\
function processLossRun(file) {\
  var reader = new FileReader();\
  reader.onload = function(e) {\
    var data = new Uint8Array(e.target.result);\
    var workbook = XLSX.read(data, { type: "array", cellDates: true });\
    var sheet = workbook.Sheets[workbook.SheetNames[0]];\
    analyticsData = XLSX.utils.sheet_to_json(sheet);\
    analyzeData(analyticsData);\
  };\
  reader.readAsArrayBuffer(file);\
}\
\
function analyzeData(data) {\
  document.getElementById("analytics-results").classList.remove("hidden");\
  var totalClaims = data.length;\
  var totalIncurred = data.reduce(function(sum, row) { return sum + (parseFloat(row.TotalIncurred) || 0); }, 0);\
  var avgClaim = totalClaims > 0 ? totalIncurred / totalClaims : 0;\
  var openClaims = data.filter(function(row) { return row.ClaimantStatus === "O"; }).length;\
  document.getElementById("stat-total-claims").textContent = totalClaims;\
  document.getElementById("stat-total-incurred").textContent = "$" + totalIncurred.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});\
  document.getElementById("stat-avg-claim").textContent = "$" + avgClaim.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});\
  document.getElementById("stat-open-claims").textContent = openClaims;\
  var yearData = {};\
  data.forEach(function(row) {\
    var lossDate = row.LossDate instanceof Date ? row.LossDate : new Date(row.LossDate);\
    var year = lossDate && !isNaN(lossDate) ? lossDate.getFullYear() : "Unknown";\
    if (!yearData[year]) yearData[year] = { claims: 0, indemnity: 0, medical: 0, legal: 0, expense: 0, total: 0 };\
    yearData[year].claims++;\
    yearData[year].indemnity += parseFloat(row.IndemnityIncurred) || 0;\
    yearData[year].medical += parseFloat(row.MedicalIncurred) || 0;\
    yearData[year].legal += parseFloat(row.LegalIncurred) || 0;\
    yearData[year].expense += parseFloat(row.ExpenseIncurred) || 0;\
    yearData[year].total += parseFloat(row.TotalIncurred) || 0;\
  });\
  yearDataGlobal = yearData;\
  var sortedYears = Object.keys(yearData).sort(function(a,b) { return b - a; });\
  var costHtml = "<table class=\\"w-full text-sm\\"><thead class=\\"bg-slate-100\\"><tr><th class=\\"px-3 py-2 text-left\\">Year</th><th class=\\"px-3 py-2 text-center\\">Claims</th><th class=\\"px-3 py-2 text-right\\">Indemnity</th><th class=\\"px-3 py-2 text-right\\">Medical</th><th class=\\"px-3 py-2 text-right\\">Total</th></tr></thead><tbody>";\
  var grandTotal = { claims: 0, indemnity: 0, medical: 0, total: 0 };\
  sortedYears.forEach(function(year) {\
    var yd = yearData[year];\
    grandTotal.claims += yd.claims;\
    grandTotal.indemnity += yd.indemnity;\
    grandTotal.medical += yd.medical;\
    grandTotal.total += yd.total;\
    costHtml += "<tr class=\\"border-b\\"><td class=\\"px-3 py-2\\">" + year + "</td><td class=\\"px-3 py-2 text-center\\">" + yd.claims + "</td><td class=\\"px-3 py-2 text-right\\">$" + yd.indemnity.toLocaleString() + "</td><td class=\\"px-3 py-2 text-right\\">$" + yd.medical.toLocaleString() + "</td><td class=\\"px-3 py-2 text-right\\">$" + yd.total.toLocaleString() + "</td></tr>";\
  });\
  costHtml += "<tr class=\\"bg-slate-700 text-white font-bold\\"><td class=\\"px-3 py-2\\">TOTAL</td><td class=\\"px-3 py-2 text-center\\">" + grandTotal.claims + "</td><td class=\\"px-3 py-2 text-right\\">$" + grandTotal.indemnity.toLocaleString() + "</td><td class=\\"px-3 py-2 text-right\\">$" + grandTotal.medical.toLocaleString() + "</td><td class=\\"px-3 py-2 text-right\\">$" + grandTotal.total.toLocaleString() + "</td></tr>";\
  costHtml += "</tbody></table>";\
  document.getElementById("cost-breakdown").innerHTML = costHtml;\
  var statusCounts = {};\
  data.forEach(function(row) {\
    var status = row.ClaimantStatus === "O" ? "Open" : row.ClaimantStatus === "C" ? "Closed" : "Other";\
    statusCounts[status] = (statusCounts[status] || 0) + 1;\
  });\
  if (chartInstances.statusChart) chartInstances.statusChart.destroy();\
  chartInstances.statusChart = new Chart(document.getElementById("statusChart"), { type: "doughnut", data: { labels: Object.keys(statusCounts), datasets: [{ data: Object.values(statusCounts), backgroundColor: ["#ef4444", "#22c55e", "#f59e0b"] }] }, options: { responsive: true, plugins: { legend: { position: "bottom" } } } });\
  var injuryCounts = {};\
  data.forEach(function(row) { var inj = row.LossTypeDesc || "Unknown"; injuryCounts[inj] = (injuryCounts[inj] || 0) + 1; });\
  var topInjuries = Object.entries(injuryCounts).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 6);\
  if (chartInstances.injuryChart) chartInstances.injuryChart.destroy();\
  chartInstances.injuryChart = new Chart(document.getElementById("injuryChart"), { type: "bar", data: { labels: topInjuries.map(function(x) { return x[0]; }), datasets: [{ label: "Claims", data: topInjuries.map(function(x) { return x[1]; }), backgroundColor: "#3b82f6" }] }, options: { indexAxis: "y", responsive: true, plugins: { legend: { display: false } } } });\
  var bodyCounts = {};\
  data.forEach(function(row) { var bp = row.PartInjuredDesc || "Unknown"; bodyCounts[bp] = (bodyCounts[bp] || 0) + 1; });\
  var topBody = Object.entries(bodyCounts).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 6);\
  if (chartInstances.bodyPartChart) chartInstances.bodyPartChart.destroy();\
  chartInstances.bodyPartChart = new Chart(document.getElementById("bodyPartChart"), { type: "bar", data: { labels: topBody.map(function(x) { return x[0]; }), datasets: [{ label: "Claims", data: topBody.map(function(x) { return x[1]; }), backgroundColor: "#8b5cf6" }] }, options: { indexAxis: "y", responsive: true, plugins: { legend: { display: false } } } });\
  var causeCounts = {};\
  data.forEach(function(row) { var c = row.LossDescription || "Unknown"; causeCounts[c] = (causeCounts[c] || 0) + 1; });\
  var topCauses = Object.entries(causeCounts).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 8);\
  if (chartInstances.causeChart) chartInstances.causeChart.destroy();\
  chartInstances.causeChart = new Chart(document.getElementById("causeChart"), { type: "bar", data: { labels: topCauses.map(function(x) { return x[0].substring(0, 30); }), datasets: [{ label: "Claims", data: topCauses.map(function(x) { return x[1]; }), backgroundColor: "#f59e0b" }] }, options: { indexAxis: "y", responsive: true, plugins: { legend: { display: false } } } });\
  var sortedData = data.slice().sort(function(a,b) { return (parseFloat(b.TotalIncurred) || 0) - (parseFloat(a.TotalIncurred) || 0); });\
  var tableHtml = "";\
  sortedData.forEach(function(row) {\
    var lossDate = row.LossDate instanceof Date ? row.LossDate : new Date(row.LossDate);\
    var dateStr = lossDate && !isNaN(lossDate) ? lossDate.toLocaleDateString() : "N/A";\
    var status = row.ClaimantStatus === "O" ? "Open" : row.ClaimantStatus === "C" ? "Closed" : "Other";\
    var statusColor = status === "Open" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";\
    tableHtml += "<tr class=\\"border-b\\"><td class=\\"px-4 py-3\\">" + dateStr + "</td><td class=\\"px-4 py-3\\">" + (row.ClaimantName || "N/A") + "</td><td class=\\"px-4 py-3\\">" + (row.LossTypeDesc || "N/A") + "</td><td class=\\"px-4 py-3\\">" + (row.PartInjuredDesc || "N/A") + "</td><td class=\\"px-4 py-3\\"><span class=\\"px-2 py-1 rounded text-xs " + statusColor + "\\">" + status + "</span></td><td class=\\"px-4 py-3 text-right font-medium\\">$" + (parseFloat(row.TotalIncurred) || 0).toLocaleString() + "</td></tr>";\
  });\
  document.getElementById("claims-table-body").innerHTML = tableHtml;\
  var topClaimsHtml = "";\
  sortedData.slice(0, 5).forEach(function(row, i) {\
    topClaimsHtml += "<div class=\\"flex justify-between items-center p-3 bg-slate-50 rounded-lg mb-2\\"><div><span class=\\"font-bold text-slate-700\\">#" + (i+1) + " " + (row.ClaimantName || "N/A") + "</span><div class=\\"text-sm text-slate-600\\">" + (row.LossTypeDesc || "N/A") + " - " + (row.PartInjuredDesc || "N/A") + "</div></div><div class=\\"text-lg font-bold text-red-600\\">$" + (parseFloat(row.TotalIncurred) || 0).toLocaleString() + "</div></div>";\
  });\
  document.getElementById("top-claims").innerHTML = topClaimsHtml;\
  var recs = [];\
  if (topInjuries.length > 0 && topInjuries[0][0].toLowerCase().includes("strain")) recs.push("Implement ergonomic training and proper lifting techniques.");\
  if (topBody.length > 0 && topBody[0][0].toLowerCase().includes("back")) recs.push("Focus on back injury prevention with ergonomic assessments.");\
  if (topCauses.length > 0 && topCauses[0][0].toLowerCase().includes("slip")) recs.push("Improve floor maintenance and require non-slip footwear.");\
  recs.push("Encourage early reporting of injuries.");\
  recs.push("Implement return-to-work programs.");\
  var recsHtml = "<ul class=\\"list-disc list-inside space-y-2\\">";\
  recs.forEach(function(r) { recsHtml += "<li>" + r + "</li>"; });\
  recsHtml += "</ul>";\
  document.getElementById("recommendations").innerHTML = recsHtml;\
}\
\
function generatePDFReport() {\
  var jsPDF = window.jspdf.jsPDF;\
  var doc = new jsPDF();\
  doc.setFillColor(51, 65, 85);\
  doc.rect(0, 0, 210, 30, "F");\
  doc.setTextColor(255, 255, 255);\
  doc.setFontSize(18);\
  doc.text("Loss Run Analysis Report", 105, 15, { align: "center" });\
  doc.setFontSize(10);\
  doc.text("Generated: " + new Date().toLocaleDateString(), 105, 23, { align: "center" });\
  doc.setTextColor(0, 0, 0);\
  doc.setFontSize(14);\
  doc.text("Executive Summary", 14, 45);\
  doc.setFontSize(10);\
  doc.text("Total Claims: " + document.getElementById("stat-total-claims").textContent, 14, 55);\
  doc.text("Total Incurred: " + document.getElementById("stat-total-incurred").textContent, 14, 62);\
  doc.text("Average per Claim: " + document.getElementById("stat-avg-claim").textContent, 14, 69);\
  doc.text("Open Claims: " + document.getElementById("stat-open-claims").textContent, 14, 76);\
  doc.save("Loss_Run_Report_" + new Date().toISOString().split("T")[0] + ".pdf");\
}\
\
function processPayrollFile(file) {\
  var reader = new FileReader();\
  reader.onload = function(e) {\
    var data = new Uint8Array(e.target.result);\
    var workbook = XLSX.read(data, { type: "array", cellDates: true });\
    var sheet = workbook.Sheets[workbook.SheetNames[0]];\
    var jsonData = XLSX.utils.sheet_to_json(sheet);\
    c240PayrollData = jsonData.map(function(row, idx) {\
      var weekEnd = row["Week Ending"] || row["Week Ending Date"] || row["Date"] || row["Pay Date"] || Object.values(row)[0];\
      var days = row["Days"] || row["Days Paid"] || row["Days Worked"] || 5;\
      var gross = row["Gross"] || row["Gross Amount"] || row["Gross Pay"] || row["Amount"] || Object.values(row)[Object.values(row).length - 1] || 0;\
      return { week: idx + 1, weekEnding: weekEnd instanceof Date ? weekEnd : new Date(weekEnd), daysPaid: parseFloat(days) || 5, grossAmount: parseFloat(String(gross).replace(/[$,]/g, "")) || 0 };\
    }).filter(function(row) { return !isNaN(row.grossAmount) && row.grossAmount > 0; }).slice(0, 52);\
    document.getElementById("c240-fileName").textContent = file.name;\
    document.getElementById("c240-fileStatus").classList.remove("hidden");\
    document.getElementById("btn-generate-c240").disabled = false;\
    updatePayrollSummary();\
    updatePayrollPreview();\
  };\
  reader.readAsArrayBuffer(file);\
}\
\
function updatePayrollSummary() {\
  if (c240PayrollData.length === 0) { document.getElementById("c240-payrollSummary").innerHTML = "<p class=\\"text-slate-500\\">No data loaded.</p>"; return; }\
  var totalDays = c240PayrollData.reduce(function(sum, row) { return sum + row.daysPaid; }, 0);\
  var totalGross = c240PayrollData.reduce(function(sum, row) { return sum + row.grossAmount; }, 0);\
  var avgWeekly = totalGross / c240PayrollData.length;\
  var html = "<div class=\\"space-y-2\\"><div class=\\"flex justify-between\\"><span>Weeks:</span><span class=\\"font-bold\\">" + c240PayrollData.length + " of 52</span></div><div class=\\"flex justify-between\\"><span>Total Days:</span><span class=\\"font-bold\\">" + totalDays + "</span></div><div class=\\"flex justify-between\\"><span>Total Gross:</span><span class=\\"font-bold text-green-600\\">$" + totalGross.toLocaleString(undefined, {minimumFractionDigits: 2}) + "</span></div><div class=\\"flex justify-between\\"><span>Avg Weekly:</span><span class=\\"font-bold\\">$" + avgWeekly.toLocaleString(undefined, {minimumFractionDigits: 2}) + "</span></div></div>";\
  document.getElementById("c240-payrollSummary").innerHTML = html;\
}\
\
function updatePayrollPreview() {\
  if (c240PayrollData.length === 0) { document.getElementById("c240-payrollPreview").classList.add("hidden"); return; }\
  document.getElementById("c240-payrollPreview").classList.remove("hidden");\
  var html = "";\
  var totalDays = 0, totalGross = 0;\
  c240PayrollData.forEach(function(row) {\
    var dateStr = row.weekEnding instanceof Date && !isNaN(row.weekEnding) ? row.weekEnding.toLocaleDateString() : "N/A";\
    totalDays += row.daysPaid;\
    totalGross += row.grossAmount;\
    html += "<tr class=\\"border-b\\"><td class=\\"px-3 py-2 border\\">" + row.week + "</td><td class=\\"px-3 py-2 border\\">" + dateStr + "</td><td class=\\"px-3 py-2 border text-center\\">" + row.daysPaid + "</td><td class=\\"px-3 py-2 border text-right\\">$" + row.grossAmount.toLocaleString(undefined, {minimumFractionDigits: 2}) + "</td></tr>";\
  });\
  document.getElementById("c240-payrollTableBody").innerHTML = html;\
  document.getElementById("c240-totalDays").textContent = totalDays.toFixed(0);\
  document.getElementById("c240-totalGross").textContent = "$" + totalGross.toLocaleString(undefined, {minimumFractionDigits: 2});\
}\
\
async function generateC240() {\
  if (c240PayrollData.length === 0) { alert("Please upload payroll data first."); return; }\
  var PDFLib = window.PDFLib;\
  try {\
    var response = await fetch("https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/C240.pdf");\
    if (!response.ok) throw new Error("Could not load form");\
    var existingPdfBytes = await response.arrayBuffer();\
    var pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);\
    var form = pdfDoc.getForm();\
    function setField(name, value) { try { var f = form.getTextField(name); if (f && value) f.setText(String(value)); } catch(e) {} }\
    function formatDate(d) { if (!d) return ""; var dt = new Date(d); if (isNaN(dt)) return ""; return (dt.getMonth()+1) + "/" + dt.getDate() + "/" + dt.getFullYear(); }\
    setField("form1[0].#pageSet[0].Page3[0].injuryDate[0]", formatDate(document.getElementById("c240-injuryDate").value));\
    c240PayrollData.forEach(function(row, idx) {\
      var weekNum = idx + 1;\
      if (weekNum <= 52) {\
        var rowNum = ((weekNum - 1) % 18) + 1;\
        var dateStr = row.weekEnding instanceof Date && !isNaN(row.weekEnding) ? formatDate(row.weekEnding) : "";\
        setField("form1[0].#subform[10].#subform[21].Table1[0].Row" + rowNum + "[0].weekEndingDate" + weekNum + "[0]", dateStr);\
        setField("form1[0].#subform[10].#subform[21].Table1[0].Row" + rowNum + "[0].daysWorked" + weekNum + "[0]", row.daysPaid.toString());\
        setField("form1[0].#subform[10].#subform[21].Table1[0].Row" + rowNum + "[0].grossAmountPaid" + weekNum + "[0]", row.grossAmount.toFixed(2));\
      }\
    });\
    var totalDays = c240PayrollData.reduce(function(sum, row) { return sum + row.daysPaid; }, 0);\
    var totalGross = c240PayrollData.reduce(function(sum, row) { return sum + row.grossAmount; }, 0);\
    setField("form1[0].#subform[10].#subform[14].totalDaysPaid[0]", totalDays.toString());\
    setField("form1[0].#subform[10].#subform[14].totalGrossPaid[0]", "$" + totalGross.toLocaleString(undefined, {minimumFractionDigits: 2}));\
    form.flatten();\
    var pdfBytes = await pdfDoc.save();\
    var blob = new Blob([pdfBytes], { type: "application/pdf" });\
    var link = document.createElement("a");\
    link.href = URL.createObjectURL(blob);\
    link.download = "C240_" + new Date().toISOString().split("T")[0] + ".pdf";\
    link.click();\
  } catch (err) {\
    alert("Error: " + err.message);\
  }\
}\
\
var formData = {};\
var currentStep = 0;\
var steps = ["Personal", "Claim", "Injury", "Work Status", "Location", "Submit"];\
\
function renderClaimForm() {\
  var container = document.getElementById("form-container");\
  var html = "<h3 class=\\"text-lg font-semibold mb-4\\">Step " + (currentStep + 1) + ": " + steps[currentStep] + "</h3>";\
  if (currentStep === 0) {\
    html += "<div class=\\"grid md:grid-cols-2 gap-4\\"><div><label class=\\"block text-sm font-medium mb-1\\">First Name *</label><input type=\\"text\\" id=\\"firstName\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div><div><label class=\\"block text-sm font-medium mb-1\\">Last Name *</label><input type=\\"text\\" id=\\"lastName\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div><div><label class=\\"block text-sm font-medium mb-1\\">Phone *</label><input type=\\"tel\\" id=\\"phone\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div><div><label class=\\"block text-sm font-medium mb-1\\">SSN</label><input type=\\"text\\" id=\\"ssn\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div></div>";\
  } else if (currentStep === 1) {\
    html += "<div class=\\"grid md:grid-cols-2 gap-4\\"><div><label class=\\"block text-sm font-medium mb-1\\">Date of Injury *</label><input type=\\"date\\" id=\\"dateOfInjury\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div><div><label class=\\"block text-sm font-medium mb-1\\">Time of Injury</label><input type=\\"time\\" id=\\"timeOfInjury\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div></div>";\
  } else if (currentStep === 2) {\
    html += "<div class=\\"space-y-4\\"><div><label class=\\"block text-sm font-medium mb-1\\">Nature of Injury *</label><input type=\\"text\\" id=\\"natureOfInjury\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div><div><label class=\\"block text-sm font-medium mb-1\\">Body Part Injured *</label><input type=\\"text\\" id=\\"bodyPartInjured\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div><div><label class=\\"block text-sm font-medium mb-1\\">Cause of Injury *</label><input type=\\"text\\" id=\\"causeOfInjury\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div><div><label class=\\"block text-sm font-medium mb-1\\">Description *</label><textarea id=\\"accidentDescription\\" rows=\\"3\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></textarea></div></div>";\
  } else if (currentStep === 3) {\
    html += "<div class=\\"space-y-4\\"><div><label class=\\"block text-sm font-medium mb-1\\">Losing time from work?</label><select id=\\"losingTime\\" class=\\"w-full px-3 py-2 border rounded-lg\\"><option value=\\"\\">Select</option><option value=\\"yes\\">Yes</option><option value=\\"no\\">No</option></select></div></div>";\
  } else if (currentStep === 4) {\
    html += "<div class=\\"space-y-4\\"><div><label class=\\"block text-sm font-medium mb-1\\">Accident Location</label><input type=\\"text\\" id=\\"accidentStreet\\" placeholder=\\"Street\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div></div>";\
  } else if (currentStep === 5) {\
    html += "<div class=\\"space-y-4\\"><div><label class=\\"block text-sm font-medium mb-1\\">Your Name *</label><input type=\\"text\\" id=\\"submitterName\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div><div><label class=\\"block text-sm font-medium mb-1\\">Your Email *</label><input type=\\"email\\" id=\\"submitterEmail\\" class=\\"w-full px-3 py-2 border rounded-lg\\"></div></div>";\
  }\
  html += "<div class=\\"flex justify-between mt-6\\">";\
  if (currentStep > 0) html += "<button type=\\"button\\" id=\\"btn-prev\\" class=\\"px-6 py-2 bg-slate-200 rounded-lg\\">Previous</button>";\
  else html += "<div></div>";\
  if (currentStep < steps.length - 1) html += "<button type=\\"button\\" id=\\"btn-next\\" class=\\"px-6 py-2 bg-slate-700 text-white rounded-lg\\">Next</button>";\
  else html += "<button type=\\"button\\" id=\\"btn-submit\\" class=\\"px-6 py-2 bg-green-600 text-white rounded-lg\\">Submit Claim</button>";\
  html += "</div>";\
  container.innerHTML = html;\
  if (document.getElementById("btn-prev")) document.getElementById("btn-prev").addEventListener("click", function() { saveFormData(); currentStep--; renderClaimForm(); });\
  if (document.getElementById("btn-next")) document.getElementById("btn-next").addEventListener("click", function() { saveFormData(); currentStep++; renderClaimForm(); });\
  if (document.getElementById("btn-submit")) document.getElementById("btn-submit").addEventListener("click", submitClaim);\
  loadFormData();\
}\
\
function saveFormData() {\
  var fields = ["firstName", "lastName", "phone", "ssn", "dateOfInjury", "timeOfInjury", "natureOfInjury", "bodyPartInjured", "causeOfInjury", "accidentDescription", "losingTime", "accidentStreet", "submitterName", "submitterEmail"];\
  fields.forEach(function(f) { var el = document.getElementById(f); if (el) formData[f] = el.value; });\
}\
\
function loadFormData() {\
  var fields = ["firstName", "lastName", "phone", "ssn", "dateOfInjury", "timeOfInjury", "natureOfInjury", "bodyPartInjured", "causeOfInjury", "accidentDescription", "losingTime", "accidentStreet", "submitterName", "submitterEmail"];\
  fields.forEach(function(f) { var el = document.getElementById(f); if (el && formData[f]) el.value = formData[f]; });\
}\
\
function submitClaim() {\
  saveFormData();\
  var fd = new FormData();\
  fd.append("formData", JSON.stringify(formData));\
  fetch("/submit-claim", { method: "POST", body: fd }).then(function(r) { return r.json(); }).then(function(data) {\
    if (data.success) {\
      document.getElementById("form-container").innerHTML = "<div class=\\"text-center py-8\\"><div class=\\"text-green-600 text-6xl mb-4\\">✓</div><h2 class=\\"text-2xl font-bold mb-2\\">Claim Submitted!</h2><p class=\\"text-slate-600\\">Reference: " + data.referenceNumber + "</p></div>";\
    } else {\
      alert("Error: " + data.error);\
    }\
  }).catch(function(err) { alert("Error: " + err.message); });\
}\
<\/script>\
</body>\
</html>';

app.get('/', function(req, res) {
  res.send(HTML);
});

app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
});
