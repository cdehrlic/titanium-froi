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

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f').text('EMPLOYEE PERSONAL INFORMATION');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text('Name: ' + (formData.firstName || '') + ' ' + (formData.lastName || ''));
    doc.text('Address: ' + (formData.mailingAddress || '') + ', ' + (formData.city || '') + ', ' + (formData.state || '') + ' ' + (formData.zipCode || ''));
    doc.text('Phone: ' + (formData.phone || 'N/A'));
    doc.text('Date of Birth: ' + (formData.dateOfBirth || 'N/A'));
    doc.text('Date of Hire: ' + (formData.dateOfHire || 'N/A'));
    doc.text('Gender: ' + (formData.gender || 'N/A'));
    doc.text('SSN: ' + (formData.ssn ? 'XXX-XX-' + formData.ssn.slice(-4) : 'N/A'));
    doc.text('Occupation: ' + (formData.occupation || 'N/A'));
    doc.text('Preferred Language: ' + (formData.preferredLanguage || 'N/A'));
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f').text('CLAIM INFORMATION');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text('Date of Injury: ' + (formData.dateOfInjury || 'N/A'));
    doc.text('Time of Injury: ' + (formData.timeOfInjury || 'N/A'));
    doc.text('Date Reported: ' + (formData.dateReported || 'N/A'));
    doc.text('Estimated Weekly Wage: $' + (formData.weeklyWage || 'N/A'));
    doc.text('Employee Work Type: ' + (formData.employeeWorkType || 'N/A'));
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f').text('INJURY DETAILS');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text('Medical Treatment: ' + (formData.medicalTreatment || 'N/A'));
    doc.text('Treatment Facility: ' + (formData.facilityName || 'N/A'));
    doc.text('Resulted in Death: ' + (formData.resultedInDeath || 'N/A'));
    doc.text('Nature of Injury: ' + (formData.natureOfInjury || 'N/A'));
    doc.text('Body Part Injured: ' + (formData.bodyPartInjured || 'N/A'));
    doc.text('Cause of Injury: ' + (formData.causeOfInjury || 'N/A'));
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Accident Description:');
    doc.font('Helvetica').text(formData.accidentDescription || 'N/A');
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f').text('WORK STATUS');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text('Losing Time from Work: ' + (formData.losingTime || 'N/A'));
    doc.text('Date Last Worked: ' + (formData.dateLastWorked || 'N/A'));
    doc.text('Return to Work Status: ' + (formData.returnStatus || 'N/A'));
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f').text('LOCATIONS');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text('Facility Location: ' + (formData.facilityStreet || '') + ' ' + (formData.facilityCity || '') + ', ' + (formData.facilityState || '') + ' ' + (formData.facilityZip || ''));
    doc.text('Accident Location: ' + (formData.accidentStreet || '') + ' ' + (formData.accidentCity || '') + ', ' + (formData.accidentState || '') + ' ' + (formData.accidentZip || ''));
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f').text('WITNESSES');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    if (formData.witness1Name) {
      doc.text('Witness 1: ' + formData.witness1Name + ' - ' + (formData.witness1Phone || 'No phone'));
    }
    if (formData.witness2Name) {
      doc.text('Witness 2: ' + formData.witness2Name + ' - ' + (formData.witness2Phone || 'No phone'));
    }
    if (!formData.witness1Name && !formData.witness2Name) {
      doc.text('No witnesses listed');
    }
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f').text('SUBMITTED BY');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text('Name: ' + (formData.submitterName || 'N/A'));
    doc.text('Phone: ' + (formData.submitterPhone || 'N/A'));
    doc.text('Email: ' + (formData.submitterEmail || 'N/A'));
    doc.moveDown();

    if (formData.additionalComments) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f').text('ADDITIONAL COMMENTS');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('black');
      doc.text(formData.additionalComments);
      doc.moveDown();
    }

    if (formData.redFlags) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#cc0000').text('RED FLAGS / PRIOR INJURIES');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#cc0000');
      doc.text(formData.redFlags);
    }

    doc.end();
  });
}

app.get('/api/health', function(req, res) {
  res.json({ status: 'ok' });
});

app.post('/api/submit-claim', upload.any(), async function(req, res) {
  try {
    var formData = JSON.parse(req.body.formData);
    var files = req.files || [];
    var referenceNumber = 'FROI-' + Date.now().toString().slice(-8);
    console.log('Processing claim ' + referenceNumber);
    var pdfBuffer = await generateClaimPDF(formData, referenceNumber);
    var attachments = [{ filename: referenceNumber + '-Summary.pdf', content: pdfBuffer, contentType: 'application/pdf' }];
    files.forEach(function(file) {
      attachments.push({ filename: file.originalname, content: file.buffer, contentType: file.mimetype });
    });

    var emailHtml = '<h2>New Workers Compensation Claim</h2>';
    emailHtml += '<p><strong>Reference:</strong> ' + referenceNumber + '</p>';
    emailHtml += '<p><strong>Date Submitted:</strong> ' + new Date().toLocaleString() + '</p>';
    emailHtml += '<hr>';
    emailHtml += '<h3>Employee Information</h3>';
    emailHtml += '<p><strong>Name:</strong> ' + (formData.firstName || '') + ' ' + (formData.lastName || '') + '</p>';
    emailHtml += '<p><strong>Address:</strong> ' + (formData.mailingAddress || '') + ', ' + (formData.city || '') + ', ' + (formData.state || '') + ' ' + (formData.zipCode || '') + '</p>';
    emailHtml += '<p><strong>Phone:</strong> ' + (formData.phone || 'N/A') + '</p>';
    emailHtml += '<p><strong>DOB:</strong> ' + (formData.dateOfBirth || 'N/A') + '</p>';
    emailHtml += '<p><strong>Date of Hire:</strong> ' + (formData.dateOfHire || 'N/A') + '</p>';
    emailHtml += '<p><strong>Occupation:</strong> ' + (formData.occupation || 'N/A') + '</p>';
    emailHtml += '<hr>';
    emailHtml += '<h3>Injury Details</h3>';
    emailHtml += '<p><strong>Date of Injury:</strong> ' + (formData.dateOfInjury || 'N/A') + '</p>';
    emailHtml += '<p><strong>Time of Injury:</strong> ' + (formData.timeOfInjury || 'N/A') + '</p>';
    emailHtml += '<p><strong>Nature of Injury:</strong> ' + (formData.natureOfInjury || 'N/A') + '</p>';
    emailHtml += '<p><strong>Body Part:</strong> ' + (formData.bodyPartInjured || 'N/A') + '</p>';
    emailHtml += '<p><strong>Cause:</strong> ' + (formData.causeOfInjury || 'N/A') + '</p>';
    emailHtml += '<p><strong>Description:</strong> ' + (formData.accidentDescription || 'N/A') + '</p>';
    emailHtml += '<p><strong>Medical Treatment:</strong> ' + (formData.medicalTreatment || 'N/A') + '</p>';
    emailHtml += '<hr>';
    emailHtml += '<h3>Submitted By</h3>';
    emailHtml += '<p><strong>Name:</strong> ' + (formData.submitterName || 'N/A') + '</p>';
    emailHtml += '<p><strong>Email:</strong> ' + (formData.submitterEmail || 'N/A') + '</p>';
    emailHtml += '<p><strong>Phone:</strong> ' + (formData.submitterPhone || 'N/A') + '</p>';
    if (formData.redFlags) {
      emailHtml += '<hr>';
      emailHtml += '<h3 style="color:red;">RED FLAGS</h3>';
      emailHtml += '<p style="color:red;">' + formData.redFlags + '</p>';
    }
    emailHtml += '<hr>';
    emailHtml += '<p><em>See attached PDF for complete details. ' + files.length + ' additional document(s) attached.</em></p>';

    await transporter.sendMail({
      from: CONFIG.SMTP.auth.user,
      to: CONFIG.CLAIMS_EMAIL,
      subject: 'New FROI Claim - ' + (formData.firstName || '') + ' ' + (formData.lastName || '') + ' - ' + (formData.dateOfInjury || ''),
      html: emailHtml,
      attachments: attachments
    });

    if (formData.submitterEmail) {
      await transporter.sendMail({
        from: CONFIG.SMTP.auth.user,
        to: formData.submitterEmail,
        subject: 'Claim Confirmation - ' + referenceNumber,
        html: '<h2>Claim Submitted Successfully</h2><p>Your workers compensation claim for <strong>' + (formData.firstName || '') + ' ' + (formData.lastName || '') + '</strong> has been received.</p><p><strong>Reference Number:</strong> ' + referenceNumber + '</p><p><strong>Date of Injury:</strong> ' + (formData.dateOfInjury || 'N/A') + '</p><p>Our team will review the claim and follow up if additional information is needed.</p><p>Thank you,<br>Titanium Defense Group</p>'
      });
    }

    console.log('Claim ' + referenceNumber + ' sent successfully');
    res.json({ success: true, referenceNumber: referenceNumber });
  } catch (error) {
    console.error('Error:', error.message);
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
<script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
body { font-family: 'Inter', sans-serif; }
.tab-active { background: #334155; color: white; }
.tab-inactive { background: #e2e8f0; color: #475569; }
.stat-card { transition: transform 0.2s, box-shadow 0.2s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
</style>
</head>
<body class="bg-slate-100 min-h-screen">
<header class="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-4 shadow-lg">
<div class="max-w-6xl mx-auto flex justify-between items-center">
<div class="flex items-center gap-4">
<img src="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Titanium%20logo.webp" alt="Titanium Defense Group" class="h-16">
<div class="border-l border-white/30 pl-4">
<div class="text-xs text-white/80 uppercase tracking-widest font-medium">Workers Compensation</div>
<div class="text-xl font-bold">Claims Management Portal</div>
</div>
</div>
</div>
</header>

<div class="max-w-6xl mx-auto p-4">
<!-- Navigation Tabs -->
<div class="flex gap-2 mb-4 flex-wrap">
<button type="button" onclick="showTab('forms')" id="tab-forms" class="px-6 py-3 rounded-t-lg font-semibold tab-active">Download Forms</button>
<button type="button" onclick="showTab('claim')" id="tab-claim" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">Submit a Claim</button>
<button type="button" onclick="showTab('analytics')" id="tab-analytics" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">Loss Run Analytics</button>
<button type="button" onclick="showTab('c240')" id="tab-c240" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">C-240 Form</button>
</div>

<!-- Forms Section -->
<div id="section-forms" class="bg-white rounded-xl shadow p-6">
<h3 class="text-xl font-bold text-slate-700 mb-4">Downloadable Forms</h3>
<div class="flex gap-4 flex-wrap">
<a href="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Employee%20Incident%20Report_Titanium_2026.pdf" target="_blank" class="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
Employee Incident Report
</a>
<a href="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Witness%20Statement%20Form_Titanium_2026.pdf" target="_blank" class="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
Witness Statement Form
</a>
</div>
</div>

<!-- Claim Form Section -->
<div id="section-claim" class="bg-white rounded-xl shadow p-6 hidden">
<div id="form-container"></div>
</div>

<!-- Loss Run Analytics Section -->
<div id="section-analytics" class="hidden">
<div class="bg-white rounded-xl shadow p-6 mb-4">
<h3 class="text-xl font-bold text-slate-700 mb-2">Loss Run Analytics Dashboard</h3>
<p class="text-slate-600 mb-4">Upload your loss run Excel file to get comprehensive insights and recommendations.</p>
<div class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-500 hover:bg-slate-50 transition-all cursor-pointer" onclick="document.getElementById('lossRunFile').click()">
<svg class="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
<p class="text-lg font-medium text-slate-700 mb-2">Drop your Loss Run Excel file here</p>
<p class="text-sm text-slate-500 mb-4">Supports .xlsx, .xls, .csv formats</p>
<input type="file" id="lossRunFile" accept=".xlsx,.xls,.csv" class="hidden" onchange="processLossRun(this.files[0])">
<button type="button" class="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-medium">Select Excel File</button>
</div>
</div>
<div id="analytics-results" class="hidden">
<!-- Action Bar -->
<div class="bg-white rounded-lg shadow-sm p-3 mb-4 flex flex-wrap justify-between items-center gap-3 border-l-4 border-slate-700">
<div class="flex items-center gap-2">
<svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
<span class="font-bold text-slate-700">Loss Run Analysis Report</span>
</div>
<div class="flex gap-2">
<button type="button" onclick="exportToPDF()" class="px-3 py-1.5 bg-slate-700 text-white rounded text-sm font-medium hover:bg-slate-800">Export PDF</button>
<button type="button" onclick="window.print()" class="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-sm font-medium hover:bg-slate-200">Print</button>
<button type="button" onclick="resetAnalytics()" class="px-3 py-1.5 bg-slate-500 text-white rounded text-sm font-medium hover:bg-slate-600">New Analysis</button>
</div>
</div>

<!-- KPI Cards Row -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
<div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-slate-700">
<div class="text-sm text-slate-500 mb-1">Total Claims</div>
<div class="text-3xl font-bold text-slate-700" id="stat-total-claims">0</div>
<div class="text-xs text-slate-400 mt-1">All reported incidents</div>
</div>
<div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-600">
<div class="text-sm text-slate-500 mb-1">Total Incurred</div>
<div class="text-3xl font-bold text-blue-600" id="stat-total-incurred">$0</div>
<div class="text-xs text-slate-400 mt-1">Combined losses</div>
</div>
<div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-amber-500">
<div class="text-sm text-slate-500 mb-1">Avg Cost/Claim</div>
<div class="text-3xl font-bold text-amber-600" id="stat-avg-claim">$0</div>
<div class="text-xs text-slate-400 mt-1">Average severity</div>
</div>
<div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
<div class="text-sm text-slate-500 mb-1">Open Claims</div>
<div class="text-3xl font-bold text-green-600" id="stat-open-claims">0</div>
<div class="text-xs text-slate-400 mt-1">Requiring attention</div>
</div>
</div>

<!-- Charts Row 1 -->
<div class="grid lg:grid-cols-3 gap-4 mb-4">
<div class="bg-white rounded-xl shadow-sm p-5">
<h4 class="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Claim Status</h4>
<div class="h-48"><canvas id="statusChart"></canvas></div>
</div>
<div class="bg-white rounded-xl shadow-sm p-5">
<h4 class="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Cost Breakdown</h4>
<div id="cost-breakdown"></div>
</div>
<div class="bg-white rounded-xl shadow-sm p-5">
<h4 class="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Monthly Trend</h4>
<div class="h-48"><canvas id="trendChart"></canvas></div>
</div>
</div>

<!-- Charts Row 2 -->
<div class="grid lg:grid-cols-2 gap-4 mb-4">
<div class="bg-white rounded-xl shadow-sm p-5">
<h4 class="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Injury Types by Cost</h4>
<div class="h-64"><canvas id="injuryChart"></canvas></div>
</div>
<div class="bg-white rounded-xl shadow-sm p-5">
<h4 class="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Body Parts Affected</h4>
<div class="h-64"><canvas id="bodyPartChart"></canvas></div>
</div>
</div>

<!-- Charts Row 3 -->
<div class="bg-white rounded-xl shadow-sm p-5 mb-4">
<h4 class="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Root Cause Analysis</h4>
<div class="h-48"><canvas id="causeChart"></canvas></div>
</div>

<!-- Top Claims & Recommendations -->
<div class="grid lg:grid-cols-2 gap-4 mb-4">
<div class="bg-white rounded-xl shadow-sm p-5">
<h4 class="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Highest Cost Claims</h4>
<div id="top-claims"></div>
</div>
<div class="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-sm p-5 text-white">
<h4 class="text-sm font-bold mb-3 uppercase tracking-wide">AI Recommendations</h4>
<div id="recommendations" class="text-sm"></div>
</div>
</div>

<!-- Claims Table -->
<div class="bg-white rounded-xl shadow-sm p-5">
<h4 class="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Claims Detail</h4>
<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-800 text-white"><tr><th class="px-4 py-3 text-left rounded-tl-lg">Date</th><th class="px-4 py-3 text-left">Claimant</th><th class="px-4 py-3 text-left">Injury</th><th class="px-4 py-3 text-left">Body Part</th><th class="px-4 py-3 text-center">Status</th><th class="px-4 py-3 text-right rounded-tr-lg">Total Incurred</th></tr></thead><tbody id="claims-table-body"></tbody></table></div>
</div>
</div>
</div>

<!-- C-240 Form Section -->
<div id="section-c240" class="hidden">
<div class="bg-white rounded-xl shadow p-6 mb-4">
<h3 class="text-xl font-bold text-slate-700 mb-2">C-240 Employers Statement of Wage Earnings</h3>
<p class="text-slate-600 mb-4">Auto-populate the 52-week payroll table (Page 2) of the NY Workers Compensation C-240 form.</p>
<div class="grid lg:grid-cols-2 gap-6">
<div class="space-y-4">
<h4 class="font-bold text-slate-700 border-b pb-2">Injured Worker Information</h4>
<div class="grid grid-cols-2 gap-3">
<div><label class="block text-xs font-medium text-slate-600 mb-1">Injured Worker Name</label><input type="text" id="c240-workerName" placeholder="Last, First MI" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"></div>
<div><label class="block text-xs font-medium text-slate-600 mb-1">Date of Injury</label><input type="date" id="c240-injuryDate" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"></div>
</div>
<div><label class="block text-xs font-medium text-slate-600 mb-1">WCB Case #</label><input type="text" id="c240-wcbCase" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"></div>
<h4 class="font-bold text-slate-700 border-b pb-2 pt-4">Upload Payroll Data</h4>
<div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
<p class="text-slate-700 font-medium mb-2">Upload Payroll File</p>
<p class="text-slate-500 text-sm mb-3">Excel (.xlsx, .xls, .csv)</p>
<input type="file" id="c240-payrollFile" accept=".xlsx,.xls,.csv" class="hidden" onchange="processPayrollFile(this.files[0])">
<button type="button" onclick="document.getElementById('c240-payrollFile').click()" class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm">Select File</button>
</div>
<div id="c240-fileStatus" class="hidden p-3 bg-green-50 border border-green-200 rounded-lg"><p class="text-green-800 text-sm font-medium"><span id="c240-fileName"></span> loaded successfully</p></div>
</div>
<div class="space-y-4">
<h4 class="font-bold text-slate-700 border-b pb-2">Payroll Summary</h4>
<div id="c240-payrollSummary" class="bg-slate-50 rounded-lg p-4 text-sm"><p class="text-slate-500">No payroll data loaded.</p></div>
</div>
</div>
</div>
<div id="c240-payrollPreview" class="bg-white rounded-xl shadow p-6 mb-4 hidden">
<h4 class="font-bold text-slate-700 mb-4">Payroll Preview (52 Weeks)</h4>
<div class="overflow-x-auto max-h-96"><table class="w-full text-sm border"><thead class="bg-slate-100 sticky top-0"><tr><th class="px-3 py-2 text-left border">Week #</th><th class="px-3 py-2 text-left border">Week Ending</th><th class="px-3 py-2 text-center border">Days Paid</th><th class="px-3 py-2 text-right border">Gross Amount</th></tr></thead><tbody id="c240-payrollTableBody"></tbody></table></div>
<div class="bg-slate-700 text-white font-bold mt-2 rounded-lg p-3 flex justify-between"><span>TOTALS:</span><span><span id="c240-totalDays">0</span> days | <span id="c240-totalGross">$0.00</span></span></div>
</div>
<div class="bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl shadow-lg p-6 text-center">
<button type="button" onclick="generateC240()" id="c240-generateBtn" class="px-8 py-3 bg-white text-slate-800 rounded-lg hover:bg-slate-100 font-bold text-lg disabled:opacity-50" disabled>Generate C-240 Page 2 PDF</button>
<p class="text-slate-300 text-sm mt-2">Generates only Page 2 with your payroll data</p>
</div>
</div>
</div>

<footer class="bg-slate-800 text-slate-400 py-6 mt-8 text-center text-sm">
<p>2025 Titanium Defense Group. All rights reserved.</p>
</footer>

<script>
// Tab Navigation
function showTab(tab) {
  document.getElementById('section-forms').classList.add('hidden');
  document.getElementById('section-claim').classList.add('hidden');
  document.getElementById('section-analytics').classList.add('hidden');
  document.getElementById('section-c240').classList.add('hidden');
  document.getElementById('tab-forms').classList.remove('tab-active');
  document.getElementById('tab-forms').classList.add('tab-inactive');
  document.getElementById('tab-claim').classList.remove('tab-active');
  document.getElementById('tab-claim').classList.add('tab-inactive');
  document.getElementById('tab-analytics').classList.remove('tab-active');
  document.getElementById('tab-analytics').classList.add('tab-inactive');
  document.getElementById('tab-c240').classList.remove('tab-active');
  document.getElementById('tab-c240').classList.add('tab-inactive');
  
  document.getElementById('section-' + tab).classList.remove('hidden');
  document.getElementById('tab-' + tab).classList.add('tab-active');
  document.getElementById('tab-' + tab).classList.remove('tab-inactive');
  
  if (tab === 'claim') render();
}

// PDF Export function
function exportToPDF() {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF('p', 'mm', 'a4');
  var pageWidth = doc.internal.pageSize.getWidth();
  var margin = 15;
  var y = 20;
  
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Loss Run Analysis Report', pageWidth/2, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Generated: ' + new Date().toLocaleDateString() + ' | Titanium Defense Group', pageWidth/2, 22, { align: 'center' });
  
  y = 40;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, y);
  y += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Claims: ' + document.getElementById('stat-total-claims').textContent, margin, y); y += 6;
  doc.text('Total Incurred: ' + document.getElementById('stat-total-incurred').textContent, margin, y); y += 6;
  doc.text('Average Cost/Claim: ' + document.getElementById('stat-avg-claim').textContent, margin, y); y += 6;
  doc.text('Open Claims: ' + document.getElementById('stat-open-claims').textContent, margin, y); y += 12;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommendations', margin, y);
  y += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  var recsEl = document.getElementById('recommendations');
  if (recsEl) {
    var recsText = recsEl.innerText.substring(0, 800);
    var lines = doc.splitTextToSize(recsText, pageWidth - 2*margin);
    doc.text(lines, margin, y);
  }
  
  doc.save('Loss_Run_Analysis_' + new Date().toISOString().split('T')[0] + '.pdf');
}

// Reset Analytics
function resetAnalytics() {
  document.getElementById('analytics-results').classList.add('hidden');
  document.getElementById('lossRunFile').value = '';
}

// Loss Run Analytics
var chartInstances = {};

function processLossRun(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var data = new Uint8Array(e.target.result);
    var workbook = XLSX.read(data, { type: 'array', cellDates: true });
    var sheet = workbook.Sheets[workbook.SheetNames[0]];
    var jsonData = XLSX.utils.sheet_to_json(sheet);
    analyzeData(jsonData);
  };
  reader.readAsArrayBuffer(file);
}

function analyzeData(data) {
  document.getElementById('analytics-results').classList.remove('hidden');
  var totalClaims = data.length;
  var totalIncurred = data.reduce(function(sum, row) { return sum + (parseFloat(row.TotalIncurred) || 0); }, 0);
  var avgClaim = totalClaims > 0 ? totalIncurred / totalClaims : 0;
  var openClaimsArr = data.filter(function(row) { return row.ClaimantStatus === 'O'; });
  var openClaims = openClaimsArr.length;
  var openReserve = openClaimsArr.reduce(function(sum, row) { return sum + (parseFloat(row.TotalIncurred) || 0); }, 0);
  
  document.getElementById('stat-total-claims').textContent = totalClaims;
  document.getElementById('stat-total-incurred').textContent = '$' + totalIncurred.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
  document.getElementById('stat-avg-claim').textContent = '$' + avgClaim.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
  document.getElementById('stat-open-claims').textContent = openClaims;
  
  var indemnity = data.reduce(function(sum, row) { return sum + (parseFloat(row.IndemnityIncurred) || 0); }, 0);
  var medical = data.reduce(function(sum, row) { return sum + (parseFloat(row.MedicalIncurred) || 0); }, 0);
  var legal = data.reduce(function(sum, row) { return sum + (parseFloat(row.LegalIncurred) || 0); }, 0);
  var expense = data.reduce(function(sum, row) { return sum + (parseFloat(row.ExpenseIncurred) || 0); }, 0);
  
  var costHtml = '<div class="space-y-2">';
  costHtml += '<div class="flex justify-between p-3 bg-blue-50 rounded-lg"><span class="text-blue-800 font-medium">Indemnity</span><span class="font-bold text-blue-900">$' + indemnity.toLocaleString() + ' <span class="text-xs text-blue-600">(' + (totalIncurred > 0 ? Math.round(indemnity/totalIncurred*100) : 0) + '%)</span></span></div>';
  costHtml += '<div class="flex justify-between p-3 bg-green-50 rounded-lg"><span class="text-green-800 font-medium">Medical</span><span class="font-bold text-green-900">$' + medical.toLocaleString() + ' <span class="text-xs text-green-600">(' + (totalIncurred > 0 ? Math.round(medical/totalIncurred*100) : 0) + '%)</span></span></div>';
  costHtml += '<div class="flex justify-between p-3 bg-purple-50 rounded-lg"><span class="text-purple-800 font-medium">Legal</span><span class="font-bold text-purple-900">$' + legal.toLocaleString() + ' <span class="text-xs text-purple-600">(' + (totalIncurred > 0 ? Math.round(legal/totalIncurred*100) : 0) + '%)</span></span></div>';
  costHtml += '<div class="flex justify-between p-3 bg-orange-50 rounded-lg"><span class="text-orange-800 font-medium">Expenses</span><span class="font-bold text-orange-900">$' + expense.toLocaleString() + ' <span class="text-xs text-orange-600">(' + (totalIncurred > 0 ? Math.round(expense/totalIncurred*100) : 0) + '%)</span></span></div>';
  costHtml += '<div class="flex justify-between p-3 bg-slate-700 rounded-lg text-white"><span class="font-bold">TOTAL INCURRED</span><span class="font-bold text-xl">$' + totalIncurred.toLocaleString() + '</span></div>';
  costHtml += '</div>';
  document.getElementById('cost-breakdown').innerHTML = costHtml;
  
  var statusCounts = {};
  data.forEach(function(row) {
    var status = row.ClaimantStatus === 'O' ? 'Open' : row.ClaimantStatus === 'C' ? 'Closed' : 'Other';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  if (chartInstances.statusChart) chartInstances.statusChart.destroy();
  chartInstances.statusChart = new Chart(document.getElementById('statusChart'), { 
    type: 'doughnut', 
    data: { 
      labels: Object.keys(statusCounts), 
      datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'], borderWidth: 0 }] 
    }, 
    options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true } } } } 
  });
  
  // Monthly Trend Chart
  var monthlyData = {};
  data.forEach(function(row) {
    if (row.LossDate) {
      var d = new Date(row.LossDate);
      if (!isNaN(d)) {
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (!monthlyData[key]) monthlyData[key] = { count: 0, cost: 0 };
        monthlyData[key].count++;
        monthlyData[key].cost += parseFloat(row.TotalIncurred) || 0;
      }
    }
  });
  var sortedMonths = Object.keys(monthlyData).sort();
  if (chartInstances.trendChart) chartInstances.trendChart.destroy();
  chartInstances.trendChart = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: sortedMonths.map(function(m) { var p = m.split('-'); return p[1] + '/' + p[0].slice(2); }),
      datasets: [{
        label: 'Claims',
        data: sortedMonths.map(function(m) { return monthlyData[m].count; }),
        borderColor: '#334155',
        backgroundColor: 'rgba(51, 65, 85, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#334155'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
  });
  
  var injuryCounts = {};
  var injuryCosts = {};
  data.forEach(function(row) { 
    var inj = row.LossTypeDesc || 'Unknown'; 
    injuryCounts[inj] = (injuryCounts[inj] || 0) + 1;
    injuryCosts[inj] = (injuryCosts[inj] || 0) + (parseFloat(row.TotalIncurred) || 0);
  });
  var sortedInjuries = Object.entries(injuryCounts).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 6);
  var sortedInjuriesByCost = Object.entries(injuryCosts).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 6);
  if (chartInstances.injuryChart) chartInstances.injuryChart.destroy();
  chartInstances.injuryChart = new Chart(document.getElementById('injuryChart'), { 
    type: 'bar', 
    data: { 
      labels: sortedInjuriesByCost.map(function(x) { return x[0].length > 25 ? x[0].substring(0,25) + '...' : x[0]; }), 
      datasets: [{ label: 'Cost ($)', data: sortedInjuriesByCost.map(function(x) { return x[1]; }), backgroundColor: ['#1e3a5f', '#2d4a6f', '#3d5a7f', '#4d6a8f', '#5d7a9f', '#6d8aaf'], borderRadius: 4 }] 
    }, 
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } } } 
  });
  
  var bodyPartCounts = {};
  data.forEach(function(row) { var bp = row.PartInjuredDesc || 'Unknown'; bodyPartCounts[bp] = (bodyPartCounts[bp] || 0) + 1; });
  var sortedBodyParts = Object.entries(bodyPartCounts).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 6);
  if (chartInstances.bodyPartChart) chartInstances.bodyPartChart.destroy();
  chartInstances.bodyPartChart = new Chart(document.getElementById('bodyPartChart'), { 
    type: 'bar', 
    data: { 
      labels: sortedBodyParts.map(function(x) { return x[0]; }), 
      datasets: [{ label: 'Claims', data: sortedBodyParts.map(function(x) { return x[1]; }), backgroundColor: ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'], borderRadius: 4 }] 
    }, 
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } } } 
  });
  
  var causeCounts = {};
  data.forEach(function(row) { var c = row.ResultingInjuryDesc || 'Unknown'; causeCounts[c.substring(0, 30)] = (causeCounts[c.substring(0, 30)] || 0) + 1; });
  var sortedCauses = Object.entries(causeCounts).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 8);
  if (chartInstances.causeChart) chartInstances.causeChart.destroy();
  chartInstances.causeChart = new Chart(document.getElementById('causeChart'), { 
    type: 'bar', 
    data: { 
      labels: sortedCauses.map(function(x) { return x[0]; }), 
      datasets: [{ label: 'Claims', data: sortedCauses.map(function(x) { return x[1]; }), backgroundColor: '#475569', borderRadius: 4 }] 
    }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } } 
  });
  
  var sortedData = data.slice().sort(function(a,b) { return (b.TotalIncurred || 0) - (a.TotalIncurred || 0); });
  var tableHtml = '';
  sortedData.forEach(function(row, idx) {
    var statusClass = row.ClaimantStatus === 'O' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    var statusText = row.ClaimantStatus === 'O' ? 'Open' : 'Closed';
    var lossDate = row.LossDate ? new Date(row.LossDate).toLocaleDateString() : 'N/A';
    var rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
    tableHtml += '<tr class="' + rowBg + ' hover:bg-blue-50"><td class="px-4 py-3">' + lossDate + '</td><td class="px-4 py-3 font-medium">' + (row.ClaimantFirstName || '') + ' ' + (row.ClaimantLastName || '') + '</td><td class="px-4 py-3">' + (row.LossTypeDesc || 'N/A') + '</td><td class="px-4 py-3">' + (row.PartInjuredDesc || 'N/A') + '</td><td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-semibold ' + statusClass + '">' + statusText + '</span></td><td class="px-4 py-3 text-right font-bold">$' + (row.TotalIncurred || 0).toLocaleString() + '</td></tr>';
  });
  document.getElementById('claims-table-body').innerHTML = tableHtml;
  
  var topClaimsHtml = '';
  sortedData.slice(0, 5).forEach(function(row, idx) {
    var statusBadge = row.ClaimantStatus === 'O' ? '<span class="ml-2 px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-bold">OPEN</span>' : '<span class="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">CLOSED</span>';
    topClaimsHtml += '<div class="p-3 bg-slate-50 rounded-lg border-l-4 border-slate-400 mb-2"><div class="flex justify-between items-center"><div><div class="font-bold text-slate-800 text-sm">#' + (idx+1) + ' ' + (row.ClaimantFirstName || '') + ' ' + (row.ClaimantLastName || '') + statusBadge + '</div><div class="text-xs text-slate-600">' + (row.LossTypeDesc || '') + ' - ' + (row.PartInjuredDesc || '') + '</div></div><div class="text-lg font-bold text-slate-700">$' + (row.TotalIncurred || 0).toLocaleString() + '</div></div></div>';
  });
  document.getElementById('top-claims').innerHTML = topClaimsHtml;
  
  // Enhanced AI Recommendations
  var recs = [];
  
  // Analyze top injury type
  if (sortedInjuries[0]) {
    var topInj = sortedInjuries[0][0];
    var topInjCount = sortedInjuries[0][1];
    var topInjPct = Math.round(topInjCount / totalClaims * 100);
    var topInjCost = injuryCosts[topInj] || 0;
    recs.push('<div class="p-4 bg-white/20 rounded-lg mb-3"><div class="font-bold text-lg mb-2">🎯 Primary Injury Pattern: ' + topInj + '</div><p class="text-green-100">This injury type accounts for <strong>' + topInjPct + '%</strong> of all claims (' + topInjCount + ' claims) and <strong>$' + topInjCost.toLocaleString() + '</strong> in costs. <strong>Action:</strong> Implement targeted prevention program focusing specifically on ' + topInj.toLowerCase() + ' hazards.</p></div>');
  }
  
  // Analyze top body part
  if (sortedBodyParts[0]) {
    var topBP = sortedBodyParts[0][0];
    var topBPCount = sortedBodyParts[0][1];
    var bpAdvice = 'Implement targeted protection measures.';
    if (topBP.toLowerCase().includes('back') || topBP.toLowerCase().includes('lumbar')) {
      bpAdvice = 'Implement ergonomic assessments, provide mechanical lifting aids, mandate proper lifting training, and consider job rotation for high-risk tasks.';
    } else if (topBP.toLowerCase().includes('knee')) {
      bpAdvice = 'Require knee pads for floor-level work, address slip hazards, and evaluate repetitive kneeling tasks.';
    } else if (topBP.toLowerCase().includes('shoulder')) {
      bpAdvice = 'Evaluate overhead work requirements, implement stretching programs, and consider tool counterbalances.';
    } else if (topBP.toLowerCase().includes('hand') || topBP.toLowerCase().includes('finger')) {
      bpAdvice = 'Review cut-resistant glove requirements, implement lockout/tagout procedures, and conduct machine guarding audits.';
    } else if (topBP.toLowerCase().includes('ankle') || topBP.toLowerCase().includes('foot')) {
      bpAdvice = 'Require proper footwear, improve walking surfaces, and address tripping hazards.';
    }
    recs.push('<div class="p-4 bg-white/20 rounded-lg mb-3"><div class="font-bold text-lg mb-2">🦴 Body Part Focus: ' + topBP + '</div><p class="text-green-100">' + topBPCount + ' claims affecting ' + topBP + '. <strong>Action:</strong> ' + bpAdvice + '</p></div>');
  }
  
  // Indemnity ratio analysis
  if (totalIncurred > 0 && indemnity / totalIncurred > 0.5) {
    recs.push('<div class="p-4 bg-white/20 rounded-lg mb-3"><div class="font-bold text-lg mb-2">💰 High Lost-Time Costs</div><p class="text-green-100">Indemnity represents <strong>' + Math.round(indemnity/totalIncurred*100) + '%</strong> of total costs, indicating significant lost work time. <strong>Action:</strong> Implement modified duty/transitional work program - studies show this can reduce indemnity costs by 30-50%.</p></div>');
  }
  
  // Open claims analysis
  if (openClaims > totalClaims * 0.3) {
    recs.push('<div class="p-4 bg-white/20 rounded-lg mb-3"><div class="font-bold text-lg mb-2">📋 Open Claim Management</div><p class="text-green-100"><strong>' + openClaims + '</strong> claims (' + Math.round(openClaims/totalClaims*100) + '%) remain open with <strong>$' + openReserve.toLocaleString() + '</strong> in reserves. <strong>Action:</strong> Review all claims open > 90 days for closure opportunities and ensure active medical management.</p></div>');
  }
  
  // Average claim cost insight
  if (avgClaim > 25000) {
    recs.push('<div class="p-4 bg-white/20 rounded-lg mb-3"><div class="font-bold text-lg mb-2">⚠️ Elevated Severity</div><p class="text-green-100">Average claim cost of <strong>$' + Math.round(avgClaim).toLocaleString() + '</strong> exceeds industry benchmarks. <strong>Action:</strong> Implement 24-hour injury reporting and nurse triage to reduce severity through early intervention.</p></div>');
  }
  
  // Always include best practices
  recs.push('<div class="p-4 bg-white/20 rounded-lg mb-3"><div class="font-bold text-lg mb-2">✓ Best Practices</div><p class="text-green-100"><strong>Early Reporting:</strong> Claims reported within 24 hours cost 18-30% less. Train supervisors on immediate response protocols. <strong>Return-to-Work:</strong> Establish modified duty programs to reduce lost time duration.</p></div>');
  
  document.getElementById('recommendations').innerHTML = recs.join('');
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
    document.getElementById('c240-fileName').textContent = file.name;
    document.getElementById('c240-fileStatus').classList.remove('hidden');
    document.getElementById('c240-generateBtn').disabled = false;
    updatePayrollSummary();
    updatePayrollPreview();
  };
  reader.readAsArrayBuffer(file);
}

function updatePayrollSummary() {
  if (c240PayrollData.length === 0) { document.getElementById('c240-payrollSummary').innerHTML = '<p class="text-slate-500">No payroll data loaded.</p>'; return; }
  var totalDays = c240PayrollData.reduce(function(sum, row) { return sum + row.daysPaid; }, 0);
  var totalGross = c240PayrollData.reduce(function(sum, row) { return sum + row.grossAmount; }, 0);
  var avgWeekly = totalGross / c240PayrollData.length;
  var html = '<div class="space-y-2"><div class="flex justify-between"><span>Weeks:</span><span class="font-bold text-green-600">' + c240PayrollData.length + ' of 52</span></div><div class="flex justify-between"><span>Total Days:</span><span class="font-bold">' + totalDays.toFixed(0) + '</span></div><div class="flex justify-between"><span>Total Gross:</span><span class="font-bold text-green-600">$' + totalGross.toLocaleString(undefined, {minimumFractionDigits: 2}) + '</span></div><div class="flex justify-between"><span>Avg Weekly:</span><span class="font-bold">$' + avgWeekly.toLocaleString(undefined, {minimumFractionDigits: 2}) + '</span></div></div>';
  document.getElementById('c240-payrollSummary').innerHTML = html;
}

function updatePayrollPreview() {
  if (c240PayrollData.length === 0) { document.getElementById('c240-payrollPreview').classList.add('hidden'); return; }
  document.getElementById('c240-payrollPreview').classList.remove('hidden');
  var html = '';
  var totalDays = 0, totalGross = 0;
  c240PayrollData.forEach(function(row) {
    var dateStr = row.weekEnding instanceof Date && !isNaN(row.weekEnding) ? row.weekEnding.toLocaleDateString() : 'N/A';
    totalDays += row.daysPaid;
    totalGross += row.grossAmount;
    html += '<tr class="border-b"><td class="px-3 py-2 border">' + row.week + '</td><td class="px-3 py-2 border">' + dateStr + '</td><td class="px-3 py-2 border text-center">' + row.daysPaid + '</td><td class="px-3 py-2 border text-right">$' + row.grossAmount.toLocaleString(undefined, {minimumFractionDigits: 2}) + '</td></tr>';
  });
  document.getElementById('c240-payrollTableBody').innerHTML = html;
  document.getElementById('c240-totalDays').textContent = totalDays.toFixed(0);
  document.getElementById('c240-totalGross').textContent = '$' + totalGross.toLocaleString(undefined, {minimumFractionDigits: 2});
}

async function generateC240() {
  if (c240PayrollData.length === 0) { alert('Please upload payroll data first.'); return; }
  var PDFLib = window.PDFLib;
  try {
    var response = await fetch('https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/C240.pdf');
    if (!response.ok) throw new Error('Could not load form');
    var existingPdfBytes = await response.arrayBuffer();
    var pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
    var form = pdfDoc.getForm();
    function setField(name, value) { try { var f = form.getTextField(name); if (f && value) f.setText(String(value)); } catch(e) {} }
    function formatDate(d) { if (!d) return ''; var dt = new Date(d); if (isNaN(dt)) return ''; return (dt.getMonth()+1) + '/' + dt.getDate() + '/' + dt.getFullYear(); }
    setField('form1[0].#pageSet[0].Page3[0].injuryDate[0]', formatDate(document.getElementById('c240-injuryDate').value));
    c240PayrollData.forEach(function(row, idx) {
      var weekNum = idx + 1;
      if (weekNum <= 52) {
        var rowNum = ((weekNum - 1) % 18) + 1;
        var dateStr = row.weekEnding instanceof Date && !isNaN(row.weekEnding) ? formatDate(row.weekEnding) : '';
        setField('form1[0].#subform[10].#subform[21].Table1[0].Row' + rowNum + '[0].weekEndingDate' + weekNum + '[0]', dateStr);
        setField('form1[0].#subform[10].#subform[21].Table1[0].Row' + rowNum + '[0].daysWorked' + weekNum + '[0]', row.daysPaid.toString());
        setField('form1[0].#subform[10].#subform[21].Table1[0].Row' + rowNum + '[0].grossAmountPaid' + weekNum + '[0]', row.grossAmount.toFixed(2));
      }
    });
    var totalDays = c240PayrollData.reduce(function(sum, row) { return sum + row.daysPaid; }, 0);
    var totalGross = c240PayrollData.reduce(function(sum, row) { return sum + row.grossAmount; }, 0);
    setField('form1[0].#subform[10].#subform[14].totalDaysPaid[0]', totalDays.toString());
    setField('form1[0].#subform[10].#subform[14].totalGrossPaid[0]', '$' + totalGross.toLocaleString(undefined, {minimumFractionDigits: 2}));
    setField('form1[0].#subform[10].#subform[21].Table1[0].Row17[0].totalDaysWorked[0]', totalDays.toString());
    setField('form1[0].#subform[10].#subform[21].Table1[0].Row17[0].totalGrossPaid[0]', totalGross.toFixed(2));
    form.flatten();
    var pdfBytes = await pdfDoc.save();
    var blob = new Blob([pdfBytes], { type: 'application/pdf' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'C240_' + new Date().toISOString().split('T')[0] + '.pdf';
    link.click();
  } catch (err) { alert('Error: ' + err.message); }
}

// FROI Claim Form
var currentStep = 0;
var formData = {firstName:'',lastName:'',mailingAddress:'',city:'',state:'',zipCode:'',phone:'',dateOfHire:'',dateOfBirth:'',gender:'',ssn:'',occupation:'',preferredLanguage:'',dateOfInjury:'',timeOfInjury:'',dateReported:'',weeklyWage:'',employeeWorkType:'',medicalTreatment:'',facilityName:'',resultedInDeath:'',natureOfInjury:'',bodyPartInjured:'',causeOfInjury:'',accidentDescription:'',losingTime:'',dateLastWorked:'',returnStatus:'',facilityStreet:'',facilityCity:'',facilityState:'',facilityZip:'',accidentStreet:'',accidentCity:'',accidentState:'',accidentZip:'',witness1Name:'',witness1Phone:'',witness2Name:'',witness2Phone:'',submitterName:'',submitterPhone:'',submitterEmail:'',additionalComments:'',redFlags:''};
var states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
var steps = ['Employee Info','Claim Details','Injury Info','Work Status','Location','Submit'];

function stateOptions() { return states.map(function(s) { return '<option value="' + s + '"' + (formData.state === s ? ' selected' : '') + '>' + s + '</option>'; }).join(''); }

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
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Employee Personal Information</h3><div class="grid md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">First Name *</label><input type="text" id="firstName" value="' + formData.firstName + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Last Name *</label><input type="text" id="lastName" value="' + formData.lastName + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="md:col-span-2"><label class="block text-sm font-medium text-slate-700 mb-1">Mailing Address *</label><input type="text" id="mailingAddress" value="' + formData.mailingAddress + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">City *</label><input type="text" id="city" value="' + formData.city + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="grid grid-cols-2 gap-2"><div><label class="block text-sm font-medium text-slate-700 mb-1">State *</label><select id="state" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option>' + stateOptions() + '</select></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Zip *</label><input type="text" id="zipCode" value="' + formData.zipCode + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Phone *</label><input type="tel" id="phone" value="' + formData.phone + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Date of Hire *</label><input type="date" id="dateOfHire" value="' + formData.dateOfHire + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label><input type="date" id="dateOfBirth" value="' + formData.dateOfBirth + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Gender</label><select id="gender" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="male"' + (formData.gender === 'male' ? ' selected' : '') + '>Male</option><option value="female"' + (formData.gender === 'female' ? ' selected' : '') + '>Female</option><option value="unknown"' + (formData.gender === 'unknown' ? ' selected' : '') + '>Unknown</option></select></div><div><label class="block text-sm font-medium text-slate-700 mb-1">SSN *</label><input type="text" id="ssn" value="' + formData.ssn + '" placeholder="XXX-XX-XXXX" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Occupation *</label><input type="text" id="occupation" value="' + formData.occupation + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Preferred Language</label><input type="text" id="preferredLanguage" value="' + formData.preferredLanguage + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div></div>';
  } else if (currentStep === 1) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Claim Information</h3><div class="grid md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Date of Injury *</label><input type="date" id="dateOfInjury" value="' + formData.dateOfInjury + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Time of Injury</label><input type="time" id="timeOfInjury" value="' + formData.timeOfInjury + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Date Reported *</label><input type="date" id="dateReported" value="' + formData.dateReported + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Weekly Wage</label><input type="number" id="weeklyWage" value="' + formData.weeklyWage + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Work Type</label><select id="employeeWorkType" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="fulltime"' + (formData.employeeWorkType === 'fulltime' ? ' selected' : '') + '>Full Time</option><option value="parttime"' + (formData.employeeWorkType === 'parttime' ? ' selected' : '') + '>Part Time</option><option value="perdiem"' + (formData.employeeWorkType === 'perdiem' ? ' selected' : '') + '>Per Diem</option></select></div></div>';
  } else if (currentStep === 2) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Injury Information</h3><div class="space-y-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Medical Treatment</label><select id="medicalTreatment" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="none"' + (formData.medicalTreatment === 'none' ? ' selected' : '') + '>No medical treatment</option><option value="minor"' + (formData.medicalTreatment === 'minor' ? ' selected' : '') + '>Minor treatment</option><option value="hospital"' + (formData.medicalTreatment === 'hospital' ? ' selected' : '') + '>Hospitalization 24+ hours</option></select></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Treatment Facility Name</label><input type="text" id="facilityName" value="' + formData.facilityName + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Resulted in Death?</label><select id="resultedInDeath" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="no"' + (formData.resultedInDeath === 'no' ? ' selected' : '') + '>No</option><option value="yes"' + (formData.resultedInDeath === 'yes' ? ' selected' : '') + '>Yes</option></select></div><div class="grid md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Nature of Injury *</label><input type="text" id="natureOfInjury" value="' + formData.natureOfInjury + '" placeholder="Strain, Sprain, Fracture..." class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Body Part Injured *</label><input type="text" id="bodyPartInjured" value="' + formData.bodyPartInjured + '" placeholder="Left arm, Back..." class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Cause of Injury *</label><input type="text" id="causeOfInjury" value="' + formData.causeOfInjury + '" placeholder="Lifting, Fall, MVA..." class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Accident Description *</label><textarea id="accidentDescription" rows="4" class="w-full px-3 py-2 border border-slate-300 rounded-lg">' + formData.accidentDescription + '</textarea></div></div>';
  } else if (currentStep === 3) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Work Status</h3><div class="space-y-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Losing time from work?</label><select id="losingTime" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="yes"' + (formData.losingTime === 'yes' ? ' selected' : '') + '>Yes</option><option value="no"' + (formData.losingTime === 'no' ? ' selected' : '') + '>No</option></select></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Date Last Worked</label><input type="date" id="dateLastWorked" value="' + formData.dateLastWorked + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Return to Work Status</label><select id="returnStatus" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="no"' + (formData.returnStatus === 'no' ? ' selected' : '') + '>No</option><option value="fullduty"' + (formData.returnStatus === 'fullduty' ? ' selected' : '') + '>Full Duty</option><option value="restrictions"' + (formData.returnStatus === 'restrictions' ? ' selected' : '') + '>With Restrictions</option></select></div></div>';
  } else if (currentStep === 4) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Location and Witnesses</h3><h4 class="font-medium text-slate-700 mb-2">Facility Location</h4><div class="grid md:grid-cols-4 gap-4 mb-6"><div class="md:col-span-2"><input type="text" id="facilityStreet" value="' + formData.facilityStreet + '" placeholder="Street" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><input type="text" id="facilityCity" value="' + formData.facilityCity + '" placeholder="City" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="grid grid-cols-2 gap-2"><select id="facilityState" class="px-2 py-2 border border-slate-300 rounded-lg"><option value="">State</option>' + states.map(function(s) { return '<option value="' + s + '"' + (formData.facilityState === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select><input type="text" id="facilityZip" value="' + formData.facilityZip + '" placeholder="Zip" class="px-2 py-2 border border-slate-300 rounded-lg"></div></div><h4 class="font-medium text-slate-700 mb-2">Accident Location</h4><div class="grid md:grid-cols-4 gap-4 mb-6"><div class="md:col-span-2"><input type="text" id="accidentStreet" value="' + formData.accidentStreet + '" placeholder="Street" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><input type="text" id="accidentCity" value="' + formData.accidentCity + '" placeholder="City" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="grid grid-cols-2 gap-2"><select id="accidentState" class="px-2 py-2 border border-slate-300 rounded-lg"><option value="">State</option>' + states.map(function(s) { return '<option value="' + s + '"' + (formData.accidentState === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select><input type="text" id="accidentZip" value="' + formData.accidentZip + '" placeholder="Zip" class="px-2 py-2 border border-slate-300 rounded-lg"></div></div><h4 class="font-medium text-slate-700 mb-2">Witnesses</h4><div class="space-y-2"><div class="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg"><input type="text" id="witness1Name" value="' + formData.witness1Name + '" placeholder="Witness 1 Name" class="px-3 py-2 border border-slate-300 rounded-lg"><input type="tel" id="witness1Phone" value="' + formData.witness1Phone + '" placeholder="Phone" class="px-3 py-2 border border-slate-300 rounded-lg"></div><div class="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg"><input type="text" id="witness2Name" value="' + formData.witness2Name + '" placeholder="Witness 2 Name" class="px-3 py-2 border border-slate-300 rounded-lg"><input type="tel" id="witness2Phone" value="' + formData.witness2Phone + '" placeholder="Phone" class="px-3 py-2 border border-slate-300 rounded-lg"></div></div>';
  } else if (currentStep === 5) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Submit Claim</h3><div class="grid md:grid-cols-2 gap-4 mb-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Your Name *</label><input type="text" id="submitterName" value="' + formData.submitterName + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Your Phone *</label><input type="tel" id="submitterPhone" value="' + formData.submitterPhone + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="md:col-span-2"><label class="block text-sm font-medium text-slate-700 mb-1">Your Email *</label><input type="email" id="submitterEmail" value="' + formData.submitterEmail + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div></div><div class="mb-4"><label class="block text-sm font-medium text-slate-700 mb-1">Additional Comments</label><textarea id="additionalComments" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-lg">' + formData.additionalComments + '</textarea></div><div class="mb-4"><label class="block text-sm font-medium text-slate-700 mb-1">Red Flags / Prior Injuries</label><textarea id="redFlags" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-lg">' + formData.redFlags + '</textarea></div><div class="mb-4"><label class="block text-sm font-medium text-slate-700 mb-1">Upload Documents (Optional)</label><input type="file" id="files" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="p-4 bg-amber-50 border border-amber-200 rounded-lg"><p class="text-sm text-amber-800"><strong>Please review before submitting.</strong> By submitting, you certify this information is accurate.</p></div>';
  }

  html += '<div class="flex justify-between mt-8 pt-6 border-t"><button type="button" onclick="prevStep()" class="px-6 py-2 rounded-lg font-medium ' + (currentStep === 0 ? 'bg-slate-100 text-slate-400' : 'bg-slate-200 text-slate-700 hover:bg-slate-300') + '">&larr; Back</button>';
  if (currentStep < 5) {
    html += '<button type="button" onclick="nextStep()" class="px-6 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800">Continue &rarr;</button>';
  } else {
    html += '<button type="button" onclick="submitClaim()" id="submitBtn" class="px-8 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Submit Claim</button>';
  }
  html += '</div>';

  document.getElementById('form-container').innerHTML = html;
}

function saveCurrentStep() {
  var fields = ['firstName','lastName','mailingAddress','city','state','zipCode','phone','dateOfHire','dateOfBirth','gender','ssn','occupation','preferredLanguage','dateOfInjury','timeOfInjury','dateReported','weeklyWage','employeeWorkType','medicalTreatment','facilityName','resultedInDeath','natureOfInjury','bodyPartInjured','causeOfInjury','accidentDescription','losingTime','dateLastWorked','returnStatus','facilityStreet','facilityCity','facilityState','facilityZip','accidentStreet','accidentCity','accidentState','accidentZip','witness1Name','witness1Phone','witness2Name','witness2Phone','submitterName','submitterPhone','submitterEmail','additionalComments','redFlags'];
  fields.forEach(function(f) {
    var el = document.getElementById(f);
    if (el) formData[f] = el.value;
  });
}

function nextStep() { saveCurrentStep(); if (currentStep < 5) { currentStep++; render(); } }
function prevStep() { saveCurrentStep(); if (currentStep > 0) { currentStep--; render(); } }

function submitClaim() {
  saveCurrentStep();
  var btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  
  var fd = new FormData();
  fd.append('formData', JSON.stringify(formData));
  var filesInput = document.getElementById('files');
  if (filesInput && filesInput.files) {
    for (var i = 0; i < filesInput.files.length; i++) {
      fd.append('file_' + i, filesInput.files[i]);
    }
  }
  
  fetch('/api/submit-claim', { method: 'POST', body: fd })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        document.getElementById('form-container').innerHTML = '<div class="text-center py-8"><div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div><h2 class="text-2xl font-bold text-slate-800 mb-2">Claim Submitted!</h2><p class="text-slate-600 mb-4">Reference: ' + data.referenceNumber + '</p><p class="text-slate-600 mb-4">Sent to: Chad@Titaniumdg.com</p><button type="button" onclick="location.reload()" class="px-6 py-2 bg-slate-700 text-white rounded-lg">Submit Another</button></div>';
      } else {
        alert('Error: ' + data.error);
        btn.disabled = false;
        btn.textContent = 'Submit Claim';
      }
    })
    .catch(function(err) {
      alert('Error submitting claim');
      btn.disabled = false;
      btn.textContent = 'Submit Claim';
    });
}

// Initialize
render();
<\/script>
</body>
</html>`;

app.get('/', function(req, res) {
  res.send(HTML);
});

app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
  console.log('Claims will be sent to: ' + CONFIG.CLAIMS_EMAIL);
});
