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
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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
<header class="bg-slate-700 text-white p-4">
<div class="max-w-6xl mx-auto flex justify-between items-center">
<div class="flex items-center gap-3">
<img src="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Titanium%20logo.webp" alt="Titanium Defense Group" class="h-20">
</div>
<div class="text-center text-lg font-bold text-white">
<div>Report a Workers</div>
<div>Compensation Claim</div>
</div>
</div>
</header>

<div class="max-w-6xl mx-auto p-4">
<!-- Navigation Tabs -->
<div class="flex gap-2 mb-4">
<button onclick="showTab('forms')" id="tab-forms" class="px-6 py-3 rounded-t-lg font-semibold tab-active">Download Forms</button>
<button onclick="showTab('claim')" id="tab-claim" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">Submit a Claim</button>
<button onclick="showTab('analytics')" id="tab-analytics" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">Loss Run Analytics</button>
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
<h3 class="text-xl font-bold text-slate-700 mb-2">Loss Run Analytics</h3>
<p class="text-slate-600 mb-4">Upload your loss run Excel file to get comprehensive insights and recommendations for preventing future claims.</p>
<div class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center" id="upload-zone">
<svg class="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
<p class="text-lg font-medium text-slate-700 mb-2">Drop your Loss Run Excel file here</p>
<p class="text-slate-500 mb-4">or click to browse</p>
<input type="file" id="lossRunFile" accept=".xlsx,.xls,.csv" class="hidden" onchange="processLossRun(this.files[0])">
<button onclick="document.getElementById('lossRunFile').click()" class="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-medium">Select Excel File</button>
</div>
</div>

<!-- Analytics Results (Hidden until file uploaded) -->
<div id="analytics-results" class="hidden">

<!-- Executive Summary -->
<div class="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-lg p-6 mb-4 text-white">
<h3 class="text-2xl font-bold mb-4">Executive Summary</h3>
<div class="grid md:grid-cols-4 gap-4">
<div class="bg-white/10 rounded-lg p-4">
<div class="text-3xl font-bold" id="stat-total-claims">0</div>
<div class="text-slate-300">Total Claims</div>
</div>
<div class="bg-white/10 rounded-lg p-4">
<div class="text-3xl font-bold" id="stat-total-incurred">$0</div>
<div class="text-slate-300">Total Incurred</div>
</div>
<div class="bg-white/10 rounded-lg p-4">
<div class="text-3xl font-bold" id="stat-avg-claim">$0</div>
<div class="text-slate-300">Avg Cost/Claim</div>
</div>
<div class="bg-white/10 rounded-lg p-4">
<div class="text-3xl font-bold" id="stat-open-claims">0</div>
<div class="text-slate-300">Open Claims</div>
</div>
</div>
</div>

<!-- Financial Breakdown -->
<div class="grid md:grid-cols-2 gap-4 mb-4">
<div class="bg-white rounded-xl shadow p-6 stat-card">
<h4 class="text-lg font-bold text-slate-700 mb-4">Cost Breakdown by Accident Year</h4>
<div class="space-y-3" id="cost-breakdown">
</div>
</div>
<div class="bg-white rounded-xl shadow p-6 stat-card">
<h4 class="text-lg font-bold text-slate-700 mb-4">Claim Status Distribution</h4>
<canvas id="statusChart" height="200"></canvas>
</div>
</div>

<!-- Injury Analysis -->
<div class="grid md:grid-cols-2 gap-4 mb-4">
<div class="bg-white rounded-xl shadow p-6 stat-card">
<h4 class="text-lg font-bold text-slate-700 mb-4">Top Injury Types</h4>
<canvas id="injuryChart" height="250"></canvas>
</div>
<div class="bg-white rounded-xl shadow p-6 stat-card">
<h4 class="text-lg font-bold text-slate-700 mb-4">Body Parts Affected</h4>
<canvas id="bodyPartChart" height="250"></canvas>
</div>
</div>

<!-- Cause Analysis -->
<div class="bg-white rounded-xl shadow p-6 mb-4 stat-card">
<h4 class="text-lg font-bold text-slate-700 mb-4">Root Cause Analysis</h4>
<canvas id="causeChart" height="150"></canvas>
</div>

<!-- Claims Table -->
<div class="bg-white rounded-xl shadow p-6 mb-4">
<h4 class="text-lg font-bold text-slate-700 mb-4">Claims Detail</h4>
<div class="overflow-x-auto">
<table class="w-full text-sm">
<thead class="bg-slate-100">
<tr>
<th class="px-4 py-3 text-left font-semibold">Date</th>
<th class="px-4 py-3 text-left font-semibold">Claimant</th>
<th class="px-4 py-3 text-left font-semibold">Injury Type</th>
<th class="px-4 py-3 text-left font-semibold">Body Part</th>
<th class="px-4 py-3 text-left font-semibold">Status</th>
<th class="px-4 py-3 text-right font-semibold">Total Incurred</th>
</tr>
</thead>
<tbody id="claims-table-body">
</tbody>
</table>
</div>
</div>

<!-- Prevention Recommendations -->
<div class="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 mb-4 text-white">
<h3 class="text-2xl font-bold mb-4">Prevention Recommendations</h3>
<div id="recommendations" class="space-y-3">
</div>
</div>

<!-- Top Costly Claims -->
<div class="bg-white rounded-xl shadow p-6 mb-4">
<h4 class="text-lg font-bold text-slate-700 mb-4">Highest Cost Claims</h4>
<div id="top-claims" class="space-y-3">
</div>
</div>

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
  document.getElementById('tab-forms').classList.remove('tab-active');
  document.getElementById('tab-forms').classList.add('tab-inactive');
  document.getElementById('tab-claim').classList.remove('tab-active');
  document.getElementById('tab-claim').classList.add('tab-inactive');
  document.getElementById('tab-analytics').classList.remove('tab-active');
  document.getElementById('tab-analytics').classList.add('tab-inactive');
  
  document.getElementById('section-' + tab).classList.remove('hidden');
  document.getElementById('tab-' + tab).classList.add('tab-active');
  document.getElementById('tab-' + tab).classList.remove('tab-inactive');
  
  if (tab === 'claim') render();
}

// Loss Run Processing
var chartInstances = {};

function processLossRun(file) {
  if (!file) return;
  
  var reader = new FileReader();
  reader.onload = function(e) {
    var data = new Uint8Array(e.target.result);
    var workbook = XLSX.read(data, { type: 'array', cellDates: true });
    var sheetName = workbook.SheetNames[0];
    var sheet = workbook.Sheets[sheetName];
    var jsonData = XLSX.utils.sheet_to_json(sheet);
    
    analyzeData(jsonData);
  };
  reader.readAsArrayBuffer(file);
}

function analyzeData(data) {
  document.getElementById('analytics-results').classList.remove('hidden');
  
  // Basic Stats
  var totalClaims = data.length;
  var totalIncurred = data.reduce(function(sum, row) { return sum + (parseFloat(row.TotalIncurred) || 0); }, 0);
  var avgClaim = totalClaims > 0 ? totalIncurred / totalClaims : 0;
  var openClaims = data.filter(function(row) { return row.ClaimantStatus === 'O'; }).length;
  
  document.getElementById('stat-total-claims').textContent = totalClaims;
  document.getElementById('stat-total-incurred').textContent = '$' + totalIncurred.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
  document.getElementById('stat-avg-claim').textContent = '$' + avgClaim.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
  document.getElementById('stat-open-claims').textContent = openClaims;
  
  // Cost Breakdown by Year
  var yearData = {};
  data.forEach(function(row) {
    var lossDate = row.LossDate ? new Date(row.LossDate) : null;
    var year = lossDate ? lossDate.getFullYear() : 'Unknown';
    if (!yearData[year]) {
      yearData[year] = { claims: 0, indemnity: 0, medical: 0, legal: 0, expense: 0, total: 0 };
    }
    yearData[year].claims++;
    yearData[year].indemnity += parseFloat(row.IndemnityIncurred) || 0;
    yearData[year].medical += parseFloat(row.MedicalIncurred) || 0;
    yearData[year].legal += parseFloat(row.LegalIncurred) || 0;
    yearData[year].expense += parseFloat(row.ExpenseIncurred) || 0;
    yearData[year].total += parseFloat(row.TotalIncurred) || 0;
  });
  
  var sortedYears = Object.keys(yearData).sort().reverse();
  var costHtml = '<div class="overflow-x-auto"><table class="w-full text-sm">';
  costHtml += '<thead class="bg-slate-100"><tr><th class="px-3 py-2 text-left font-semibold">Year</th><th class="px-3 py-2 text-center font-semibold">Claims</th><th class="px-3 py-2 text-right font-semibold">Indemnity</th><th class="px-3 py-2 text-right font-semibold">Medical</th><th class="px-3 py-2 text-right font-semibold">Legal</th><th class="px-3 py-2 text-right font-semibold">Expense</th><th class="px-3 py-2 text-right font-semibold">Total</th></tr></thead><tbody>';
  
  var grandTotal = { claims: 0, indemnity: 0, medical: 0, legal: 0, expense: 0, total: 0 };
  sortedYears.forEach(function(year) {
    var yd = yearData[year];
    grandTotal.claims += yd.claims;
    grandTotal.indemnity += yd.indemnity;
    grandTotal.medical += yd.medical;
    grandTotal.legal += yd.legal;
    grandTotal.expense += yd.expense;
    grandTotal.total += yd.total;
    costHtml += '<tr class="border-b hover:bg-slate-50">';
    costHtml += '<td class="px-3 py-2 font-medium">' + year + '</td>';
    costHtml += '<td class="px-3 py-2 text-center">' + yd.claims + '</td>';
    costHtml += '<td class="px-3 py-2 text-right">$' + yd.indemnity.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) + '</td>';
    costHtml += '<td class="px-3 py-2 text-right">$' + yd.medical.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) + '</td>';
    costHtml += '<td class="px-3 py-2 text-right">$' + yd.legal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) + '</td>';
    costHtml += '<td class="px-3 py-2 text-right">$' + yd.expense.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) + '</td>';
    costHtml += '<td class="px-3 py-2 text-right font-bold">$' + yd.total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) + '</td>';
    costHtml += '</tr>';
  });
  
  costHtml += '<tr class="bg-slate-700 text-white font-bold">';
  costHtml += '<td class="px-3 py-2">TOTAL</td>';
  costHtml += '<td class="px-3 py-2 text-center">' + grandTotal.claims + '</td>';
  costHtml += '<td class="px-3 py-2 text-right">$' + grandTotal.indemnity.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) + '</td>';
  costHtml += '<td class="px-3 py-2 text-right">$' + grandTotal.medical.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) + '</td>';
  costHtml += '<td class="px-3 py-2 text-right">$' + grandTotal.legal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) + '</td>';
  costHtml += '<td class="px-3 py-2 text-right">$' + grandTotal.expense.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) + '</td>';
  costHtml += '<td class="px-3 py-2 text-right">$' + grandTotal.total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) + '</td>';
  costHtml += '</tr>';
  costHtml += '</tbody></table></div>';
  document.getElementById('cost-breakdown').innerHTML = costHtml;
  
  // Status Chart
  var statusCounts = {};
  data.forEach(function(row) {
    var status = row.ClaimantStatus === 'O' ? 'Open' : row.ClaimantStatus === 'C' ? 'Closed' : row.ClaimantStatus === 'RC' ? 'Re-opened' : row.ClaimantStatus || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  if (chartInstances.statusChart) chartInstances.statusChart.destroy();
  chartInstances.statusChart = new Chart(document.getElementById('statusChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#ef4444', '#22c55e', '#f59e0b', '#6366f1']
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
  
  // Injury Type Chart
  var injuryCounts = {};
  data.forEach(function(row) {
    var injury = row.LossTypeDesc || 'Unknown';
    injuryCounts[injury] = (injuryCounts[injury] || 0) + 1;
  });
  var sortedInjuries = Object.entries(injuryCounts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 6);
  
  if (chartInstances.injuryChart) chartInstances.injuryChart.destroy();
  chartInstances.injuryChart = new Chart(document.getElementById('injuryChart'), {
    type: 'bar',
    data: {
      labels: sortedInjuries.map(function(x) { return x[0]; }),
      datasets: [{
        label: 'Claims',
        data: sortedInjuries.map(function(x) { return x[1]; }),
        backgroundColor: '#3b82f6'
      }]
    },
    options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
  });
  
  // Body Part Chart
  var bodyPartCounts = {};
  data.forEach(function(row) {
    var part = row.PartInjuredDesc || 'Unknown';
    bodyPartCounts[part] = (bodyPartCounts[part] || 0) + 1;
  });
  var sortedBodyParts = Object.entries(bodyPartCounts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 6);
  
  if (chartInstances.bodyPartChart) chartInstances.bodyPartChart.destroy();
  chartInstances.bodyPartChart = new Chart(document.getElementById('bodyPartChart'), {
    type: 'bar',
    data: {
      labels: sortedBodyParts.map(function(x) { return x[0]; }),
      datasets: [{
        label: 'Claims',
        data: sortedBodyParts.map(function(x) { return x[1]; }),
        backgroundColor: '#10b981'
      }]
    },
    options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
  });
  
  // Cause Chart
  var causeCounts = {};
  data.forEach(function(row) {
    var cause = row.ResultingInjuryDesc || 'Unknown';
    var shortCause = cause.length > 40 ? cause.substring(0, 40) + '...' : cause;
    causeCounts[shortCause] = (causeCounts[shortCause] || 0) + 1;
  });
  var sortedCauses = Object.entries(causeCounts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 8);
  
  if (chartInstances.causeChart) chartInstances.causeChart.destroy();
  chartInstances.causeChart = new Chart(document.getElementById('causeChart'), {
    type: 'bar',
    data: {
      labels: sortedCauses.map(function(x) { return x[0]; }),
      datasets: [{
        label: 'Claims',
        data: sortedCauses.map(function(x) { return x[1]; }),
        backgroundColor: '#8b5cf6'
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
  
  // Claims Table
  var tableHtml = '';
  var sortedData = data.slice().sort(function(a, b) { return (b.TotalIncurred || 0) - (a.TotalIncurred || 0); });
  sortedData.forEach(function(row) {
    var statusClass = row.ClaimantStatus === 'O' ? 'bg-red-100 text-red-800' : row.ClaimantStatus === 'C' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    var statusText = row.ClaimantStatus === 'O' ? 'Open' : row.ClaimantStatus === 'C' ? 'Closed' : row.ClaimantStatus === 'RC' ? 'Re-opened' : row.ClaimantStatus;
    var lossDate = row.LossDate ? new Date(row.LossDate).toLocaleDateString() : 'N/A';
    tableHtml += '<tr class="border-b hover:bg-slate-50">';
    tableHtml += '<td class="px-4 py-3">' + lossDate + '</td>';
    tableHtml += '<td class="px-4 py-3">' + (row.ClaimantFirstName || '') + ' ' + (row.ClaimantLastName || '') + '</td>';
    tableHtml += '<td class="px-4 py-3">' + (row.LossTypeDesc || 'N/A') + '</td>';
    tableHtml += '<td class="px-4 py-3">' + (row.PartInjuredDesc || 'N/A') + '</td>';
    tableHtml += '<td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs font-medium ' + statusClass + '">' + statusText + '</span></td>';
    tableHtml += '<td class="px-4 py-3 text-right font-medium">$' + (row.TotalIncurred || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) + '</td>';
    tableHtml += '</tr>';
  });
  document.getElementById('claims-table-body').innerHTML = tableHtml;
  
  // Top Costly Claims
  var topClaimsHtml = '';
  sortedData.slice(0, 5).forEach(function(row, idx) {
    var lossDate = row.LossDate ? new Date(row.LossDate).toLocaleDateString() : 'N/A';
    topClaimsHtml += '<div class="p-4 bg-slate-50 rounded-lg border-l-4 border-red-500">';
    topClaimsHtml += '<div class="flex justify-between items-start">';
    topClaimsHtml += '<div>';
    topClaimsHtml += '<div class="font-bold text-slate-800">#' + (idx + 1) + ' - ' + (row.ClaimantFirstName || '') + ' ' + (row.ClaimantLastName || '') + '</div>';
    topClaimsHtml += '<div class="text-sm text-slate-600">' + (row.LossTypeDesc || 'N/A') + ' - ' + (row.PartInjuredDesc || 'N/A') + '</div>';
    topClaimsHtml += '<div class="text-sm text-slate-500 mt-1">' + (row.LossDescription || 'No description') + '</div>';
    topClaimsHtml += '</div>';
    topClaimsHtml += '<div class="text-right">';
    topClaimsHtml += '<div class="text-xl font-bold text-red-600">$' + (row.TotalIncurred || 0).toLocaleString(undefined, {minimumFractionDigits: 0}) + '</div>';
    topClaimsHtml += '<div class="text-sm text-slate-500">' + lossDate + '</div>';
    topClaimsHtml += '</div>';
    topClaimsHtml += '</div>';
    topClaimsHtml += '</div>';
  });
  document.getElementById('top-claims').innerHTML = topClaimsHtml;
  
  // Generate Recommendations
  generateRecommendations(data, sortedInjuries, sortedBodyParts, sortedCauses);
}

function generateRecommendations(data, injuries, bodyParts, causes) {
  var recommendations = [];
  
  // Analyze patterns and generate recommendations
  var topInjury = injuries[0] ? injuries[0][0] : '';
  var topBodyPart = bodyParts[0] ? bodyParts[0][0] : '';
  var topCause = causes[0] ? causes[0][0] : '';
  
  if (topInjury.toLowerCase().includes('strain')) {
    recommendations.push({
      icon: '💪',
      title: 'Implement Ergonomic Training',
      desc: 'Strains are your #1 injury type. Provide proper lifting techniques training and consider ergonomic equipment for repetitive tasks.'
    });
  }
  if (topInjury.toLowerCase().includes('laceration') || topInjury.toLowerCase().includes('cut')) {
    recommendations.push({
      icon: '🧤',
      title: 'Enhance Cut Protection',
      desc: 'Lacerations are a significant issue. Require cut-resistant gloves and ensure proper knife safety training.'
    });
  }
  if (topInjury.toLowerCase().includes('contusion')) {
    recommendations.push({
      icon: '🚧',
      title: 'Improve Workplace Layout',
      desc: 'Contusions indicate employees are striking objects. Review workplace layout and add padding to sharp corners.'
    });
  }
  
  if (topBodyPart.toLowerCase().includes('back') || topBodyPart.toLowerCase().includes('lumbar')) {
    recommendations.push({
      icon: '🏋️',
      title: 'Back Injury Prevention Program',
      desc: 'Back injuries are costly and common. Implement mandatory lifting training and provide mechanical lifting aids.'
    });
  }
  if (topBodyPart.toLowerCase().includes('knee')) {
    recommendations.push({
      icon: '🦵',
      title: 'Knee Protection Protocol',
      desc: 'Multiple knee injuries detected. Require knee pads for floor work and address wet/slippery surfaces immediately.'
    });
  }
  if (topBodyPart.toLowerCase().includes('hand') || topBodyPart.toLowerCase().includes('finger')) {
    recommendations.push({
      icon: '✋',
      title: 'Hand Safety Initiative',
      desc: 'Hand/finger injuries are prevalent. Review PPE requirements and implement machine guarding audits.'
    });
  }
  
  if (topCause.toLowerCase().includes('slip') || topCause.toLowerCase().includes('fall')) {
    recommendations.push({
      icon: '⚠️',
      title: 'Slip & Fall Prevention',
      desc: 'Falls are a major cause of injuries. Install anti-slip flooring, improve drainage, and enforce immediate spill cleanup.'
    });
  }
  if (topCause.toLowerCase().includes('push') || topCause.toLowerCase().includes('pull')) {
    recommendations.push({
      icon: '🛒',
      title: 'Material Handling Review',
      desc: 'Pushing/pulling injuries indicate equipment issues. Evaluate cart wheels, weight limits, and floor conditions.'
    });
  }
  
  // Always add these general recommendations
  recommendations.push({
    icon: '📋',
    title: 'Early Reporting Protocol',
    desc: 'Encourage immediate injury reporting. Early intervention reduces claim costs by up to 50%.'
  });
  recommendations.push({
    icon: '🎯',
    title: 'Return-to-Work Program',
    desc: 'Implement a modified duty program to reduce lost time and help employees recover while working.'
  });
  
  var recsHtml = '';
  recommendations.forEach(function(rec) {
    recsHtml += '<div class="bg-white/10 rounded-lg p-4">';
    recsHtml += '<div class="flex items-start gap-3">';
    recsHtml += '<span class="text-2xl">' + rec.icon + '</span>';
    recsHtml += '<div>';
    recsHtml += '<div class="font-bold">' + rec.title + '</div>';
    recsHtml += '<div class="text-green-100 text-sm">' + rec.desc + '</div>';
    recsHtml += '</div>';
    recsHtml += '</div>';
    recsHtml += '</div>';
  });
  document.getElementById('recommendations').innerHTML = recsHtml;
}

// FROI Form Code
var currentStep = 0;
var formData = {firstName:"",lastName:"",mailingAddress:"",city:"",state:"",zipCode:"",phone:"",dateOfHire:"",dateOfBirth:"",gender:"",ssn:"",occupation:"",preferredLanguage:"",dateOfInjury:"",timeOfInjury:"",dateReported:"",weeklyWage:"",employeeWorkType:"",medicalTreatment:"",facilityName:"",resultedInDeath:"",natureOfInjury:"",bodyPartInjured:"",causeOfInjury:"",accidentDescription:"",losingTime:"",dateLastWorked:"",returnStatus:"",facilityStreet:"",facilityCity:"",facilityState:"",facilityZip:"",accidentStreet:"",accidentCity:"",accidentState:"",accidentZip:"",witness1Name:"",witness1Phone:"",witness2Name:"",witness2Phone:"",submitterName:"",submitterPhone:"",submitterEmail:"",additionalComments:"",redFlags:""};
var states = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
var steps = ["Employee Info","Claim Details","Injury Info","Work Status","Location","Submit"];

function stateOptions() {
  return states.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');
}

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
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Employee Personal Information</h3><div class="grid md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">First Name *</label><input type="text" id="firstName" value="' + formData.firstName + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Last Name *</label><input type="text" id="lastName" value="' + formData.lastName + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="md:col-span-2"><label class="block text-sm font-medium text-slate-700 mb-1">Mailing Address *</label><input type="text" id="mailingAddress" value="' + formData.mailingAddress + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">City *</label><input type="text" id="city" value="' + formData.city + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="grid grid-cols-2 gap-2"><div><label class="block text-sm font-medium text-slate-700 mb-1">State *</label><select id="state" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option>' + stateOptions() + '</select></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Zip *</label><input type="text" id="zipCode" value="' + formData.zipCode + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Phone *</label><input type="tel" id="phone" value="' + formData.phone + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Date of Hire *</label><input type="date" id="dateOfHire" value="' + formData.dateOfHire + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label><input type="date" id="dateOfBirth" value="' + formData.dateOfBirth + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Gender</label><select id="gender" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="unknown">Unknown</option></select></div><div><label class="block text-sm font-medium text-slate-700 mb-1">SSN *</label><input type="text" id="ssn" value="' + formData.ssn + '" placeholder="XXX-XX-XXXX" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Occupation *</label><input type="text" id="occupation" value="' + formData.occupation + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Preferred Language</label><input type="text" id="preferredLanguage" value="' + formData.preferredLanguage + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div></div>';
  } else if (currentStep === 1) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Claim Information</h3><div class="grid md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Date of Injury *</label><input type="date" id="dateOfInjury" value="' + formData.dateOfInjury + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Time of Injury</label><input type="time" id="timeOfInjury" value="' + formData.timeOfInjury + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Date Reported *</label><input type="date" id="dateReported" value="' + formData.dateReported + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Weekly Wage</label><input type="number" id="weeklyWage" value="' + formData.weeklyWage + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Work Type</label><select id="employeeWorkType" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="fulltime">Full Time</option><option value="parttime">Part Time</option><option value="perdiem">Per Diem</option></select></div></div>';
  } else if (currentStep === 2) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Injury Information</h3><div class="space-y-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Medical Treatment</label><select id="medicalTreatment" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="none">No medical treatment</option><option value="minor">Minor treatment</option><option value="hospital">Hospitalization 24+ hours</option></select></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Treatment Facility Name</label><input type="text" id="facilityName" value="' + formData.facilityName + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Resulted in Death?</label><select id="resultedInDeath" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="no">No</option><option value="yes">Yes</option></select></div><div class="grid md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Nature of Injury *</label><input type="text" id="natureOfInjury" value="' + formData.natureOfInjury + '" placeholder="Strain, Sprain, Fracture..." class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Body Part Injured *</label><input type="text" id="bodyPartInjured" value="' + formData.bodyPartInjured + '" placeholder="Left arm, Back..." class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Cause of Injury *</label><input type="text" id="causeOfInjury" value="' + formData.causeOfInjury + '" placeholder="Lifting, Fall, MVA..." class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Accident Description *</label><textarea id="accidentDescription" rows="4" class="w-full px-3 py-2 border border-slate-300 rounded-lg">' + formData.accidentDescription + '</textarea></div></div>';
  } else if (currentStep === 3) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Work Status</h3><div class="space-y-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Losing time from work?</label><select id="losingTime" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="yes">Yes</option><option value="no">No</option></select></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Date Last Worked</label><input type="date" id="dateLastWorked" value="' + formData.dateLastWorked + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Return to Work Status</label><select id="returnStatus" class="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="no">No</option><option value="fullduty">Full Duty</option><option value="restrictions">With Restrictions</option></select></div></div>';
  } else if (currentStep === 4) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Location and Witnesses</h3><h4 class="font-medium text-slate-700 mb-2">Facility Location</h4><div class="grid md:grid-cols-4 gap-4 mb-6"><div class="md:col-span-2"><input type="text" id="facilityStreet" value="' + formData.facilityStreet + '" placeholder="Street" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><input type="text" id="facilityCity" value="' + formData.facilityCity + '" placeholder="City" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="grid grid-cols-2 gap-2"><select id="facilityState" class="px-2 py-2 border border-slate-300 rounded-lg"><option value="">State</option>' + stateOptions() + '</select><input type="text" id="facilityZip" value="' + formData.facilityZip + '" placeholder="Zip" class="px-2 py-2 border border-slate-300 rounded-lg"></div></div><h4 class="font-medium text-slate-700 mb-2">Accident Location</h4><div class="grid md:grid-cols-4 gap-4 mb-6"><div class="md:col-span-2"><input type="text" id="accidentStreet" value="' + formData.accidentStreet + '" placeholder="Street" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><input type="text" id="accidentCity" value="' + formData.accidentCity + '" placeholder="City" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="grid grid-cols-2 gap-2"><select id="accidentState" class="px-2 py-2 border border-slate-300 rounded-lg"><option value="">State</option>' + stateOptions() + '</select><input type="text" id="accidentZip" value="' + formData.accidentZip + '" placeholder="Zip" class="px-2 py-2 border border-slate-300 rounded-lg"></div></div><h4 class="font-medium text-slate-700 mb-2">Witnesses</h4><div class="space-y-2"><div class="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg"><input type="text" id="witness1Name" value="' + formData.witness1Name + '" placeholder="Witness 1 Name" class="px-3 py-2 border border-slate-300 rounded-lg"><input type="tel" id="witness1Phone" value="' + formData.witness1Phone + '" placeholder="Phone" class="px-3 py-2 border border-slate-300 rounded-lg"></div><div class="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg"><input type="text" id="witness2Name" value="' + formData.witness2Name + '" placeholder="Witness 2 Name" class="px-3 py-2 border border-slate-300 rounded-lg"><input type="tel" id="witness2Phone" value="' + formData.witness2Phone + '" placeholder="Phone" class="px-3 py-2 border border-slate-300 rounded-lg"></div></div>';
  } else if (currentStep === 5) {
    html += '<h3 class="text-lg font-semibold mb-4 pb-2 border-b">Submit Claim</h3><div class="grid md:grid-cols-2 gap-4 mb-4"><div><label class="block text-sm font-medium text-slate-700 mb-1">Your Name *</label><input type="text" id="submitterName" value="' + formData.submitterName + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div><label class="block text-sm font-medium text-slate-700 mb-1">Your Phone *</label><input type="tel" id="submitterPhone" value="' + formData.submitterPhone + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="md:col-span-2"><label class="block text-sm font-medium text-slate-700 mb-1">Your Email *</label><input type="email" id="submitterEmail" value="' + formData.submitterEmail + '" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div></div><div class="mb-4"><label class="block text-sm font-medium text-slate-700 mb-1">Additional Comments</label><textarea id="additionalComments" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-lg">' + formData.additionalComments + '</textarea></div><div class="mb-4"><label class="block text-sm font-medium text-slate-700 mb-1">Red Flags / Prior Injuries</label><textarea id="redFlags" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-lg">' + formData.redFlags + '</textarea></div><div class="mb-4"><label class="block text-sm font-medium text-slate-700 mb-1">Upload Documents (Optional)</label><input type="file" id="files" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" class="w-full px-3 py-2 border border-slate-300 rounded-lg"></div><div class="p-4 bg-amber-50 border border-amber-200 rounded-lg"><p class="text-sm text-amber-800"><strong>Please review before submitting.</strong> By submitting, you certify this information is accurate.</p></div>';
  }

  html += '<div class="flex justify-between mt-8 pt-6 border-t"><button onclick="prevStep()" class="px-6 py-2 rounded-lg font-medium ' + (currentStep === 0 ? 'bg-slate-100 text-slate-400' : 'bg-slate-200 text-slate-700 hover:bg-slate-300') + '">&larr; Back</button>';
  if (currentStep < 5) {
    html += '<button onclick="nextStep()" class="px-6 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800">Continue &rarr;</button>';
  } else {
    html += '<button onclick="submitClaim()" id="submitBtn" class="px-8 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Submit Claim</button>';
  }
  html += '</div>';

  document.getElementById('form-container').innerHTML = html;
  
  // Restore select values
  if (formData.state) document.getElementById('state').value = formData.state;
  if (formData.gender) document.getElementById('gender').value = formData.gender;
  if (formData.employeeWorkType && document.getElementById('employeeWorkType')) document.getElementById('employeeWorkType').value = formData.employeeWorkType;
  if (formData.medicalTreatment && document.getElementById('medicalTreatment')) document.getElementById('medicalTreatment').value = formData.medicalTreatment;
  if (formData.resultedInDeath && document.getElementById('resultedInDeath')) document.getElementById('resultedInDeath').value = formData.resultedInDeath;
  if (formData.losingTime && document.getElementById('losingTime')) document.getElementById('losingTime').value = formData.losingTime;
  if (formData.returnStatus && document.getElementById('returnStatus')) document.getElementById('returnStatus').value = formData.returnStatus;
  if (formData.facilityState && document.getElementById('facilityState')) document.getElementById('facilityState').value = formData.facilityState;
  if (formData.accidentState && document.getElementById('accidentState')) document.getElementById('accidentState').value = formData.accidentState;
}

function saveCurrentStep() {
  var fields = ['firstName','lastName','mailingAddress','city','state','zipCode','phone','dateOfHire','dateOfBirth','gender','ssn','occupation','preferredLanguage','dateOfInjury','timeOfInjury','dateReported','weeklyWage','employeeWorkType','medicalTreatment','facilityName','resultedInDeath','natureOfInjury','bodyPartInjured','causeOfInjury','accidentDescription','losingTime','dateLastWorked','returnStatus','facilityStreet','facilityCity','facilityState','facilityZip','accidentStreet','accidentCity','accidentState','accidentZip','witness1Name','witness1Phone','witness2Name','witness2Phone','submitterName','submitterPhone','submitterEmail','additionalComments','redFlags'];
  fields.forEach(function(f) {
    var el = document.getElementById(f);
    if (el) formData[f] = el.value;
  });
}

function nextStep() {
  saveCurrentStep();
  if (currentStep < 5) { currentStep++; render(); }
}

function prevStep() {
  saveCurrentStep();
  if (currentStep > 0) { currentStep--; render(); }
}

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
        document.getElementById('form-container').innerHTML = '<div class="text-center py-8"><div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div><h2 class="text-2xl font-bold text-slate-800 mb-2">Claim Submitted!</h2><p class="text-slate-600 mb-4">Reference: ' + data.referenceNumber + '</p><p class="text-slate-600 mb-4">Sent to: Chad@Titaniumdg.com</p><button onclick="location.reload()" class="px-6 py-2 bg-slate-700 text-white rounded-lg">Submit Another</button></div>';
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
</script>
</body>
</html>`;

app.get('/', function(req, res) {
  res.send(HTML);
});

app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
  console.log('Claims will be sent to: ' + CONFIG.CLAIMS_EMAIL);
});
