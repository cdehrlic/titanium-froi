const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Security: Helmet adds various HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for inline scripts
  crossOriginEmbedderPolicy: false
}));

// Security: Rate limiting - max 10 submissions per 15 minutes per IP
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

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
  },
  SECURE_LINK_EXPIRY_DAYS: 7,
  BASE_URL: process.env.BASE_URL || 'https://www.wcreporting.com'
};

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from current directory
app.use(express.static(__dirname));

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024, files: 25 } });

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
// IN-MEMORY STORAGE (Replace with database in production)
// ═══════════════════════════════════════════════════════════════════════════════
const secureLinks = new Map(); // token -> { claimRef, type, personName, email, phone, expiresAt, completed }
const claimData = new Map(); // claimRef -> full claim object with statements

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
  'Towne Home Care / Towne Staffing LLC',
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
  'no_training': 'No Training Provided',
  'inadequate_training': 'Inadequate Training',
  'training_not_followed': 'Training Not Followed',
  'no_supervision': 'Lack of Supervision',
  'inadequate_supervision': 'Inadequate Supervision',
  'no_inspection': 'No Inspection Procedures',
  'inspection_not_followed': 'Inspection Procedures Not Followed',
  'equipment_failure': 'Equipment Failure/Malfunction',
  'equipment_not_maintained': 'Equipment Not Properly Maintained',
  'wrong_equipment': 'Wrong Equipment for Task',
  'no_ppe': 'No PPE Provided',
  'ppe_not_worn': 'Required PPE Not Worn',
  'improper_ppe': 'Improper PPE for Task',
  'no_safe_handling': 'No Safe Patient Handling Procedures',
  'safe_handling_not_followed': 'Safe Patient Handling Not Followed',
  'understaffed': 'Understaffed/Overworked',
  'rushing': 'Rushing/Time Pressure',
  'fatigue': 'Employee Fatigue',
  'distraction': 'Distraction/Inattention',
  'horseplay': 'Horseplay/Misconduct',
  'shortcut_taken': 'Shortcut Taken',
  'no_policies': 'No Applicable Policies/Procedures',
  'policies_not_followed': 'Policies/Procedures Not Followed',
  'gap_in_policies': 'Gap in Policies/Procedures',
  'poor_housekeeping': 'Poor Housekeeping',
  'wet_floor': 'Wet/Slippery Floor',
  'poor_lighting': 'Poor Lighting',
  'cluttered_area': 'Cluttered Work Area',
  'weather_conditions': 'Weather Conditions',
  'combative_patient': 'Combative Patient/Resident',
  'no_deescalation': 'No De-escalation Training',
  'communication_failure': 'Communication Failure',
  'language_barrier': 'Language Barrier'
};

const CORRECTIVE_LABELS = {
  'reviewed_procedures': 'Reviewed Procedures with Employee',
  'observed_performance': 'Observed Proper Performance',
  'reviewed_department': 'Reviewed with All Department Staff',
  'discipline_verbal': 'Verbal Warning Issued',
  'discipline_written': 'Written Warning Issued',
  'discipline_suspension': 'Suspension',
  'discipline_termination': 'Termination',
  'discipline_applied': 'Discipline Applied',
  'training_scheduled': 'Training Scheduled',
  'training_completed': 'Training Completed',
  'retraining_required': 'Retraining Required',
  'new_procedures': 'New Procedures Created',
  'procedures_updated': 'Procedures Updated',
  'equipment_repaired': 'Equipment Repaired',
  'equipment_replaced': 'Equipment Replaced',
  'ppe_provided': 'PPE Provided',
  'ppe_training': 'PPE Training Conducted',
  'area_cleaned': 'Area Cleaned/Organized',
  'lighting_improved': 'Lighting Improved',
  'signage_added': 'Warning Signs Added',
  'staffing_adjusted': 'Staffing Levels Adjusted',
  'supervision_increased': 'Supervision Increased',
  'safety_meeting': 'Safety Meeting Held',
  'incident_review': 'Incident Review Completed',
  'accountability_assigned': 'Accountability/Risk Owner Assigned',
  'engineering_control': 'Engineering Control Added',
  'job_hazard_analysis': 'Job Hazard Analysis Completed',
  'established_training': 'Established Training(s)',
  'increased_training': 'Increased Training Frequency',
  'adjusted_procedures': 'Adjusted or Expanded Existing Procedures'
};

const FRAUD_LABELS = {
  'delayed_report': 'Delayed Reporting',
  'monday_claim': 'Monday Morning Claim',
  'friday_injury': 'Friday Afternoon Injury',
  'no_witnesses': 'No Witnesses to Incident',
  'conflicting_witness': 'Conflicting Witness Accounts',
  'vague_description': 'Vague/Changing Description',
  'inconsistent_story': 'Inconsistent Story Over Time',
  'recent_discipline': 'Recent Disciplinary Action',
  'pending_layoff': 'Facing Layoff/Termination',
  'job_change': 'Recent Job Change/Demotion',
  'new_employee': 'Very New Employee (<90 days)',
  'history_claims': 'History of Prior Claims',
  'prior_similar': 'Prior Similar Injuries',
  'financial_issues': 'Known Financial Difficulties',
  'second_job': 'Works Second Job',
  'refuses_medical': 'Refused Then Sought Treatment',
  'doctor_shops': 'Changed Physicians Multiple Times',
  'excessive_treatment': 'Excessive Treatment Requests',
  'missed_appointments': 'Missed Medical Appointments',
  'restrictions_disputed': 'Disputes Work Restrictions',
  'surveillance_potential': 'Surveillance Recommended',
  'social_media': 'Social Media Activity Contradicts',
  'attorney_immediate': 'Attorney Retained Immediately',
  'settlement_demands': 'Demanding Quick Settlement',
  'uncooperative': 'Uncooperative with Investigation',
  'family_unaware': 'Family Unaware of Injury',
  'no_impact': 'No Visible Impact/Injury',
  'preexisting': 'Possible Pre-existing Condition',
  'off_premises': 'May Have Occurred Off Premises',
  'personal_issues': 'Known Personal/Domestic Issues',
  'substance_abuse': 'History of Substance Abuse',
  'malingering': 'Signs of Malingering'
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateDocumentHash(content) {
  return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         'Unknown';
}

// Helper to get entity name from form data
function getEntityName(formData) {
  if (formData.entity === 'Other - Enter Manually' || formData.entity === 'Other') {
    return formData.customEntity || 'Workers Compensation Claim';
  }
  return formData.entity || 'Workers Compensation Claim';
}

// Helper to build follow-up link
function buildFollowUpLink(referenceNumber, formData) {
  const name = encodeURIComponent((formData.firstName || '') + ' ' + (formData.lastName || ''));
  const dob = formData.dateOfBirth || '';
  const entity = encodeURIComponent(getEntityName(formData));
  return `${CONFIG.BASE_URL}/followup.html?ref=${referenceNumber}&name=${name}&dob=${dob}&entity=${entity}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// E-SIGNATURE PDF GENERATION - WITNESS STATEMENT
// ═══════════════════════════════════════════════════════════════════════════════
function generateWitnessStatementPDF(data, signatureData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Get entity name for header
    const entityName = data.entityName || 'Workers Compensation Claim';

    // Header - Use entity name instead of Titanium
    doc.rect(0, 0, 612, 70).fill('#1a1f26');
    doc.fontSize(18).font('Helvetica-Bold').fillColor('white').text('WITNESS STATEMENT', 50, 25);
    doc.fontSize(10).fillColor('#94a3b8').text(entityName + ' | www.wcreporting.com', 50, 48);
    doc.y = 90;

    // Reference info
    doc.fontSize(10).fillColor('#1a1f26').font('Helvetica-Bold');
    doc.text('Claim Reference: ', 50, doc.y, { continued: true });
    doc.font('Helvetica').text(data.claimRef || 'N/A');
    doc.font('Helvetica-Bold').text('Date: ', 50, doc.y + 15, { continued: true });
    doc.font('Helvetica').text(new Date().toLocaleDateString());
    doc.moveDown(2);

    // Witness info
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a1f26').text('WITNESS INFORMATION');
    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('Name: ' + (data.witnessName || 'N/A'));
    doc.text('Phone: ' + (data.witnessPhone || 'N/A'));
    doc.text('Email: ' + (data.witnessEmail || 'N/A'));
    doc.text('Relationship to Claimant: ' + (data.relationship || 'N/A'));
    doc.moveDown(1.5);

    // Statement
    doc.font('Helvetica-Bold').fontSize(12).text('STATEMENT');
    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(data.statement || 'No statement provided.', { width: 500, align: 'left' });
    doc.moveDown(1.5);

    // Audio recording note if applicable
    if (data.hasAudioRecording) {
      doc.font('Helvetica-Bold').fillColor('#5ba4e6').text('📎 Audio Recording Attached');
      doc.font('Helvetica').fillColor('#6e7681').fontSize(9);
      doc.text('An audio recording of this statement is attached to this submission.');
      doc.moveDown(1.5);
    }

    // E-Signature Section
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a1f26').text('ELECTRONIC SIGNATURE');
    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    
    doc.fontSize(9).font('Helvetica').fillColor('#333');
    doc.text('I, ' + (signatureData.typedName || data.witnessName) + ', certify that the above statement is true and correct to the best of my knowledge. I understand that this statement may be used in connection with a workers\' compensation claim and that providing false information may result in legal consequences.', { width: 500 });
    doc.moveDown(1);

    // Signature image if provided
    if (signatureData.signatureImage) {
      try {
        const sigBuffer = Buffer.from(signatureData.signatureImage.replace(/^data:image\/png;base64,/, ''), 'base64');
        doc.image(sigBuffer, 50, doc.y, { width: 200, height: 60 });
        doc.y += 65;
      } catch (e) {
        doc.text('[Signature on file]');
      }
    }
    
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').text('Typed Name: ' + (signatureData.typedName || 'N/A'));
    doc.font('Helvetica').text('Date Signed: ' + (signatureData.signedAt || new Date().toISOString()));
    doc.text('IP Address: ' + (signatureData.ipAddress || 'N/A'));
    doc.moveDown(1);

    // Legal notice
    doc.rect(50, doc.y, 512, 60).fill('#f0f6fc');
    doc.fontSize(8).fillColor('#6e7681');
    doc.text('ELECTRONIC SIGNATURE CERTIFICATION', 60, doc.y - 55, { width: 490 });
    doc.text('This document was electronically signed in accordance with the Electronic Signatures in Global and National Commerce Act (E-SIGN Act, 15 U.S.C. § 7001 et seq.) and the Uniform Electronic Transactions Act (UETA). The signer consented to conduct this transaction electronically and acknowledged that an electronic signature has the same legal effect as a handwritten signature.', 60, doc.y - 40, { width: 490 });
    doc.moveDown(4);

    // Document hash
    doc.fontSize(8).fillColor('#94a3b8');
    doc.text('Document Hash: ' + (signatureData.documentHash || 'N/A'), 50, 720);

    doc.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// E-SIGNATURE PDF GENERATION - CLAIMANT STATEMENT
// ═══════════════════════════════════════════════════════════════════════════════
function generateClaimantStatementPDF(data, signatureData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Get entity name for header
    const entityName = data.entityName || 'Workers Compensation Claim';

    // Header - Use entity name instead of Titanium
    doc.rect(0, 0, 612, 70).fill('#1a1f26');
    doc.fontSize(18).font('Helvetica-Bold').fillColor('white').text('CLAIMANT STATEMENT', 50, 25);
    doc.fontSize(10).fillColor('#94a3b8').text(entityName + ' | www.wcreporting.com', 50, 48);
    doc.y = 90;

    // Reference info
    doc.fontSize(10).fillColor('#1a1f26').font('Helvetica-Bold');
    doc.text('Claim Reference: ', 50, doc.y, { continued: true });
    doc.font('Helvetica').text(data.claimRef || 'N/A');
    doc.font('Helvetica-Bold').text('Date of Injury: ', 50, doc.y + 15, { continued: true });
    doc.font('Helvetica').text(data.dateOfInjury || 'N/A');
    doc.moveDown(2);

    // Claimant info
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a1f26').text('CLAIMANT INFORMATION');
    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('Name: ' + (data.claimantName || 'N/A'));
    doc.text('Date of Birth: ' + (data.dateOfBirth || 'N/A'));
    doc.text('Phone: ' + (data.claimantPhone || 'N/A'));
    doc.text('Email: ' + (data.claimantEmail || 'N/A'));
    doc.text('Employer: ' + (data.employer || entityName));
    doc.text('Job Title: ' + (data.jobTitle || 'N/A'));
    doc.moveDown(1.5);

    // Statement
    doc.font('Helvetica-Bold').fontSize(12).text('DESCRIPTION OF INCIDENT');
    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(data.incidentDescription || 'No description provided.', { width: 500, align: 'left' });
    doc.moveDown(1);

    // Injury details
    doc.font('Helvetica-Bold').fontSize(12).text('INJURY DETAILS');
    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('Body Parts Injured: ' + (data.bodyPartsInjured || 'N/A'));
    doc.text('Current Symptoms: ' + (data.currentSymptoms || 'N/A'));
    doc.text('Medical Treatment Received: ' + (data.medicalTreatment || 'N/A'));
    doc.moveDown(1.5);

    // Audio recording note
    if (data.hasAudioRecording) {
      doc.font('Helvetica-Bold').fillColor('#5ba4e6').text('📎 Audio Recording Attached');
      doc.font('Helvetica').fillColor('#6e7681').fontSize(9);
      doc.text('An audio recording of this statement is attached to this submission.');
      doc.moveDown(1.5);
    }

    // E-Signature Section
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a1f26').text('ELECTRONIC SIGNATURE');
    doc.moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    
    doc.fontSize(9).font('Helvetica').fillColor('#333');
    doc.text('I, ' + (signatureData.typedName || data.claimantName) + ', certify that the information provided above is true and correct to the best of my knowledge. I understand that this statement will be used in connection with my workers\' compensation claim. I acknowledge that providing false or misleading information may result in denial of benefits and/or legal consequences including criminal prosecution.', { width: 500 });
    doc.moveDown(1);

    // Signature image
    if (signatureData.signatureImage) {
      try {
        const sigBuffer = Buffer.from(signatureData.signatureImage.replace(/^data:image\/png;base64,/, ''), 'base64');
        doc.image(sigBuffer, 50, doc.y, { width: 200, height: 60 });
        doc.y += 65;
      } catch (e) {
        doc.text('[Signature on file]');
      }
    }
    
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').text('Typed Name: ' + (signatureData.typedName || 'N/A'));
    doc.font('Helvetica').text('Date Signed: ' + (signatureData.signedAt || new Date().toISOString()));
    doc.text('IP Address: ' + (signatureData.ipAddress || 'N/A'));
    doc.moveDown(1);

    // Legal notice
    doc.rect(50, doc.y, 512, 60).fill('#f0f6fc');
    doc.fontSize(8).fillColor('#6e7681');
    doc.text('ELECTRONIC SIGNATURE CERTIFICATION', 60, doc.y - 55, { width: 490 });
    doc.text('This document was electronically signed in accordance with the Electronic Signatures in Global and National Commerce Act (E-SIGN Act, 15 U.S.C. § 7001 et seq.) and the Uniform Electronic Transactions Act (UETA). The signer consented to conduct this transaction electronically and acknowledged that an electronic signature has the same legal effect as a handwritten signature.', 60, doc.y - 40, { width: 490 });

    // Document hash
    doc.fontSize(8).fillColor('#94a3b8');
    doc.text('Document Hash: ' + (signatureData.documentHash || 'N/A'), 50, 720);

    doc.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// E-SIGNATURE PDF GENERATION - HIPAA RELEASE
// ═══════════════════════════════════════════════════════════════════════════════
function generateHIPAAReleasePDF(data, signatureData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Get entity name for header
    const entityName = data.entityName || 'Workers Compensation Claim';

    // Header - Use entity name instead of Titanium
    doc.rect(0, 0, 612, 70).fill('#1a1f26');
    doc.fontSize(16).font('Helvetica-Bold').fillColor('white').text('HIPAA AUTHORIZATION FOR RELEASE', 50, 20);
    doc.fontSize(10).text('OF PROTECTED HEALTH INFORMATION', 50, 40);
    doc.fontSize(9).fillColor('#94a3b8').text(entityName + ' | www.wcreporting.com', 50, 55);
    doc.y = 90;

    // Patient info
    doc.fontSize(10).fillColor('#1a1f26').font('Helvetica-Bold');
    doc.text('Patient Name: ', 50, doc.y, { continued: true });
    doc.font('Helvetica').text(data.patientName || 'N/A');
    doc.font('Helvetica-Bold').text('Date of Birth: ', 50, doc.y + 14, { continued: true });
    doc.font('Helvetica').text(data.dateOfBirth || 'N/A');
    doc.font('Helvetica-Bold').text('SSN (last 4): ', 300, doc.y - 14, { continued: true });
    doc.font('Helvetica').text(data.ssnLast4 ? 'XXX-XX-' + data.ssnLast4 : 'N/A');
    doc.font('Helvetica-Bold').text('Claim Reference: ', 300, doc.y, { continued: true });
    doc.font('Helvetica').text(data.claimRef || 'N/A');
    doc.moveDown(1.5);

    // Authorization section
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a1f26');
    doc.text('AUTHORIZATION', 50, doc.y);
    doc.moveTo(50, doc.y + 2).lineTo(150, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);

    doc.fontSize(9).font('Helvetica').fillColor('#333');
    doc.text('I hereby authorize the following healthcare providers, facilities, and entities to release my protected health information:', { width: 512 });
    doc.moveDown(0.5);

    // Providers box
    doc.rect(50, doc.y, 512, 40).stroke('#e1e4e8');
    doc.text(data.authorizedProviders || 'All treating physicians, hospitals, clinics, pharmacies, and healthcare facilities', 55, doc.y + 5, { width: 500 });
    doc.y += 45;
    doc.moveDown(0.5);

    // Recipient section
    doc.font('Helvetica-Bold').fontSize(11).text('RECIPIENT OF INFORMATION');
    doc.moveTo(50, doc.y + 2).lineTo(200, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text('The above-named providers are authorized to release my information to:', { width: 512 });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold');
    doc.text(entityName);
    doc.font('Helvetica');
    doc.text('And their authorized representatives, including:');
    doc.text('• ' + (data.employer || entityName) + ' and their workers\' compensation insurance carrier');
    doc.text('• Claims adjusters, attorneys, and medical professionals involved in the claim');
    doc.text('• State workers\' compensation boards and regulatory agencies as required by law');
    doc.moveDown(1);

    // Information to be disclosed
    doc.font('Helvetica-Bold').fontSize(11).text('INFORMATION TO BE DISCLOSED');
    doc.moveTo(50, doc.y + 2).lineTo(220, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text('☑ Medical records and diagnostic test results');
    doc.text('☑ Treatment records and physician notes');
    doc.text('☑ Billing records and itemized statements');
    doc.text('☑ Pharmacy records');
    doc.moveDown(0.5);
    doc.text('Related to: Workers\' Compensation Claim - Date of Injury: ' + (data.dateOfInjury || 'N/A'));
    doc.moveDown(1);

    // Purpose
    doc.font('Helvetica-Bold').fontSize(11).text('PURPOSE');
    doc.moveTo(50, doc.y + 2).lineTo(100, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text('The purpose of this disclosure is to facilitate the processing, investigation, and determination of my workers\' compensation claim, including but not limited to: medical management, determination of compensability, litigation, and coordination of benefits.', { width: 512 });
    doc.moveDown(1);

    // Expiration
    doc.font('Helvetica-Bold').fontSize(11).text('EXPIRATION');
    doc.moveTo(50, doc.y + 2).lineTo(120, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    const expirationDate = data.expirationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString();
    doc.text('This authorization shall remain in effect until ' + expirationDate + ' or until the workers\' compensation claim is closed, whichever occurs first, unless revoked earlier by the patient in writing.', { width: 512 });
    doc.moveDown(1);

    // Patient rights
    doc.font('Helvetica-Bold').fontSize(11).text('PATIENT RIGHTS');
    doc.moveTo(50, doc.y + 2).lineTo(130, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica').fillColor('#555');
    doc.text('• I understand that I have the right to revoke this authorization at any time by submitting a written request, except to the extent that action has already been taken in reliance on this authorization.', { width: 512 });
    doc.text('• I understand that information disclosed pursuant to this authorization may be subject to re-disclosure by the recipient and may no longer be protected by HIPAA.', { width: 512 });
    doc.text('• I understand that my treatment, payment, enrollment, or eligibility for benefits will not be conditioned on signing this authorization, except as permitted by law for workers\' compensation purposes.', { width: 512 });
    doc.text('• I understand that I am entitled to receive a copy of this authorization upon request.', { width: 512 });
    doc.moveDown(1);

    // E-Signature Section
    doc.fillColor('#1a1f26');
    doc.font('Helvetica-Bold').fontSize(11).text('ELECTRONIC SIGNATURE');
    doc.moveTo(50, doc.y + 2).lineTo(180, doc.y + 2).stroke('#5ba4e6');
    doc.moveDown(0.5);
    
    doc.fontSize(9).font('Helvetica').fillColor('#333');
    doc.text('By signing below, I acknowledge that I have read and understand this authorization. I voluntarily authorize the release of my protected health information as described above.', { width: 512 });
    doc.moveDown(0.8);

    // Signature image
    if (signatureData.signatureImage) {
      try {
        const sigBuffer = Buffer.from(signatureData.signatureImage.replace(/^data:image\/png;base64,/, ''), 'base64');
        doc.image(sigBuffer, 50, doc.y, { width: 180, height: 50 });
        doc.y += 55;
      } catch (e) {
        doc.text('[Signature on file]');
      }
    }
    
    doc.fontSize(9).font('Helvetica-Bold').text('Patient/Authorized Representative: ' + (signatureData.typedName || 'N/A'));
    doc.font('Helvetica').text('Date Signed: ' + (signatureData.signedAt || new Date().toISOString()));
    doc.text('IP Address: ' + (signatureData.ipAddress || 'N/A'));

    // Legal footer
    doc.fontSize(7).fillColor('#94a3b8');
    doc.text('This authorization complies with 45 CFR § 164.508. Document Hash: ' + (signatureData.documentHash || 'N/A'), 50, 740, { width: 512, align: 'center' });

    doc.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLAIM PDF GENERATION
// ═══════════════════════════════════════════════════════════════════════════════
function generateClaimPDF(formData, referenceNumber) {
  return new Promise(function(resolve, reject) {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const COLORS = { primary: '#1a1f26', accent: '#5ba4e6', success: '#238636', warning: '#d29922', danger: '#dc2626', text: '#333333', muted: '#6e7681' };

    // Get entity name for header
    const entityName = getEntityName(formData);

    // Header - Use entity name instead of Titanium
    doc.rect(0, 0, 612, 80).fill('#1a1f26');
    doc.fontSize(22).font('Helvetica-Bold').fillColor('white').text(entityName.toUpperCase(), 50, 25);
    doc.fontSize(11).font('Helvetica').fillColor('#94a3b8').text('Workers Compensation Claim Report', 50, 50);
    doc.fontSize(10).fillColor('#5ba4e6').text('www.wcreporting.com', 450, 50);
    doc.y = 100;

    // Reference Box
    doc.rect(50, 90, 512, 40).fillAndStroke('#f0f6fc', '#e1e4e8');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1f26').text('Reference #: ' + referenceNumber, 60, 100);
    doc.fontSize(10).font('Helvetica').fillColor('#6e7681').text('Generated: ' + new Date().toLocaleString(), 60, 116);
    doc.fontSize(10).fillColor('#6e7681').text('Entity: ' + entityName, 350, 100);
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
    addFieldRow([{ label: 'Phone', value: formData.phone }, { label: 'Date of Hire', value: formData.dateOfHire }]);
    addFieldRow([{ label: 'SSN', value: formData.ssn ? 'XXX-XX-' + formData.ssn.slice(-4) : 'N/A' }, { label: 'Occupation', value: formData.occupation }]);

    // CLAIM INFORMATION
    addSection('CLAIM INFORMATION');
    addField('Entity', entityName);
    addFieldRow([{ label: 'Date of Injury', value: formData.dateOfInjury }, { label: 'Time', value: formData.timeOfInjury }]);
    addFieldRow([{ label: 'Date Reported', value: formData.dateReported }, { label: 'Reported Immediately', value: formData.reportedImmediately === true ? 'Yes' : formData.reportedImmediately === false ? 'NO ⚠️' : 'N/A' }]);

    // INCIDENT DETAILS
    addSection('INCIDENT DETAILS');
    addField('Injury Type', INJURY_TYPE_LABELS[formData.injuryType] || formData.injuryType);
    addField('Body Parts', Array.isArray(formData.bodyParts) ? formData.bodyParts.join(', ') : formData.bodyParts);
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.muted).text('Description:', 60, doc.y);
    doc.moveDown(0.2);
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text(formData.accidentDescription || 'N/A', 60, doc.y, { width: 490 });
    doc.moveDown(0.5);

    // MEDICAL TREATMENT
    addSection('MEDICAL TREATMENT');
    addField('Treatment Received', formData.soughtMedicalTreatment === true ? 'Yes' : formData.soughtMedicalTreatment === false ? 'No' : 'N/A');
    if (formData.soughtMedicalTreatment === true) {
      addField('Facility', formData.initialFacilityName);
    }

    // WORK STATUS
    addSection('WORK STATUS');
    addFieldRow([{ label: 'Losing Time', value: formData.losingTime === true ? 'YES ⚠️' : 'No' }, { label: 'Date Last Worked', value: formData.dateLastWorked }]);
    addField('Return Status', formData.returnStatus);

    // ROOT CAUSE
    if (formData.directCause) {
      addSection('ROOT CAUSE ANALYSIS', '#334155');
      addField('Direct Cause', formData.directCause);
    }

    // INVESTIGATION FLAGS
    if (formData.validityConcerns === true || formData.thirdPartyInvolved === true) {
      addSection('⚠️ INVESTIGATION FLAGS', COLORS.danger);
      if (formData.validityConcerns) addField('Validity Concerns', 'YES');
      if (formData.thirdPartyInvolved) addField('Third Party (Subrogation)', 'YES - Investigate');
    }

    // SUBMITTED BY
    addSection('SUBMITTED BY');
    addFieldRow([{ label: 'Name', value: formData.submitterName }, { label: 'Email', value: formData.submitterEmail }]);

    doc.fontSize(8).fillColor(COLORS.muted).text(entityName + ' | Workers Compensation Claim | www.wcreporting.com', 50, 750, { align: 'center', width: 512 });

    doc.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '3.4' }));
app.get('/health', (req, res) => res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() }));
app.get('/api/entities', (req, res) => res.json(ENTITIES));

// Generate secure link for statement/release
app.post('/api/generate-link', async (req, res) => {
  try {
    const { claimRef, type, personName, email, phone, entityName } = req.body;
    if (!claimRef || !type) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + CONFIG.SECURE_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    secureLinks.set(token, {
      claimRef,
      type,
      personName,
      email,
      phone,
      entityName,
      expiresAt,
      completed: false,
      createdAt: new Date().toISOString()
    });

    const link = `${CONFIG.BASE_URL}/statement/${token}`;

    // Send email if provided
    if (email) {
      try {
        await transporter.sendMail({
          from: CONFIG.SMTP.auth.user,
          to: email,
          subject: `Action Required: ${type === 'hipaa' ? 'HIPAA Authorization' : type.charAt(0).toUpperCase() + type.slice(1) + ' Statement'} - ${claimRef}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#1a1f26;padding:25px;text-align:center;">
                <h1 style="color:white;margin:0;">${entityName || 'Workers Compensation'}</h1>
              </div>
              <div style="padding:30px;background:#f8fafc;">
                <p>Hello ${personName || ''},</p>
                <p>You have been requested to complete a ${type === 'hipaa' ? 'HIPAA Authorization' : type + ' statement'} for workers' compensation claim <strong>${claimRef}</strong>.</p>
                <div style="text-align:center;margin:30px 0;">
                  <a href="${link}" style="background:#5ba4e6;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;font-weight:bold;">Complete ${type === 'hipaa' ? 'Authorization' : 'Statement'}</a>
                </div>
                <p style="color:#6e7681;font-size:13px;">This link will expire on ${expiresAt.toLocaleDateString()}.</p>
                <p style="color:#6e7681;font-size:13px;">If you did not expect this request, please disregard this email.</p>
              </div>
              <div style="background:#1a1f26;padding:20px;text-align:center;">
                <p style="color:#94a3b8;margin:0;font-size:12px;">www.wcreporting.com</p>
              </div>
            </div>`
        });
        console.log(`✅ Statement link sent to ${email}`);
      } catch (emailErr) {
        console.error('Email send error:', emailErr.message);
      }
    }

    res.json({ success: true, token, link, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error('Generate link error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate secure link
app.get('/api/validate-link/:token', (req, res) => {
  const { token } = req.params;
  const linkData = secureLinks.get(token);

  if (!linkData) {
    return res.status(404).json({ valid: false, error: 'Link not found' });
  }

  if (new Date() > new Date(linkData.expiresAt)) {
    return res.status(410).json({ valid: false, error: 'Link has expired' });
  }

  if (linkData.completed) {
    return res.status(410).json({ valid: false, error: 'This form has already been completed' });
  }

  res.json({
    valid: true,
    type: linkData.type,
    claimRef: linkData.claimRef,
    personName: linkData.personName,
    entityName: linkData.entityName,
    expiresAt: linkData.expiresAt
  });
});

// Submit statement via secure link
app.post('/api/submit-statement/:token', upload.any(), async (req, res) => {
  try {
    const { token } = req.params;
    const linkData = secureLinks.get(token);

    if (!linkData) {
      return res.status(404).json({ success: false, error: 'Invalid link' });
    }

    if (new Date() > new Date(linkData.expiresAt)) {
      return res.status(410).json({ success: false, error: 'Link has expired' });
    }

    if (linkData.completed) {
      return res.status(410).json({ success: false, error: 'Already submitted' });
    }

    const formData = JSON.parse(req.body.formData);
    const signatureData = JSON.parse(req.body.signatureData);
    const files = req.files || [];

    // Add entity name to form data
    formData.entityName = linkData.entityName;

    // Add IP and timestamp
    signatureData.ipAddress = getClientIP(req);
    signatureData.signedAt = new Date().toISOString();
    signatureData.documentHash = generateDocumentHash({ formData, signatureData: { ...signatureData, signatureImage: '[REDACTED]' } });

    // Generate appropriate PDF
    let pdfBuffer;
    let pdfFilename;
    
    if (linkData.type === 'witness') {
      pdfBuffer = await generateWitnessStatementPDF({ ...formData, claimRef: linkData.claimRef, entityName: linkData.entityName }, signatureData);
      pdfFilename = `${linkData.claimRef}-WitnessStatement-${formData.witnessName || 'Unknown'}.pdf`;
    } else if (linkData.type === 'claimant') {
      pdfBuffer = await generateClaimantStatementPDF({ ...formData, claimRef: linkData.claimRef, entityName: linkData.entityName }, signatureData);
      pdfFilename = `${linkData.claimRef}-ClaimantStatement.pdf`;
    } else if (linkData.type === 'hipaa') {
      pdfBuffer = await generateHIPAAReleasePDF({ ...formData, claimRef: linkData.claimRef, entityName: linkData.entityName }, signatureData);
      pdfFilename = `${linkData.claimRef}-HIPAAAuthorization.pdf`;
    }

    // Build attachments
    const attachments = [{ filename: pdfFilename, content: pdfBuffer, contentType: 'application/pdf' }];
    
    // Add audio recording if present
    files.forEach(file => {
      attachments.push({ filename: file.originalname, content: file.buffer, contentType: file.mimetype });
    });

    // Send email notification
    try {
      await transporter.sendMail({
        from: CONFIG.SMTP.auth.user,
        to: CONFIG.CLAIMS_EMAIL,
        subject: `[${linkData.type.toUpperCase()}] ${linkData.claimRef} - ${formData.witnessName || formData.claimantName || formData.patientName || 'Statement'} Received`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;">
            <div style="background:#1a1f26;padding:20px;text-align:center;">
              <h2 style="color:white;margin:0;">${linkData.type === 'hipaa' ? 'HIPAA Authorization' : linkData.type.charAt(0).toUpperCase() + linkData.type.slice(1) + ' Statement'} Received</h2>
            </div>
            <div style="padding:20px;background:#f8fafc;">
              <p><strong>Entity:</strong> ${linkData.entityName || 'N/A'}</p>
              <p><strong>Claim:</strong> ${linkData.claimRef}</p>
              <p><strong>Type:</strong> ${linkData.type}</p>
              <p><strong>Signed By:</strong> ${signatureData.typedName || 'N/A'}</p>
              <p><strong>Signed At:</strong> ${signatureData.signedAt}</p>
              <p><strong>IP Address:</strong> ${signatureData.ipAddress}</p>
              <p><strong>Document Hash:</strong> <code style="font-size:10px;">${signatureData.documentHash}</code></p>
              ${formData.hasAudioRecording ? '<p><strong>📎 Audio Recording Attached</strong></p>' : ''}
            </div>
          </div>`,
        attachments
      });
      console.log(`✅ ${linkData.type} statement received for ${linkData.claimRef}`);
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
    }

    // Mark as completed
    linkData.completed = true;
    linkData.completedAt = new Date().toISOString();
    linkData.signatureData = { ...signatureData, signatureImage: '[STORED SEPARATELY]' };
    secureLinks.set(token, linkData);

    res.json({ success: true, message: 'Statement submitted successfully' });
  } catch (error) {
    console.error('Submit statement error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit inline statement (during main claim flow) - FIXED to include audio files and entity name
app.post('/api/submit-inline-statement', upload.any(), async (req, res) => {
  try {
    const formData = JSON.parse(req.body.formData);
    const signatureData = JSON.parse(req.body.signatureData);
    const statementType = req.body.statementType;
    const claimRef = req.body.claimRef;
    const entityName = req.body.entityName || formData.entityName || 'Workers Compensation Claim';
    const files = req.files || [];

    signatureData.ipAddress = getClientIP(req);
    signatureData.signedAt = new Date().toISOString();
    signatureData.documentHash = generateDocumentHash({ formData, signatureData: { ...signatureData, signatureImage: '[REDACTED]' } });

    let pdfBuffer;
    let pdfFilename;
    
    if (statementType === 'witness') {
      pdfBuffer = await generateWitnessStatementPDF({ ...formData, claimRef, entityName }, signatureData);
      pdfFilename = `${claimRef}-WitnessStatement-${formData.witnessName || 'Unknown'}.pdf`;
    } else if (statementType === 'claimant') {
      pdfBuffer = await generateClaimantStatementPDF({ ...formData, claimRef, entityName }, signatureData);
      pdfFilename = `${claimRef}-ClaimantStatement.pdf`;
    } else if (statementType === 'hipaa') {
      pdfBuffer = await generateHIPAAReleasePDF({ ...formData, claimRef, entityName }, signatureData);
      pdfFilename = `${claimRef}-HIPAAAuthorization.pdf`;
    }

    // Process audio files if present - return them as base64 for the main claim
    const audioFiles = [];
    files.forEach(file => {
      if (file.mimetype && (file.mimetype.startsWith('audio/') || file.originalname.endsWith('.webm'))) {
        audioFiles.push({
          filename: file.originalname || `${claimRef}-${statementType}-audio.webm`,
          content: file.buffer.toString('base64'),
          mimetype: file.mimetype || 'audio/webm'
        });
      }
    });

    // Return PDF and audio as base64 for attachment to main claim
    res.json({ 
      success: true, 
      pdf: pdfBuffer.toString('base64'),
      filename: pdfFilename,
      audioFiles: audioFiles,
      signatureData: {
        typedName: signatureData.typedName,
        signedAt: signatureData.signedAt,
        ipAddress: signatureData.ipAddress,
        documentHash: signatureData.documentHash
      }
    });
  } catch (error) {
    console.error('Inline statement error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLAIM SUBMISSION (with follow-up link)
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/submit-claim', submitLimiter, upload.any(), async (req, res) => {
  try {
    if (!req.body.formData) {
      return res.status(400).json({ success: false, error: 'No form data received' });
    }
    const formData = JSON.parse(req.body.formData);
    const files = req.files || [];
    const referenceNumber = 'FROI-' + Date.now().toString().slice(-8);
    
    // Parse any inline statement PDFs
    const inlineStatements = req.body.inlineStatements ? JSON.parse(req.body.inlineStatements) : [];
    
    // Get entity name
    const entityName = getEntityName(formData);

    // Build follow-up link for root cause & statements
    const followUpLink = buildFollowUpLink(referenceNumber, formData);
    
    console.log(`📋 Processing claim ${referenceNumber} for ${entityName}`);

    const pdfBuffer = await generateClaimPDF(formData, referenceNumber);
    const attachments = [{ filename: `${referenceNumber}-ClaimReport.pdf`, content: pdfBuffer, contentType: 'application/pdf' }];
    
    // Add inline statement PDFs and their audio files
    inlineStatements.forEach(stmt => {
      // Add the PDF
      if (stmt.pdf) {
        attachments.push({
          filename: stmt.filename,
          content: Buffer.from(stmt.pdf, 'base64'),
          contentType: 'application/pdf'
        });
      }
      // Add any audio files associated with this statement
      if (stmt.audioFiles && Array.isArray(stmt.audioFiles)) {
        stmt.audioFiles.forEach(audio => {
          attachments.push({
            filename: audio.filename,
            content: Buffer.from(audio.content, 'base64'),
            contentType: audio.mimetype || 'audio/webm'
          });
        });
      }
    });
    
    // Add uploaded files
    files.forEach(file => attachments.push({ filename: file.originalname, content: file.buffer, contentType: file.mimetype }));

    // Store claim data
    claimData.set(referenceNumber, { formData, createdAt: new Date().toISOString(), inlineStatements });

    // Count audio files for email
    let audioFileCount = 0;
    inlineStatements.forEach(stmt => {
      if (stmt.audioFiles) audioFileCount += stmt.audioFiles.length;
    });

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
          <h1 style="color:white;margin:0;">${entityName}</h1>
          <p style="color:#5ba4e6;margin:8px 0 0;">Workers Compensation Claim Report</p>
        </div>
        <div style="background:${priorityColor};padding:12px 20px;">
          <p style="color:white;margin:0;font-weight:bold;">PRIORITY: ${priority}</p>
        </div>
        <div style="padding:25px;background:#f8fafc;">
          <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid #e2e8f0;">
            <h2 style="color:#1a1f26;margin:0 0 15px;border-bottom:2px solid #5ba4e6;padding-bottom:10px;">Claim Summary</h2>
            <table style="width:100%;font-size:14px;">
              <tr><td style="padding:5px 0;color:#6e7681;width:140px;">Reference:</td><td style="font-weight:bold;">${referenceNumber}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Entity:</td><td style="font-weight:bold;">${entityName}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Employee:</td><td>${formData.firstName || ''} ${formData.lastName || ''}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Date of Injury:</td><td>${formData.dateOfInjury || 'N/A'}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Injury Type:</td><td>${INJURY_TYPE_LABELS[formData.injuryType] || formData.injuryType || 'N/A'}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Losing Time:</td><td style="${formData.losingTime === true ? 'color:#dc2626;font-weight:bold;' : ''}">${formData.losingTime === true ? 'YES' : 'No'}</td></tr>
            </table>
          </div>
          ${inlineStatements.length > 0 ? `
          <div style="background:#dcfce7;border:1px solid #16a34a;padding:15px;margin-bottom:20px;border-radius:8px;">
            <h3 style="color:#16a34a;margin:0 0 10px;">✓ E-Signed Documents Attached</h3>
            <ul style="margin:5px 0;font-size:13px;">
              ${inlineStatements.map(s => `<li>${s.filename}${s.audioFiles && s.audioFiles.length > 0 ? ' <strong>(+ Audio Recording)</strong>' : ''}</li>`).join('')}
            </ul>
          </div>` : ''}
          ${audioFileCount > 0 ? `
          <div style="background:#dbeafe;border:1px solid #3b82f6;padding:15px;margin-bottom:20px;border-radius:8px;">
            <h3 style="color:#3b82f6;margin:0 0 5px;">🎤 ${audioFileCount} Audio Recording(s) Attached</h3>
            <p style="margin:0;font-size:12px;color:#64748b;">Audio statements are attached to this email.</p>
          </div>` : ''}
          <div style="background:#eff6ff;border:1px solid #5ba4e6;padding:15px;margin-bottom:20px;border-radius:8px;">
            <h3 style="color:#1a1f26;margin:0 0 8px;">📋 Complete Follow-Up</h3>
            <p style="margin:0 0 10px;font-size:13px;color:#334155;">Use the link below to submit root cause analysis and collect signed statements:</p>
            <a href="${followUpLink}" style="display:inline-block;background:#5ba4e6;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">Open Follow-Up Form</a>
          </div>
          <p style="font-size:13px;color:#6e7681;">Submitted by: ${formData.submitterName || 'N/A'} (${formData.submitterEmail || 'N/A'})</p>
        </div>
        <div style="background:#1a1f26;padding:20px;text-align:center;">
          <p style="color:#94a3b8;margin:0;font-size:12px;">www.wcreporting.com</p>
        </div>
      </div>`;

    try {
      await transporter.sendMail({
        from: CONFIG.SMTP.auth.user,
        to: CONFIG.CLAIMS_EMAIL,
        subject: `[${priority.replace(/[^\w\s-]/g, '').trim()}] ${formData.firstName || ''} ${formData.lastName || ''} - ${entityName} - ${formData.dateOfInjury || ''}`,
        html: emailHtml,
        attachments
      });
      console.log(`✅ Claim email sent to ${CONFIG.CLAIMS_EMAIL} with ${attachments.length} attachments (including ${audioFileCount} audio files)`);
    } catch (err) {
      console.error('❌ Email error:', err.message);
    }

    // Confirmation to submitter (with follow-up link)
    if (formData.submitterEmail) {
      try {
        await transporter.sendMail({
          from: CONFIG.SMTP.auth.user,
          to: formData.submitterEmail,
          subject: `Claim Confirmation - ${referenceNumber} - ${entityName}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#1a1f26;padding:25px;text-align:center;">
                <h1 style="color:white;margin:0;">${entityName}</h1>
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
                <div style="background:#eff6ff;border:1px solid #5ba4e6;padding:15px;margin:20px 0;border-radius:8px;">
                  <h3 style="color:#1a1f26;margin:0 0 8px;">Next Step: Complete Follow-Up</h3>
                  <p style="margin:0 0 12px;font-size:13px;color:#334155;">Submit root cause analysis, witness statements, and claimant statements using the link below:</p>
                  <a href="${followUpLink}" style="display:inline-block;background:#5ba4e6;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">Complete Follow-Up</a>
                </div>
                <p style="color:#64748b;">Our team will review and follow up if needed.</p>
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
// FOLLOW-UP SUBMISSION (Root Cause + Statements)
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/followup', upload.any(), async (req, res) => {
  try {
    const { referenceNumber, entity, rootCause, witnessStatement, claimantStatement, witnessSigned, claimantSigned } = req.body;
    
    if (!referenceNumber) {
      return res.status(400).json({ error: 'Missing reference number' });
    }

    const entityName = entity || 'Workers Compensation Claim';
    const rootCauseData = JSON.parse(rootCause || '{}');
    const witnessData = JSON.parse(witnessStatement || '{}');
    const claimantData = JSON.parse(claimantStatement || '{}');

    // Build follow-up summary for email
    let summary = `CLAIM FOLLOW-UP SUBMITTED\nReference: ${referenceNumber}\nSubmitted: ${new Date().toLocaleString()}\n\n`;

    // Root Cause
    summary += `=== ROOT CAUSE ANALYSIS ===\n`;
    if (rootCauseData.directCause) summary += `Direct Cause: ${rootCauseData.directCause}\n`;
    if (rootCauseData.proceduresExisted !== null && rootCauseData.proceduresExisted !== undefined) summary += `Procedures in Place: ${rootCauseData.proceduresExisted ? 'Yes' : 'No'}\n`;
    if (rootCauseData.trainingProvided !== null && rootCauseData.trainingProvided !== undefined) summary += `Training Provided: ${rootCauseData.trainingProvided ? 'Yes' : 'No'}\n`;
    if (rootCauseData.factors && rootCauseData.factors.length > 0) summary += `Contributing Factors (${rootCauseData.factors.length}): ${rootCauseData.factors.join(', ')}\n`;
    if (rootCauseData.actions && rootCauseData.actions.length > 0) summary += `Corrective Actions (${rootCauseData.actions.length}): ${rootCauseData.actions.join(', ')}\n`;

    // Witness Statement
    if (witnessSigned === 'true') {
      summary += `\n=== WITNESS STATEMENT (SIGNED) ===\n`;
      summary += `Witness: ${witnessData.witnessName || 'N/A'}\n`;
      summary += `Relationship: ${witnessData.relationship || 'N/A'}\n`;
      summary += `Location During Incident: ${witnessData.witnessLocation || 'N/A'}\n`;
      summary += `Statement: ${witnessData.statement || 'N/A'}\n`;
      summary += `Signed By: ${witnessData.typedName}\n`;
    }

    // Claimant Statement
    if (claimantSigned === 'true') {
      summary += `\n=== CLAIMANT STATEMENT (SIGNED) ===\n`;
      summary += `Claimant: ${claimantData.claimantName || 'N/A'}\n`;
      summary += `DOB: ${claimantData.dateOfBirth || 'N/A'}\n`;
      summary += `Description: ${claimantData.incidentDescription || 'N/A'}\n`;
      summary += `Body Parts: ${claimantData.bodyPartsInjured || 'N/A'}\n`;
      summary += `Symptoms: ${claimantData.currentSymptoms || 'N/A'}\n`;
      summary += `Prior Injury: ${claimantData.priorInjury || 'N/A'}\n`;
      summary += `Able to Work: ${claimantData.ableToWork || 'N/A'}\n`;
      summary += `Signed By: ${claimantData.typedName}\n`;
    }

    // Build attachments array
    const attachments = [];

    // Generate Witness Statement PDF if signed
    if (witnessSigned === 'true' && witnessData.typedName) {
      try {
        const sigData = {
          typedName: witnessData.typedName,
          signatureImage: witnessData.signature || null,
          signedAt: new Date().toISOString(),
          ipAddress: getClientIP(req),
          documentHash: generateDocumentHash({ witnessData, type: 'witness-followup' })
        };
        const witnessPdf = await generateWitnessStatementPDF({
          ...witnessData,
          claimRef: referenceNumber,
          entityName: entityName,
          hasAudioRecording: !!(req.files && req.files.find(f => f.fieldname === 'witnessAudio'))
        }, sigData);
        attachments.push({
          filename: `${referenceNumber}-WitnessStatement-${witnessData.witnessName || 'Unknown'}.pdf`,
          content: witnessPdf,
          contentType: 'application/pdf'
        });
      } catch (pdfErr) {
        console.error('Witness PDF generation error:', pdfErr.message);
      }
    }

    // Generate Claimant Statement PDF if signed
    if (claimantSigned === 'true' && claimantData.typedName) {
      try {
        const sigData = {
          typedName: claimantData.typedName,
          signatureImage: claimantData.signature || null,
          signedAt: new Date().toISOString(),
          ipAddress: getClientIP(req),
          documentHash: generateDocumentHash({ claimantData, type: 'claimant-followup' })
        };
        const claimantPdf = await generateClaimantStatementPDF({
          ...claimantData,
          claimRef: referenceNumber,
          entityName: entityName,
          hasAudioRecording: !!(req.files && req.files.find(f => f.fieldname === 'claimantAudio'))
        }, sigData);
        attachments.push({
          filename: `${referenceNumber}-ClaimantStatement.pdf`,
          content: claimantPdf,
          contentType: 'application/pdf'
        });
      } catch (pdfErr) {
        console.error('Claimant PDF generation error:', pdfErr.message);
      }
    }

    // Add audio files
    if (req.files) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.originalname,
          content: file.buffer,
          contentType: file.mimetype || 'audio/webm'
        });
      });
    }

    // Build HTML email
    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;">
        <div style="background:#1a1f26;padding:25px;text-align:center;">
          <h1 style="color:white;margin:0;">Follow-Up Received</h1>
          <p style="color:#5ba4e6;margin:8px 0 0;">${referenceNumber} — ${entityName}</p>
        </div>
        <div style="padding:25px;background:#f8fafc;">
          ${rootCauseData.directCause || (rootCauseData.factors && rootCauseData.factors.length > 0) ? `
          <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid #e2e8f0;">
            <h3 style="color:#1a1f26;margin:0 0 12px;border-bottom:2px solid #d97706;padding-bottom:8px;">Root Cause Analysis</h3>
            ${rootCauseData.directCause ? `<p><strong>Direct Cause:</strong> ${rootCauseData.directCause}</p>` : ''}
            ${rootCauseData.proceduresExisted !== null && rootCauseData.proceduresExisted !== undefined ? `<p><strong>Procedures in Place:</strong> ${rootCauseData.proceduresExisted ? 'Yes' : '<span style="color:#dc2626;">No</span>'}</p>` : ''}
            ${rootCauseData.trainingProvided !== null && rootCauseData.trainingProvided !== undefined ? `<p><strong>Training Provided:</strong> ${rootCauseData.trainingProvided ? 'Yes' : '<span style="color:#dc2626;">No</span>'}</p>` : ''}
            ${rootCauseData.factors && rootCauseData.factors.length > 0 ? `<p><strong>Contributing Factors (${rootCauseData.factors.length}):</strong><br/>${rootCauseData.factors.map(f => `<span style="display:inline-block;background:#fef3c7;border:1px solid #d97706;padding:2px 8px;border-radius:4px;margin:2px;font-size:12px;">${f}</span>`).join(' ')}</p>` : ''}
            ${rootCauseData.actions && rootCauseData.actions.length > 0 ? `<p><strong>Corrective Actions (${rootCauseData.actions.length}):</strong><br/>${rootCauseData.actions.map(a => `<span style="display:inline-block;background:#dcfce7;border:1px solid #16a34a;padding:2px 8px;border-radius:4px;margin:2px;font-size:12px;">${a}</span>`).join(' ')}</p>` : ''}
          </div>` : ''}
          ${witnessSigned === 'true' ? `
          <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid #e2e8f0;">
            <h3 style="color:#1a1f26;margin:0 0 12px;border-bottom:2px solid #5ba4e6;padding-bottom:8px;">Witness Statement (Signed)</h3>
            <p><strong>Witness:</strong> ${witnessData.witnessName || 'N/A'}</p>
            <p><strong>Relationship:</strong> ${witnessData.relationship || 'N/A'}</p>
            <p><strong>Statement:</strong> ${witnessData.statement || 'N/A'}</p>
            <p style="color:#16a34a;font-weight:bold;">✓ Signed by: ${witnessData.typedName}</p>
          </div>` : ''}
          ${claimantSigned === 'true' ? `
          <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid #e2e8f0;">
            <h3 style="color:#1a1f26;margin:0 0 12px;border-bottom:2px solid #5ba4e6;padding-bottom:8px;">Claimant Statement (Signed)</h3>
            <p><strong>Claimant:</strong> ${claimantData.claimantName || 'N/A'}</p>
            <p><strong>Description:</strong> ${claimantData.incidentDescription || 'N/A'}</p>
            <p><strong>Body Parts:</strong> ${claimantData.bodyPartsInjured || 'N/A'}</p>
            <p><strong>Symptoms:</strong> ${claimantData.currentSymptoms || 'N/A'}</p>
            <p style="color:#16a34a;font-weight:bold;">✓ Signed by: ${claimantData.typedName}</p>
          </div>` : ''}
          ${req.files && req.files.length > 0 ? `
          <div style="background:#dbeafe;border:1px solid #3b82f6;padding:12px;margin-bottom:15px;border-radius:8px;">
            <p style="color:#3b82f6;margin:0;font-weight:bold;">🎤 ${req.files.length} Audio Recording(s) Attached</p>
          </div>` : ''}
        </div>
        <div style="background:#1a1f26;padding:20px;text-align:center;">
          <p style="color:#94a3b8;margin:0;font-size:12px;">www.wcreporting.com</p>
        </div>
      </div>`;

    // Send notification email
    await transporter.sendMail({
      from: CONFIG.SMTP.auth.user,
      to: CONFIG.CLAIMS_EMAIL,
      subject: `[FOLLOW-UP] ${referenceNumber} - ${entityName} - Root Cause & Statements`,
      html: emailHtml,
      text: summary,
      attachments
    });

    console.log(`✅ Follow-up received for ${referenceNumber}`);
    res.json({ success: true, referenceNumber });
  } catch (error) {
    console.error('Follow-up submission error:', error);
    res.status(500).json({ error: 'Failed to submit follow-up' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERVE HTML FILES
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/statement/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'statement.html'));
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  WORKERS COMPENSATION CLAIM INTAKE PORTAL v3.4');
  console.log('  With E-Signatures, Follow-Up, Statements & HIPAA Release');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  🌐 Portal running at: http://localhost:${PORT}`);
  console.log(`  📧 Claims sent to: ${CONFIG.CLAIMS_EMAIL}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
});

module.exports = app;
