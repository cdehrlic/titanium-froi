const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const CONFIG = {
  CLAIMS_EMAIL: process.env.CLAIMS_EMAIL || 'Chad@Titaniumdg.com',
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024, files: 20 } });

const transporter = nodemailer.createTransport(CONFIG.SMTP);

transporter.verify(function(error, success) {
  if (error) {
    console.error('⚠️  SMTP Connection Error:', error.message);
    console.log('   Claims will be saved but emails may not send.');
  } else {
    console.log('✅ SMTP Connected - Emails will be sent to:', CONFIG.CLAIMS_EMAIL);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY LIST - Edit this to add/remove clients
// ═══════════════════════════════════════════════════════════════════════════════
const ENTITIES = [
  'Sigma Link Rehab',
  'Towne Nursing Staff',
  'Towne Healthcare Staffing',
  'Towne School Nurses',
  'Shiftster LLC / Eshyft',
  'Grandison Management',
  'SMS Cleaning and Housekeeping Services',
  'Towne Home Care / Towne Staffing LLC Share Policy',
  'Fairmont & GNP',
  'LiveWell Plus',
  'Advanced Care Agency / Baybay',
  'Esky Care',
  'New Premier Management LLC',
  'Quality Facility Solutions Corp',
  'Friends and Family Homecare LLC'
];

// ═══════════════════════════════════════════════════════════════════════════════
// LABEL MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════════
const INJURY_TYPE_LABELS = {
  'slip_trip_fall': 'Slip, Trip, or Fall',
  'struck_by': 'Struck By Object',
  'strain_sprain': 'Strain / Sprain / Overexertion',
  'cut_laceration': 'Cut / Laceration / Puncture',
  'burn': 'Burn (Heat/Chemical/Electrical)',
  'caught_in': 'Caught In / Between',
  'vehicle': 'Motor Vehicle Incident',
  'assault': 'Assault / Violence',
  'exposure': 'Chemical / Toxic Exposure',
  'repetitive': 'Repetitive Motion / Cumulative',
  'other': 'Other'
};

const ROOT_CAUSE_LABELS = {
  'no_inspection': 'No Inspection Procedures',
  'gap_inspection': 'Gap in Inspection Procedures',
  'inspection_not_followed': 'Inspection Procedures Not Followed',
  'no_safe_handling': 'No Safe Patient Handling Procedures',
  'gap_safe_handling': 'Gap in Safe Patient Handling Procedures',
  'safe_handling_not_followed': 'Safe Patient Handling Not Followed',
  'combative_no_trigger': 'Combative Resident - No Identified Trigger',
  'combative_identified': 'Combative Resident - Identified Trigger',
  'no_deescalation': 'No De-escalation Procedures',
  'deescalation_not_followed': 'De-escalation Procedures Not Followed',
  'no_ppe': 'No Applicable PPE/Footwear Requirements',
  'ppe_not_worn': 'Required PPE/Footwear Not Worn',
  'no_policies': 'No Applicable Policies/Procedures',
  'gap_policies': 'Gap in Applicable Policies/Procedures',
  'policies_not_followed': 'Policies/Procedures Not Followed'
};

const CORRECTIVE_LABELS = {
  'reviewed_procedures': 'Reviewed Proper Procedures with Employee',
  'observed_performance': 'Observed Employee Performing Procedures Properly',
  'reviewed_department': 'Reviewed Incident with All Department Employees',
  'discipline_applied': 'Employee Disciplined for Disregarding Procedures',
  'accountability_assigned': 'Accountability/Risk Owner Assigned',
  'incentive_program': 'Established Incentive Program for Compliance',
  'established_training': 'Established Training(s)',
  'increased_training': 'Increased Training Frequency',
  'adjusted_procedures': 'Adjusted or Expanded Existing Procedures',
  'new_procedures': 'Established New Procedures'
};

const FRAUD_LABELS = {
  'delayed_report': 'Delayed reporting (not immediate)',
  'monday_claim': 'Monday morning claim',
  'no_witnesses': 'No witnesses to incident',
  'vague_description': 'Vague or inconsistent description',
  'recent_discipline': 'Recent disciplinary action',
  'pending_layoff': 'Facing layoff or termination',
  'new_employee': 'Very new employee',
  'history_claims': 'History of prior claims',
  'financial_issues': 'Known financial difficulties',
  'refuses_medical': 'Initially refused then changed mind',
  'family_unaware': 'Family unaware of injury',
  'excessive_time': 'More time off than injury warrants',
  'settlement_demands': 'Demanding quick settlement',
  'changes_physician': 'Changed physician after release'
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED PDF GENERATION
// ═══════════════════════════════════════════════════════════════════════════════
function generateClaimPDF(formData, referenceNumber) {
  return new Promise(function(resolve, reject) {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const COLORS = { primary: '#1a1f26', accent: '#58a6ff', success: '#238636', warning: '#d29922', danger: '#f85149', text: '#333333', muted: '#6e7681' };

    // Header
    doc.rect(0, 0, 612, 80).fill('#1a1f26');
    doc.fontSize(22).font('Helvetica-Bold').fillColor('white').text('TITANIUM DEFENSE GROUP', 50, 25);
    doc.fontSize(11).font('Helvetica').fillColor('#8b949e').text('Smart Claim Intake Report', 50, 50);
    doc.fontSize(10).fillColor('#58a6ff').text('www.wcreporting.com', 450, 50);
    doc.y = 100;

    // Reference Box
    doc.rect(50, 90, 512, 40).fillAndStroke('#f0f6fc', '#e1e4e8');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1f26').text('Reference #: ' + referenceNumber, 60, 100);
    doc.fontSize(10).font('Helvetica').fillColor('#6e7681').text('Generated: ' + new Date().toLocaleString(), 60, 116);
    doc.fontSize(10).fillColor('#6e7681').text('Entity: ' + (formData.entity || 'N/A'), 350, 100);
    doc.y = 145;

    function addSection(title, color) {
      doc.moveDown(0.5);
      if (doc.y > 680) { doc.addPage(); doc.y = 50; }
      doc.rect(50, doc.y, 512, 22).fill(color || COLORS.primary);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('white').text(title, 60, doc.y + 6);
      doc.y += 28;
    }

    function addField(label, value) {
      if (doc.y > 720) { doc.addPage(); doc.y = 50; }
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.muted).text(label + ':', 60, doc.y, { continued: true, width: 150 });
      doc.font('Helvetica').fillColor(COLORS.text).text(' ' + (value || 'N/A'), { width: 400 });
      doc.y += 4;
    }

    function addFieldRow(fields) {
      if (doc.y > 720) { doc.addPage(); doc.y = 50; }
      const startY = doc.y;
      fields.forEach((field, i) => {
        const x = 60 + (i * 250);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.muted).text(field.label + ': ', x, startY, { continued: true });
        doc.font('Helvetica').fillColor(COLORS.text).text(field.value || 'N/A');
      });
      doc.y = startY + 14;
    }

    // EMPLOYEE INFORMATION
    addSection('EMPLOYEE PERSONAL INFORMATION');
    addFieldRow([{ label: 'Name', value: (formData.firstName || '') + ' ' + (formData.lastName || '') }, { label: 'DOB', value: formData.dateOfBirth }]);
    addField('Address', [formData.mailingAddress, formData.city, formData.state, formData.zipCode].filter(Boolean).join(', '));
    addFieldRow([{ label: 'Phone', value: formData.phone }, { label: 'Date of Hire', value: formData.dateOfHire }]);
    addFieldRow([{ label: 'SSN', value: formData.ssn ? 'XXX-XX-' + formData.ssn.slice(-4) : 'N/A' }, { label: 'Occupation', value: formData.occupation }]);

    // CLAIM INFORMATION
    addSection('CLAIM INFORMATION');
    addField('Entity', formData.entity);
    addFieldRow([{ label: 'Date of Injury', value: formData.dateOfInjury }, { label: 'Time', value: formData.timeOfInjury }]);
    addFieldRow([{ label: 'Date Reported', value: formData.dateReported }, { label: 'Reported Immediately', value: formData.reportedImmediately === true ? 'Yes' : formData.reportedImmediately === false ? 'NO ⚠️' : 'N/A' }]);
    addFieldRow([{ label: 'Weekly Wage', value: formData.weeklyWage ? '$' + formData.weeklyWage : 'N/A' }, { label: 'Work Type', value: formData.employeeWorkType }]);

    // INCIDENT DETAILS
    addSection('INCIDENT DETAILS');
    addField('Injury Type', INJURY_TYPE_LABELS[formData.injuryType] || formData.injuryType);
    addFieldRow([{ label: 'Nature of Injury', value: formData.natureOfInjury }, { label: 'Cause', value: formData.causeOfInjury }]);
    addField('Body Parts', Array.isArray(formData.bodyParts) ? formData.bodyParts.join(', ') : formData.bodyParts);
    addField('Job Duties', formData.jobDuties);
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.muted).text('Description:', 60, doc.y);
    doc.moveDown(0.2);
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text(formData.accidentDescription || 'N/A', 60, doc.y, { width: 490 });
    doc.moveDown(0.5);
    if (formData.accidentStreet) {
      addField('Accident Location', [formData.accidentStreet, formData.accidentCity, formData.accidentState, formData.accidentZip].filter(Boolean).join(', '));
    }

    // MEDICAL TREATMENT
    addSection('MEDICAL TREATMENT');
    addFieldRow([{ label: 'Treatment Level', value: formData.medicalTreatment }, { label: 'Sought Treatment', value: formData.soughtMedicalTreatment === true ? 'Yes' : 'No' }]);
    if (formData.soughtMedicalTreatment === true) {
      addField('Facility', formData.facilityName);
      if (formData.facilityStreet) addField('Facility Address', [formData.facilityStreet, formData.facilityCity, formData.facilityState, formData.facilityZip].filter(Boolean).join(', '));
      addField('Treatment Date', formData.treatmentDate);
    }
    if (formData.refusedTreatment === true) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.warning).text('⚠️ EMPLOYEE REFUSED MEDICAL TREATMENT', 60, doc.y);
      doc.moveDown(0.5);
    }

    // WITNESSES & EVIDENCE
    addSection('WITNESSES & EVIDENCE');
    addFieldRow([{ label: 'Video Available', value: formData.hasVideo === true ? 'YES ✓' : 'No' }, { label: 'Photos Available', value: formData.photosAvailable === true ? 'YES ✓' : 'No' }]);
    if (formData.videoLocation) addField('Video Location', formData.videoLocation);
    if (formData.witness1Name) {
      addFieldRow([{ label: 'Witness 1', value: formData.witness1Name }, { label: 'Phone', value: formData.witness1Phone }]);
      if (formData.witness1Statement) addField('Statement', formData.witness1Statement);
    }
    if (formData.witness2Name) {
      addFieldRow([{ label: 'Witness 2', value: formData.witness2Name }, { label: 'Phone', value: formData.witness2Phone }]);
      if (formData.witness2Statement) addField('Statement', formData.witness2Statement);
    }
    if (!formData.witness1Name && !formData.witness2Name) {
      doc.fontSize(9).fillColor(COLORS.warning).text('⚠️ No witnesses reported', 60, doc.y);
      doc.moveDown(0.5);
    }

    // WORK STATUS
    addSection('WORK STATUS');
    addFieldRow([{ label: 'Losing Time', value: formData.losingTime === true ? 'YES ⚠️' : 'No' }, { label: 'Date Last Worked', value: formData.dateLastWorked }]);
    addField('Return Status', formData.returnStatus === 'no' ? 'Has not returned' : formData.returnStatus === 'fullduty' ? 'Full Duty' : formData.returnStatus === 'restrictions' ? 'Light Duty' : formData.returnStatus);
    addFieldRow([{ label: 'Light Duty Available', value: formData.lightDutyAvailable === true ? 'Yes' : formData.lightDutyAvailable === false ? 'NO ⚠️' : 'N/A' }, { label: 'Salary Continuation', value: formData.salaryContinuation === true ? 'Yes' : 'No' }]);

    // ROOT CAUSE ANALYSIS
    addSection('ROOT CAUSE ANALYSIS', '#334155');
    addField('Direct Cause', formData.directCause);
    if (Array.isArray(formData.rootCauseSymptoms) && formData.rootCauseSymptoms.length > 0) {
      addField('Root Cause', formData.rootCauseSymptoms.map(rc => ROOT_CAUSE_LABELS[rc] || rc).join(', '));
    }
    addFieldRow([{ label: 'Procedures in Place', value: formData.proceduresInPlace === true ? 'Yes' : formData.proceduresInPlace === false ? 'NO ⚠️' : 'N/A' }, { label: 'Followed', value: formData.proceduresFollowed === true ? 'Yes' : formData.proceduresFollowed === false ? 'NO ⚠️' : 'N/A' }]);
    if (formData.proceduresFollowed === false) {
      addFieldRow([{ label: 'Training Provided', value: formData.trainingProvided === true ? 'Yes' : 'NO ⚠️' }, { label: 'Frequency', value: formData.trainingFrequency }]);
    }
    if (Array.isArray(formData.correctiveActions) && formData.correctiveActions.length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.success).text('✓ Corrective Actions:', 60, doc.y);
      doc.moveDown(0.2);
      formData.correctiveActions.forEach(action => {
        doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text('• ' + (CORRECTIVE_LABELS[action] || action), 70, doc.y);
        doc.moveDown(0.3);
      });
    }

    // INVESTIGATION FLAGS
    const hasFlags = formData.validityConcerns === true || (Array.isArray(formData.fraudIndicators) && formData.fraudIndicators.length > 0) || formData.redFlags;
    if (hasFlags) {
      addSection('⚠️ INVESTIGATION FLAGS', COLORS.danger);
      if (formData.validityConcerns === true) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.danger).text('VALIDITY CONCERNS REPORTED', 60, doc.y);
        doc.moveDown(0.3);
        if (formData.concernDetails) {
          doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text(formData.concernDetails, 60, doc.y, { width: 490 });
          doc.moveDown(0.5);
        }
      }
      if (Array.isArray(formData.fraudIndicators) && formData.fraudIndicators.length > 0) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.warning).text('Fraud Indicators:', 60, doc.y);
        doc.moveDown(0.2);
        formData.fraudIndicators.forEach(ind => {
          doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text('⚠️ ' + (FRAUD_LABELS[ind] || ind), 70, doc.y);
          doc.moveDown(0.3);
        });
      }
      if (formData.redFlags) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.warning).text('Additional Red Flags:', 60, doc.y);
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text(formData.redFlags, 60, doc.y, { width: 490 });
        doc.moveDown(0.5);
      }
    }

    // SUBROGATION
    if (formData.thirdPartyInvolved === true || formData.thirdPartyInvolved === 'maybe') {
      addSection('💰 SUBROGATION POTENTIAL', COLORS.success);
      addField('Third Party', formData.thirdPartyInvolved === true ? 'YES - Investigate' : 'Possible');
      if (formData.thirdPartyDetails) addField('Details', formData.thirdPartyDetails);
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.accent).text('ACTION ITEMS:', 60, doc.y);
      doc.moveDown(0.2);
      ['Preserve all evidence immediately', 'Issue preservation letter within 48 hours', 'Identify responsible party', 'Obtain insurance information', 'Photograph scene'].forEach(item => {
        doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text('• ' + item, 70, doc.y);
        doc.moveDown(0.3);
      });
    }

    // SUBMITTED BY
    addSection('SUBMITTED BY');
    addFieldRow([{ label: 'Name', value: formData.submitterName }, { label: 'Phone', value: formData.submitterPhone }]);
    addField('Email', formData.submitterEmail);
    if (formData.additionalComments) {
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.muted).text('Comments:', 60, doc.y);
      doc.moveDown(0.2);
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text(formData.additionalComments, 60, doc.y, { width: 490 });
    }

    // Footer on all pages
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor(COLORS.muted).text('Titanium Defense Group | Smart Claim Intake | Page ' + (i + 1) + ' of ' + pageCount, 50, 750, { align: 'center', width: 512 });
    }

    doc.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.0' }));
app.get('/api/entities', (req, res) => res.json(ENTITIES));

app.post('/api/submit-claim', upload.any(), async (req, res) => {
  try {
    const formData = JSON.parse(req.body.formData);
    const files = req.files || [];
    const referenceNumber = 'FROI-' + Date.now().toString().slice(-8);
    console.log(`📋 Processing claim ${referenceNumber} for ${formData.entity}`);

    const pdfBuffer = await generateClaimPDF(formData, referenceNumber);
    const attachments = [{ filename: `${referenceNumber}-SmartClaimReport.pdf`, content: pdfBuffer, contentType: 'application/pdf' }];
    files.forEach(file => attachments.push({ filename: file.originalname, content: file.buffer, contentType: file.mimetype }));

    // Determine priority
    let priority = 'NORMAL';
    let priorityColor = '#334155';
    if (formData.validityConcerns === true || (formData.fraudIndicators && formData.fraudIndicators.length >= 3)) {
      priority = '🚨 HIGH - INVESTIGATION NEEDED';
      priorityColor = '#dc2626';
    } else if (formData.thirdPartyInvolved === true) {
      priority = '💰 SUBROGATION POTENTIAL';
      priorityColor = '#16a34a';
    } else if (formData.losingTime === true) {
      priority = '⚠️ LOST TIME CLAIM';
      priorityColor = '#d97706';
    }

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;">
        <div style="background:#1a1f26;padding:25px;text-align:center;">
          <h1 style="color:white;margin:0;">Titanium Defense Group</h1>
          <p style="color:#58a6ff;margin:8px 0 0;">Smart Claim Intake Report</p>
        </div>
        <div style="background:${priorityColor};padding:12px 20px;">
          <p style="color:white;margin:0;font-weight:bold;">PRIORITY: ${priority}</p>
        </div>
        <div style="padding:25px;background:#f8fafc;">
          <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid #e2e8f0;">
            <h2 style="color:#1a1f26;margin:0 0 15px;border-bottom:2px solid #58a6ff;padding-bottom:10px;">Claim Summary</h2>
            <table style="width:100%;font-size:14px;">
              <tr><td style="padding:5px 0;color:#6e7681;width:140px;">Reference:</td><td style="font-weight:bold;">${referenceNumber}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Entity:</td><td style="font-weight:bold;">${formData.entity || 'N/A'}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Employee:</td><td>${formData.firstName || ''} ${formData.lastName || ''}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Date of Injury:</td><td>${formData.dateOfInjury || 'N/A'}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Injury Type:</td><td>${INJURY_TYPE_LABELS[formData.injuryType] || formData.injuryType || 'N/A'}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Losing Time:</td><td style="${formData.losingTime === true ? 'color:#dc2626;font-weight:bold;' : ''}">${formData.losingTime === true ? 'YES' : 'No'}</td></tr>
            </table>
          </div>
          ${formData.validityConcerns === true || (formData.fraudIndicators && formData.fraudIndicators.length > 0) ? `
          <div style="background:#fef2f2;border:1px solid #dc2626;padding:15px;margin-bottom:20px;border-radius:8px;">
            <h3 style="color:#dc2626;margin:0 0 10px;">⚠️ INVESTIGATION FLAGS</h3>
            ${formData.fraudIndicators && formData.fraudIndicators.length > 0 ? `<p style="margin:5px 0;font-size:13px;"><strong>Fraud Indicators:</strong> ${formData.fraudIndicators.length} flagged</p>` : ''}
          </div>` : ''}
          ${formData.thirdPartyInvolved === true || formData.thirdPartyInvolved === 'maybe' ? `
          <div style="background:#dcfce7;border:1px solid #16a34a;padding:15px;margin-bottom:20px;border-radius:8px;">
            <h3 style="color:#16a34a;margin:0 0 10px;">💰 SUBROGATION POTENTIAL</h3>
            <p style="margin:5px 0;font-size:13px;">${formData.thirdPartyDetails || 'Third party involved - investigate'}</p>
          </div>` : ''}
          <p style="font-size:13px;color:#6e7681;">Submitted by: ${formData.submitterName || 'N/A'} (${formData.submitterEmail || 'N/A'})</p>
        </div>
        <div style="background:#1a1f26;padding:20px;text-align:center;">
          <p style="color:#8b949e;margin:0;font-size:12px;">www.wcreporting.com</p>
        </div>
      </div>`;

    try {
      await transporter.sendMail({
        from: CONFIG.SMTP.auth.user,
        to: CONFIG.CLAIMS_EMAIL,
        subject: `[${priority.replace(/[^\w\s-]/g, '').trim()}] ${formData.firstName || ''} ${formData.lastName || ''} - ${formData.entity || ''} - ${formData.dateOfInjury || ''}`,
        html: emailHtml,
        attachments
      });
      console.log(`✅ Claim email sent to ${CONFIG.CLAIMS_EMAIL}`);
    } catch (err) {
      console.error('❌ Email error:', err.message);
    }

    // Confirmation to submitter
    if (formData.submitterEmail) {
      try {
        await transporter.sendMail({
          from: CONFIG.SMTP.auth.user,
          to: formData.submitterEmail,
          subject: `Claim Confirmation - ${referenceNumber} - Titanium Defense Group`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#1a1f26;padding:25px;text-align:center;">
                <h1 style="color:white;margin:0;">Titanium Defense Group</h1>
              </div>
              <div style="padding:30px;background:#f8fafc;">
                <div style="background:#dcfce7;border:1px solid #16a34a;padding:20px;border-radius:8px;text-align:center;margin-bottom:25px;">
                  <h2 style="color:#16a34a;margin:0;">✓ Claim Submitted Successfully</h2>
                </div>
                <p>Your claim for <strong>${formData.firstName || ''} ${formData.lastName || ''}</strong> has been received.</p>
                <div style="background:white;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #e2e8f0;text-align:center;">
                  <p style="margin:0 0 10px;font-size:14px;"><strong>Reference Number:</strong></p>
                  <p style="margin:0;font-size:24px;font-family:monospace;font-weight:bold;">${referenceNumber}</p>
                </div>
                <p style="color:#64748b;">Our team will review and follow up if needed.</p>
              </div>
              <div style="background:#1a1f26;padding:20px;text-align:center;">
                <p style="color:#8b949e;margin:0;font-size:12px;">www.wcreporting.com</p>
              </div>
            </div>`
        });
        console.log(`✅ Confirmation sent to ${formData.submitterEmail}`);
      } catch (err) {
        console.error('❌ Confirmation email error:', err.message);
      }
    }

    res.json({ success: true, referenceNumber });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERVE THE PORTAL HTML
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  res.send(getPortalHTML());
});

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TITANIUM DEFENSE GROUP - SMART CLAIM INTAKE PORTAL v2.0');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  🌐 Portal running at: http://localhost:${PORT}`);
  console.log(`  📧 Claims sent to: ${CONFIG.CLAIMS_EMAIL}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMBEDDED PORTAL HTML + REACT
// ═══════════════════════════════════════════════════════════════════════════════
function getPortalHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Titanium Defense Group - Smart Claim Intake</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:linear-gradient(145deg,#0d1117 0%,#161b22 50%,#1a1f26 100%);min-height:100vh;color:#e6edf3}
.portal-header{background:linear-gradient(180deg,rgba(45,50,58,0.95) 0%,rgba(22,27,34,0.98) 100%);border-bottom:1px solid rgba(139,148,158,0.2);padding:14px 24px;position:sticky;top:0;z-index:100}
.header-content{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.brand{display:flex;align-items:center;gap:12px}
.brand-logo{width:42px;height:42px;background:linear-gradient(135deg,#58a6ff 0%,#1f6feb 100%);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:white}
.brand-text h1{font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:600;color:#f0f6fc}
.brand-text p{font-size:10px;color:#8b949e}
.completion-badge{display:flex;align-items:center;gap:10px;background:rgba(45,50,58,0.6);padding:8px 14px;border-radius:10px}
.completion-bar{width:80px;height:6px;background:rgba(139,148,158,0.2);border-radius:3px;overflow:hidden}
.completion-fill{height:100%;background:linear-gradient(90deg,#238636 0%,#2ea043 100%);transition:width 0.5s}
.completion-text{font-size:12px;font-weight:600;color:#8b949e}
.portal-body{display:flex;max-width:1200px;margin:0 auto;padding:20px;gap:20px}
.steps-sidebar{width:200px;flex-shrink:0}
.steps-list{background:rgba(45,50,58,0.4);border-radius:14px;border:1px solid rgba(139,148,158,0.15);padding:10px}
.step-item{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all 0.2s;margin-bottom:2px}
.step-item:hover{background:rgba(88,166,255,0.08)}
.step-item.active{background:rgba(88,166,255,0.15);border:1px solid rgba(88,166,255,0.3)}
.step-icon{width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px}
.step-title{font-size:12px;font-weight:500;color:#c9d1d9}
.step-item.active .step-title{color:#58a6ff}
.main-content{flex:1;min-width:0}
.step-content{background:rgba(45,50,58,0.4);border-radius:16px;border:1px solid rgba(139,148,158,0.15);padding:24px}
.section-header{margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid rgba(139,148,158,0.15)}
.section-header h2{font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:600;color:#f0f6fc;margin-bottom:4px}
.section-subtitle{font-size:13px;color:#8b949e}
.highlight{color:#58a6ff;font-weight:500}
.form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.form-group{display:flex;flex-direction:column;gap:5px}
.form-group.full-width{grid-column:1/-1}
.form-group label{font-size:12px;font-weight:500;color:#c9d1d9}
.required{color:#f85149}
.input-field{background:rgba(22,27,34,0.8);border:1px solid rgba(139,148,158,0.25);border-radius:8px;padding:10px 12px;font-size:13px;color:#e6edf3;font-family:'DM Sans',sans-serif;width:100%}
.input-field:focus{outline:none;border-color:#58a6ff}
.toggle-group{display:flex;gap:6px;flex-wrap:wrap}
.toggle-btn{padding:8px 14px;border-radius:8px;border:1px solid rgba(139,148,158,0.25);background:rgba(22,27,34,0.6);color:#8b949e;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif}
.toggle-btn.active{background:rgba(88,166,255,0.15);border-color:#58a6ff;color:#58a6ff}
.toggle-btn.active.success{background:rgba(35,134,54,0.15);border-color:#238636;color:#3fb950}
.toggle-btn.active.warning{background:rgba(210,153,34,0.15);border-color:#d29922;color:#e3b341}
.injury-type-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
.injury-type-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:10px;border:1px solid rgba(139,148,158,0.2);background:rgba(22,27,34,0.5);cursor:pointer;font-family:'DM Sans',sans-serif}
.injury-type-btn.active{background:rgba(88,166,255,0.12);border-color:#58a6ff}
.injury-icon{font-size:20px}
.injury-label{font-size:10px;color:#c9d1d9;text-align:center}
.smart-tips-panel{background:rgba(88,166,255,0.08);border:1px solid rgba(88,166,255,0.2);border-radius:12px;padding:14px 16px;margin:16px 0}
.smart-tips-panel h4{font-size:13px;color:#58a6ff;margin-bottom:10px}
.smart-tips-panel ul{list-style:none}
.smart-tips-panel li{padding-left:16px;margin-bottom:6px;font-size:12px;color:#c9d1d9;position:relative}
.smart-tips-panel li::before{content:'→';position:absolute;left:0;color:#58a6ff}
.body-parts-grid,.root-cause-grid,.corrective-grid,.fraud-grid{display:flex;flex-wrap:wrap;gap:6px}
.chip-btn{padding:6px 10px;border-radius:6px;border:1px solid rgba(139,148,158,0.2);background:rgba(22,27,34,0.5);color:#8b949e;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif}
.chip-btn.active{background:rgba(88,166,255,0.12);border-color:#58a6ff;color:#58a6ff}
.chip-btn.active.warning{background:rgba(210,153,34,0.12);border-color:#d29922;color:#e3b341}
.chip-btn.active.success{background:rgba(35,134,54,0.12);border-color:#238636;color:#3fb950}
.chip-btn.active.danger{background:rgba(248,81,73,0.1);border-color:rgba(248,81,73,0.4);color:#f85149}
.witness-card{background:rgba(22,27,34,0.5);border:1px solid rgba(139,148,158,0.15);border-radius:10px;padding:14px;margin-top:12px}
.witness-header{font-size:12px;font-weight:600;color:#58a6ff;margin-bottom:10px}
.info-tip{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:rgba(88,166,255,0.08);border-radius:10px;border-left:3px solid #58a6ff;margin-top:10px;font-size:12px;color:#8b949e}
.disclaimer-box{background:rgba(210,153,34,0.1);border:1px solid rgba(210,153,34,0.3);border-radius:10px;padding:14px;font-size:13px;color:#e3b341;margin-bottom:16px}
.nav-buttons{display:flex;justify-content:space-between;margin-top:24px;padding-top:20px;border-top:1px solid rgba(139,148,158,0.15)}
.nav-btn{padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;border:none}
.nav-btn.secondary{background:transparent;border:1px solid rgba(139,148,158,0.3);color:#8b949e}
.nav-btn.secondary:hover{border-color:rgba(139,148,158,0.5);color:#c9d1d9}
.nav-btn.primary{background:linear-gradient(135deg,#238636 0%,#2ea043 100%);color:white}
.nav-btn.primary:hover{transform:translateY(-2px)}
.nav-btn.submit{background:linear-gradient(135deg,#58a6ff 0%,#1f6feb 100%)}
.nav-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
.summary-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:20px 0}
.summary-section{background:rgba(22,27,34,0.5);border-radius:10px;padding:14px;border:1px solid rgba(139,148,158,0.15)}
.summary-section h4{font-size:12px;color:#58a6ff;margin-bottom:8px;font-weight:600}
.summary-section p{font-size:12px;color:#c9d1d9;margin-bottom:4px}
.certification-box{background:rgba(22,27,34,0.6);border:1px solid rgba(139,148,158,0.2);border-radius:10px;padding:16px;text-align:center;margin-top:16px}
.certification-box p{font-size:12px;color:#8b949e}
.success-container{max-width:500px;margin:60px auto;text-align:center;padding:40px}
.success-icon{width:80px;height:80px;background:rgba(35,134,54,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:40px}
.ref-number{font-size:32px;font-family:monospace;color:#f0f6fc;font-weight:bold;margin:16px 0}
@media(max-width:900px){.portal-body{flex-direction:column}.steps-sidebar{width:100%}.steps-list{display:flex;overflow-x:auto;gap:8px}.step-item{flex-shrink:0}.form-grid,.summary-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div id="root"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script>
const e=React.createElement,{useState:S,useEffect:E}=React;
const ENTITIES=${JSON.stringify(ENTITIES)};
const INJURY_TYPES=[{value:'slip_trip_fall',label:'Slip/Trip/Fall',icon:'⚠️'},{value:'struck_by',label:'Struck By',icon:'💥'},{value:'strain_sprain',label:'Strain/Sprain',icon:'💪'},{value:'cut_laceration',label:'Cut/Laceration',icon:'🩹'},{value:'burn',label:'Burn',icon:'🔥'},{value:'caught_in',label:'Caught In',icon:'⚙️'},{value:'vehicle',label:'Vehicle',icon:'🚗'},{value:'assault',label:'Assault',icon:'🚨'},{value:'exposure',label:'Exposure',icon:'☣️'},{value:'repetitive',label:'Repetitive',icon:'🔄'},{value:'other',label:'Other',icon:'📋'}];
const BODY_PARTS=['Head','Face','Eye(s)','Neck','Shoulder-L','Shoulder-R','Upper Back','Lower Back','Chest','Hip-L','Hip-R','Wrist-L','Wrist-R','Hand-L','Hand-R','Knee-L','Knee-R','Ankle-L','Ankle-R','Foot-L','Foot-R','Multiple'];
const ROOT_CAUSES=[{v:'no_inspection',l:'No Inspection'},{v:'inspection_not_followed',l:'Inspection Not Followed'},{v:'no_safe_handling',l:'No Safe Handling'},{v:'safe_handling_not_followed',l:'Safe Handling Not Followed'},{v:'no_ppe',l:'No PPE Required'},{v:'ppe_not_worn',l:'PPE Not Worn'},{v:'no_policies',l:'No Policies'},{v:'policies_not_followed',l:'Policies Not Followed'}];
const CORRECTIVE=[{v:'reviewed_procedures',l:'Reviewed Procedures'},{v:'observed_performance',l:'Observed Performance'},{v:'reviewed_department',l:'Reviewed w/ Dept'},{v:'discipline_applied',l:'Discipline Applied'},{v:'established_training',l:'New Training'},{v:'adjusted_procedures',l:'Adjusted Procedures'}];
const FRAUD=[{v:'delayed_report',l:'Delayed Report'},{v:'monday_claim',l:'Monday Claim'},{v:'no_witnesses',l:'No Witnesses'},{v:'vague_description',l:'Vague Description'},{v:'recent_discipline',l:'Recent Discipline'},{v:'pending_layoff',l:'Facing Layoff'},{v:'new_employee',l:'New Employee'},{v:'history_claims',l:'Prior Claims'}];
const TIPS={slip_trip_fall:['Floor conditions?','Lighting?','Footwear?','Photo location','Third-party owner?'],struck_by:['What object?','PPE worn?','Secured?'],strain_sprain:['Lifting action?','Technique?','Trained?'],vehicle:['Police report','All parties','Insurance info','Subrogation!'],assault:['Patient violence?','De-escalation?','Prior incidents?']};
const STATES=['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function App(){
const[step,setStep]=S(0);
const[submitting,setSubmitting]=S(false);
const[result,setResult]=S(null);
const[d,setD]=S({firstName:'',lastName:'',mailingAddress:'',city:'',state:'',zipCode:'',phone:'',dateOfBirth:'',dateOfHire:'',ssn:'',occupation:'',entity:'',dateOfInjury:'',timeOfInjury:'',dateReported:'',reportedImmediately:null,weeklyWage:'',employeeWorkType:'',accidentDescription:'',jobDuties:'',injuryType:'',natureOfInjury:'',bodyParts:[],causeOfInjury:'',accidentStreet:'',accidentCity:'',accidentState:'',accidentZip:'',medicalTreatment:'',soughtMedicalTreatment:null,facilityName:'',treatmentDate:'',refusedTreatment:null,witness1Name:'',witness1Phone:'',witness2Name:'',witness2Phone:'',hasVideo:null,videoLocation:'',losingTime:null,dateLastWorked:'',returnStatus:'',lightDutyAvailable:null,directCause:'',rootCauseSymptoms:[],correctiveActions:[],proceduresInPlace:null,proceduresFollowed:null,validityConcerns:null,concernDetails:'',fraudIndicators:[],redFlags:'',thirdPartyInvolved:null,thirdPartyDetails:'',submitterName:'',submitterPhone:'',submitterEmail:'',additionalComments:''});
const[score,setScore]=S(0);

E(()=>{const req=['firstName','lastName','entity','dateOfInjury','accidentDescription','injuryType','submitterName','submitterEmail'];const bon=['jobDuties','witness1Name','hasVideo','directCause','rootCauseSymptoms','correctiveActions','dateOfHire','occupation'];let s=0;req.forEach(f=>{if(d[f]&&(Array.isArray(d[f])?d[f].length>0:true))s+=8});bon.forEach(f=>{if(d[f]&&(Array.isArray(d[f])?d[f].length>0:d[f]!==null))s+=4.5});setScore(Math.min(100,Math.round(s)))},[d]);

const u=(f,v)=>setD(p=>({...p,[f]:v}));
const ta=(f,v)=>setD(p=>{const a=p[f]||[];return{...p,[f]:a.includes(v)?a.filter(x=>x!==v):[...a,v]}});

const steps=[{t:'Employee',i:'👤'},{t:'Claim',i:'📋'},{t:'Incident',i:'⚡'},{t:'Medical',i:'🏥'},{t:'Evidence',i:'👁️'},{t:'Work Status',i:'💼'},{t:'Root Cause',i:'🔍'},{t:'Flags',i:'🚩'},{t:'Submit',i:'✅'}];

const submit=async()=>{setSubmitting(true);try{const fd=new FormData();fd.append('formData',JSON.stringify(d));const r=await fetch('/api/submit-claim',{method:'POST',body:fd});const j=await r.json();if(j.success)setResult(j);else alert('Error: '+j.error)}catch(err){alert('Error submitting')}setSubmitting(false)};

if(result)return e('div',{className:'claim-intake-portal'},e('header',{className:'portal-header'},e('div',{className:'header-content'},e('div',{className:'brand'},e('div',{className:'brand-logo'},'TDG'),e('div',{className:'brand-text'},e('h1',null,'Smart Claim Intake'),e('p',null,'Titanium Defense Group'))))),e('div',{className:'success-container'},e('div',{className:'success-icon'},'✓'),e('h2',{style:{color:'#3fb950',marginBottom:16}},'Claim Submitted!'),e('p',{style:{color:'#8b949e'}},'Reference Number:'),e('div',{className:'ref-number'},result.referenceNumber),e('p',{style:{color:'#6e7681',margin:'24px 0'}},'Confirmation sent to '+d.submitterEmail),e('button',{className:'nav-btn primary',onClick:()=>location.reload()},'Submit Another')));

const inp=(f,p,t='text')=>e('input',{type:t,className:'input-field',value:d[f],onChange:x=>u(f,x.target.value),placeholder:p});
const sel=(f,opts,p)=>e('select',{className:'input-field',value:d[f],onChange:x=>u(f,x.target.value)},e('option',{value:''},p),...opts.map(o=>e('option',{key:o,value:o},o)));
const tog=(f,opts)=>e('div',{className:'toggle-group'},...opts.map(o=>e('button',{key:o.v,className:'toggle-btn'+(d[f]===o.v?' active'+(o.c?' '+o.c:''):''),onClick:()=>u(f,o.v)},o.l)));

const renderStep=()=>{
if(step===0)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Employee Information')),e('div',{className:'form-grid'},e('div',{className:'form-group'},e('label',null,'First Name ',e('span',{className:'required'},'*')),inp('firstName','First name')),e('div',{className:'form-group'},e('label',null,'Last Name ',e('span',{className:'required'},'*')),inp('lastName','Last name')),e('div',{className:'form-group full-width'},e('label',null,'Address'),inp('mailingAddress','Street')),e('div',{className:'form-group'},e('label',null,'City'),inp('city','City')),e('div',{className:'form-group'},e('label',null,'State'),sel('state',STATES,'State')),e('div',{className:'form-group'},e('label',null,'Zip'),inp('zipCode','Zip')),e('div',{className:'form-group'},e('label',null,'Phone'),inp('phone','Phone','tel')),e('div',{className:'form-group'},e('label',null,'DOB'),inp('dateOfBirth','','date')),e('div',{className:'form-group'},e('label',null,'Date of Hire'),inp('dateOfHire','','date')),e('div',{className:'form-group'},e('label',null,'SSN'),inp('ssn','XXX-XX-XXXX')),e('div',{className:'form-group'},e('label',null,'Occupation ',e('span',{className:'required'},'*')),inp('occupation','Job title'))));
if(step===1)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Claim Information')),e('div',{className:'form-group full-width'},e('label',null,'Entity ',e('span',{className:'required'},'*')),sel('entity',ENTITIES,'Select Entity')),e('div',{className:'form-grid',style:{marginTop:16}},e('div',{className:'form-group'},e('label',null,'Date of Injury ',e('span',{className:'required'},'*')),inp('dateOfInjury','','date')),e('div',{className:'form-group'},e('label',null,'Time'),inp('timeOfInjury','','time')),e('div',{className:'form-group'},e('label',null,'Date Reported'),inp('dateReported','','date')),e('div',{className:'form-group'},e('label',null,'Reported Immediately?'),tog('reportedImmediately',[{v:true,l:'Yes'},{v:false,l:'No',c:'warning'}])),e('div',{className:'form-group'},e('label',null,'Weekly Wage'),inp('weeklyWage','$0.00','number')),e('div',{className:'form-group'},e('label',null,'Work Type'),sel('employeeWorkType',['Full Time','Part Time','Per Diem'],'Select'))));
if(step===2)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'What Happened?'),e('p',{className:'section-subtitle'},'Details matter. ',e('span',{className:'highlight'},"Don't hold back."))),e('div',{className:'form-group full-width'},e('label',null,'Description ',e('span',{className:'required'},'*')),e('textarea',{className:'input-field',rows:4,value:d.accidentDescription,onChange:x=>u('accidentDescription',x.target.value),placeholder:'Who, what, when, where, how...'})),e('div',{className:'form-group full-width',style:{marginTop:16}},e('label',null,'Injury Type ',e('span',{className:'required'},'*')),e('div',{className:'injury-type-grid'},...INJURY_TYPES.map(t=>e('button',{key:t.value,className:'injury-type-btn'+(d.injuryType===t.value?' active':''),onClick:()=>u('injuryType',t.value)},e('span',{className:'injury-icon'},t.icon),e('span',{className:'injury-label'},t.label))))),d.injuryType&&TIPS[d.injuryType]?e('div',{className:'smart-tips-panel'},e('h4',null,'🎯 Investigation Tips'),e('ul',null,...TIPS[d.injuryType].map((t,i)=>e('li',{key:i},t)))):null,e('div',{className:'form-grid',style:{marginTop:16}},e('div',{className:'form-group'},e('label',null,'Nature of Injury'),inp('natureOfInjury','Strain, Sprain...')),e('div',{className:'form-group'},e('label',null,'Cause'),inp('causeOfInjury','Lifting, Fall...'))),e('div',{className:'form-group full-width',style:{marginTop:16}},e('label',null,'Body Parts'),e('div',{className:'body-parts-grid'},...BODY_PARTS.map(p=>e('button',{key:p,className:'chip-btn'+(d.bodyParts.includes(p)?' active':''),onClick:()=>ta('bodyParts',p)},p)))));
if(step===3)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Medical Treatment')),e('div',{className:'form-group'},e('label',null,'Sought Treatment?'),tog('soughtMedicalTreatment',[{v:true,l:'Yes'},{v:false,l:'No'}])),d.soughtMedicalTreatment===true?e('div',{className:'form-grid',style:{marginTop:16}},e('div',{className:'form-group full-width'},e('label',null,'Facility'),inp('facilityName','Hospital/Clinic')),e('div',{className:'form-group'},e('label',null,'Treatment Date'),inp('treatmentDate','','date'))):null,d.soughtMedicalTreatment===false?e('div',{className:'form-group',style:{marginTop:16}},e('label',null,'Refused Treatment?'),tog('refusedTreatment',[{v:true,l:'Yes, Refused',c:'warning'},{v:false,l:'N/A'}]),d.refusedTreatment===true?e('div',{className:'info-tip'},'💡 Get signed refusal form'):null):null);
if(step===4)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Witnesses & Evidence')),e('div',{className:'form-group'},e('label',null,'Video Available?'),tog('hasVideo',[{v:true,l:'Yes',c:'success'},{v:false,l:'No'}]),d.hasVideo===true?e('div',{className:'info-tip'},'⚡ Preserve immediately! Systems auto-delete in 7-30 days.'):null),e('div',{className:'witness-card'},e('div',{className:'witness-header'},'Witness #1'),e('div',{className:'form-grid'},e('div',{className:'form-group'},inp('witness1Name','Name')),e('div',{className:'form-group'},inp('witness1Phone','Phone','tel')))),e('div',{className:'witness-card'},e('div',{className:'witness-header'},'Witness #2'),e('div',{className:'form-grid'},e('div',{className:'form-group'},inp('witness2Name','Name')),e('div',{className:'form-group'},inp('witness2Phone','Phone','tel')))));
if(step===5)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Work Status')),e('div',{className:'form-grid'},e('div',{className:'form-group'},e('label',null,'Losing Time?'),tog('losingTime',[{v:true,l:'Yes',c:'warning'},{v:false,l:'No',c:'success'}])),e('div',{className:'form-group'},e('label',null,'Date Last Worked'),inp('dateLastWorked','','date')),e('div',{className:'form-group'},e('label',null,'Return Status'),sel('returnStatus',['Has not returned','Full Duty','Light Duty'],'Select')),e('div',{className:'form-group'},e('label',null,'Light Duty Available?'),tog('lightDutyAvailable',[{v:true,l:'Yes',c:'success'},{v:false,l:'No',c:'warning'}]))));
if(step===6)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Root Cause Analysis'),e('p',{className:'section-subtitle'},'Ask "why" until you find the root.')),e('div',{className:'form-group full-width'},e('label',null,'Direct Cause'),inp('directCause','What directly caused injury?')),e('div',{className:'form-group full-width',style:{marginTop:16}},e('label',null,'Root Cause'),e('div',{className:'root-cause-grid'},...ROOT_CAUSES.map(c=>e('button',{key:c.v,className:'chip-btn'+(d.rootCauseSymptoms.includes(c.v)?' active warning':''),onClick:()=>ta('rootCauseSymptoms',c.v)},c.l)))),e('div',{className:'form-group full-width',style:{marginTop:16}},e('label',null,'Corrective Actions'),e('div',{className:'corrective-grid'},...CORRECTIVE.map(c=>e('button',{key:c.v,className:'chip-btn'+(d.correctiveActions.includes(c.v)?' active success':''),onClick:()=>ta('correctiveActions',c.v)},c.l)))));
if(step===7)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Investigation Flags')),e('div',{className:'disclaimer-box'},'These are red flags for closer review, not accusations.'),e('div',{className:'form-group'},e('label',null,'Validity Concerns?'),tog('validityConcerns',[{v:true,l:'Yes',c:'warning'},{v:false,l:'No'}])),d.validityConcerns===true?e('div',{className:'form-group full-width',style:{marginTop:12}},e('textarea',{className:'input-field',rows:2,value:d.concernDetails,onChange:x=>u('concernDetails',x.target.value),placeholder:'Explain concerns...'})):null,e('div',{className:'form-group full-width',style:{marginTop:16}},e('label',null,'Fraud Indicators'),e('div',{className:'fraud-grid'},...FRAUD.map(f=>e('button',{key:f.v,className:'chip-btn'+(d.fraudIndicators.includes(f.v)?' active danger':''),onClick:()=>ta('fraudIndicators',f.v)},f.l)))),e('div',{className:'form-group',style:{marginTop:20}},e('label',null,'Third Party Involved? (Subrogation)'),tog('thirdPartyInvolved',[{v:true,l:'Yes',c:'success'},{v:false,l:'No'},{v:'maybe',l:'Maybe'}]),(d.thirdPartyInvolved===true||d.thirdPartyInvolved==='maybe')?e('div',{className:'info-tip'},'💰 Subrogation potential! Preserve evidence, issue preservation letter.'):null));
if(step===8)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Submit Claim')),e('div',{style:{textAlign:'center',margin:'20px 0'}},e('div',{style:{display:'inline-block',width:80,height:80,borderRadius:'50%',background:'conic-gradient(#238636 '+score+'%, rgba(139,148,158,0.2) '+score+'%)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}},e('div',{style:{position:'absolute',width:64,height:64,background:'#1a1f26',borderRadius:'50%'}}),e('span',{style:{position:'relative',fontSize:24,fontWeight:'bold',color:'#3fb950'}},score+'%')),e('div',{style:{color:'#8b949e',marginTop:8,fontSize:13}},score>=80?'Excellent!':score>=60?'Good':'Add More')),e('div',{className:'summary-grid'},e('div',{className:'summary-section'},e('h4',null,'Employee'),e('p',null,d.firstName+' '+d.lastName),e('p',null,d.occupation||'—')),e('div',{className:'summary-section'},e('h4',null,'Claim'),e('p',null,d.entity||'—'),e('p',null,d.dateOfInjury||'—'))),e('div',{className:'form-grid',style:{marginTop:20}},e('div',{className:'form-group'},e('label',null,'Your Name ',e('span',{className:'required'},'*')),inp('submitterName','Your name')),e('div',{className:'form-group'},e('label',null,'Your Phone'),inp('submitterPhone','Phone','tel')),e('div',{className:'form-group full-width'},e('label',null,'Your Email ',e('span',{className:'required'},'*')),inp('submitterEmail','you@company.com','email'))),e('div',{className:'certification-box'},e('p',null,e('strong',null,'THE ABOVE REPORT IS TRUE AND CORRECT.'))));
};

return e('div',{className:'claim-intake-portal'},e('header',{className:'portal-header'},e('div',{className:'header-content'},e('div',{className:'brand'},e('div',{className:'brand-logo'},'TDG'),e('div',{className:'brand-text'},e('h1',null,'Smart Claim Intake'),e('p',null,'Titanium Defense Group • WCReporting.com'))),e('div',{className:'completion-badge'},e('div',{className:'completion-bar'},e('div',{className:'completion-fill',style:{width:score+'%'}})),e('span',{className:'completion-text'},score+'%')))),e('div',{className:'portal-body'},e('aside',{className:'steps-sidebar'},e('div',{className:'steps-list'},...steps.map((s,i)=>e('div',{key:i,className:'step-item'+(i===step?' active':''),onClick:()=>setStep(i)},e('div',{className:'step-icon'},s.i),e('span',{className:'step-title'},s.t))))),e('main',{className:'main-content'},renderStep(),e('div',{className:'nav-buttons'},e('button',{className:'nav-btn secondary',onClick:()=>setStep(Math.max(0,step-1)),disabled:step===0,style:{opacity:step===0?0.5:1}},'← Back'),step<8?e('button',{className:'nav-btn primary',onClick:()=>setStep(step+1)},'Continue →'):e('button',{className:'nav-btn primary submit',disabled:submitting,onClick:submit},submitting?'Submitting...':'Submit Claim')))));
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
</script>
</body>
</html>`;
}

module.exports = app;
