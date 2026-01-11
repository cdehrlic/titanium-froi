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

function generateClaimPDF(formData, referenceNumber) {
  return new Promise(function(resolve, reject) {
    var doc = new PDFDocument({ margin: 50 });
    var chunks = [];
    doc.on('data', function(chunk) { chunks.push(chunk); });
    doc.on('end', function() { resolve(Buffer.concat(chunks)); });
    doc.on('error', reject);

    doc.fontSize(20).font('Helvetica-Bold').text('TITANIUM DEFENSE GROUP', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('First Report of Work-Related Injury/Illness', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a5f').text('Reference #: ' + referenceNumber, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('black').text('Generated: ' + new Date().toLocaleString(), { align: 'center' });
    doc.moveDown(2);

    var sections = [
      { title: 'EMPLOYEE PERSONAL INFORMATION', fields: [
        ['Name', (formData.firstName || '') + ' ' + (formData.lastName || '')],
        ['Address', (formData.mailingAddress || '') + ', ' + (formData.city || '') + ', ' + (formData.state || '') + ' ' + (formData.zipCode || '')],
        ['Phone', formData.phone || 'N/A'], ['DOB', formData.dateOfBirth || 'N/A'], ['Hire Date', formData.dateOfHire || 'N/A'],
        ['Gender', formData.gender || 'N/A'], ['SSN', formData.ssn ? 'XXX-XX-' + formData.ssn.slice(-4) : 'N/A'],
        ['Occupation', formData.occupation || 'N/A'], ['Language', formData.preferredLanguage || 'N/A']
      ]},
      { title: 'CLAIM INFORMATION', fields: [
        ['Date of Injury', formData.dateOfInjury || 'N/A'], ['Time', formData.timeOfInjury || 'N/A'],
        ['Date Reported', formData.dateReported || 'N/A'], ['Weekly Wage', '$' + (formData.weeklyWage || 'N/A')],
        ['Work Type', formData.employeeWorkType || 'N/A']
      ]},
      { title: 'INJURY DETAILS', fields: [
        ['Medical Treatment', formData.medicalTreatment || 'N/A'], ['Facility', formData.facilityName || 'N/A'],
        ['Death', formData.resultedInDeath || 'N/A'], ['Nature', formData.natureOfInjury || 'N/A'],
        ['Body Part', formData.bodyPartInjured || 'N/A'], ['Cause', formData.causeOfInjury || 'N/A'],
        ['Description', formData.accidentDescription || 'N/A']
      ]},
      { title: 'WORK STATUS', fields: [
        ['Losing Time', formData.losingTime || 'N/A'], ['Last Worked', formData.dateLastWorked || 'N/A'],
        ['Return Status', formData.returnStatus || 'N/A']
      ]},
      { title: 'SUBMITTED BY', fields: [
        ['Name', formData.submitterName || 'N/A'], ['Phone', formData.submitterPhone || 'N/A'],
        ['Email', formData.submitterEmail || 'N/A']
      ]}
    ];

    sections.forEach(function(section) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f').text(section.title);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('black');
      section.fields.forEach(function(f) { doc.text(f[0] + ': ' + f[1]); });
      doc.moveDown();
    });

    if (formData.redFlags) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#cc0000').text('RED FLAGS');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#cc0000').text(formData.redFlags);
    }

    doc.end();
  });
}

app.get('/api/health', function(req, res) { res.json({ status: 'ok' }); });

app.post('/api/submit-claim', upload.any(), async function(req, res) {
  try {
    var formData = JSON.parse(req.body.formData);
    var files = req.files || [];
    var referenceNumber = 'FROI-' + Date.now().toString().slice(-8);
    var pdfBuffer = await generateClaimPDF(formData, referenceNumber);
    var attachments = [{ filename: referenceNumber + '-Summary.pdf', content: pdfBuffer, contentType: 'application/pdf' }];
    files.forEach(function(file) { attachments.push({ filename: file.originalname, content: file.buffer, contentType: file.mimetype }); });

    await transporter.sendMail({
      from: CONFIG.SMTP.auth.user, to: CONFIG.CLAIMS_EMAIL,
      subject: 'New FROI Claim - ' + (formData.firstName || '') + ' ' + (formData.lastName || ''),
      html: '<h2>New Claim: ' + referenceNumber + '</h2><p>Employee: ' + formData.firstName + ' ' + formData.lastName + '</p><p>DOI: ' + formData.dateOfInjury + '</p>',
      attachments: attachments
    });

    if (formData.submitterEmail) {
      await transporter.sendMail({
        from: CONFIG.SMTP.auth.user, to: formData.submitterEmail,
        subject: 'Claim Confirmation - ' + referenceNumber,
        html: '<h2>Claim Submitted</h2><p>Reference: ' + referenceNumber + '</p>'
      });
    }
    res.json({ success: true, referenceNumber: referenceNumber });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

var HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Titanium Defense Group - Claims Portal</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
body { font-family: 'Inter', sans-serif; }
.tab-active { background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); color: white; }
.tab-inactive { background: #e2e8f0; color: #475569; }
.stat-card { transition: all 0.3s ease; }
.stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
.gradient-header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%); }
.insight-card { border-left: 4px solid; transition: all 0.2s ease; }
.insight-card:hover { transform: translateX(4px); }
.priority-critical { border-color: #dc2626; background: linear-gradient(90deg, #fef2f2 0%, white 100%); }
.priority-high { border-color: #f59e0b; background: linear-gradient(90deg, #fffbeb 0%, white 100%); }
.priority-medium { border-color: #3b82f6; background: linear-gradient(90deg, #eff6ff 0%, white 100%); }
.priority-low { border-color: #10b981; background: linear-gradient(90deg, #ecfdf5 0%, white 100%); }
@media print { .no-print { display: none !important; } }
</style>
</head>
<body class="bg-gray-50 min-h-screen">
<header class="gradient-header text-white p-4 shadow-lg">
<div class="max-w-7xl mx-auto flex justify-between items-center">
<div class="flex items-center gap-4">
<img src="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Titanium%20logo.webp" alt="Titanium Defense Group" class="h-16">
<div class="hidden md:block border-l border-white/30 pl-4">
<div class="text-xs text-blue-200 uppercase tracking-wider">Workers Compensation</div>
<div class="text-lg font-bold">Claims Management Portal</div>
</div>
</div>
</div>
</header>

<div class="max-w-7xl mx-auto p-4">
<div class="flex gap-2 mb-6 flex-wrap no-print">
<button type="button" onclick="showTab('forms')" id="tab-forms" class="px-6 py-3 rounded-lg font-semibold tab-active shadow-md">Download Forms</button>
<button type="button" onclick="showTab('claim')" id="tab-claim" class="px-6 py-3 rounded-lg font-semibold tab-inactive shadow-md">Submit a Claim</button>
<button type="button" onclick="showTab('analytics')" id="tab-analytics" class="px-6 py-3 rounded-lg font-semibold tab-inactive shadow-md">Loss Run Analytics</button>
<button type="button" onclick="showTab('c240')" id="tab-c240" class="px-6 py-3 rounded-lg font-semibold tab-inactive shadow-md">C-240 Form</button>
</div>

<!-- Forms Section -->
<div id="section-forms" class="bg-white rounded-2xl shadow-xl p-8">
<h3 class="text-2xl font-bold text-slate-800 mb-6">Downloadable Forms</h3>
<div class="flex gap-4 flex-wrap">
<a href="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Employee%20Incident%20Report_Titanium_2026.pdf" target="_blank" class="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl hover:from-slate-800 hover:to-slate-700 shadow-lg">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
<div><div class="font-semibold">Employee Incident Report</div><div class="text-xs text-slate-300">PDF Download</div></div>
</a>
<a href="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Witness%20Statement%20Form_Titanium_2026.pdf" target="_blank" class="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl hover:from-slate-800 hover:to-slate-700 shadow-lg">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
<div><div class="font-semibold">Witness Statement Form</div><div class="text-xs text-slate-300">PDF Download</div></div>
</a>
</div>
</div>

<!-- Claim Form Section -->
<div id="section-claim" class="bg-white rounded-2xl shadow-xl p-8 hidden">
<div id="form-container"></div>
</div>

<!-- Loss Run Analytics Section -->
<div id="section-analytics" class="hidden">
<div id="upload-section" class="bg-white rounded-2xl shadow-xl p-8 mb-6">
<div class="text-center max-w-2xl mx-auto">
<div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
<svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
</div>
<h3 class="text-2xl font-bold text-slate-800 mb-3">Loss Run Analytics Dashboard</h3>
<p class="text-slate-600 mb-6">Upload your loss run data to receive comprehensive insights, identify risk patterns, and get actionable recommendations to reduce claim frequency and severity.</p>
<div class="border-2 border-dashed border-slate-300 rounded-2xl p-8 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer" onclick="document.getElementById('lossRunFile').click()">
<svg class="w-12 h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
<p class="text-lg font-semibold text-slate-700 mb-2">Drop your Loss Run file here</p>
<p class="text-slate-500 mb-4">Supports Excel (.xlsx, .xls) and CSV formats</p>
<input type="file" id="lossRunFile" accept=".xlsx,.xls,.csv" class="hidden" onchange="processLossRun(this.files[0])">
<button type="button" class="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg">Select File</button>
</div>
</div>
</div>

<div id="analytics-results" class="hidden">
<!-- Report Header -->
<div class="bg-white rounded-2xl shadow-xl p-6 mb-6 no-print">
<div class="flex flex-wrap justify-between items-center gap-4">
<div>
<h2 class="text-2xl font-bold text-slate-800">Loss Run Analysis Report</h2>
<p class="text-slate-500">Generated <span id="report-date"></span></p>
</div>
<div class="flex gap-3">
<button onclick="window.print()" class="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
Print Report
</button>
<button onclick="exportToPDF()" class="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-lg">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
Export PDF
</button>
<button onclick="resetAnalytics()" class="flex items-center gap-2 px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
New Analysis
</button>
</div>
</div>
</div>

<!-- Executive Summary -->
<div class="gradient-header rounded-2xl shadow-xl p-8 mb-6 text-white">
<div class="flex items-center justify-between mb-6">
<h3 class="text-2xl font-bold">Executive Summary</h3>
<div class="text-right text-sm text-blue-200">
<div>Analysis Period</div>
<div id="analysis-period" class="font-semibold text-white">--</div>
</div>
</div>
<div class="grid md:grid-cols-5 gap-4">
<div class="bg-white/10 backdrop-blur rounded-xl p-5 text-center stat-card">
<div class="text-4xl font-extrabold mb-1" id="stat-total-claims">0</div>
<div class="text-blue-200 text-sm">Total Claims</div>
</div>
<div class="bg-white/10 backdrop-blur rounded-xl p-5 text-center stat-card">
<div class="text-4xl font-extrabold mb-1" id="stat-total-incurred">$0</div>
<div class="text-blue-200 text-sm">Total Incurred</div>
</div>
<div class="bg-white/10 backdrop-blur rounded-xl p-5 text-center stat-card">
<div class="text-4xl font-extrabold mb-1" id="stat-avg-claim">$0</div>
<div class="text-blue-200 text-sm">Avg Cost/Claim</div>
</div>
<div class="bg-white/10 backdrop-blur rounded-xl p-5 text-center stat-card">
<div class="text-4xl font-extrabold mb-1 text-yellow-300" id="stat-open-claims">0</div>
<div class="text-blue-200 text-sm">Open Claims</div>
</div>
<div class="bg-white/10 backdrop-blur rounded-xl p-5 text-center stat-card">
<div class="text-4xl font-extrabold mb-1 text-red-300" id="stat-open-reserve">$0</div>
<div class="text-blue-200 text-sm">Open Reserves</div>
</div>
</div>
</div>

<!-- Risk Score & Financial -->
<div class="grid lg:grid-cols-3 gap-6 mb-6">
<div class="bg-white rounded-2xl shadow-xl p-6">
<h4 class="text-lg font-bold text-slate-800 mb-4">Risk Assessment Score</h4>
<div class="flex items-center justify-center">
<div class="relative w-40 h-40">
<svg class="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
<circle cx="50" cy="50" r="45" stroke="#e5e7eb" stroke-width="10" fill="none"/>
<circle id="risk-circle" cx="50" cy="50" r="45" stroke="#22c55e" stroke-width="10" fill="none" stroke-dasharray="283" stroke-dashoffset="283" stroke-linecap="round"/>
</svg>
<div class="absolute inset-0 flex flex-col items-center justify-center">
<div id="risk-score" class="text-4xl font-extrabold text-slate-800">--</div>
<div class="text-sm text-slate-500">out of 100</div>
</div>
</div>
</div>
<div id="risk-level" class="text-center mt-4 py-2 px-4 rounded-full text-sm font-semibold">--</div>
</div>

<div class="bg-white rounded-2xl shadow-xl p-6 col-span-2">
<h4 class="text-lg font-bold text-slate-800 mb-4">Financial Breakdown</h4>
<div class="grid grid-cols-2 gap-4">
<div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
<div class="text-sm text-blue-600 font-medium">Indemnity</div>
<div id="cost-indemnity" class="text-2xl font-bold text-blue-800">$0</div>
<div id="cost-indemnity-pct" class="text-xs text-blue-500 mt-1">0% of total</div>
</div>
<div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
<div class="text-sm text-green-600 font-medium">Medical</div>
<div id="cost-medical" class="text-2xl font-bold text-green-800">$0</div>
<div id="cost-medical-pct" class="text-xs text-green-500 mt-1">0% of total</div>
</div>
<div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
<div class="text-sm text-purple-600 font-medium">Legal/Defense</div>
<div id="cost-legal" class="text-2xl font-bold text-purple-800">$0</div>
<div id="cost-legal-pct" class="text-xs text-purple-500 mt-1">0% of total</div>
</div>
<div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
<div class="text-sm text-orange-600 font-medium">Expenses</div>
<div id="cost-expense" class="text-2xl font-bold text-orange-800">$0</div>
<div id="cost-expense-pct" class="text-xs text-orange-500 mt-1">0% of total</div>
</div>
</div>
</div>
</div>

<!-- AI Insights -->
<div class="bg-white rounded-2xl shadow-xl p-6 mb-6">
<div class="flex items-center gap-3 mb-6">
<div class="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
</div>
<div>
<h4 class="text-xl font-bold text-slate-800">AI-Powered Risk Insights</h4>
<p class="text-sm text-slate-500">Data-driven recommendations to reduce claim frequency and severity</p>
</div>
</div>
<div id="ai-insights" class="space-y-4"></div>
</div>

<!-- Charts -->
<div class="grid lg:grid-cols-2 gap-6 mb-6">
<div class="bg-white rounded-2xl shadow-xl p-6">
<h4 class="text-lg font-bold text-slate-800 mb-4">Claims by Status</h4>
<div class="h-64"><canvas id="statusChart"></canvas></div>
</div>
<div class="bg-white rounded-2xl shadow-xl p-6">
<h4 class="text-lg font-bold text-slate-800 mb-4">Monthly Trend Analysis</h4>
<div class="h-64"><canvas id="trendChart"></canvas></div>
</div>
</div>

<div class="grid lg:grid-cols-2 gap-6 mb-6">
<div class="bg-white rounded-2xl shadow-xl p-6">
<h4 class="text-lg font-bold text-slate-800 mb-4">Top Injury Types by Cost</h4>
<div class="h-72"><canvas id="injuryChart"></canvas></div>
</div>
<div class="bg-white rounded-2xl shadow-xl p-6">
<h4 class="text-lg font-bold text-slate-800 mb-4">Body Parts Affected</h4>
<div class="h-72"><canvas id="bodyPartChart"></canvas></div>
</div>
</div>

<div class="bg-white rounded-2xl shadow-xl p-6 mb-6">
<h4 class="text-lg font-bold text-slate-800 mb-4">Cause of Injury Analysis</h4>
<div class="h-64"><canvas id="causeChart"></canvas></div>
</div>

<!-- High Cost Claims -->
<div class="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl shadow-xl p-6 mb-6 text-white">
<div class="flex items-center gap-3 mb-4">
<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
<h4 class="text-xl font-bold">High-Severity Claims Requiring Attention</h4>
</div>
<div id="high-cost-claims" class="space-y-3"></div>
</div>

<!-- Action Plan -->
<div class="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
<div class="flex items-center gap-3 mb-4">
<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
<h4 class="text-xl font-bold">Recommended Action Plan</h4>
</div>
<div id="action-plan" class="grid md:grid-cols-2 gap-4"></div>
</div>

<!-- Claims Table -->
<div class="bg-white rounded-2xl shadow-xl p-6 mb-6">
<h4 class="text-lg font-bold text-slate-800 mb-4">Claims Detail</h4>
<div class="overflow-x-auto">
<table class="w-full text-sm">
<thead class="bg-slate-800 text-white">
<tr>
<th class="px-4 py-3 text-left rounded-tl-lg">Loss Date</th>
<th class="px-4 py-3 text-left">Claimant</th>
<th class="px-4 py-3 text-left">Injury Type</th>
<th class="px-4 py-3 text-left">Body Part</th>
<th class="px-4 py-3 text-center">Status</th>
<th class="px-4 py-3 text-right rounded-tr-lg">Total Incurred</th>
</tr>
</thead>
<tbody id="claims-table-body"></tbody>
</table>
</div>
</div>
</div>
</div>

<!-- C-240 Form Section -->
<div id="section-c240" class="hidden">
<div class="bg-white rounded-2xl shadow-xl p-8 mb-6">
<h3 class="text-2xl font-bold text-slate-800 mb-2">C-240 Employers Statement of Wage Earnings</h3>
<p class="text-slate-600 mb-6">Auto-populate the 52-week payroll table (Page 2) of the NY Workers Compensation C-240 form.</p>
<div class="grid lg:grid-cols-2 gap-8">
<div class="space-y-6">
<div class="bg-slate-50 rounded-xl p-6">
<h4 class="font-bold text-slate-700 mb-4">Injured Worker Information</h4>
<div class="grid grid-cols-2 gap-4">
<div><label class="block text-sm font-medium text-slate-600 mb-2">Injured Worker Name</label><input type="text" id="c240-workerName" placeholder="Last, First MI" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg"></div>
<div><label class="block text-sm font-medium text-slate-600 mb-2">Date of Injury</label><input type="date" id="c240-injuryDate" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg"></div>
</div>
<div class="mt-4"><label class="block text-sm font-medium text-slate-600 mb-2">WCB Case #</label><input type="text" id="c240-wcbCase" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg"></div>
</div>
<div class="bg-slate-50 rounded-xl p-6">
<h4 class="font-bold text-slate-700 mb-4">Upload Payroll Data</h4>
<div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer" onclick="document.getElementById('c240-payrollFile').click()">
<p class="text-slate-600 font-medium mb-1">Upload Payroll File</p>
<p class="text-slate-400 text-sm">Excel or CSV format</p>
<input type="file" id="c240-payrollFile" accept=".xlsx,.xls,.csv" class="hidden" onchange="processPayrollFile(this.files[0])">
</div>
<div id="c240-fileStatus" class="hidden mt-4 p-3 bg-green-50 border border-green-200 rounded-lg"><p class="text-green-700 text-sm font-medium"><span id="c240-fileName"></span></p></div>
</div>
</div>
<div class="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-6 text-white">
<h4 class="font-bold mb-4">Payroll Summary</h4>
<div id="c240-payrollSummary"><p class="text-slate-400">No payroll data loaded yet.</p></div>
</div>
</div>
</div>
<div id="c240-payrollPreview" class="bg-white rounded-2xl shadow-xl p-6 mb-6 hidden">
<h4 class="font-bold text-slate-800 mb-4">Payroll Preview (52 Weeks)</h4>
<div class="overflow-x-auto max-h-96 rounded-lg border"><table class="w-full text-sm"><thead class="bg-slate-100 sticky top-0"><tr><th class="px-4 py-3 text-left">Week #</th><th class="px-4 py-3 text-left">Week Ending</th><th class="px-4 py-3 text-center">Days Paid</th><th class="px-4 py-3 text-right">Gross Amount</th></tr></thead><tbody id="c240-payrollTableBody"></tbody></table></div>
<div class="bg-slate-800 text-white font-bold mt-4 rounded-xl p-4 flex justify-between"><span>TOTALS:</span><span><span id="c240-totalDays">0</span> days | <span id="c240-totalGross">$0.00</span></span></div>
</div>
<div class="text-center">
<button type="button" onclick="generateC240()" id="c240-generateBtn" class="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-lg shadow-xl disabled:opacity-50" disabled>Generate C-240 PDF</button>
</div>
</div>
</div>

<footer class="bg-slate-900 text-slate-400 py-8 mt-12 text-center text-sm">
<p>&copy; 2025 Titanium Defense Group. All rights reserved.</p>
</footer>

<script>
var chartInstances = {};
var analysisData = null;

function showTab(tab) {
  ['forms','claim','analytics','c240'].forEach(function(t) {
    document.getElementById('section-' + t).classList.add('hidden');
    document.getElementById('tab-' + t).classList.remove('tab-active');
    document.getElementById('tab-' + t).classList.add('tab-inactive');
  });
  document.getElementById('section-' + tab).classList.remove('hidden');
  document.getElementById('tab-' + tab).classList.add('tab-active');
  document.getElementById('tab-' + tab).classList.remove('tab-inactive');
  if (tab === 'claim') render();
}

function resetAnalytics() {
  document.getElementById('upload-section').classList.remove('hidden');
  document.getElementById('analytics-results').classList.add('hidden');
  document.getElementById('lossRunFile').value = '';
}

function exportToPDF() {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF('p', 'mm', 'a4');
  var pageWidth = doc.internal.pageSize.getWidth();
  var margin = 15;
  var y = 20;
  
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Loss Run Analysis Report', pageWidth/2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Generated: ' + new Date().toLocaleDateString() + ' | Titanium Defense Group', pageWidth/2, 28, { align: 'center' });
  
  y = 45;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  var stats = [
    'Total Claims: ' + document.getElementById('stat-total-claims').textContent,
    'Total Incurred: ' + document.getElementById('stat-total-incurred').textContent,
    'Average Cost: ' + document.getElementById('stat-avg-claim').textContent,
    'Open Claims: ' + document.getElementById('stat-open-claims').textContent
  ];
  stats.forEach(function(s) { doc.text(s, margin, y); y += 6; });
  
  y += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Risk Insights', margin, y);
  y += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  var insights = document.querySelectorAll('#ai-insights .insight-card');
  insights.forEach(function(insight, idx) {
    if (idx < 6 && y < 260) {
      var title = insight.querySelector('h5').textContent;
      doc.setFont('helvetica', 'bold');
      doc.text((idx + 1) + '. ' + title, margin, y);
      y += 10;
    }
  });
  
  doc.save('Loss_Run_Analysis_' + new Date().toISOString().split('T')[0] + '.pdf');
}

function processLossRun(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var data = new Uint8Array(e.target.result);
    var workbook = XLSX.read(data, { type: 'array', cellDates: true });
    var sheet = workbook.Sheets[workbook.SheetNames[0]];
    analysisData = XLSX.utils.sheet_to_json(sheet);
    analyzeData(analysisData);
  };
  reader.readAsArrayBuffer(file);
}

function analyzeData(data) {
  document.getElementById('upload-section').classList.add('hidden');
  document.getElementById('analytics-results').classList.remove('hidden');
  document.getElementById('report-date').textContent = new Date().toLocaleDateString();
  
  var totalClaims = data.length;
  var totalIncurred = data.reduce(function(sum, row) { return sum + (parseFloat(row.TotalIncurred) || 0); }, 0);
  var avgClaim = totalClaims > 0 ? totalIncurred / totalClaims : 0;
  var openClaims = data.filter(function(row) { return row.ClaimantStatus === 'O'; });
  var openReserve = openClaims.reduce(function(sum, row) { return sum + (parseFloat(row.TotalIncurred) || 0); }, 0);
  
  var indemnity = data.reduce(function(sum, row) { return sum + (parseFloat(row.IndemnityIncurred) || 0); }, 0);
  var medical = data.reduce(function(sum, row) { return sum + (parseFloat(row.MedicalIncurred) || 0); }, 0);
  var legal = data.reduce(function(sum, row) { return sum + (parseFloat(row.LegalIncurred) || 0); }, 0);
  var expense = data.reduce(function(sum, row) { return sum + (parseFloat(row.ExpenseIncurred) || 0); }, 0);
  
  document.getElementById('stat-total-claims').textContent = totalClaims.toLocaleString();
  document.getElementById('stat-total-incurred').textContent = '$' + Math.round(totalIncurred).toLocaleString();
  document.getElementById('stat-avg-claim').textContent = '$' + Math.round(avgClaim).toLocaleString();
  document.getElementById('stat-open-claims').textContent = openClaims.length;
  document.getElementById('stat-open-reserve').textContent = '$' + Math.round(openReserve).toLocaleString();
  
  document.getElementById('cost-indemnity').textContent = '$' + Math.round(indemnity).toLocaleString();
  document.getElementById('cost-medical').textContent = '$' + Math.round(medical).toLocaleString();
  document.getElementById('cost-legal').textContent = '$' + Math.round(legal).toLocaleString();
  document.getElementById('cost-expense').textContent = '$' + Math.round(expense).toLocaleString();
  
  if (totalIncurred > 0) {
    document.getElementById('cost-indemnity-pct').textContent = Math.round(indemnity/totalIncurred*100) + '% of total';
    document.getElementById('cost-medical-pct').textContent = Math.round(medical/totalIncurred*100) + '% of total';
    document.getElementById('cost-legal-pct').textContent = Math.round(legal/totalIncurred*100) + '% of total';
    document.getElementById('cost-expense-pct').textContent = Math.round(expense/totalIncurred*100) + '% of total';
  }
  
  var dates = data.map(function(row) { return row.LossDate ? new Date(row.LossDate) : null; }).filter(function(d) { return d && !isNaN(d); });
  if (dates.length > 0) {
    var minDate = new Date(Math.min.apply(null, dates));
    var maxDate = new Date(Math.max.apply(null, dates));
    document.getElementById('analysis-period').textContent = minDate.toLocaleDateString() + ' - ' + maxDate.toLocaleDateString();
  }
  
  var riskScore = calculateRiskScore(data, totalIncurred, avgClaim, openClaims.length, totalClaims);
  updateRiskDisplay(riskScore);
  generateAIInsights(data, totalIncurred, avgClaim, indemnity, medical);
  generateActionPlan();
  generateHighCostClaims(data);
  createCharts(data);
  createClaimsTable(data);
}

function calculateRiskScore(data, totalIncurred, avgClaim, openCount, totalClaims) {
  var score = 100;
  if (avgClaim > 50000) score -= 25; else if (avgClaim > 25000) score -= 15; else if (avgClaim > 10000) score -= 8;
  var openRatio = openCount / totalClaims;
  if (openRatio > 0.5) score -= 20; else if (openRatio > 0.3) score -= 12; else if (openRatio > 0.2) score -= 6;
  if (totalIncurred > 1000000) score -= 20; else if (totalIncurred > 500000) score -= 12; else if (totalIncurred > 100000) score -= 5;
  if (totalClaims > 100) score -= 15; else if (totalClaims > 50) score -= 8; else if (totalClaims > 20) score -= 3;
  return Math.max(0, Math.min(100, score));
}

function updateRiskDisplay(score) {
  document.getElementById('risk-score').textContent = score;
  var circle = document.getElementById('risk-circle');
  var offset = 283 - (score / 100 * 283);
  circle.style.strokeDashoffset = offset;
  
  var levelEl = document.getElementById('risk-level');
  if (score >= 80) { circle.style.stroke = '#22c55e'; levelEl.textContent = 'Low Risk'; levelEl.className = 'text-center mt-4 py-2 px-4 rounded-full text-sm font-semibold bg-green-100 text-green-800'; }
  else if (score >= 60) { circle.style.stroke = '#f59e0b'; levelEl.textContent = 'Moderate Risk'; levelEl.className = 'text-center mt-4 py-2 px-4 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800'; }
  else if (score >= 40) { circle.style.stroke = '#f97316'; levelEl.textContent = 'Elevated Risk'; levelEl.className = 'text-center mt-4 py-2 px-4 rounded-full text-sm font-semibold bg-orange-100 text-orange-800'; }
  else { circle.style.stroke = '#dc2626'; levelEl.textContent = 'High Risk'; levelEl.className = 'text-center mt-4 py-2 px-4 rounded-full text-sm font-semibold bg-red-100 text-red-800'; }
}
]) {
    var topBP = sortedBodyParts[0][0], bpCount = sortedBodyParts[0][1];
    var bpPct = Math.round(bpCount / data.length * 100);
    var bodyAdvice = 'Implement targeted ergonomic interventions and protective equipment.';
    if (topBP.toLowerCase().includes('back') || topBP.toLowerCase().includes('lumbar')) bodyAdvice = 'Implement ergonomic assessments, mechanical lifting aids, and mandatory lifting training. Consider job rotation.';
    else if (topBP.toLowerCase().includes('knee')) bodyAdvice = 'Require knee pads for floor work, address slippery surfaces, consider job modifications.';
    else if (topBP.toLowerCase().includes('shoulder')) bodyAdvice = 'Evaluate overhead work, implement stretching programs, consider tool counterbalances.';
    else if (topBP.toLowerCase().includes('hand') || topBP.toLowerCase().includes('finger')) bodyAdvice = 'Review cut-resistant glove requirements, implement lockout/tagout, conduct machine guarding audits.';
    
    insights.push({
      priority: 'high',
      title: 'Vulnerable Body Part: ' + topBP,
      description: topBP + ' injuries represent ' + bpPct + '% of all claims (' + bpCount + ' claims). This indicates systematic exposure requiring targeted interventions.',
      action: bodyAdvice
    });
  }
  
  if (sortedCauses[0]) {
    var topCause = sortedCauses[0][0], causeCount = sortedCauses[0][1];
    insights.push({
      priority: 'high',
      title: 'Root Cause: ' + (topCause.length > 50 ? topCause.substring(0,50) + '...' : topCause),
      description: 'This cause accounts for ' + Math.round(causeCount/data.length*100) + '% of incidents. Detailed root cause analysis will help develop specific prevention strategies.',
      action: 'Conduct detailed investigation and implement engineering or administrative controls'
    });
  }
  
  if (totalIncurred > 0 && indemnity / totalIncurred > 0.5) {
    insights.push({
      priority: 'high',
      title: 'High Lost-Time Impact',
      description: 'Indemnity costs (' + Math.round(indemnity/totalIncurred*100) + '% of total) indicate significant lost work time. Early return-to-work programs typically reduce these costs 30-50%.',
      action: 'Implement modified duty/transitional work program immediately'
    });
  }
  
  var openClaims = data.filter(function(row) { return row.ClaimantStatus === 'O'; });
  if (openClaims.length > data.length * 0.3) {
    insights.push({
      priority: 'medium',
      title: 'Open Claim Management Needed',
      description: Math.round(openClaims.length/data.length*100) + '% of claims remain open. Active management and timely closure reduces reserves and administrative costs.',
      action: 'Review all claims open over 90 days for closure opportunities'
    });
  }
  
  if (avgClaim > 25000) {
    insights.push({
      priority: 'high',
      title: 'Elevated Claim Severity',
      description: 'Average claim cost of $' + Math.round(avgClaim).toLocaleString() + ' exceeds typical benchmarks. Focus on early intervention and medical management.',
      action: 'Implement 24-hour injury reporting and nurse triage hotline'
    });
  }
  
  insights.push({
    priority: 'low',
    title: 'Best Practice: Early Reporting',
    description: 'Claims reported within 24 hours cost 18-30% less than those reported after 3+ days. Ensure supervisors understand immediate reporting importance.',
    action: 'Train all supervisors on immediate injury response protocols'
  });
  
  var html = '';
  insights.forEach(function(ins) {
    var colors = { critical: ['red', '!'], high: ['amber', '↑'], medium: ['blue', '→'], low: ['green', '✓'] };
    var c = colors[ins.priority];
    html += '<div class="insight-card priority-' + ins.priority + ' rounded-lg p-4">';
    html += '<div class="flex items-start gap-3">';
    html += '<div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-' + c[0] + '-200 text-' + c[0] + '-700 font-bold">' + c[1] + '</div>';
    html += '<div class="flex-1">';
    html += '<div class="flex items-center gap-2 mb-1"><h5 class="font-bold text-slate-800">' + ins.title + '</h5>';
    html += '<span class="text-xs px-2 py-0.5 rounded-full bg-' + c[0] + '-100 text-' + c[0] + '-700">' + ins.priority.charAt(0).toUpperCase() + ins.priority.slice(1) + '</span></div>';
    html += '<p class="text-sm text-slate-600 mb-2">' + ins.description + '</p>';
    html += '<div class="text-sm font-medium text-slate-700 bg-white/50 px-3 py-1.5 rounded inline-block">→ ' + ins.action + '</div>';
    html += '</div></div></div>';
  });
  document.getElementById('ai-insights').innerHTML = html;
}

function generateActionPlan() {
  var actions = [
    { title: '30-Day Actions', items: ['Review all open claims for closure', 'Implement 24-hour reporting policy', 'Schedule safety stand-down meeting'] },
    { title: '60-Day Actions', items: ['Complete ergonomic assessments', 'Deploy targeted training programs', 'Establish return-to-work committee'] },
    { title: '90-Day Actions', items: ['Measure KPI improvements', 'Adjust programs based on results', 'Report progress to leadership'] },
    { title: 'Ongoing', items: ['Monthly claim reviews', 'Quarterly trend analysis', 'Annual program evaluation'] }
  ];
  var html = '';
  actions.forEach(function(sec) {
    html += '<div class="bg-white/10 backdrop-blur rounded-xl p-4"><h5 class="font-bold mb-3">' + sec.title + '</h5><ul class="space-y-2 text-sm text-emerald-100">';
    sec.items.forEach(function(item) { html += '<li class="flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path></svg>' + item + '</li>'; });
    html += '</ul></div>';
  });
  document.getElementById('action-plan').innerHTML = html;
}

function generateHighCostClaims(data) {
  var sorted = data.slice().sort(function(a,b) { return (b.TotalIncurred || 0) - (a.TotalIncurred || 0); }).slice(0, 5);
  var html = '';
  sorted.forEach(function(claim, idx) {
    var lossDate = claim.LossDate ? new Date(claim.LossDate).toLocaleDateString() : 'N/A';
    var status = claim.ClaimantStatus === 'O' ? 'OPEN' : 'CLOSED';
    var statusClass = claim.ClaimantStatus === 'O' ? 'bg-yellow-400 text-yellow-900' : 'bg-green-400 text-green-900';
    html += '<div class="bg-white/10 backdrop-blur rounded-xl p-4 flex justify-between items-center">';
    html += '<div class="flex items-center gap-4"><div class="text-3xl font-bold text-white/30">#' + (idx+1) + '</div>';
    html += '<div><div class="font-bold">' + (claim.ClaimantFirstName || '') + ' ' + (claim.ClaimantLastName || '') + '</div>';
    html += '<div class="text-sm text-red-200">' + (claim.LossTypeDesc || 'N/A') + ' - ' + (claim.PartInjuredDesc || 'N/A') + '</div>';
    html += '<div class="text-xs text-red-300 mt-1">Loss Date: ' + lossDate + '</div></div></div>';
    html += '<div class="text-right"><div class="text-2xl font-bold">$' + Math.round(claim.TotalIncurred || 0).toLocaleString() + '</div>';
    html += '<span class="text-xs px-2 py-1 rounded-full ' + statusClass + '">' + status + '</span></div></div>';
  });
  document.getElementById('high-cost-claims').innerHTML = html;
}

function createCharts(data) {
  Object.keys(chartInstances).forEach(function(key) { if (chartInstances[key]) chartInstances[key].destroy(); });
  
  var statusCounts = { 'Open': 0, 'Closed': 0 };
  data.forEach(function(row) { if (row.ClaimantStatus === 'O') statusCounts['Open']++; else statusCounts['Closed']++; });
  chartInstances.statusChart = new Chart(document.getElementById('statusChart'), {
    type: 'doughnut',
    data: { labels: Object.keys(statusCounts), datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#f59e0b', '#22c55e'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
  
  var monthlyData = {};
  data.forEach(function(row) {
    if (row.LossDate) {
      var d = new Date(row.LossDate);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (!monthlyData[key]) monthlyData[key] = { count: 0, cost: 0 };
      monthlyData[key].count++;
      monthlyData[key].cost += parseFloat(row.TotalIncurred) || 0;
    }
  });
  var sortedMonths = Object.keys(monthlyData).sort();
  chartInstances.trendChart = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: sortedMonths.map(function(m) { var p = m.split('-'); return p[1] + '/' + p[0].slice(2); }),
      datasets: [
        { label: 'Claims', data: sortedMonths.map(function(m) { return monthlyData[m].count; }), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4, yAxisID: 'y' },
        { label: 'Cost ($)', data: sortedMonths.map(function(m) { return monthlyData[m].cost; }), borderColor: '#ef4444', backgroundColor: 'transparent', tension: 0.4, yAxisID: 'y1' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { position: 'left', title: { display: true, text: 'Claims' } }, y1: { position: 'right', title: { display: true, text: 'Cost ($)' }, grid: { drawOnChartArea: false } } } }
  });
  
  var injuryData = {};
  data.forEach(function(row) { var inj = row.LossTypeDesc || 'Unknown'; if (!injuryData[inj]) injuryData[inj] = 0; injuryData[inj] += parseFloat(row.TotalIncurred) || 0; });
  var sortedInjuries = Object.entries(injuryData).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 8);
  chartInstances.injuryChart = new Chart(document.getElementById('injuryChart'), {
    type: 'bar',
    data: { labels: sortedInjuries.map(function(x) { return x[0].length > 25 ? x[0].substring(0,25) + '...' : x[0]; }), datasets: [{ label: 'Cost ($)', data: sortedInjuries.map(function(x) { return x[1]; }), backgroundColor: '#3b82f6' }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
  });
  
  var bodyPartData = {};
  data.forEach(function(row) { var bp = row.PartInjuredDesc || 'Unknown'; bodyPartData[bp] = (bodyPartData[bp] || 0) + 1; });
  var sortedBP = Object.entries(bodyPartData).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 8);
  chartInstances.bodyPartChart = new Chart(document.getElementById('bodyPartChart'), {
    type: 'bar',
    data: { labels: sortedBP.map(function(x) { return x[0]; }), datasets: [{ label: 'Claims', data: sortedBP.map(function(x) { return x[1]; }), backgroundColor: '#10b981' }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
  });
  
  var causeData = {};
  data.forEach(function(row) { var c = (row.ResultingInjuryDesc || row.CauseDesc || 'Unknown').substring(0, 35); causeData[c] = (causeData[c] || 0) + 1; });
  var sortedCauses = Object.entries(causeData).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 10);
  chartInstances.causeChart = new Chart(document.getElementById('causeChart'), {
    type: 'bar',
    data: { labels: sortedCauses.map(function(x) { return x[0]; }), datasets: [{ label: 'Claims', data: sortedCauses.map(function(x) { return x[1]; }), backgroundColor: '#8b5cf6' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function createClaimsTable(data) {
  var sorted = data.slice().sort(function(a,b) { return (b.TotalIncurred || 0) - (a.TotalIncurred || 0); });
  var html = '';
  sorted.forEach(function(row, idx) {
    var lossDate = row.LossDate ? new Date(row.LossDate).toLocaleDateString() : 'N/A';
    var statusClass = row.ClaimantStatus === 'O' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800';
    var statusText = row.ClaimantStatus === 'O' ? 'Open' : 'Closed';
    var rowClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
    html += '<tr class="' + rowClass + ' hover:bg-blue-50"><td class="px-4 py-3">' + lossDate + '</td>';
    html += '<td class="px-4 py-3 font-medium">' + (row.ClaimantFirstName || '') + ' ' + (row.ClaimantLastName || '') + '</td>';
    html += '<td class="px-4 py-3">' + (row.LossTypeDesc || 'N/A') + '</td>';
    html += '<td class="px-4 py-3">' + (row.PartInjuredDesc || 'N/A') + '</td>';
    html += '<td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-semibold ' + statusClass + '">' + statusText + '</span></td>';
    html += '<td class="px-4 py-3 text-right font-bold">$' + Math.round(row.TotalIncurred || 0).toLocaleString() + '</td></tr>';
  });
  document.getElementById('claims-table-body').innerHTML = html;
}

// C-240 Functions
var c240PayrollData = [];

function processPayrollFile(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var data = new Uint8Array(e.target.result);
    var workbook = XLSX.read(data, { type: 'array', cellDates: true });
    var sheet = workbook.Sheets[workbook.SheetNames[0]];
    var jsonData = XLSX.utils.sheet_to_json(sheet);
    c240PayrollData = jsonData.map(function(row, idx) {
      var weekEnd = row['Week Ending'] || row['Week Ending Date'] || row['Date'] || row['Pay Date'] || Object.values(row)[0];
      var days = row['Days'] || row['Days Paid'] || row['Days Worked'] || 5;
      var gross = row['Gross'] || row['Gross Amount'] || row['Gross Pay'] || row['Amount'] || Object.values(row)[Object.values(row).length - 1] || 0;
      return { week: idx + 1, weekEnding: weekEnd instanceof Date ? weekEnd : new Date(weekEnd), daysPaid: parseFloat(days) || 5, grossAmount: parseFloat(String(gross).replace(/[$,]/g, '')) || 0 };
    }).filter(function(row) { return !isNaN(row.grossAmount) && row.grossAmount > 0; }).slice(0, 52);
    document.getElementById('c240-fileName').textContent = file.name + ' loaded';
    document.getElementById('c240-fileStatus').classList.remove('hidden');
    document.getElementById('c240-generateBtn').disabled = false;
    updatePayrollSummary();
    updatePayrollPreview();
  };
  reader.readAsArrayBuffer(file);
}

function updatePayrollSummary() {
  if (c240PayrollData.length === 0) { document.getElementById('c240-payrollSummary').innerHTML = '<p class="text-slate-400">No data loaded.</p>'; return; }
  var totalDays = c240PayrollData.reduce(function(s, r) { return s + r.daysPaid; }, 0);
  var totalGross = c240PayrollData.reduce(function(s, r) { return s + r.grossAmount; }, 0);
  document.getElementById('c240-payrollSummary').innerHTML = '<div class="space-y-3"><div class="flex justify-between"><span class="text-slate-300">Weeks:</span><span class="font-bold text-green-400">' + c240PayrollData.length + ' of 52</span></div><div class="flex justify-between"><span class="text-slate-300">Total Days:</span><span class="font-bold">' + totalDays + '</span></div><div class="flex justify-between"><span class="text-slate-300">Total Gross:</span><span class="font-bold text-green-400">$' + totalGross.toLocaleString(undefined, {minimumFractionDigits: 2}) + '</span></div></div>';
}

function updatePayrollPreview() {
  if (c240PayrollData.length === 0) { document.getElementById('c240-payrollPreview').classList.add('hidden'); return; }
  document.getElementById('c240-payrollPreview').classList.remove('hidden');
  var html = '', totalDays = 0, totalGross = 0;
  c240PayrollData.forEach(function(row, idx) {
    var dateStr = row.weekEnding instanceof Date && !isNaN(row.weekEnding) ? row.weekEnding.toLocaleDateString() : 'N/A';
    totalDays += row.daysPaid; totalGross += row.grossAmount;
    html += '<tr class="' + (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50') + '"><td class="px-4 py-2">' + row.week + '</td><td class="px-4 py-2">' + dateStr + '</td><td class="px-4 py-2 text-center">' + row.daysPaid + '</td><td class="px-4 py-2 text-right">$' + row.grossAmount.toLocaleString(undefined, {minimumFractionDigits: 2}) + '</td></tr>';
  });
  document.getElementById('c240-payrollTableBody').innerHTML = html;
  document.getElementById('c240-totalDays').textContent = totalDays;
  document.getElementById('c240-totalGross').textContent = '$' + totalGross.toLocaleString(undefined, {minimumFractionDigits: 2});
}

async function generateC240() {
  if (c240PayrollData.length === 0) { alert('Upload payroll data first.'); return; }
  try {
    var response = await fetch('https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/C240.pdf');
    var pdfDoc = await PDFLib.PDFDocument.load(await response.arrayBuffer());
    var form = pdfDoc.getForm();
    function setField(n, v) { try { var f = form.getTextField(n); if (f && v) f.setText(String(v)); } catch(e) {} }
    function formatDate(d) { if (!d) return ''; var dt = new Date(d); return isNaN(dt) ? '' : (dt.getMonth()+1) + '/' + dt.getDate() + '/' + dt.getFullYear(); }
    setField('form1[0].#pageSet[0].Page3[0].injuryDate[0]', formatDate(document.getElementById('c240-injuryDate').value));
    c240PayrollData.forEach(function(row, idx) {
      var wn = idx + 1, rn = ((wn - 1) % 18) + 1;
      if (wn <= 52) {
        setField('form1[0].#subform[10].#subform[21].Table1[0].Row' + rn + '[0].weekEndingDate' + wn + '[0]', row.weekEnding instanceof Date ? formatDate(row.weekEnding) : '');
        setField('form1[0].#subform[10].#subform[21].Table1[0].Row' + rn + '[0].daysWorked' + wn + '[0]', row.daysPaid.toString());
        setField('form1[0].#subform[10].#subform[21].Table1[0].Row' + rn + '[0].grossAmountPaid' + wn + '[0]', row.grossAmount.toFixed(2));
      }
    });
    var totalDays = c240PayrollData.reduce(function(s, r) { return s + r.daysPaid; }, 0);
    var totalGross = c240PayrollData.reduce(function(s, r) { return s + r.grossAmount; }, 0);
    setField('form1[0].#subform[10].#subform[14].totalDaysPaid[0]', totalDays.toString());
    setField('form1[0].#subform[10].#subform[14].totalGrossPaid[0]', '$' + totalGross.toFixed(2));
    setField('form1[0].#subform[10].#subform[21].Table1[0].Row17[0].totalDaysWorked[0]', totalDays.toString());
    setField('form1[0].#subform[10].#subform[21].Table1[0].Row17[0].totalGrossPaid[0]', totalGross.toFixed(2));
    form.flatten();
    var blob = new Blob([await pdfDoc.save()], { type: 'application/pdf' });
    var link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'C240_' + new Date().toISOString().split('T')[0] + '.pdf'; link.click();
  } catch (err) { alert('Error: ' + err.message); }
}

// FROI Claim Form
var currentStep = 0;
var formData = {firstName:'',lastName:'',mailingAddress:'',city:'',state:'',zipCode:'',phone:'',dateOfHire:'',dateOfBirth:'',gender:'',ssn:'',occupation:'',preferredLanguage:'',dateOfInjury:'',timeOfInjury:'',dateReported:'',weeklyWage:'',employeeWorkType:'',medicalTreatment:'',facilityName:'',resultedInDeath:'',natureOfInjury:'',bodyPartInjured:'',causeOfInjury:'',accidentDescription:'',losingTime:'',dateLastWorked:'',returnStatus:'',facilityStreet:'',facilityCity:'',facilityState:'',facilityZip:'',accidentStreet:'',accidentCity:'',accidentState:'',accidentZip:'',witness1Name:'',witness1Phone:'',witness2Name:'',witness2Phone:'',submitterName:'',submitterPhone:'',submitterEmail:'',additionalComments:'',redFlags:''};
var states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
var steps = ['Employee Info','Claim Details','Injury Info','Work Status','Location','Submit'];

function stateOptions(sel) { return states.map(function(s) { return '<option value="' + s + '"' + (sel === s ? ' selected' : '') + '>' + s + '</option>'; }).join(''); }

function render() {
  var html = '<div class="mb-6"><div class="flex justify-between mb-4">';
  for (var i = 0; i < steps.length; i++) {
    var bg = i < currentStep ? 'bg-green-500' : i === currentStep ? 'bg-slate-700' : 'bg-slate-300';
    var text = i <= currentStep ? 'text-white' : 'text-slate-500';
    html += '<div class="flex items-center"><div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ' + bg + ' ' + text + '">' + (i < currentStep ? '✓' : (i + 1)) + '</div>';
    if (i < steps.length - 1) html += '<div class="w-8 h-0.5 mx-1 ' + (i < currentStep ? 'bg-green-500' : 'bg-slate-300') + '"></div>';
    html += '</div>';
  }
  html += '</div></div>';

  if (currentStep === 0) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Employee Personal Information</h3><div class="grid md:grid-cols-2 gap-4">';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">First Name *</label><input type="text" id="firstName" value="' + formData.firstName + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Last Name *</label><input type="text" id="lastName" value="' + formData.lastName + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div class="md:col-span-2"><label class="block text-sm font-medium text-slate-700 mb-1">Mailing Address *</label><input type="text" id="mailingAddress" value="' + formData.mailingAddress + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">City *</label><input type="text" id="city" value="' + formData.city + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div class="grid grid-cols-2 gap-2"><div><label class="block text-sm font-medium text-slate-700 mb-1">State *</label><select id="state" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option>' + stateOptions(formData.state) + '</select></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Zip *</label><input type="text" id="zipCode" value="' + formData.zipCode + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Phone *</label><input type="tel" id="phone" value="' + formData.phone + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Date of Hire *</label><input type="date" id="dateOfHire" value="' + formData.dateOfHire + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label><input type="date" id="dateOfBirth" value="' + formData.dateOfBirth + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Gender</label><select id="gender" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="male"' + (formData.gender === 'male' ? ' selected' : '') + '>Male</option><option value="female"' + (formData.gender === 'female' ? ' selected' : '') + '>Female</option></select></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">SSN *</label><input type="text" id="ssn" value="' + formData.ssn + '" placeholder="XXX-XX-XXXX" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Occupation *</label><input type="text" id="occupation" value="' + formData.occupation + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Preferred Language</label><input type="text" id="preferredLanguage" value="' + formData.preferredLanguage + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '</div>';
  } else if (currentStep === 1) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Claim Information</h3><div class="grid md:grid-cols-2 gap-4">';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Date of Injury *</label><input type="date" id="dateOfInjury" value="' + formData.dateOfInjury + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Time of Injury</label><input type="time" id="timeOfInjury" value="' + formData.timeOfInjury + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Date Reported *</label><input type="date" id="dateReported" value="' + formData.dateReported + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Weekly Wage</label><input type="number" id="weeklyWage" value="' + formData.weeklyWage + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Work Type</label><select id="employeeWorkType" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="fulltime"' + (formData.employeeWorkType === 'fulltime' ? ' selected' : '') + '>Full Time</option><option value="parttime"' + (formData.employeeWorkType === 'parttime' ? ' selected' : '') + '>Part Time</option></select></div>';
    html += '</div>';
  } else if (currentStep === 2) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Injury Information</h3><div class="space-y-4">';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Medical Treatment</label><select id="medicalTreatment" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="none"' + (formData.medicalTreatment === 'none' ? ' selected' : '') + '>No treatment</option><option value="minor"' + (formData.medicalTreatment === 'minor' ? ' selected' : '') + '>Minor treatment</option><option value="hospital"' + (formData.medicalTreatment === 'hospital' ? ' selected' : '') + '>Hospitalization</option></select></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Treatment Facility</label><input type="text" id="facilityName" value="' + formData.facilityName + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div class="grid md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Nature of Injury *</label><input type="text" id="natureOfInjury" value="' + formData.natureOfInjury + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Body Part *</label><input type="text" id="bodyPartInjured" value="' + formData.bodyPartInjured + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Cause *</label><input type="text" id="causeOfInjury" value="' + formData.causeOfInjury + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Description *</label><textarea id="accidentDescription" rows="4" class="w-full px-3 py-2 border border-slate-300 rounded-lg">' + formData.accidentDescription + '</textarea></div>';
    html += '</div>';
  } else if (currentStep === 3) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Work Status</h3><div class="space-y-4">';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Losing time?</label><select id="losingTime" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="yes"' + (formData.losingTime === 'yes' ? ' selected' : '') + '>Yes</option><option value="no"' + (formData.losingTime === 'no' ? ' selected' : '') + '>No</option></select></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Date Last Worked</label><input type="date" id="dateLastWorked" value="' + formData.dateLastWorked + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Return Status</label><select id="returnStatus" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="no"' + (formData.returnStatus === 'no' ? ' selected' : '') + '>No</option><option value="fullduty"' + (formData.returnStatus === 'fullduty' ? ' selected' : '') + '>Full Duty</option><option value="restrictions"' + (formData.returnStatus === 'restrictions' ? ' selected' : '') + '>Restrictions</option></select></div>';
    html += '</div>';
  } else if (currentStep === 4) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Location & Witnesses</h3>';
    html += '<h4 class="font-medium mb-2">Facility Location</h4><div class="grid md:grid-cols-4 gap-4 mb-4"><div class="md:col-span-2"><input type="text" id="facilityStreet" value="' + formData.facilityStreet + '" placeholder="Street" class="w-full px-3 py-2 border rounded-lg"></div><div><input type="text" id="facilityCity" value="' + formData.facilityCity + '" placeholder="City" class="w-full px-3 py-2 border rounded-lg"></div><div class="grid grid-cols-2 gap-2"><select id="facilityState" class="px-2 py-2 border rounded-lg"><option value="">ST</option>' + stateOptions(formData.facilityState) + '</select><input type="text" id="facilityZip" value="' + formData.facilityZip + '" placeholder="Zip" class="px-2 py-2 border rounded-lg"></div></div>';
    html += '<h4 class="font-medium mb-2">Accident Location</h4><div class="grid md:grid-cols-4 gap-4 mb-4"><div class="md:col-span-2"><input type="text" id="accidentStreet" value="' + formData.accidentStreet + '" placeholder="Street" class="w-full px-3 py-2 border rounded-lg"></div><div><input type="text" id="accidentCity" value="' + formData.accidentCity + '" placeholder="City" class="w-full px-3 py-2 border rounded-lg"></div><div class="grid grid-cols-2 gap-2"><select id="accidentState" class="px-2 py-2 border rounded-lg"><option value="">ST</option>' + stateOptions(formData.accidentState) + '</select><input type="text" id="accidentZip" value="' + formData.accidentZip + '" placeholder="Zip" class="px-2 py-2 border rounded-lg"></div></div>';
    html += '<h4 class="font-medium mb-2">Witnesses</h4><div class="space-y-2"><div class="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg"><input type="text" id="witness1Name" value="' + formData.witness1Name + '" placeholder="Witness 1 Name" class="px-3 py-2 border rounded-lg"><input type="tel" id="witness1Phone" value="' + formData.witness1Phone + '" placeholder="Phone" class="px-3 py-2 border rounded-lg"></div><div class="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg"><input type="text" id="witness2Name" value="' + formData.witness2Name + '" placeholder="Witness 2 Name" class="px-3 py-2 border rounded-lg"><input type="tel" id="witness2Phone" value="' + formData.witness2Phone + '" placeholder="Phone" class="px-3 py-2 border rounded-lg"></div></div>';
  } else if (currentStep === 5) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Submit Claim</h3><div class="grid md:grid-cols-2 gap-4 mb-4">';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Your Name *</label><input type="text" id="submitterName" value="' + formData.submitterName + '" class="w-full px-3 py-2 border rounded-lg"></div>';
    html += '<div><label class="block text-sm font-medium text-slate-700 mb-1">Your Phone *</label><input type="tel" id="submitterPhone" value="' + formData.submitterPhone + '" class="w-full px-3 py-2 border rounded-lg"></div>';
    html += '<div class="md:col-span-2"><label class="block text-sm font-medium text-slate-700 mb-1">Your Email *</label><input type="email" id="submitterEmail" value="' + formData.submitterEmail + '" class="w-full px-3 py-2 border rounded-lg"></div></div>';
    html += '<div class="mb-4"><label class="block text-sm font-medium text-slate-700 mb-1">Comments</label><textarea id="additionalComments" rows="3" class="w-full px-3 py-2 border rounded-lg">' + formData.additionalComments + '</textarea></div>';
    html += '<div class="mb-4"><label class="block text-sm font-medium text-slate-700 mb-1">Red Flags</label><textarea id="redFlags" rows="3" class="w-full px-3 py-2 border rounded-lg">' + formData.redFlags + '</textarea></div>';
    html += '<div class="mb-4"><label class="block text-sm font-medium text-slate-700 mb-1">Documents</label><input type="file" id="files" multiple class="w-full px-3 py-2 border rounded-lg"></div>';
    html += '<div class="p-4 bg-amber-50 border border-amber-200 rounded-lg"><p class="text-sm text-amber-800"><strong>Review before submitting.</strong></p></div>';
  }

  html += '<div class="flex justify-between mt-8 pt-6 border-t"><button type="button" onclick="prevStep()" class="px-6 py-2 rounded-lg font-medium ' + (currentStep === 0 ? 'bg-slate-100 text-slate-400' : 'bg-slate-200 text-slate-700 hover:bg-slate-300') + '">← Back</button>';
  if (currentStep < 5) html += '<button type="button" onclick="nextStep()" class="px-6 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800">Continue →</button>';
  else html += '<button type="button" onclick="submitClaim()" id="submitBtn" class="px-8 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Submit Claim</button>';
  html += '</div>';
  document.getElementById('form-container').innerHTML = html;
}

function saveCurrentStep() {
  var fields = ['firstName','lastName','mailingAddress','city','state','zipCode','phone','dateOfHire','dateOfBirth','gender','ssn','occupation','preferredLanguage','dateOfInjury','timeOfInjury','dateReported','weeklyWage','employeeWorkType','medicalTreatment','facilityName','resultedInDeath','natureOfInjury','bodyPartInjured','causeOfInjury','accidentDescription','losingTime','dateLastWorked','returnStatus','facilityStreet','facilityCity','facilityState','facilityZip','accidentStreet','accidentCity','accidentState','accidentZip','witness1Name','witness1Phone','witness2Name','witness2Phone','submitterName','submitterPhone','submitterEmail','additionalComments','redFlags'];
  fields.forEach(function(f) { var el = document.getElementById(f); if (el) formData[f] = el.value; });
}

function nextStep() { saveCurrentStep(); if (currentStep < 5) { currentStep++; render(); } }
function prevStep() { saveCurrentStep(); if (currentStep > 0) { currentStep--; render(); } }

function submitClaim() {
  saveCurrentStep();
  var btn = document.getElementById('submitBtn');
  btn.disabled = true; btn.textContent = 'Submitting...';
  var fd = new FormData();
  fd.append('formData', JSON.stringify(formData));
  var filesInput = document.getElementById('files');
  if (filesInput && filesInput.files) { for (var i = 0; i < filesInput.files.length; i++) fd.append('file_' + i, filesInput.files[i]); }
  fetch('/api/submit-claim', { method: 'POST', body: fd })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        document.getElementById('form-container').innerHTML = '<div class="text-center py-8"><div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div><h2 class="text-2xl font-bold text-slate-800 mb-2">Claim Submitted!</h2><p class="text-slate-600 mb-4">Reference: ' + data.referenceNumber + '</p><button type="button" onclick="location.reload()" class="px-6 py-2 bg-slate-700 text-white rounded-lg">Submit Another</button></div>';
      } else { alert('Error: ' + data.error); btn.disabled = false; btn.textContent = 'Submit Claim'; }
    })
    .catch(function() { alert('Error submitting'); btn.disabled = false; btn.textContent = 'Submit Claim'; });
}

render();
<\/script>
</body>
</html>`;

app.get('/', function(req, res) { res.send(HTML); });
app.listen(PORT, function() { console.log('Server running on port ' + PORT); });
