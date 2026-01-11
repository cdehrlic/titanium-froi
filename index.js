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

var LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>WCReporting | Modern Workers' Compensation Platform</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { font-family: 'Inter', sans-serif; }
.gradient-hero { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%); }
.gradient-cta { background: linear-gradient(135deg, #1e3a5f 0%, #334155 100%); }
.gradient-card { background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); }
.feature-icon { background: linear-gradient(135deg, #1e3a5f 0%, #334155 100%); }
.glow { box-shadow: 0 0 60px rgba(30, 58, 95, 0.4); }
.float { animation: float 6s ease-in-out infinite; }
@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
.slide-up { animation: slideUp 0.8s ease-out forwards; opacity: 0; }
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } from { transform: translateY(30px); } }
</style>
</head>
<body class="bg-slate-50">

<!-- Navigation -->
<nav class="fixed w-full z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
<div class="max-w-7xl mx-auto px-6 py-4">
<div class="flex justify-between items-center">
<div class="flex items-center gap-3">
<img src="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Titanium%20logo.webp" alt="WCReporting" class="h-10 rounded-lg">
<span class="text-2xl font-bold text-white">WC<span class="text-slate-400">Reporting</span></span>
</div>
<div class="hidden md:flex items-center gap-8">
<a href="#features" class="text-slate-300 hover:text-white transition">Features</a>
<a href="#benefits" class="text-slate-300 hover:text-white transition">Benefits</a>
<a href="#pricing" class="text-slate-300 hover:text-white transition">Pricing</a>
<a href="/app" class="px-5 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-700 transition">Launch App</a>
</div>
<button class="md:hidden text-white">
<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
</button>
</div>
</div>
</nav>

<!-- Hero Section -->
<section class="gradient-hero min-h-screen flex items-center pt-20">
<div class="max-w-7xl mx-auto px-6 py-20">
<div class="grid lg:grid-cols-2 gap-12 items-center">
<div class="slide-up">
<div class="inline-flex items-center gap-2 px-4 py-2 bg-slate-500/10 border border-slate-500/30 rounded-full mb-6">
<span class="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
<span class="text-slate-400 text-sm font-medium">Now Available for Employers & Brokers</span>
</div>
<h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
Workers' Comp<br>
<span class="text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-blue-300">Made Simple.</span>
</h1>
<p class="text-xl text-slate-300 mb-8 leading-relaxed">
The modern all-in-one platform that eliminates paperwork, simplifies reporting, and gives you instant visibility into every claim. Replace outdated spreadsheets with a portal your team will actually use.
</p>
<div class="flex flex-col sm:flex-row gap-4">
<a href="/app" class="px-8 py-4 gradient-cta text-white rounded-xl font-semibold text-lg hover:opacity-90 transition text-center glow">
Start Free Trial
</a>
<a href="#demo" class="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition text-center flex items-center justify-center gap-2">
<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
Watch Demo
</a>
</div>
<div class="flex items-center gap-8 mt-10 pt-10 border-t border-slate-700">
<div>
<div class="text-3xl font-bold text-white">98%</div>
<div class="text-slate-400 text-sm">Faster Reporting</div>
</div>
<div>
<div class="text-3xl font-bold text-white">45%</div>
<div class="text-slate-400 text-sm">Cost Reduction</div>
</div>
<div>
<div class="text-3xl font-bold text-white">24/7</div>
<div class="text-slate-400 text-sm">Access Anywhere</div>
</div>
</div>
</div>
<div class="relative float hidden lg:block">
<div class="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-4 shadow-2xl">
<div class="flex items-center gap-2 mb-3">
<div class="w-3 h-3 rounded-full bg-red-500"></div>
<div class="w-3 h-3 rounded-full bg-yellow-500"></div>
<div class="w-3 h-3 rounded-full bg-green-500"></div>
<span class="text-slate-500 text-xs ml-2">wcreporting.com/app</span>
</div>
<!-- Mini Dashboard Preview -->
<div class="bg-slate-100 rounded-lg overflow-hidden" style="width:480px;">
<!-- Header -->
<div class="bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-2 flex items-center gap-2">
<div class="w-6 h-6 bg-slate-600 rounded flex items-center justify-center">
<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
</div>
<span class="text-white font-semibold text-xs">Claims Portal</span>
</div>
<!-- Tabs -->
<div class="bg-white px-2 py-1.5 flex gap-1 border-b">
<span class="px-2 py-1 bg-slate-700 text-white text-xs rounded font-medium">Analytics</span>
<span class="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded">Claims</span>
<span class="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded">C-240</span>
<span class="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded">EMR</span>
</div>
<!-- Content -->
<div class="p-3">
<!-- KPIs -->
<div class="grid grid-cols-4 gap-2 mb-3">
<div class="bg-white rounded p-2 border-l-4 border-slate-700 shadow-sm">
<div class="text-xs text-slate-500">Claims</div>
<div class="text-lg font-bold text-slate-800">25</div>
</div>
<div class="bg-white rounded p-2 border-l-4 border-blue-500 shadow-sm">
<div class="text-xs text-slate-500">Incurred</div>
<div class="text-lg font-bold text-blue-600">$402K</div>
</div>
<div class="bg-white rounded p-2 border-l-4 border-amber-500 shadow-sm">
<div class="text-xs text-slate-500">Avg Cost</div>
<div class="text-lg font-bold text-amber-600">$16K</div>
</div>
<div class="bg-white rounded p-2 border-l-4 border-green-500 shadow-sm">
<div class="text-xs text-slate-500">Open</div>
<div class="text-lg font-bold text-green-600">8</div>
</div>
</div>
<!-- Charts Row -->
<div class="grid grid-cols-3 gap-2 mb-3">
<!-- Donut -->
<div class="bg-white rounded p-2 shadow-sm">
<div class="text-xs font-semibold text-slate-600 mb-1">STATUS</div>
<svg width="80" height="80" viewBox="0 0 80 80" class="mx-auto">
<circle cx="40" cy="40" r="30" fill="none" stroke="#ef4444" stroke-width="12" stroke-dasharray="131 188" transform="rotate(-90 40 40)"/>
<circle cx="40" cy="40" r="30" fill="none" stroke="#22c55e" stroke-width="12" stroke-dasharray="38 188" stroke-dashoffset="-131" transform="rotate(-90 40 40)"/>
<circle cx="40" cy="40" r="30" fill="none" stroke="#f59e0b" stroke-width="12" stroke-dasharray="19 188" stroke-dashoffset="-169" transform="rotate(-90 40 40)"/>
</svg>
</div>
<!-- Bar Chart -->
<div class="bg-white rounded p-2 shadow-sm">
<div class="text-xs font-semibold text-slate-600 mb-1">INJURY TYPE</div>
<div class="space-y-1">
<div class="flex items-center gap-1"><span class="text-xs text-slate-500 w-12 truncate">Fracture</span><div class="flex-1 bg-slate-200 rounded-full h-2"><div class="bg-slate-700 h-2 rounded-full" style="width:85%"></div></div></div>
<div class="flex items-center gap-1"><span class="text-xs text-slate-500 w-12 truncate">Contusion</span><div class="flex-1 bg-slate-200 rounded-full h-2"><div class="bg-slate-700 h-2 rounded-full" style="width:60%"></div></div></div>
<div class="flex items-center gap-1"><span class="text-xs text-slate-500 w-12 truncate">Strain</span><div class="flex-1 bg-slate-200 rounded-full h-2"><div class="bg-slate-700 h-2 rounded-full" style="width:45%"></div></div></div>
</div>
</div>
<!-- Line Chart -->
<div class="bg-white rounded p-2 shadow-sm">
<div class="text-xs font-semibold text-slate-600 mb-1">TREND</div>
<svg width="100%" height="50" viewBox="0 0 120 50">
<polyline fill="none" stroke="#334155" stroke-width="2" points="5,40 20,35 35,30 50,15 65,20 80,25 95,18 110,30"/>
<g fill="#334155"><circle cx="5" cy="40" r="2"/><circle cx="20" cy="35" r="2"/><circle cx="35" cy="30" r="2"/><circle cx="50" cy="15" r="2"/><circle cx="65" cy="20" r="2"/><circle cx="80" cy="25" r="2"/><circle cx="95" cy="18" r="2"/><circle cx="110" cy="30" r="2"/></g>
</svg>
</div>
</div>
<!-- Bottom Row -->
<div class="grid grid-cols-2 gap-2">
<!-- Claims List -->
<div class="bg-white rounded p-2 shadow-sm">
<div class="text-xs font-semibold text-slate-600 mb-1">TOP CLAIMS</div>
<div class="space-y-1 text-xs">
<div class="flex justify-between"><span>Rosa V. <span class="px-1 bg-green-100 text-green-700 rounded text-xs">OPEN</span></span><span class="font-bold">$118K</span></div>
<div class="flex justify-between"><span>Kimberly R. <span class="px-1 bg-green-100 text-green-700 rounded text-xs">OPEN</span></span><span class="font-bold">$81K</span></div>
<div class="flex justify-between"><span>Catina W. <span class="px-1 bg-red-100 text-red-700 rounded text-xs">CLOSED</span></span><span class="font-bold">$54K</span></div>
</div>
</div>
<!-- AI Box -->
<div class="bg-gradient-to-br from-slate-700 to-slate-800 rounded p-2">
<div class="text-xs font-semibold text-white mb-1">🤖 AI INSIGHTS</div>
<div class="space-y-1">
<div class="bg-white/10 rounded p-1 text-xs text-slate-200">⚠️ Contusion: 32% of claims</div>
<div class="bg-white/10 rounded p-1 text-xs text-slate-200">🦵 Knee injuries trending up</div>
<div class="bg-white/10 rounded p-1 text-xs text-slate-200">💰 51% indemnity ratio</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</section>

<!-- Logos -->
<section class="py-12 bg-white border-b border-slate-200">
<div class="max-w-7xl mx-auto px-6">
<p class="text-center text-slate-500 text-sm mb-8">TRUSTED BY LEADING EMPLOYERS AND BROKERS</p>
<div class="flex flex-wrap justify-center items-center gap-12 opacity-50">
<div class="text-2xl font-bold text-slate-400">ACME Corp</div>
<div class="text-2xl font-bold text-slate-400">BuildRight</div>
<div class="text-2xl font-bold text-slate-400">SafeWorks</div>
<div class="text-2xl font-bold text-slate-400">Premier HR</div>
<div class="text-2xl font-bold text-slate-400">Atlas Insurance</div>
</div>
</div>
</section>

<!-- Problem/Solution -->
<section class="py-20 bg-white">
<div class="max-w-7xl mx-auto px-6">
<div class="grid lg:grid-cols-2 gap-16 items-center">
<div>
<h2 class="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
Stop drowning in<br>
<span class="text-red-500">paperwork & spreadsheets</span>
</h2>
<div class="space-y-4">
<div class="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
<div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
</div>
<div>
<div class="font-semibold text-slate-800">Manual incident forms</div>
<div class="text-slate-600 text-sm">Paper forms get lost, delayed, or filled out incorrectly</div>
</div>
</div>
<div class="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
<div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
</div>
<div>
<div class="font-semibold text-slate-800">Scattered loss data</div>
<div class="text-slate-600 text-sm">Claims info buried in emails, PDFs, and outdated spreadsheets</div>
</div>
</div>
<div class="flex items-start gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
<div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
</div>
<div>
<div class="font-semibold text-slate-800">No visibility into trends</div>
<div class="text-slate-600 text-sm">Can't identify patterns or prevent future incidents</div>
</div>
</div>
</div>
</div>
<div>
<h2 class="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
One platform for<br>
<span class="text-slate-700">complete control</span>
</h2>
<div class="space-y-4">
<div class="flex items-start gap-4 p-4 bg-slate-100 rounded-xl border border-slate-200">
<div class="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
<svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
</div>
<div>
<div class="font-semibold text-slate-800">Digital incident submission</div>
<div class="text-slate-600 text-sm">Mobile-friendly forms with instant notifications</div>
</div>
</div>
<div class="flex items-start gap-4 p-4 bg-slate-100 rounded-xl border border-slate-200">
<div class="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
<svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
</div>
<div>
<div class="font-semibold text-slate-800">Centralized dashboard</div>
<div class="text-slate-600 text-sm">All claims, documents, and analytics in one place</div>
</div>
</div>
<div class="flex items-start gap-4 p-4 bg-slate-100 rounded-xl border border-slate-200">
<div class="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
<svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
</div>
<div>
<div class="font-semibold text-slate-800">AI-powered insights</div>
<div class="text-slate-600 text-sm">Identify trends and prevent incidents before they happen</div>
</div>
</div>
</div>
</div>
</div>
</div>
</section>

<!-- Features Grid -->
<section id="features" class="py-20 bg-slate-50">
<div class="max-w-7xl mx-auto px-6">
<div class="text-center mb-16">
<h2 class="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Everything you need in one platform</h2>
<p class="text-xl text-slate-600 max-w-2xl mx-auto">Powerful tools designed to streamline compliance, reduce costs, and keep your workforce safe.</p>
</div>
<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
<div class="gradient-card rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-all hover:-translate-y-1">
<div class="feature-icon w-14 h-14 rounded-xl flex items-center justify-center mb-6">
<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
</div>
<h3 class="text-xl font-bold text-slate-800 mb-3">Digital Claim Submission</h3>
<p class="text-slate-600">Submit FROI claims instantly from any device. Auto-generated PDFs sent directly to your carrier.</p>
</div>
<div class="gradient-card rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-all hover:-translate-y-1">
<div class="feature-icon w-14 h-14 rounded-xl flex items-center justify-center mb-6">
<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
</div>
<h3 class="text-xl font-bold text-slate-800 mb-3">Loss Run Analytics</h3>
<p class="text-slate-600">Upload loss runs and get instant visualizations, trend analysis, and AI-powered recommendations.</p>
</div>
<div class="gradient-card rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-all hover:-translate-y-1">
<div class="feature-icon w-14 h-14 rounded-xl flex items-center justify-center mb-6">
<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
</div>
<h3 class="text-xl font-bold text-slate-800 mb-3">EMR Calculator</h3>
<p class="text-slate-600">Estimate your experience modification rate with automatic primary/excess splits and what-if scenarios.</p>
</div>
<div class="gradient-card rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-all hover:-translate-y-1">
<div class="feature-icon w-14 h-14 rounded-xl flex items-center justify-center mb-6">
<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
</div>
<h3 class="text-xl font-bold text-slate-800 mb-3">Fraud Detection</h3>
<p class="text-slate-600">AI-powered red flag indicators automatically identify suspicious claims for further review.</p>
</div>
<div class="gradient-card rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-all hover:-translate-y-1">
<div class="feature-icon w-14 h-14 rounded-xl flex items-center justify-center mb-6">
<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
</div>
<h3 class="text-xl font-bold text-slate-800 mb-3">Auto Form Generation</h3>
<p class="text-slate-600">Generate C-240 wage statements, HIPAA authorizations, and compliance forms automatically.</p>
</div>
<div class="gradient-card rounded-2xl p-8 border border-slate-200 hover:shadow-xl transition-all hover:-translate-y-1">
<div class="feature-icon w-14 h-14 rounded-xl flex items-center justify-center mb-6">
<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
</div>
<h3 class="text-xl font-bold text-slate-800 mb-3">Root Cause Analysis</h3>
<p class="text-slate-600">Identify patterns, track hazards, and implement preventive measures with actionable insights.</p>
</div>
</div>
</div>
</section>

<!-- Benefits -->
<section id="benefits" class="py-20 bg-slate-900">
<div class="max-w-7xl mx-auto px-6">
<div class="text-center mb-16">
<h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Results that speak for themselves</h2>
<p class="text-xl text-slate-400 max-w-2xl mx-auto">Companies using WCReporting see dramatic improvements in efficiency, compliance, and cost savings.</p>
</div>
<div class="grid md:grid-cols-3 gap-8">
<div class="text-center p-8">
<div class="text-6xl font-bold text-blue-400 mb-4">98%</div>
<div class="text-xl font-semibold text-white mb-2">Faster Claim Reporting</div>
<p class="text-slate-400">Digital submissions eliminate delays from paper forms and manual data entry.</p>
</div>
<div class="text-center p-8">
<div class="text-6xl font-bold text-blue-400 mb-4">45%</div>
<div class="text-xl font-semibold text-white mb-2">Reduction in Claim Costs</div>
<p class="text-slate-400">Early intervention and fraud detection significantly reduce total incurred losses.</p>
</div>
<div class="text-center p-8">
<div class="text-6xl font-bold text-blue-400 mb-4">12hrs</div>
<div class="text-xl font-semibold text-white mb-2">Saved Per Week</div>
<p class="text-slate-400">Automated forms and centralized data eliminate tedious administrative work.</p>
</div>
</div>
</div>
</section>

<!-- Testimonials -->
<section class="py-20 bg-white">
<div class="max-w-7xl mx-auto px-6">
<div class="text-center mb-16">
<h2 class="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Loved by risk managers everywhere</h2>
</div>
<div class="grid md:grid-cols-3 gap-8">
<div class="bg-slate-50 rounded-2xl p-8 border border-slate-200">
<div class="flex items-center gap-1 mb-4">
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
</div>
<p class="text-slate-600 mb-6">"WCReporting transformed how we handle claims. What used to take hours now takes minutes. Our EMR dropped from 1.24 to 0.91 in one year."</p>
<div class="flex items-center gap-3">
<div class="w-12 h-12 bg-slate-300 rounded-full"></div>
<div>
<div class="font-semibold text-slate-800">Sarah Mitchell</div>
<div class="text-slate-500 text-sm">HR Director, BuildRight Construction</div>
</div>
</div>
</div>
<div class="bg-slate-50 rounded-2xl p-8 border border-slate-200">
<div class="flex items-center gap-1 mb-4">
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
</div>
<p class="text-slate-600 mb-6">"The analytics alone are worth it. We identified that 60% of our claims came from one department and implemented targeted training."</p>
<div class="flex items-center gap-3">
<div class="w-12 h-12 bg-slate-300 rounded-full"></div>
<div>
<div class="font-semibold text-slate-800">Michael Torres</div>
<div class="text-slate-500 text-sm">Risk Manager, Premier Manufacturing</div>
</div>
</div>
</div>
<div class="bg-slate-50 rounded-2xl p-8 border border-slate-200">
<div class="flex items-center gap-1 mb-4">
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
</div>
<p class="text-slate-600 mb-6">"As a broker, I can now offer clients real value beyond just placing coverage. The EMR calculator helps us win accounts."</p>
<div class="flex items-center gap-3">
<div class="w-12 h-12 bg-slate-300 rounded-full"></div>
<div>
<div class="font-semibold text-slate-800">Jennifer Adams</div>
<div class="text-slate-500 text-sm">Principal, Adams Insurance Group</div>
</div>
</div>
</div>
</div>
</div>
</section>

<!-- Pricing -->
<section id="pricing" class="py-20 bg-slate-50">
<div class="max-w-7xl mx-auto px-6">
<div class="text-center mb-16">
<h2 class="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Simple, transparent pricing</h2>
<p class="text-xl text-slate-600">Start free. Upgrade when you need more power.</p>
</div>
<div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
<div class="bg-white rounded-2xl p-8 border border-slate-200">
<div class="text-lg font-semibold text-slate-600 mb-2">Starter</div>
<div class="flex items-baseline gap-1 mb-6">
<span class="text-5xl font-bold text-slate-800">$0</span>
<span class="text-slate-500">/month</span>
</div>
<ul class="space-y-3 mb-8">
<li class="flex items-center gap-2 text-slate-600"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Up to 10 claims/year</li>
<li class="flex items-center gap-2 text-slate-600"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Digital claim submission</li>
<li class="flex items-center gap-2 text-slate-600"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Basic analytics</li>
<li class="flex items-center gap-2 text-slate-600"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>EMR calculator</li>
</ul>
<a href="/app" class="block w-full py-3 text-center bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition">Get Started Free</a>
</div>
<div class="bg-slate-900 rounded-2xl p-8 border-2 border-slate-500 relative">
<div class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-slate-600 text-white text-sm font-semibold rounded-full">MOST POPULAR</div>
<div class="text-lg font-semibold text-slate-400 mb-2">Professional</div>
<div class="flex items-baseline gap-1 mb-6">
<span class="text-5xl font-bold text-white">$99</span>
<span class="text-slate-400">/month</span>
</div>
<ul class="space-y-3 mb-8">
<li class="flex items-center gap-2 text-slate-300"><svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Unlimited claims</li>
<li class="flex items-center gap-2 text-slate-300"><svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Advanced analytics & AI</li>
<li class="flex items-center gap-2 text-slate-300"><svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Auto form generation</li>
<li class="flex items-center gap-2 text-slate-300"><svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Fraud detection</li>
<li class="flex items-center gap-2 text-slate-300"><svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Priority support</li>
</ul>
<a href="/app" class="block w-full py-3 text-center gradient-cta text-white rounded-xl font-semibold hover:opacity-90 transition">Start 14-Day Trial</a>
</div>
<div class="bg-white rounded-2xl p-8 border border-slate-200">
<div class="text-lg font-semibold text-slate-600 mb-2">Enterprise</div>
<div class="flex items-baseline gap-1 mb-6">
<span class="text-5xl font-bold text-slate-800">Custom</span>
</div>
<ul class="space-y-3 mb-8">
<li class="flex items-center gap-2 text-slate-600"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Everything in Pro</li>
<li class="flex items-center gap-2 text-slate-600"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Multi-location support</li>
<li class="flex items-center gap-2 text-slate-600"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>SSO & API access</li>
<li class="flex items-center gap-2 text-slate-600"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Dedicated success manager</li>
<li class="flex items-center gap-2 text-slate-600"><svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Custom integrations</li>
</ul>
<a href="#contact" class="block w-full py-3 text-center bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition">Contact Sales</a>
</div>
</div>
</div>
</section>

<!-- CTA -->
<section class="py-20 gradient-hero">
<div class="max-w-4xl mx-auto px-6 text-center">
<h2 class="text-3xl md:text-4xl font-bold text-white mb-6">Ready to modernize your workers' comp program?</h2>
<p class="text-xl text-slate-300 mb-8">Join hundreds of employers and brokers who've made the switch to WCReporting.</p>
<div class="flex flex-col sm:flex-row gap-4 justify-center">
<a href="/app" class="px-8 py-4 gradient-cta text-white rounded-xl font-semibold text-lg hover:opacity-90 transition glow">
Start Your Free Trial
</a>
<a href="#demo" class="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition">
Schedule a Demo
</a>
</div>
<p class="text-slate-400 text-sm mt-6">No credit card required - Setup in under 5 minutes</p>
</div>
</section>

<!-- Footer -->
<footer class="bg-slate-900 py-16 border-t border-slate-800">
<div class="max-w-7xl mx-auto px-6">
<div class="grid md:grid-cols-4 gap-12 mb-12">
<div>
<div class="flex items-center gap-3 mb-4">
<img src="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Titanium%20logo.webp" alt="WCReporting" class="h-10 rounded-lg">
<span class="text-xl font-bold text-white">WC<span class="text-slate-400">Reporting</span></span>
</div>
<p class="text-slate-400 text-sm">The modern all-in-one workers' compensation platform for employers and brokers.</p>
</div>
<div>
<div class="font-semibold text-white mb-4">Product</div>
<ul class="space-y-2 text-slate-400 text-sm">
<li><a href="#features" class="hover:text-white transition">Features</a></li>
<li><a href="#pricing" class="hover:text-white transition">Pricing</a></li>
<li><a href="#" class="hover:text-white transition">Security</a></li>
<li><a href="#" class="hover:text-white transition">Integrations</a></li>
</ul>
</div>
<div>
<div class="font-semibold text-white mb-4">Resources</div>
<ul class="space-y-2 text-slate-400 text-sm">
<li><a href="#" class="hover:text-white transition">Documentation</a></li>
<li><a href="#" class="hover:text-white transition">Blog</a></li>
<li><a href="#" class="hover:text-white transition">Webinars</a></li>
<li><a href="#" class="hover:text-white transition">Support</a></li>
</ul>
</div>
<div>
<div class="font-semibold text-white mb-4">Company</div>
<ul class="space-y-2 text-slate-400 text-sm">
<li><a href="#" class="hover:text-white transition">About</a></li>
<li><a href="#" class="hover:text-white transition">Contact</a></li>
<li><a href="#" class="hover:text-white transition">Privacy Policy</a></li>
<li><a href="#" class="hover:text-white transition">Terms of Service</a></li>
</ul>
</div>
</div>
<div class="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
<p class="text-slate-500 text-sm">© 2025 WCReporting. All rights reserved.</p>
<div class="flex gap-4">
<a href="#" class="text-slate-400 hover:text-white transition"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path></svg></a>
<a href="#" class="text-slate-400 hover:text-white transition"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg></a>
</div>
</div>
</div>
</footer>

</body>
</html>`;

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
<a href="/" class="flex items-center gap-4 hover:opacity-90 transition">
<img src="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Titanium%20logo.webp" alt="Titanium Defense Group" class="h-16">
<div class="border-l border-white/30 pl-4">
<div class="text-xs text-white/80 uppercase tracking-widest font-medium">Workers Compensation</div>
<div class="text-xl font-bold">Claims Management Portal</div>
</div>
</a>
</div>
</header>

<div class="max-w-6xl mx-auto p-4">
<!-- Navigation Tabs -->
<div class="flex gap-2 mb-4 flex-wrap">
<button type="button" onclick="showTab('forms')" id="tab-forms" class="px-6 py-3 rounded-t-lg font-semibold tab-active">Download Forms</button>
<button type="button" onclick="showTab('claim')" id="tab-claim" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">Submit a Claim</button>
<button type="button" onclick="showTab('analytics')" id="tab-analytics" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">Loss Run Analytics</button>
<button type="button" onclick="showTab('c240')" id="tab-c240" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">C-240 Form</button>
<button type="button" onclick="showTab('emr')" id="tab-emr" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive">EMR Calculator</button>
<button type="button" disabled class="px-6 py-3 rounded-t-lg font-semibold bg-slate-100 text-slate-400 cursor-not-allowed">Fraud / Red Flags</button>
<button type="button" disabled class="px-6 py-3 rounded-t-lg font-semibold bg-slate-100 text-slate-400 cursor-not-allowed">HIPAA Generator</button>
<button type="button" disabled class="px-6 py-3 rounded-t-lg font-semibold bg-slate-100 text-slate-400 cursor-not-allowed">Root Cause Analysis</button>
<button type="button" disabled class="px-6 py-3 rounded-t-lg font-semibold bg-slate-100 text-slate-400 cursor-not-allowed">Hazard Tracking</button>
<button type="button" disabled class="px-6 py-3 rounded-t-lg font-semibold bg-slate-100 text-slate-400 cursor-not-allowed">Safety Committee</button>
<button type="button" disabled class="px-6 py-3 rounded-t-lg font-semibold bg-slate-100 text-slate-400 cursor-not-allowed">Settlement Estimator</button>
<button type="button" disabled class="px-6 py-3 rounded-t-lg font-semibold bg-slate-100 text-slate-400 cursor-not-allowed">Jurisdiction / Compliance</button>
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
<h4 class="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Cost by Accident Year</h4>
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

<!-- EMR Calculator Section -->
<div id="section-emr" class="hidden">
<div class="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4">
<p class="text-amber-800 text-sm"><strong>⚠️ Disclaimer:</strong> This calculator is for <strong>educational and planning purposes only</strong> and does not constitute an official NYCIRB, NCCI, or any state rating bureau modification factor. Actual EMR calculations involve additional factors and should be obtained from your insurance carrier or rating bureau.</p>
</div>

<div class="bg-white rounded-xl shadow p-6 mb-4">
<h3 class="text-xl font-bold text-slate-700 mb-2">Experience Modification Rate (EMR) Calculator</h3>
<p class="text-slate-600 mb-4">Estimate your workers' compensation experience mod by entering payroll, class codes, and claims data for the last 3 policy years.</p>

<div class="grid lg:grid-cols-2 gap-6">
<div>
<h4 class="font-bold text-slate-700 border-b pb-2 mb-4">Configuration</h4>
<div class="grid grid-cols-2 gap-3 mb-4">
<div>
<label class="block text-xs font-medium text-slate-600 mb-1">Split Point ($)</label>
<input type="number" id="emr-splitPoint" value="17500" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
<p class="text-xs text-slate-400 mt-1">Primary vs Excess threshold</p>
</div>
<div>
<label class="block text-xs font-medium text-slate-600 mb-1">Weighting Factor (W)</label>
<input type="number" id="emr-weightFactor" value="0.30" step="0.01" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
<p class="text-xs text-slate-400 mt-1">Excess loss weight</p>
</div>
</div>
<div class="mb-4">
<label class="block text-xs font-medium text-slate-600 mb-1">Ballast Value</label>
<input type="number" id="emr-ballast" value="10000" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
<p class="text-xs text-slate-400 mt-1">Stabilizing constant</p>
</div>
</div>

<div>
<h4 class="font-bold text-slate-700 border-b pb-2 mb-4">Upload Supporting Documents</h4>
<div class="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-slate-500 hover:bg-slate-50 transition-all cursor-pointer" onclick="document.getElementById('emr-documents').click()">
<svg class="w-10 h-10 mx-auto text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
<p class="text-slate-700 font-medium text-sm mb-1">Upload Documents</p>
<p class="text-slate-500 text-xs">Loss runs, experience worksheets, dec pages, payroll reports</p>
<input type="file" id="emr-documents" multiple accept=".pdf,.xlsx,.xls,.csv,.doc,.docx" class="hidden" onchange="handleEMRDocuments(this.files)">
</div>
<div id="emr-docList" class="mt-2 text-xs text-slate-600"></div>
</div>
</div>
</div>

<!-- Payroll Entry by Year -->
<div class="bg-white rounded-xl shadow p-6 mb-4">
<h4 class="font-bold text-slate-700 mb-4">Payroll & Class Codes by Policy Year</h4>
<div class="grid lg:grid-cols-3 gap-4">
<!-- Year 1 -->
<div class="border border-slate-200 rounded-lg p-4">
<h5 class="font-bold text-slate-600 text-sm mb-3 bg-slate-100 -mx-4 -mt-4 px-4 py-2 rounded-t-lg">Year 1 (Oldest)</h5>
<div class="space-y-2" id="emr-payroll-year1">
<div class="grid grid-cols-3 gap-2 payroll-row">
<input type="text" placeholder="Class Code" class="emr-class1 px-2 py-1 border border-slate-300 rounded text-xs">
<input type="number" placeholder="Payroll $" class="emr-payroll1 px-2 py-1 border border-slate-300 rounded text-xs">
<input type="number" placeholder="ELR" step="0.01" class="emr-elr1 px-2 py-1 border border-slate-300 rounded text-xs" title="Expected Loss Rate">
</div>
</div>
<button type="button" onclick="addPayrollRow(1)" class="mt-2 text-xs text-slate-500 hover:text-slate-700">+ Add Class Code</button>
</div>
<!-- Year 2 -->
<div class="border border-slate-200 rounded-lg p-4">
<h5 class="font-bold text-slate-600 text-sm mb-3 bg-slate-100 -mx-4 -mt-4 px-4 py-2 rounded-t-lg">Year 2 (Middle)</h5>
<div class="space-y-2" id="emr-payroll-year2">
<div class="grid grid-cols-3 gap-2 payroll-row">
<input type="text" placeholder="Class Code" class="emr-class2 px-2 py-1 border border-slate-300 rounded text-xs">
<input type="number" placeholder="Payroll $" class="emr-payroll2 px-2 py-1 border border-slate-300 rounded text-xs">
<input type="number" placeholder="ELR" step="0.01" class="emr-elr2 px-2 py-1 border border-slate-300 rounded text-xs" title="Expected Loss Rate">
</div>
</div>
<button type="button" onclick="addPayrollRow(2)" class="mt-2 text-xs text-slate-500 hover:text-slate-700">+ Add Class Code</button>
</div>
<!-- Year 3 -->
<div class="border border-slate-200 rounded-lg p-4">
<h5 class="font-bold text-slate-600 text-sm mb-3 bg-slate-100 -mx-4 -mt-4 px-4 py-2 rounded-t-lg">Year 3 (Most Recent)</h5>
<div class="space-y-2" id="emr-payroll-year3">
<div class="grid grid-cols-3 gap-2 payroll-row">
<input type="text" placeholder="Class Code" class="emr-class3 px-2 py-1 border border-slate-300 rounded text-xs">
<input type="number" placeholder="Payroll $" class="emr-payroll3 px-2 py-1 border border-slate-300 rounded text-xs">
<input type="number" placeholder="ELR" step="0.01" class="emr-elr3 px-2 py-1 border border-slate-300 rounded text-xs" title="Expected Loss Rate">
</div>
</div>
<button type="button" onclick="addPayrollRow(3)" class="mt-2 text-xs text-slate-500 hover:text-slate-700">+ Add Class Code</button>
</div>
</div>
<p class="text-xs text-slate-500 mt-3">ELR = Expected Loss Rate per $100 of payroll (obtain from your rating bureau or carrier)</p>
</div>

<!-- Claims Entry -->
<div class="bg-white rounded-xl shadow p-6 mb-4">
<h4 class="font-bold text-slate-700 mb-4">Claims Data (All 3 Years Combined)</h4>
<div class="overflow-x-auto">
<table class="w-full text-sm">
<thead class="bg-slate-100">
<tr>
<th class="px-3 py-2 text-left text-xs font-medium text-slate-600">Claim #</th>
<th class="px-3 py-2 text-left text-xs font-medium text-slate-600">Description</th>
<th class="px-3 py-2 text-left text-xs font-medium text-slate-600">Policy Year</th>
<th class="px-3 py-2 text-right text-xs font-medium text-slate-600">Total Incurred</th>
<th class="px-3 py-2 text-right text-xs font-medium text-slate-600">Primary</th>
<th class="px-3 py-2 text-right text-xs font-medium text-slate-600">Excess</th>
<th class="px-3 py-2 text-center text-xs font-medium text-slate-600">Actions</th>
</tr>
</thead>
<tbody id="emr-claims-body">
<tr class="border-b" id="emr-claim-row-0">
<td class="px-3 py-2"><input type="text" class="emr-claimNum w-full px-2 py-1 border border-slate-300 rounded text-xs" placeholder="CLM-001"></td>
<td class="px-3 py-2"><input type="text" class="emr-claimDesc w-full px-2 py-1 border border-slate-300 rounded text-xs" placeholder="Back strain"></td>
<td class="px-3 py-2"><select class="emr-claimYear w-full px-2 py-1 border border-slate-300 rounded text-xs"><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option></select></td>
<td class="px-3 py-2"><input type="number" class="emr-claimTotal w-full px-2 py-1 border border-slate-300 rounded text-xs text-right" placeholder="0" onchange="updateClaimSplit(0)"></td>
<td class="px-3 py-2 text-right emr-claimPrimary text-xs text-slate-600">$0</td>
<td class="px-3 py-2 text-right emr-claimExcess text-xs text-slate-600">$0</td>
<td class="px-3 py-2 text-center"><button type="button" onclick="removeClaimRow(0)" class="text-red-500 hover:text-red-700 text-xs">✕</button></td>
</tr>
</tbody>
</table>
</div>
<button type="button" onclick="addClaimRow()" class="mt-3 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200">+ Add Claim</button>
</div>

<!-- D-Ratio Configuration -->
<div class="bg-white rounded-xl shadow p-6 mb-4">
<h4 class="font-bold text-slate-700 mb-4">D-Ratio (Primary Loss Weight)</h4>
<div class="grid grid-cols-3 gap-4">
<div>
<label class="block text-xs font-medium text-slate-600 mb-1">Year 1 D-Ratio</label>
<input type="number" id="emr-dratio1" value="0.20" step="0.01" min="0" max="1" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
</div>
<div>
<label class="block text-xs font-medium text-slate-600 mb-1">Year 2 D-Ratio</label>
<input type="number" id="emr-dratio2" value="0.20" step="0.01" min="0" max="1" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
</div>
<div>
<label class="block text-xs font-medium text-slate-600 mb-1">Year 3 D-Ratio</label>
<input type="number" id="emr-dratio3" value="0.20" step="0.01" min="0" max="1" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
</div>
</div>
<p class="text-xs text-slate-500 mt-2">D-Ratio determines how primary losses are weighted. Typically ranges from 0.07 to 0.63 based on expected losses.</p>
</div>

<!-- Calculate Button -->
<div class="bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl shadow-lg p-6 text-center mb-4">
<button type="button" onclick="calculateEMR()" class="px-8 py-3 bg-white text-slate-800 rounded-lg hover:bg-slate-100 font-bold text-lg">Calculate Estimated MOD</button>
</div>

<!-- Results -->
<div id="emr-results" class="hidden">
<div class="bg-white rounded-xl shadow p-6 mb-4">
<h4 class="font-bold text-slate-700 mb-4">EMR Calculation Results</h4>

<div class="grid md:grid-cols-2 gap-6 mb-6">
<div>
<h5 class="font-semibold text-slate-600 text-sm mb-3">Expected Losses</h5>
<div class="bg-blue-50 rounded-lg p-4">
<div class="flex justify-between mb-2"><span class="text-sm text-slate-600">Expected Primary:</span><span class="font-bold text-blue-700" id="emr-expectedPrimary">$0</span></div>
<div class="flex justify-between mb-2"><span class="text-sm text-slate-600">Expected Excess:</span><span class="font-bold text-blue-700" id="emr-expectedExcess">$0</span></div>
<div class="flex justify-between border-t pt-2"><span class="text-sm font-medium text-slate-700">Total Expected:</span><span class="font-bold text-blue-800" id="emr-expectedTotal">$0</span></div>
</div>
</div>
<div>
<h5 class="font-semibold text-slate-600 text-sm mb-3">Actual Losses</h5>
<div class="bg-amber-50 rounded-lg p-4">
<div class="flex justify-between mb-2"><span class="text-sm text-slate-600">Actual Primary:</span><span class="font-bold text-amber-700" id="emr-actualPrimary">$0</span></div>
<div class="flex justify-between mb-2"><span class="text-sm text-slate-600">Actual Excess:</span><span class="font-bold text-amber-700" id="emr-actualExcess">$0</span></div>
<div class="flex justify-between border-t pt-2"><span class="text-sm font-medium text-slate-700">Total Actual:</span><span class="font-bold text-amber-800" id="emr-actualTotal">$0</span></div>
</div>
</div>
</div>

<div class="bg-slate-800 rounded-xl p-6 text-center mb-4">
<p class="text-slate-400 text-sm mb-2">Estimated Experience Modification Rate</p>
<div class="text-5xl font-bold text-white mb-2" id="emr-modResult">1.00</div>
<p class="text-slate-400 text-xs" id="emr-modInterpretation">Average risk - no credit or debit</p>
</div>

<div class="bg-slate-50 rounded-lg p-4 text-xs text-slate-600">
<p class="font-bold mb-2">Formula Used:</p>
<p class="font-mono bg-white p-2 rounded mb-2">MOD = (Actual Primary + W × Actual Excess + Ballast) ÷ (Expected Primary + W × Expected Excess + Ballast)</p>
<p id="emr-formulaValues" class="text-slate-500"></p>
</div>
</div>

<div class="bg-amber-50 border border-amber-300 rounded-xl p-4">
<p class="text-amber-800 text-sm"><strong>⚠️ Reminder:</strong> This estimated MOD is for <strong>educational and planning purposes only</strong>. It is not an official calculation from NYCIRB, NCCI, or any state rating bureau. Your actual experience modification factor may differ based on additional rating elements, state-specific rules, and official bureau calculations. Contact your insurance carrier or rating bureau for official mod worksheets.</p>
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
  document.getElementById('section-emr').classList.add('hidden');
  document.getElementById('tab-forms').classList.remove('tab-active');
  document.getElementById('tab-forms').classList.add('tab-inactive');
  document.getElementById('tab-claim').classList.remove('tab-active');
  document.getElementById('tab-claim').classList.add('tab-inactive');
  document.getElementById('tab-analytics').classList.remove('tab-active');
  document.getElementById('tab-analytics').classList.add('tab-inactive');
  document.getElementById('tab-c240').classList.remove('tab-active');
  document.getElementById('tab-c240').classList.add('tab-inactive');
  document.getElementById('tab-emr').classList.remove('tab-active');
  document.getElementById('tab-emr').classList.add('tab-inactive');
  
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
  
  // Calculate totals for AI recommendations
  var indemnity = data.reduce(function(sum, row) { return sum + (parseFloat(row.IndemnityIncurred) || 0); }, 0);
  var medical = data.reduce(function(sum, row) { return sum + (parseFloat(row.MedicalIncurred) || 0); }, 0);
  var expense = data.reduce(function(sum, row) { return sum + (parseFloat(row.ExpenseIncurred) || 0); }, 0);
  
  // Cost Breakdown by Accident Year with Indemnity/Medical/Expense
  var yearData = {};
  data.forEach(function(row) {
    var year = 'Unknown';
    if (row.LossDate) {
      var d = new Date(row.LossDate);
      if (!isNaN(d)) year = d.getFullYear().toString();
    }
    if (!yearData[year]) yearData[year] = { total: 0, indemnity: 0, medical: 0, expense: 0, claims: 0 };
    yearData[year].total += parseFloat(row.TotalIncurred) || 0;
    yearData[year].indemnity += parseFloat(row.IndemnityIncurred) || 0;
    yearData[year].medical += parseFloat(row.MedicalIncurred) || 0;
    yearData[year].expense += (parseFloat(row.ExpenseIncurred) || 0) + (parseFloat(row.LegalIncurred) || 0);
    yearData[year].claims++;
  });
  var sortedYears = Object.keys(yearData).sort().reverse(); // Most recent first
  
  var costHtml = '<div class="space-y-3 text-sm">';
  sortedYears.forEach(function(year) {
    var yd = yearData[year];
    costHtml += '<div class="bg-slate-50 rounded-lg p-3">';
    costHtml += '<div class="flex justify-between items-center mb-2"><span class="font-bold text-slate-800">' + year + ' <span class="text-xs font-normal text-slate-500">(' + yd.claims + ' claims)</span></span><span class="font-bold text-slate-700">$' + yd.total.toLocaleString() + '</span></div>';
    costHtml += '<div class="grid grid-cols-3 gap-2 text-xs">';
    costHtml += '<div class="text-center"><div class="text-blue-600 font-semibold">$' + yd.indemnity.toLocaleString() + '</div><div class="text-slate-500">Indemnity</div></div>';
    costHtml += '<div class="text-center"><div class="text-green-600 font-semibold">$' + yd.medical.toLocaleString() + '</div><div class="text-slate-500">Medical</div></div>';
    costHtml += '<div class="text-center"><div class="text-orange-600 font-semibold">$' + yd.expense.toLocaleString() + '</div><div class="text-slate-500">Expense</div></div>';
    costHtml += '</div></div>';
  });
  costHtml += '<div class="flex justify-between p-2 bg-slate-700 rounded-lg text-white"><span class="font-bold">TOTAL</span><span class="font-bold">$' + totalIncurred.toLocaleString() + '</span></div>';
  costHtml += '</div>';
  document.getElementById('cost-breakdown').innerHTML = costHtml;
  
  var statusCounts = {};
  data.forEach(function(row) {
    var rawStatus = row.ClaimantStatus || '';
    var status;
    if (rawStatus === 'O') status = 'Open';
    else if (rawStatus === 'C') status = 'Closed';
    else status = rawStatus ? rawStatus : 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  // Set colors based on status - Open=green, Closed=red, others=amber
  var statusLabels = Object.keys(statusCounts);
  var statusColors = statusLabels.map(function(s) {
    if (s === 'Open') return '#22c55e';
    if (s === 'Closed') return '#ef4444';
    return '#f59e0b';
  });
  if (chartInstances.statusChart) chartInstances.statusChart.destroy();
  chartInstances.statusChart = new Chart(document.getElementById('statusChart'), { 
    type: 'doughnut', 
    data: { 
      labels: statusLabels, 
      datasets: [{ data: Object.values(statusCounts), backgroundColor: statusColors, borderWidth: 0 }] 
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
  data.forEach(function(row) { 
    var c = (row.ResultingInjuryDesc || 'Unknown').toLowerCase();
    var category = 'Other';
    if (c.includes('fall') || c.includes('slip')) category = 'Slip/Fall';
    else if (c.includes('strain') || c.includes('sprain') || c.includes('pulling') || c.includes('lifting')) category = 'Strain';
    else if (c.includes('cut') || c.includes('puncture') || c.includes('laceration')) category = 'Cut/Puncture';
    else if (c.includes('struck') || c.includes('strike') || c.includes('hit')) category = 'Struck By';
    else if (c.includes('caught') || c.includes('crush')) category = 'Caught/Crush';
    else if (c.includes('burn') || c.includes('heat') || c.includes('cold')) category = 'Burn/Temp';
    else if (c.includes('motor') || c.includes('vehicle') || c.includes('auto')) category = 'MVA';
    else if (c.includes('repetitive') || c.includes('cumulative')) category = 'Repetitive';
    else if (c.includes('foreign') || c.includes('eye')) category = 'Foreign Body';
    else if (c.includes('chemical') || c.includes('exposure')) category = 'Exposure';
    causeCounts[category] = (causeCounts[category] || 0) + 1; 
  });
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
    var statusClass, statusText;
    var rawStatus = row.ClaimantStatus || '';
    if (rawStatus === 'O') {
      statusClass = 'bg-green-100 text-green-800';
      statusText = 'Open';
    } else if (rawStatus === 'C') {
      statusClass = 'bg-red-100 text-red-800';
      statusText = 'Closed';
    } else {
      statusClass = 'bg-amber-100 text-amber-800';
      statusText = rawStatus ? rawStatus : 'Unknown';
    }
    var lossDate = row.LossDate ? new Date(row.LossDate).toLocaleDateString() : 'N/A';
    var rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
    tableHtml += '<tr class="' + rowBg + ' hover:bg-blue-50"><td class="px-4 py-3">' + lossDate + '</td><td class="px-4 py-3 font-medium">' + (row.ClaimantFirstName || '') + ' ' + (row.ClaimantLastName || '') + '</td><td class="px-4 py-3">' + (row.LossTypeDesc || 'N/A') + '</td><td class="px-4 py-3">' + (row.PartInjuredDesc || 'N/A') + '</td><td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-semibold ' + statusClass + '">' + statusText + '</span></td><td class="px-4 py-3 text-right font-bold">$' + (row.TotalIncurred || 0).toLocaleString() + '</td></tr>';
  });
  document.getElementById('claims-table-body').innerHTML = tableHtml;
  
  var topClaimsHtml = '';
  sortedData.slice(0, 5).forEach(function(row, idx) {
    var statusBadge;
    if (row.ClaimantStatus === 'O') {
      statusBadge = '<span class="ml-2 px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-bold">OPEN</span>';
    } else if (row.ClaimantStatus === 'C') {
      statusBadge = '<span class="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">CLOSED</span>';
    } else {
      statusBadge = '<span class="ml-2 px-2 py-0.5 bg-slate-400 text-white rounded-full text-xs font-bold">' + (row.ClaimantStatus || 'N/A') + '</span>';
    }
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
    recs.push('<div class="p-3 bg-white/10 rounded-lg mb-2"><div class="font-bold mb-1">🎯 Primary Injury: ' + topInj + '</div><p class="text-slate-300 text-xs">' + topInjPct + '% of claims (' + topInjCount + ') totaling $' + topInjCost.toLocaleString() + '. Focus prevention efforts here.</p></div>');
  }
  
  // Analyze top body part
  if (sortedBodyParts[0]) {
    var topBP = sortedBodyParts[0][0];
    var topBPCount = sortedBodyParts[0][1];
    var bpAdvice = 'Implement targeted protection measures.';
    if (topBP.toLowerCase().includes('back') || topBP.toLowerCase().includes('lumbar')) {
      bpAdvice = 'Ergonomic assessments, mechanical lifting aids, proper lifting training.';
    } else if (topBP.toLowerCase().includes('knee')) {
      bpAdvice = 'Knee pads, address slip hazards, evaluate repetitive kneeling.';
    } else if (topBP.toLowerCase().includes('shoulder')) {
      bpAdvice = 'Evaluate overhead work, stretching programs, tool counterbalances.';
    } else if (topBP.toLowerCase().includes('hand') || topBP.toLowerCase().includes('finger')) {
      bpAdvice = 'Cut-resistant gloves, lockout/tagout, machine guarding audits.';
    } else if (topBP.toLowerCase().includes('ankle') || topBP.toLowerCase().includes('foot')) {
      bpAdvice = 'Proper footwear, improve walking surfaces, address tripping hazards.';
    }
    recs.push('<div class="p-3 bg-white/10 rounded-lg mb-2"><div class="font-bold mb-1">🦴 Body Part: ' + topBP + ' (' + topBPCount + ' claims)</div><p class="text-slate-300 text-xs">' + bpAdvice + '</p></div>');
  }
  
  // Indemnity ratio analysis
  if (totalIncurred > 0 && indemnity / totalIncurred > 0.4) {
    recs.push('<div class="p-3 bg-white/10 rounded-lg mb-2"><div class="font-bold mb-1">💰 High Indemnity (' + Math.round(indemnity/totalIncurred*100) + '%)</div><p class="text-slate-300 text-xs">Implement modified duty/return-to-work program to reduce lost time costs by 30-50%.</p></div>');
  }
  
  // Open claims analysis
  if (openClaims > 0) {
    recs.push('<div class="p-3 bg-white/10 rounded-lg mb-2"><div class="font-bold mb-1">📋 ' + openClaims + ' Open Claims ($' + openReserve.toLocaleString() + ')</div><p class="text-slate-300 text-xs">Review claims open >90 days for closure opportunities. Ensure active medical management.</p></div>');
  }
  
  // Best practices
  recs.push('<div class="p-3 bg-white/10 rounded-lg mb-2"><div class="font-bold mb-1">✓ Best Practices</div><p class="text-slate-300 text-xs">24-hour reporting reduces costs 18-30%. Train supervisors on immediate response.</p></div>');
  
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

// EMR Calculator Functions
var emrClaimCounter = 1;
var emrDocuments = [];

function addPayrollRow(year) {
  var container = document.getElementById('emr-payroll-year' + year);
  var html = '<div class="grid grid-cols-3 gap-2 payroll-row">';
  html += '<input type="text" placeholder="Class Code" class="emr-class' + year + ' px-2 py-1 border border-slate-300 rounded text-xs">';
  html += '<input type="number" placeholder="Payroll $" class="emr-payroll' + year + ' px-2 py-1 border border-slate-300 rounded text-xs">';
  html += '<input type="number" placeholder="ELR" step="0.01" class="emr-elr' + year + ' px-2 py-1 border border-slate-300 rounded text-xs" title="Expected Loss Rate">';
  html += '</div>';
  container.insertAdjacentHTML('beforeend', html);
}

function addClaimRow() {
  var tbody = document.getElementById('emr-claims-body');
  var html = '<tr class="border-b" id="emr-claim-row-' + emrClaimCounter + '">';
  html += '<td class="px-3 py-2"><input type="text" class="emr-claimNum w-full px-2 py-1 border border-slate-300 rounded text-xs" placeholder="CLM-00' + (emrClaimCounter + 1) + '"></td>';
  html += '<td class="px-3 py-2"><input type="text" class="emr-claimDesc w-full px-2 py-1 border border-slate-300 rounded text-xs" placeholder="Description"></td>';
  html += '<td class="px-3 py-2"><select class="emr-claimYear w-full px-2 py-1 border border-slate-300 rounded text-xs"><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option></select></td>';
  html += '<td class="px-3 py-2"><input type="number" class="emr-claimTotal w-full px-2 py-1 border border-slate-300 rounded text-xs text-right" placeholder="0" onchange="updateClaimSplit(' + emrClaimCounter + ')"></td>';
  html += '<td class="px-3 py-2 text-right emr-claimPrimary text-xs text-slate-600">$0</td>';
  html += '<td class="px-3 py-2 text-right emr-claimExcess text-xs text-slate-600">$0</td>';
  html += '<td class="px-3 py-2 text-center"><button type="button" onclick="removeClaimRow(' + emrClaimCounter + ')" class="text-red-500 hover:text-red-700 text-xs">✕</button></td>';
  html += '</tr>';
  tbody.insertAdjacentHTML('beforeend', html);
  emrClaimCounter++;
}

function removeClaimRow(idx) {
  var row = document.getElementById('emr-claim-row-' + idx);
  if (row) row.remove();
}

function updateClaimSplit(idx) {
  var row = document.getElementById('emr-claim-row-' + idx);
  if (!row) return;
  var totalInput = row.querySelector('.emr-claimTotal');
  var primaryCell = row.querySelector('.emr-claimPrimary');
  var excessCell = row.querySelector('.emr-claimExcess');
  var total = parseFloat(totalInput.value) || 0;
  var splitPoint = parseFloat(document.getElementById('emr-splitPoint').value) || 17500;
  var primary = Math.min(total, splitPoint);
  var excess = Math.max(0, total - splitPoint);
  primaryCell.textContent = '$' + primary.toLocaleString();
  excessCell.textContent = '$' + excess.toLocaleString();
}

function handleEMRDocuments(files) {
  var docList = document.getElementById('emr-docList');
  var html = '';
  for (var i = 0; i < files.length; i++) {
    emrDocuments.push(files[i]);
    html += '<span class="inline-block bg-slate-100 px-2 py-1 rounded mr-1 mb-1">' + files[i].name + '</span>';
  }
  docList.innerHTML = html;
}

function calculateEMR() {
  var splitPoint = parseFloat(document.getElementById('emr-splitPoint').value) || 17500;
  var weightFactor = parseFloat(document.getElementById('emr-weightFactor').value) || 0.30;
  var ballast = parseFloat(document.getElementById('emr-ballast').value) || 10000;
  
  // Calculate Expected Losses from Payroll
  var expectedLosses = { year1: 0, year2: 0, year3: 0, total: 0 };
  for (var y = 1; y <= 3; y++) {
    var payrollInputs = document.querySelectorAll('.emr-payroll' + y);
    var elrInputs = document.querySelectorAll('.emr-elr' + y);
    for (var i = 0; i < payrollInputs.length; i++) {
      var payroll = parseFloat(payrollInputs[i].value) || 0;
      var elr = parseFloat(elrInputs[i].value) || 0;
      var expected = (payroll / 100) * elr;
      expectedLosses['year' + y] += expected;
      expectedLosses.total += expected;
    }
  }
  
  // Get D-Ratios
  var dRatio1 = parseFloat(document.getElementById('emr-dratio1').value) || 0.20;
  var dRatio2 = parseFloat(document.getElementById('emr-dratio2').value) || 0.20;
  var dRatio3 = parseFloat(document.getElementById('emr-dratio3').value) || 0.20;
  var avgDRatio = (dRatio1 + dRatio2 + dRatio3) / 3;
  
  // Calculate Expected Primary and Excess
  var expectedPrimary = expectedLosses.total * avgDRatio;
  var expectedExcess = expectedLosses.total * (1 - avgDRatio);
  
  // Calculate Actual Losses from Claims
  var actualPrimary = 0;
  var actualExcess = 0;
  var claimRows = document.querySelectorAll('[id^="emr-claim-row-"]');
  claimRows.forEach(function(row) {
    var totalInput = row.querySelector('.emr-claimTotal');
    var total = parseFloat(totalInput.value) || 0;
    var primary = Math.min(total, splitPoint);
    var excess = Math.max(0, total - splitPoint);
    actualPrimary += primary;
    actualExcess += excess;
  });
  
  // Calculate MOD
  var numerator = actualPrimary + (weightFactor * actualExcess) + ballast;
  var denominator = expectedPrimary + (weightFactor * expectedExcess) + ballast;
  var mod = denominator > 0 ? numerator / denominator : 1.00;
  
  // Update Results Display
  document.getElementById('emr-results').classList.remove('hidden');
  document.getElementById('emr-expectedPrimary').textContent = '$' + Math.round(expectedPrimary).toLocaleString();
  document.getElementById('emr-expectedExcess').textContent = '$' + Math.round(expectedExcess).toLocaleString();
  document.getElementById('emr-expectedTotal').textContent = '$' + Math.round(expectedLosses.total).toLocaleString();
  document.getElementById('emr-actualPrimary').textContent = '$' + Math.round(actualPrimary).toLocaleString();
  document.getElementById('emr-actualExcess').textContent = '$' + Math.round(actualExcess).toLocaleString();
  document.getElementById('emr-actualTotal').textContent = '$' + Math.round(actualPrimary + actualExcess).toLocaleString();
  document.getElementById('emr-modResult').textContent = mod.toFixed(2);
  
  // Interpretation
  var interpretation = '';
  if (mod < 0.75) interpretation = 'Excellent - Significant credit for better than average experience';
  else if (mod < 0.90) interpretation = 'Good - Credit for better than average experience';
  else if (mod < 1.00) interpretation = 'Slightly better than average experience';
  else if (mod === 1.00) interpretation = 'Average risk - no credit or debit';
  else if (mod < 1.10) interpretation = 'Slightly worse than average experience';
  else if (mod < 1.25) interpretation = 'Poor - Debit for worse than average experience';
  else interpretation = 'High risk - Significant debit for poor experience';
  document.getElementById('emr-modInterpretation').textContent = interpretation;
  
  // Formula values
  var formulaValues = 'Values: (' + Math.round(actualPrimary).toLocaleString() + ' + ' + weightFactor + ' × ' + Math.round(actualExcess).toLocaleString() + ' + ' + ballast.toLocaleString() + ') ÷ (' + Math.round(expectedPrimary).toLocaleString() + ' + ' + weightFactor + ' × ' + Math.round(expectedExcess).toLocaleString() + ' + ' + ballast.toLocaleString() + ') = ' + mod.toFixed(4);
  document.getElementById('emr-formulaValues').textContent = formulaValues;
  
  // Scroll to results
  document.getElementById('emr-results').scrollIntoView({ behavior: 'smooth' });
}
<\/script>
</body>
</html>`;

app.get('/', function(req, res) {
  res.send(LANDING_HTML);
});

app.get('/app', function(req, res) {
  res.send(HTML);
});

app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
  console.log('Landing page at /');
  console.log('Dashboard at /app');
  console.log('Claims will be sent to: ' + CONFIG.CLAIMS_EMAIL);
});
