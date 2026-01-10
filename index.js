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

var HTML = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Titanium Defense Group - Claims Portal</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-100 min-h-screen"><header class="bg-slate-700 text-white p-4"><div class="max-w-4xl mx-auto flex justify-between items-center"><div class="flex items-center gap-3"><img src="https://raw.githubusercontent.com/cdehrlic/titanium-froi/main/Titanium%20logo.webp" alt="Titanium Defense Group" class="h-16"></div><div class="text-right text-sm"><div class="text-slate-300">Workers Compensation</div><div class="font-medium">First Report of Injury</div></div></div></header><div class="max-w-4xl mx-auto p-4"><div id="app" class="bg-white rounded-xl shadow p-6"><div id="form-container"></div></div></div><footer class="bg-slate-800 text-slate-400 py-6 mt-8 text-center text-sm"><p>2025 Titanium Defense Group. All rights reserved.</p></footer><script>var currentStep=0;var formData={firstName:"",lastName:"",mailingAddress:"",city:"",state:"",zipCode:"",phone:"",dateOfHire:"",dateOfBirth:"",gender:"",ssn:"",occupation:"",preferredLanguage:"",dateOfInjury:"",timeOfInjury:"",dateReported:"",weeklyWage:"",employeeWorkType:"",medicalTreatment:"",facilityName:"",resultedInDeath:"",natureOfInjury:"",bodyPartInjured:"",causeOfInjury:"",accidentDescription:"",losingTime:"",dateLastWorked:"",returnStatus:"",facilityStreet:"",facilityCity:"",facilityState:"",facilityZip:"",accidentStreet:"",accidentCity:"",accidentState:"",accidentZip:"",witness1Name:"",witness1Phone:"",witness2Name:"",witness2Phone:"",submitterName:"",submitterPhone:"",submitterEmail:"",additionalComments:"",redFlags:""};var states=["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];var steps=["Employee Info","Claim Details","Injury Info","Work Status","Location","Submit"];function stateOptions(){return states.map(function(s){return "<option value=\\""+s+"\\">"+s+"</option>";}).join("");}function render(){var html="<div class=\\"mb-6\\"><div class=\\"flex justify-between mb-4\\">";for(var i=0;i<steps.length;i++){var bg=i<currentStep?"bg-green-500":i===currentStep?"bg-slate-700":"bg-slate-300";var text=i<=currentStep?"text-white":"text-slate-500";html+="<div class=\\"flex items-center\\"><div class=\\"w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium "+bg+" "+text+"\\">"+(i<currentStep?"\\u2713":(i+1))+"</div>";if(i<steps.length-1)html+="<div class=\\"w-8 h-0.5 mx-1 "+(i<currentStep?"bg-green-500":"bg-slate-300")+"\\"></div>";html+="</div>";}html+="</div></div>";if(currentStep===0){html+="<h3 class=\\"text-lg font-semibold mb-4 pb-2 border-b\\">Employee Personal Information</h3><div class=\\"grid md:grid-cols-2 gap-4\\"><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">First Name *</label><input type=\\"text\\" id=\\"firstName\\" value=\\""+formData.firstName+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Last Name *</label><input type=\\"text\\" id=\\"lastName\\" value=\\""+formData.lastName+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div class=\\"md:col-span-2\\"><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Mailing Address *</label><input type=\\"text\\" id=\\"mailingAddress\\" value=\\""+formData.mailingAddress+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">City *</label><input type=\\"text\\" id=\\"city\\" value=\\""+formData.city+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div class=\\"grid grid-cols-2 gap-2\\"><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">State *</label><select id=\\"state\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"><option value=\\"\\">Select</option>"+stateOptions()+"</select></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Zip *</label><input type=\\"text\\" id=\\"zipCode\\" value=\\""+formData.zipCode+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Phone *</label><input type=\\"tel\\" id=\\"phone\\" value=\\""+formData.phone+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Date of Hire *</label><input type=\\"date\\" id=\\"dateOfHire\\" value=\\""+formData.dateOfHire+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Date of Birth *</label><input type=\\"date\\" id=\\"dateOfBirth\\" value=\\""+formData.dateOfBirth+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Gender</label><select id=\\"gender\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"><option value=\\"\\">Select</option><option value=\\"male\\">Male</option><option value=\\"female\\">Female</option><option value=\\"unknown\\">Unknown</option></select></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">SSN *</label><input type=\\"text\\" id=\\"ssn\\" value=\\""+formData.ssn+"\\" placeholder=\\"XXX-XX-XXXX\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Occupation *</label><input type=\\"text\\" id=\\"occupation\\" value=\\""+formData.occupation+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Preferred Language</label><input type=\\"text\\" id=\\"preferredLanguage\\" value=\\""+formData.preferredLanguage+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div></div>";}else if(currentStep===1){html+="<h3 class=\\"text-lg font-semibold mb-4 pb-2 border-b\\">Claim Information</h3><div class=\\"grid md:grid-cols-2 gap-4\\"><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Date of Injury *</label><input type=\\"date\\" id=\\"dateOfInjury\\" value=\\""+formData.dateOfInjury+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Time of Injury</label><input type=\\"time\\" id=\\"timeOfInjury\\" value=\\""+formData.timeOfInjury+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Date Reported *</label><input type=\\"date\\" id=\\"dateReported\\" value=\\""+formData.dateReported+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Weekly Wage</label><input type=\\"number\\" id=\\"weeklyWage\\" value=\\""+formData.weeklyWage+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Work Type</label><select id=\\"employeeWorkType\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"><option value=\\"\\">Select</option><option value=\\"fulltime\\">Full Time</option><option value=\\"parttime\\">Part Time</option><option value=\\"perdiem\\">Per Diem</option></select></div></div>";}else if(currentStep===2){html+="<h3 class=\\"text-lg font-semibold mb-4 pb-2 border-b\\">Injury Information</h3><div class=\\"space-y-4\\"><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Medical Treatment</label><select id=\\"medicalTreatment\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"><option value=\\"\\">Select</option><option value=\\"none\\">No medical treatment</option><option value=\\"minor\\">Minor treatment</option><option value=\\"hospital\\">Hospitalization 24+ hours</option></select></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Treatment Facility Name</label><input type=\\"text\\" id=\\"facilityName\\" value=\\""+formData.facilityName+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Resulted in Death?</label><select id=\\"resultedInDeath\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"><option value=\\"\\">Select</option><option value=\\"no\\">No</option><option value=\\"yes\\">Yes</option></select></div><div class=\\"grid md:grid-cols-2 gap-4\\"><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Nature of Injury *</label><input type=\\"text\\" id=\\"natureOfInjury\\" value=\\""+formData.natureOfInjury+"\\" placeholder=\\"Strain, Sprain, Fracture...\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Body Part Injured *</label><input type=\\"text\\" id=\\"bodyPartInjured\\" value=\\""+formData.bodyPartInjured+"\\" placeholder=\\"Left arm, Back...\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Cause of Injury *</label><input type=\\"text\\" id=\\"causeOfInjury\\" value=\\""+formData.causeOfInjury+"\\" placeholder=\\"Lifting, Fall, MVA...\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Accident Description *</label><textarea id=\\"accidentDescription\\" rows=\\"4\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\">"+formData.accidentDescription+"</textarea></div></div>";}else if(currentStep===3){html+="<h3 class=\\"text-lg font-semibold mb-4 pb-2 border-b\\">Work Status</h3><div class=\\"space-y-4\\"><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Losing time from work?</label><select id=\\"losingTime\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"><option value=\\"\\">Select</option><option value=\\"yes\\">Yes</option><option value=\\"no\\">No</option></select></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Date Last Worked</label><input type=\\"date\\" id=\\"dateLastWorked\\" value=\\""+formData.dateLastWorked+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Return to Work Status</label><select id=\\"returnStatus\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"><option value=\\"\\">Select</option><option value=\\"no\\">No</option><option value=\\"fullduty\\">Full Duty</option><option value=\\"restrictions\\">With Restrictions</option></select></div></div>";}else if(currentStep===4){html+="<h3 class=\\"text-lg font-semibold mb-4 pb-2 border-b\\">Location and Witnesses</h3><h4 class=\\"font-medium text-slate-700 mb-2\\">Facility Location</h4><div class=\\"grid md:grid-cols-4 gap-4 mb-6\\"><div class=\\"md:col-span-2\\"><input type=\\"text\\" id=\\"facilityStreet\\" value=\\""+formData.facilityStreet+"\\" placeholder=\\"Street\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><input type=\\"text\\" id=\\"facilityCity\\" value=\\""+formData.facilityCity+"\\" placeholder=\\"City\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div class=\\"grid grid-cols-2 gap-2\\"><select id=\\"facilityState\\" class=\\"px-2 py-2 border border-slate-300 rounded-lg\\"><option value=\\"\\">State</option>"+stateOptions()+"</select><input type=\\"text\\" id=\\"facilityZip\\" value=\\""+formData.facilityZip+"\\" placeholder=\\"Zip\\" class=\\"px-2 py-2 border border-slate-300 rounded-lg\\"></div></div><h4 class=\\"font-medium text-slate-700 mb-2\\">Accident Location</h4><div class=\\"grid md:grid-cols-4 gap-4 mb-6\\"><div class=\\"md:col-span-2\\"><input type=\\"text\\" id=\\"accidentStreet\\" value=\\""+formData.accidentStreet+"\\" placeholder=\\"Street\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><input type=\\"text\\" id=\\"accidentCity\\" value=\\""+formData.accidentCity+"\\" placeholder=\\"City\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div class=\\"grid grid-cols-2 gap-2\\"><select id=\\"accidentState\\" class=\\"px-2 py-2 border border-slate-300 rounded-lg\\"><option value=\\"\\">State</option>"+stateOptions()+"</select><input type=\\"text\\" id=\\"accidentZip\\" value=\\""+formData.accidentZip+"\\" placeholder=\\"Zip\\" class=\\"px-2 py-2 border border-slate-300 rounded-lg\\"></div></div><h4 class=\\"font-medium text-slate-700 mb-2\\">Witnesses</h4><div class=\\"space-y-2\\"><div class=\\"grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg\\"><input type=\\"text\\" id=\\"witness1Name\\" value=\\""+formData.witness1Name+"\\" placeholder=\\"Witness 1 Name\\" class=\\"px-3 py-2 border border-slate-300 rounded-lg\\"><input type=\\"tel\\" id=\\"witness1Phone\\" value=\\""+formData.witness1Phone+"\\" placeholder=\\"Phone\\" class=\\"px-3 py-2 border border-slate-300 rounded-lg\\"></div><div class=\\"grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg\\"><input type=\\"text\\" id=\\"witness2Name\\" value=\\""+formData.witness2Name+"\\" placeholder=\\"Witness 2 Name\\" class=\\"px-3 py-2 border border-slate-300 rounded-lg\\"><input type=\\"tel\\" id=\\"witness2Phone\\" value=\\""+formData.witness2Phone+"\\" placeholder=\\"Phone\\" class=\\"px-3 py-2 border border-slate-300 rounded-lg\\"></div></div>";}else if(currentStep===5){html+="<h3 class=\\"text-lg font-semibold mb-4 pb-2 border-b\\">Submit Claim</h3><div class=\\"grid md:grid-cols-2 gap-4 mb-4\\"><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Your Name *</label><input type=\\"text\\" id=\\"submitterName\\" value=\\""+formData.submitterName+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Your Phone *</label><input type=\\"tel\\" id=\\"submitterPhone\\" value=\\""+formData.submitterPhone+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div class=\\"md:col-span-2\\"><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Your Email *</label><input type=\\"email\\" id=\\"submitterEmail\\" value=\\""+formData.submitterEmail+"\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div></div><div class=\\"mb-4\\"><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Additional Comments</label><textarea id=\\"additionalComments\\" rows=\\"3\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\">"+formData.additionalComments+"</textarea></div><div class=\\"mb-4\\"><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Red Flags / Prior Injuries</label><textarea id=\\"redFlags\\" rows=\\"3\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\">"+formData.redFlags+"</textarea></div><div class=\\"mb-4\\"><label class=\\"block text-sm font-medium text-slate-700 mb-1\\">Upload Documents (Optional)</label><input type=\\"file\\" id=\\"files\\" multiple accept=\\".pdf,.jpg,.jpeg,.png,.doc,.docx\\" class=\\"w-full px-3 py-2 border border-slate-300 rounded-lg\\"></div><div class=\\"p-4 bg-amber-50 border border-amber-200 rounded-lg\\"><p class=\\"text-sm text-amber-800\\"><strong>Please review before submitting.</strong> By submitting, you certify this information is accurate.</p></div>";}html+="<div class=\\"flex justify-between mt-8 pt-6 border-t\\"><button onclick=\\"prevStep()\\" class=\\"px-6 py-2 rounded-lg font-medium "+(currentStep===0?"bg-slate-100 text-slate-400":"bg-slate-200 text-slate-700 hover:bg-slate-300")+"\\">&larr; Back</button>";if(currentStep<5){html+="<button onclick=\\"nextStep()\\" class=\\"px-6 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800\\">Continue &rarr;</button>";}else{html+="<button onclick=\\"submitClaim()\\" id=\\"submitBtn\\" class=\\"px-8 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700\\">Submit Claim</button>";}html+="</div>";document.getElementById("form-container").innerHTML=html;if(formData.state)document.getElementById("state").value=formData.state;if(formData.gender)document.getElementById("gender").value=formData.gender;if(formData.employeeWorkType&&document.getElementById("employeeWorkType"))document.getElementById("employeeWorkType").value=formData.employeeWorkType;if(formData.medicalTreatment&&document.getElementById("medicalTreatment"))document.getElementById("medicalTreatment").value=formData.medicalTreatment;if(formData.resultedInDeath&&document.getElementById("resultedInDeath"))document.getElementById("resultedInDeath").value=formData.resultedInDeath;if(formData.losingTime&&document.getElementById("losingTime"))document.getElementById("losingTime").value=formData.losingTime;if(formData.returnStatus&&document.getElementById("returnStatus"))document.getElementById("returnStatus").value=formData.returnStatus;if(formData.facilityState&&document.getElementById("facilityState"))document.getElementById("facilityState").value=formData.facilityState;if(formData.accidentState&&document.getElementById("accidentState"))document.getElementById("accidentState").value=formData.accidentState;}function saveCurrentStep(){var fields=["firstName","lastName","mailingAddress","city","state","zipCode","phone","dateOfHire","dateOfBirth","gender","ssn","occupation","preferredLanguage","dateOfInjury","timeOfInjury","dateReported","weeklyWage","employeeWorkType","medicalTreatment","facilityName","resultedInDeath","natureOfInjury","bodyPartInjured","causeOfInjury","accidentDescription","losingTime","dateLastWorked","returnStatus","facilityStreet","facilityCity","facilityState","facilityZip","accidentStreet","accidentCity","accidentState","accidentZip","witness1Name","witness1Phone","witness2Name","witness2Phone","submitterName","submitterPhone","submitterEmail","additionalComments","redFlags"];fields.forEach(function(f){var el=document.getElementById(f);if(el)formData[f]=el.value;});}function nextStep(){saveCurrentStep();if(currentStep<5){currentStep++;render();}}function prevStep(){saveCurrentStep();if(currentStep>0){currentStep--;render();}}function submitClaim(){saveCurrentStep();var btn=document.getElementById("submitBtn");btn.disabled=true;btn.textContent="Submitting...";var fd=new FormData();fd.append("formData",JSON.stringify(formData));var filesInput=document.getElementById("files");if(filesInput&&filesInput.files){for(var i=0;i<filesInput.files.length;i++){fd.append("file_"+i,filesInput.files[i]);}}fetch("/api/submit-claim",{method:"POST",body:fd}).then(function(r){return r.json();}).then(function(data){if(data.success){document.getElementById("form-container").innerHTML="<div class=\\"text-center py-8\\"><div class=\\"w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4\\"><svg class=\\"w-8 h-8 text-green-600\\" fill=\\"none\\" stroke=\\"currentColor\\" viewBox=\\"0 0 24 24\\"><path stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" stroke-width=\\"2\\" d=\\"M5 13l4 4L19 7\\"></path></svg></div><h2 class=\\"text-2xl font-bold text-slate-800 mb-2\\">Claim Submitted!</h2><p class=\\"text-slate-600 mb-4\\">Reference: "+data.referenceNumber+"</p><p class=\\"text-slate-600 mb-4\\">Sent to: Chad@Titaniumdg.com</p><button onclick=\\"location.reload()\\" class=\\"px-6 py-2 bg-slate-700 text-white rounded-lg\\">Submit Another</button></div>";}else{alert("Error: "+data.error);btn.disabled=false;btn.textContent="Submit Claim";}}).catch(function(err){alert("Error submitting claim");btn.disabled=false;btn.textContent="Submit Claim";});}render();</script></body></html>';

app.get('/', function(req, res) {
  res.send(HTML);
});

app.listen(PORT, function() {
  console.log('Server running on port ' + PORT);
  console.log('Claims will be sent to: ' + CONFIG.CLAIMS_EMAIL);
});
