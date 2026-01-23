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

transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to send emails');
    console.log('Claims will be sent to:', CONFIG.CLAIMS_EMAIL);
  }
});

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
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#334155').text('Reference #: ' + referenceNumber, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('black').text('Generated: ' + new Date().toLocaleString(), { align: 'center' });
    doc.moveDown(2);

    var sections = [
      { title: 'EMPLOYEE PERSONAL INFORMATION', fields: [
        ['Name', (formData.firstName || '') + ' ' + (formData.lastName || '')],
        ['Address', (formData.mailingAddress || '') + ', ' + (formData.city || '') + ', ' + (formData.state || '') + ' ' + (formData.zipCode || '')],
        ['Phone', formData.phone || 'N/A'],
        ['Date of Birth', formData.dateOfBirth || 'N/A'],
        ['Date of Hire', formData.dateOfHire || 'N/A'],
        ['Gender', formData.gender || 'N/A'],
        ['SSN', formData.ssn ? 'XXX-XX-' + formData.ssn.slice(-4) : 'N/A'],
        ['Occupation', formData.occupation || 'N/A']
      ]},
      { title: 'CLAIM INFORMATION', fields: [
        ['Date of Injury', formData.dateOfInjury || 'N/A'],
        ['Time of Injury', formData.timeOfInjury || 'N/A'],
        ['Date Reported', formData.dateReported || 'N/A'],
        ['Weekly Wage', '$' + (formData.weeklyWage || 'N/A')],
        ['Work Type', formData.employeeWorkType || 'N/A']
      ]},
      { title: 'INJURY DETAILS', fields: [
        ['Medical Treatment', formData.medicalTreatment || 'N/A'],
        ['Treatment Facility', formData.facilityName || 'N/A'],
        ['Resulted in Death', formData.resultedInDeath || 'N/A'],
        ['Nature of Injury', formData.natureOfInjury || 'N/A'],
        ['Body Part Injured', formData.bodyPartInjured || 'N/A'],
        ['Cause of Injury', formData.causeOfInjury || 'N/A']
      ]},
      { title: 'WORK STATUS', fields: [
        ['Losing Time', formData.losingTime || 'N/A'],
        ['Date Last Worked', formData.dateLastWorked || 'N/A'],
        ['Return Status', formData.returnStatus || 'N/A']
      ]},
      { title: 'SUBMITTED BY', fields: [
        ['Name', formData.submitterName || 'N/A'],
        ['Phone', formData.submitterPhone || 'N/A'],
        ['Email', formData.submitterEmail || 'N/A']
      ]}
    ];

    sections.forEach(function(section) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#334155').text(section.title);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('black');
      section.fields.forEach(function(field) {
        doc.text(field[0] + ': ' + field[1]);
      });
      doc.moveDown();
    });

    if (formData.accidentDescription) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#334155').text('ACCIDENT DESCRIPTION');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('black').text(formData.accidentDescription);
      doc.moveDown();
    }

    if (formData.redFlags) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#cc0000').text('RED FLAGS / PRIOR INJURIES');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#cc0000').text(formData.redFlags);
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

    var emailHtml = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
      '<div style="background:#334155;padding:20px;text-align:center;"><h1 style="color:white;margin:0;">Titanium Defense Group</h1><p style="color:#94a3b8;margin:5px 0 0;">Workers Compensation Claim</p></div>' +
      '<div style="padding:20px;background:#f8fafc;">' +
      '<h2 style="color:#334155;">New Claim Submitted</h2>' +
      '<p><strong>Reference:</strong> ' + referenceNumber + '</p>' +
      '<p><strong>Employee:</strong> ' + (formData.firstName || '') + ' ' + (formData.lastName || '') + '</p>' +
      '<p><strong>Date of Injury:</strong> ' + (formData.dateOfInjury || 'N/A') + '</p>' +
      '<p><strong>Nature of Injury:</strong> ' + (formData.natureOfInjury || 'N/A') + '</p>' +
      '<p><strong>Body Part:</strong> ' + (formData.bodyPartInjured || 'N/A') + '</p>' +
      '<p><strong>Submitted By:</strong> ' + (formData.submitterName || 'N/A') + ' (' + (formData.submitterEmail || 'N/A') + ')</p>' +
      (formData.redFlags ? '<div style="background:#fef2f2;border:1px solid #dc2626;padding:10px;margin-top:15px;border-radius:5px;"><strong style="color:#dc2626;">RED FLAGS:</strong><br>' + formData.redFlags + '</div>' : '') +
      '<p style="color:#64748b;font-size:14px;margin-top:20px;">See attached PDF for complete details.</p>' +
      '</div>' +
      '<div style="background:#334155;padding:15px;text-align:center;"><p style="color:#94a3b8;margin:0;font-size:12px;">Titanium Defense Group | www.wcreporting.com</p></div></div>';

    try {
      await transporter.sendMail({
        from: CONFIG.SMTP.auth.user,
        to: CONFIG.CLAIMS_EMAIL,
        subject: 'New FROI Claim - ' + (formData.firstName || '') + ' ' + (formData.lastName || '') + ' - ' + (formData.dateOfInjury || ''),
        html: emailHtml,
        attachments: attachments
      });
      console.log('Claim email sent to ' + CONFIG.CLAIMS_EMAIL);
    } catch (err) {
      console.error('Claim email error:', err.message);
    }

    if (formData.submitterEmail) {
      var confirmHtml = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
        '<div style="background:#334155;padding:20px;text-align:center;"><h1 style="color:white;margin:0;">Titanium Defense Group</h1></div>' +
        '<div style="padding:20px;background:#f8fafc;">' +
        '<div style="background:#dcfce7;border:1px solid #16a34a;padding:15px;border-radius:8px;text-align:center;margin-bottom:20px;"><h2 style="color:#16a34a;margin:0;">Claim Submitted Successfully</h2></div>' +
        '<p>Your workers compensation claim for <strong>' + (formData.firstName || '') + ' ' + (formData.lastName || '') + '</strong> has been received.</p>' +
        '<p><strong>Reference Number:</strong> ' + referenceNumber + '</p>' +
        '<p><strong>Date of Injury:</strong> ' + (formData.dateOfInjury || 'N/A') + '</p>' +
        '<p>Our team will review the claim and follow up if needed.</p>' +
        '<p>Thank you,<br><strong>Titanium Defense Group</strong></p>' +
        '</div>' +
        '<div style="background:#334155;padding:15px;text-align:center;"><p style="color:#94a3b8;margin:0;font-size:12px;">www.wcreporting.com</p></div></div>';

      try {
        await transporter.sendMail({
          from: CONFIG.SMTP.auth.user,
          to: formData.submitterEmail,
          subject: 'Claim Confirmation - ' + referenceNumber + ' - Titanium Defense Group',
          html: confirmHtml
        });
        console.log('Confirmation sent to ' + formData.submitterEmail);
      } catch (err) {
        console.error('Confirmation email error:', err.message);
      }
    }

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
<title>Titanium Defense Group - Workers Compensation Claims Portal</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
body { font-family: 'Segoe UI', system-ui, sans-serif; }
.tab-active { background: #334155; color: white; }
.tab-inactive { background: #e2e8f0; color: #475569; }
.tab-inactive:hover { background: #cbd5e1; }
</style>
</head>
<body class="bg-slate-100 min-h-screen">

<header class="bg-slate-700 text-white shadow-lg">
<div class="max-w-6xl mx-auto p-4 flex justify-between items-center">
<div class="flex items-center">
<img src="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Titanium%20logo.webp" alt="Titanium Defense Group" class="h-14">
</div>
<div class="text-right text-sm">
<div class="text-xs text-slate-300 uppercase tracking-widest">Workers Compensation</div>
<div class="font-semibold">Claims Reporting Portal</div>
<div class="text-slate-300 text-xs mt-1">www.wcreporting.com</div>
</div>
</div>
</header>

<div class="max-w-6xl mx-auto p-4">
<div class="flex gap-2 mb-4">
<button onclick="showTab('forms')" id="tab-forms" class="px-6 py-3 rounded-t-lg font-semibold tab-active transition-colors">Download Forms</button>
<button onclick="showTab('claim')" id="tab-claim" class="px-6 py-3 rounded-t-lg font-semibold tab-inactive transition-colors">Submit a Claim</button>
</div>

<div id="section-forms" class="bg-white rounded-xl shadow-lg p-6">
<h3 class="text-xl font-bold text-slate-700 mb-4">Downloadable Forms</h3>
<p class="text-slate-600 mb-6">Download the forms below to document workplace incidents. Completed forms can be uploaded when submitting a claim.</p>
<div class="flex gap-4 flex-wrap">
<a href="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Employee%20Incident%20Report_Titanium_2026.pdf" target="_blank" class="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
Employee Incident Report
</a>
<a href="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Witness%20Statement%20Form_Titanium_2026.pdf" target="_blank" class="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors">
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
Witness Statement Form
</a>
</div>
</div>

<div id="section-claim" class="bg-white rounded-xl shadow-lg p-6 hidden">
<div id="form-container"></div>
</div>
</div>

<footer class="bg-slate-800 text-slate-400 py-6 mt-8 text-center text-sm">
<p>&copy; 2025 Titanium Defense Group. All rights reserved.</p>
<p class="mt-1">www.wcreporting.com</p>
</footer>

<script>
function showTab(t) {
  document.getElementById('section-forms').classList.add('hidden');
  document.getElementById('section-claim').classList.add('hidden');
  document.getElementById('tab-forms').className = 'px-6 py-3 rounded-t-lg font-semibold tab-inactive transition-colors';
  document.getElementById('tab-claim').className = 'px-6 py-3 rounded-t-lg font-semibold tab-inactive transition-colors';
  document.getElementById('section-' + t).classList.remove('hidden');
  document.getElementById('tab-' + t).className = 'px-6 py-3 rounded-t-lg font-semibold tab-active transition-colors';
}

var currentStep = 0;
var formData = {
  firstName: '', lastName: '', mailingAddress: '', city: '', state: '', zipCode: '',
  phone: '', dateOfHire: '', dateOfBirth: '', gender: '', ssn: '', occupation: '', preferredLanguage: '',
  dateOfInjury: '', timeOfInjury: '', dateReported: '', weeklyWage: '', employeeWorkType: '',
  medicalTreatment: '', facilityName: '', resultedInDeath: '', natureOfInjury: '', bodyPartInjured: '',
  causeOfInjury: '', accidentDescription: '', losingTime: '', dateLastWorked: '', returnStatus: '',
  facilityStreet: '', facilityCity: '', facilityState: '', facilityZip: '',
  accidentStreet: '', accidentCity: '', accidentState: '', accidentZip: '',
  witness1Name: '', witness1Phone: '', witness2Name: '', witness2Phone: '',
  submitterName: '', submitterPhone: '', submitterEmail: '', additionalComments: '', redFlags: ''
};

var states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function stateOptions(selected) {
  return '<option value="">Select</option>' + states.map(function(s) {
    return '<option value="' + s + '"' + (selected === s ? ' selected' : '') + '>' + s + '</option>';
  }).join('');
}

function render() {
  var h = '';
  var stepNames = ['Employee Info', 'Claim Info', 'Injury', 'Work Status', 'Location', 'Submit'];
  
  h += '<div class="flex justify-between mb-8">';
  for (var i = 0; i < stepNames.length; i++) {
    var active = i === currentStep;
    var done = i < currentStep;
    h += '<div class="flex flex-col items-center flex-1">';
    h += '<div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ';
    h += active ? 'bg-slate-700 text-white' : done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500';
    h += '">' + (done ? '&#10003;' : (i + 1)) + '</div>';
    h += '<div class="text-xs mt-2 text-center ' + (active ? 'text-slate-700 font-semibold' : 'text-slate-400') + '">' + stepNames[i] + '</div>';
    h += '</div>';
  }
  h += '</div>';

  if (currentStep === 0) {
    h += '<h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-slate-200">Employee Personal Information</h3>';
    h += '<div class="grid md:grid-cols-2 gap-4">';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">First Name *</label><input type="text" id="firstName" value="' + formData.firstName + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Last Name *</label><input type="text" id="lastName" value="' + formData.lastName + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"></div>';
    h += '</div>';
    h += '<div class="mt-4"><label class="block text-sm font-semibold text-slate-700 mb-1">Mailing Address *</label><input type="text" id="mailingAddress" value="' + formData.mailingAddress + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div class="grid md:grid-cols-4 gap-4 mt-4">';
    h += '<div class="md:col-span-2"><label class="block text-sm font-semibold text-slate-700 mb-1">City *</label><input type="text" id="city" value="' + formData.city + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">State *</label><select id="state" class="w-full px-4 py-2 border border-slate-300 rounded-lg">' + stateOptions(formData.state) + '</select></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Zip *</label><input type="text" id="zipCode" value="' + formData.zipCode + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '</div>';
    h += '<div class="grid md:grid-cols-3 gap-4 mt-4">';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Phone</label><input type="tel" id="phone" value="' + formData.phone + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Date of Birth *</label><input type="date" id="dateOfBirth" value="' + formData.dateOfBirth + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Date of Hire *</label><input type="date" id="dateOfHire" value="' + formData.dateOfHire + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '</div>';
    h += '<div class="grid md:grid-cols-4 gap-4 mt-4">';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Gender</label><select id="gender" class="w-full px-4 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="male"' + (formData.gender === 'male' ? ' selected' : '') + '>Male</option><option value="female"' + (formData.gender === 'female' ? ' selected' : '') + '>Female</option></select></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">SSN</label><input type="text" id="ssn" value="' + formData.ssn + '" placeholder="XXX-XX-XXXX" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Occupation *</label><input type="text" id="occupation" value="' + formData.occupation + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Language</label><select id="preferredLanguage" class="w-full px-4 py-2 border border-slate-300 rounded-lg"><option value="english">English</option><option value="spanish"' + (formData.preferredLanguage === 'spanish' ? ' selected' : '') + '>Spanish</option></select></div>';
    h += '</div>';
  } else if (currentStep === 1) {
    h += '<h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-slate-200">Claim Information</h3>';
    h += '<div class="grid md:grid-cols-3 gap-4">';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Date of Injury *</label><input type="date" id="dateOfInjury" value="' + formData.dateOfInjury + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Time of Injury</label><input type="time" id="timeOfInjury" value="' + formData.timeOfInjury + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Date Reported</label><input type="date" id="dateReported" value="' + formData.dateReported + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '</div>';
    h += '<div class="grid md:grid-cols-2 gap-4 mt-4">';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Estimated Weekly Wage</label><input type="number" id="weeklyWage" value="' + formData.weeklyWage + '" placeholder="$0.00" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Employee Work Type</label><select id="employeeWorkType" class="w-full px-4 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="fulltime"' + (formData.employeeWorkType === 'fulltime' ? ' selected' : '') + '>Full Time</option><option value="parttime"' + (formData.employeeWorkType === 'parttime' ? ' selected' : '') + '>Part Time</option><option value="seasonal"' + (formData.employeeWorkType === 'seasonal' ? ' selected' : '') + '>Seasonal</option></select></div>';
    h += '</div>';
  } else if (currentStep === 2) {
    h += '<h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-slate-200">Injury Information</h3>';
    h += '<div class="space-y-4">';
    h += '<div class="grid md:grid-cols-2 gap-4">';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Medical Treatment</label><select id="medicalTreatment" class="w-full px-4 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="none"' + (formData.medicalTreatment === 'none' ? ' selected' : '') + '>No medical treatment</option><option value="minor"' + (formData.medicalTreatment === 'minor' ? ' selected' : '') + '>Minor treatment</option><option value="hospital"' + (formData.medicalTreatment === 'hospital' ? ' selected' : '') + '>Hospitalization 24+ hours</option></select></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Treatment Facility Name</label><input type="text" id="facilityName" value="' + formData.facilityName + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '</div>';
    h += '<div class="grid md:grid-cols-2 gap-4">';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Nature of Injury *</label><input type="text" id="natureOfInjury" value="' + formData.natureOfInjury + '" placeholder="Strain, Sprain, Fracture..." class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Body Part Injured *</label><input type="text" id="bodyPartInjured" value="' + formData.bodyPartInjured + '" placeholder="Left arm, Back, etc." class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '</div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Cause of Injury *</label><input type="text" id="causeOfInjury" value="' + formData.causeOfInjury + '" placeholder="Lifting, Fall, MVA..." class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Accident Description *</label><textarea id="accidentDescription" rows="4" placeholder="Describe what happened..." class="w-full px-4 py-2 border border-slate-300 rounded-lg">' + formData.accidentDescription + '</textarea></div>';
    h += '</div>';
  } else if (currentStep === 3) {
    h += '<h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-slate-200">Work Status</h3>';
    h += '<div class="space-y-4">';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Losing time from work?</label><select id="losingTime" class="w-full px-4 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="yes"' + (formData.losingTime === 'yes' ? ' selected' : '') + '>Yes</option><option value="no"' + (formData.losingTime === 'no' ? ' selected' : '') + '>No</option></select></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Date Last Worked</label><input type="date" id="dateLastWorked" value="' + formData.dateLastWorked + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Return to Work Status</label><select id="returnStatus" class="w-full px-4 py-2 border border-slate-300 rounded-lg"><option value="">Select</option><option value="no"' + (formData.returnStatus === 'no' ? ' selected' : '') + '>Has not returned</option><option value="fullduty"' + (formData.returnStatus === 'fullduty' ? ' selected' : '') + '>Returned - Full Duty</option><option value="restrictions"' + (formData.returnStatus === 'restrictions' ? ' selected' : '') + '>Returned - With Restrictions</option></select></div>';
    h += '</div>';
  } else if (currentStep === 4) {
    h += '<h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-slate-200">Location and Witnesses</h3>';
    h += '<h4 class="font-semibold text-slate-700 mb-2">Accident Location</h4>';
    h += '<div class="grid md:grid-cols-4 gap-4 mb-6">';
    h += '<div class="md:col-span-2"><input type="text" id="accidentStreet" value="' + formData.accidentStreet + '" placeholder="Street Address" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><input type="text" id="accidentCity" value="' + formData.accidentCity + '" placeholder="City" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><input type="text" id="accidentZip" value="' + formData.accidentZip + '" placeholder="Zip" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '</div>';
    h += '<h4 class="font-semibold text-slate-700 mb-2">Witnesses</h4>';
    h += '<div class="space-y-3">';
    h += '<div class="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">';
    h += '<input type="text" id="witness1Name" value="' + formData.witness1Name + '" placeholder="Witness 1 Name" class="px-4 py-2 border border-slate-300 rounded-lg">';
    h += '<input type="tel" id="witness1Phone" value="' + formData.witness1Phone + '" placeholder="Phone Number" class="px-4 py-2 border border-slate-300 rounded-lg">';
    h += '</div>';
    h += '<div class="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">';
    h += '<input type="text" id="witness2Name" value="' + formData.witness2Name + '" placeholder="Witness 2 Name" class="px-4 py-2 border border-slate-300 rounded-lg">';
    h += '<input type="tel" id="witness2Phone" value="' + formData.witness2Phone + '" placeholder="Phone Number" class="px-4 py-2 border border-slate-300 rounded-lg">';
    h += '</div>';
    h += '</div>';
  } else if (currentStep === 5) {
    h += '<h3 class="text-lg font-bold text-slate-800 mb-4 pb-2 border-b-2 border-slate-200">Submit Claim</h3>';
    h += '<div class="grid md:grid-cols-2 gap-4 mb-4">';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Your Name *</label><input type="text" id="submitterName" value="' + formData.submitterName + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div><label class="block text-sm font-semibold text-slate-700 mb-1">Your Phone *</label><input type="tel" id="submitterPhone" value="' + formData.submitterPhone + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div class="md:col-span-2"><label class="block text-sm font-semibold text-slate-700 mb-1">Your Email *</label><input type="email" id="submitterEmail" value="' + formData.submitterEmail + '" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '</div>';
    h += '<div class="mb-4"><label class="block text-sm font-semibold text-slate-700 mb-1">Additional Comments</label><textarea id="additionalComments" rows="3" class="w-full px-4 py-2 border border-slate-300 rounded-lg">' + formData.additionalComments + '</textarea></div>';
    h += '<div class="mb-4"><label class="block text-sm font-semibold text-slate-700 mb-1">Red Flags / Prior Injuries</label><textarea id="redFlags" rows="3" placeholder="Note any concerns or prior related injuries..." class="w-full px-4 py-2 border border-slate-300 rounded-lg">' + formData.redFlags + '</textarea></div>';
    h += '<div class="mb-4"><label class="block text-sm font-semibold text-slate-700 mb-1">Upload Documents (Optional)</label><input type="file" id="files" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" class="w-full px-4 py-2 border border-slate-300 rounded-lg"></div>';
    h += '<div class="p-4 bg-amber-50 border border-amber-300 rounded-lg"><p class="text-sm text-amber-800"><strong>Please review all information before submitting.</strong> By submitting this claim, you certify that the information provided is accurate to the best of your knowledge.</p></div>';
  }

  h += '<div class="flex justify-between mt-8 pt-6 border-t border-slate-200">';
  h += '<button onclick="prevStep()" class="px-6 py-2 rounded-lg font-semibold ' + (currentStep === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-700 hover:bg-slate-300') + ' transition-colors">Back</button>';
  if (currentStep < 5) {
    h += '<button onclick="nextStep()" class="px-6 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors">Continue</button>';
  } else {
    h += '<button onclick="submitClaim()" id="submitBtn" class="px-8 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">Submit Claim</button>';
  }
  h += '</div>';

  document.getElementById('form-container').innerHTML = h;
}

function saveStep() {
  var fields = ['firstName','lastName','mailingAddress','city','state','zipCode','phone','dateOfHire','dateOfBirth','gender','ssn','occupation','preferredLanguage','dateOfInjury','timeOfInjury','dateReported','weeklyWage','employeeWorkType','medicalTreatment','facilityName','resultedInDeath','natureOfInjury','bodyPartInjured','causeOfInjury','accidentDescription','losingTime','dateLastWorked','returnStatus','facilityStreet','facilityCity','facilityState','facilityZip','accidentStreet','accidentCity','accidentState','accidentZip','witness1Name','witness1Phone','witness2Name','witness2Phone','submitterName','submitterPhone','submitterEmail','additionalComments','redFlags'];
  fields.forEach(function(f) {
    var el = document.getElementById(f);
    if (el) formData[f] = el.value;
  });
}

function nextStep() {
  saveStep();
  if (currentStep < 5) { currentStep++; render(); window.scrollTo(0, 0); }
}

function prevStep() {
  saveStep();
  if (currentStep > 0) { currentStep--; render(); window.scrollTo(0, 0); }
}

function submitClaim() {
  saveStep();
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
        document.getElementById('form-container').innerHTML = '<div class="text-center py-12"><div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div><h2 class="text-2xl font-bold text-slate-800 mb-2">Claim Submitted Successfully!</h2><p class="text-slate-600 mb-2">Reference Number:</p><p class="text-2xl font-mono font-bold text-slate-800 mb-6">' + data.referenceNumber + '</p><p class="text-slate-500 mb-6">A confirmation email has been sent. Our team will review your submission.</p><button onclick="location.reload()" class="px-6 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors">Submit Another Claim</button></div>';
      } else {
        alert('Error: ' + data.error);
        btn.disabled = false;
        btn.textContent = 'Submit Claim';
      }
    })
    .catch(function(err) {
      alert('Error submitting claim. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Submit Claim';
    });
}

render();
</script>
</body>
</html>`;

app.get('/', function(req, res) {
  res.send(HTML);
});

app.listen(PORT, function() {
  console.log('Titanium Defense Group Claims Portal running on port ' + PORT);
});
