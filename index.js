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
// ENHANCED PDF GENERATION
// ═══════════════════════════════════════════════════════════════════════════════
function generateClaimPDF(formData, referenceNumber) {
  return new Promise(function(resolve, reject) {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const COLORS = { primary: '#1a1f26', accent: 'var(--titanium-accent)', success: '#238636', warning: '#d29922', danger: 'var(--titanium-danger)', text: '#333333', muted: '#6e7681' };

    // Header
    doc.rect(0, 0, 612, 80).fill('#1a1f26');
    doc.fontSize(22).font('Helvetica-Bold').fillColor('white').text('TITANIUM DEFENSE GROUP', 50, 25);
    doc.fontSize(11).font('Helvetica').fillColor('var(--titanium-muted)').text('Smart Claim Intake Report', 50, 50);
    doc.fontSize(10).fillColor('var(--titanium-accent)').text('www.wcreporting.com', 450, 50);
    doc.y = 100;

    // Reference Box
    doc.rect(50, 90, 512, 40).fillAndStroke('#f0f6fc', '#e1e4e8');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1f26').text('Reference #: ' + referenceNumber, 60, 100);
    doc.fontSize(10).font('Helvetica').fillColor('#6e7681').text('Generated: ' + new Date().toLocaleString(), 60, 116);
    doc.fontSize(10).fillColor('#6e7681').text('Entity: ' + (formData.entity === 'Other - Enter Manually' ? formData.customEntity || 'N/A' : formData.entity || 'N/A'), 350, 100);
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
    addField('Entity', formData.entity === 'Other - Enter Manually' ? formData.customEntity : formData.entity);
    addFieldRow([{ label: 'Date of Injury', value: formData.dateOfInjury }, { label: 'Time', value: formData.timeOfInjury }]);
    addFieldRow([{ label: 'Date Reported', value: formData.dateReported }, { label: 'Reported Immediately', value: formData.reportedImmediately === true ? 'Yes' : formData.reportedImmediately === false ? 'NO ⚠️' : 'N/A' }]);
    addFieldRow([{ label: 'Weekly Wage', value: formData.weeklyWage ? '$' + formData.weeklyWage : 'N/A' }, { label: 'Work Type', value: formData.employeeWorkType }]);

    // INCIDENT DETAILS
    addSection('INCIDENT DETAILS');
    addField('Injury Type', INJURY_TYPE_LABELS[formData.injuryType] || formData.injuryType);
    addFieldRow([{ label: 'Nature of Injury', value: formData.natureOfInjury }, { label: 'Cause', value: formData.causeOfInjury }]);
    addField('Body Parts', (Array.isArray(formData.bodyParts) ? formData.bodyParts.join(', ') : formData.bodyParts) + (formData.customBodyPart ? (formData.bodyParts && formData.bodyParts.length > 0 ? ', ' : '') + formData.customBodyPart : ''));
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
    addField('Initial Treatment Received', formData.soughtMedicalTreatment === true ? 'Yes' : 'No');
    if (formData.soughtMedicalTreatment === true) {
      addField('Initial Facility', formData.initialFacilityName || formData.facilityName);
      addField('Treatment Date', formData.initialTreatmentDate || formData.treatmentDate);
      if (formData.additionalTreatmentNeeded === true) {
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.accent).text('Follow-Up Treatment Needed:', 60, doc.y);
        doc.moveDown(0.2);
        if (formData.followUpTreatmentType) addField('Type', formData.followUpTreatmentType);
        if (formData.followUpFacility) addField('Referred To', formData.followUpFacility);
      }
    }
    if (formData.soughtMedicalTreatment === false) {
      if (formData.refusedTreatment === true) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.warning).text('⚠️ EMPLOYEE REFUSED MEDICAL TREATMENT', 60, doc.y);
        doc.moveDown(0.5);
      } else if (formData.refusedTreatment === false) {
        doc.moveDown(0.3);
        const referralType = formData.severeInjury === true || formData.employeeRequestsHospital === true ? 'HOSPITAL' : 'URGENT CARE (Concentra Preferred)';
        doc.fontSize(9).font('Helvetica-Bold').fillColor(formData.severeInjury === true || formData.employeeRequestsHospital === true ? COLORS.danger : COLORS.success).text('🏥 REFERRAL: ' + referralType, 60, doc.y);
        doc.moveDown(0.3);
        if (formData.severeInjury === true) addField('Severe Injury', 'YES ⚠️');
        if (formData.employeeRequestsHospital === true) addField('Employee Requested Hospital', 'Yes');
        if (formData.referralFacility) addField('Referred To', formData.referralFacility);
        if (formData.referralNotes) addField('Referral Notes', formData.referralNotes);
      }
    }

    // WITNESSES & EVIDENCE
    addSection('WITNESSES & EVIDENCE');
    addFieldRow([{ label: 'Video Available', value: formData.hasVideo === true ? 'YES ✓' : 'No' }, { label: 'Scene Photos', value: formData.hasScenePhotos === true ? 'YES ✓' : formData.hasScenePhotos === 'pending' ? 'Pending' : 'No' }]);
    addFieldRow([{ label: 'Injury Photos', value: formData.hasInjuryPhotos === true ? 'YES ✓' : formData.hasInjuryPhotos === 'pending' ? 'Pending' : 'No' }, { label: '', value: '' }]);
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
    // Statements
    addFieldRow([{ label: 'Witness Statement', value: formData.hasWitnessStatement === true ? 'Yes' : formData.hasWitnessStatement === 'pending' ? 'Pending' : 'No' }, { label: 'Employee Statement', value: formData.hasEmployeeStatement === true ? 'Yes' : formData.hasEmployeeStatement === 'pending' ? 'Pending' : 'No' }]);
    addField('Supervisor Statement', formData.hasSupervisorStatement === true ? 'Yes' : formData.hasSupervisorStatement === 'pending' ? 'Pending' : 'No');
    if (formData.supervisorComments) {
      addField('Supervisor Comments', formData.supervisorComments);
    }

    // WORK STATUS
    addSection('WORK STATUS');
    addFieldRow([{ label: 'Losing Time', value: formData.losingTime === true ? 'YES ⚠️' : 'No' }, { label: 'Date Last Worked', value: formData.dateLastWorked }]);
    addFieldRow([{ label: 'Last Day Paid', value: formData.lastDayPaid || 'N/A' }, { label: 'Still Being Paid', value: formData.stillBeingPaid === true ? 'Yes' : formData.stillBeingPaid === false ? 'NO ⚠️' : 'N/A' }]);
    addField('Return Status', formData.returnStatus === 'no' ? 'Has not returned' : formData.returnStatus === 'fullduty' ? 'Full Duty' : formData.returnStatus === 'restrictions' ? 'Light Duty' : formData.returnStatus);
    addFieldRow([{ label: 'Light Duty Available', value: formData.lightDutyAvailable === true ? 'Yes' : formData.lightDutyAvailable === false ? 'NO ⚠️' : 'N/A' }, { label: 'Salary Continuation', value: formData.salaryContinuation === true ? 'Yes' : 'No' }]);

    // ROOT CAUSE ANALYSIS
    addSection('ROOT CAUSE ANALYSIS', '#334155');
    addField('Direct Cause', formData.directCause);
    if (formData.rootCauseCategory) {
      addField('Root Cause Category', formData.rootCauseCategory);
    }
    if (Array.isArray(formData.rootCauseSymptoms) && formData.rootCauseSymptoms.length > 0) {
      addField('Root Causes', formData.rootCauseSymptoms.map(rc => ROOT_CAUSE_LABELS[rc] || rc).join(', '));
    }
    if (formData.customRootCause) {
      addField('Other Root Cause', formData.customRootCause);
    }
    addFieldRow([{ label: 'Procedures in Place', value: formData.proceduresInPlace === true ? 'Yes' : formData.proceduresInPlace === false ? 'NO ⚠️' : 'N/A' }, { label: 'Followed', value: formData.proceduresFollowed === true ? 'Yes' : formData.proceduresFollowed === false ? 'NO ⚠️' : 'N/A' }]);
    if (formData.proceduresFollowed === false) {
      addFieldRow([{ label: 'Training Provided', value: formData.trainingProvided === true ? 'Yes' : 'NO ⚠️' }, { label: 'Frequency', value: formData.trainingFrequency }]);
    }
    if ((Array.isArray(formData.correctiveActions) && formData.correctiveActions.length > 0) || formData.customCorrectiveAction) {
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.success).text('✓ Corrective Actions:', 60, doc.y);
      doc.moveDown(0.2);
      if (Array.isArray(formData.correctiveActions)) {
        formData.correctiveActions.forEach(action => {
          doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text('• ' + (CORRECTIVE_LABELS[action] || action), 70, doc.y);
          doc.moveDown(0.3);
        });
      }
      if (formData.customCorrectiveAction) {
        doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text('• ' + formData.customCorrectiveAction, 70, doc.y);
        doc.moveDown(0.3);
      }
    }

    // INVESTIGATION FLAGS
    const hasFlags = formData.validityConcerns === true || (Array.isArray(formData.fraudIndicators) && formData.fraudIndicators.length > 0) || formData.customRedFlag || formData.investigationNotes || formData.recommendDeny === true || formData.recommendSIU === true;
    if (hasFlags) {
      addSection('⚠️ INVESTIGATION FLAGS', COLORS.danger);
      if (formData.recommendDeny === true || formData.recommendSIU === true) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.danger).text('🚨 RECOMMENDATIONS:', 60, doc.y);
        doc.moveDown(0.2);
        if (formData.recommendDeny === true) {
          doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.danger).text('• RECOMMEND DENIAL', 70, doc.y);
          doc.moveDown(0.3);
        }
        if (formData.recommendSIU === true) {
          doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.warning).text('• REFER TO SIU', 70, doc.y);
          doc.moveDown(0.3);
        }
        doc.moveDown(0.3);
      }
      if (formData.validityConcerns === true) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.danger).text('VALIDITY CONCERNS REPORTED', 60, doc.y);
        doc.moveDown(0.3);
        if (formData.concernDetails) {
          doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text(formData.concernDetails, 60, doc.y, { width: 490 });
          doc.moveDown(0.5);
        }
      }
      if (Array.isArray(formData.fraudIndicators) && formData.fraudIndicators.length > 0) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.warning).text('Red Flag Indicators (' + formData.fraudIndicators.length + '):', 60, doc.y);
        doc.moveDown(0.2);
        formData.fraudIndicators.forEach(ind => {
          doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text('⚠️ ' + (FRAUD_LABELS[ind] || ind), 70, doc.y);
          doc.moveDown(0.3);
        });
      }
      if (formData.customRedFlag) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.warning).text('Other Red Flag:', 60, doc.y);
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text('⚠️ ' + formData.customRedFlag, 70, doc.y);
        doc.moveDown(0.5);
      }
      if (formData.investigationNotes) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.accent).text('Investigation Notes:', 60, doc.y);
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text(formData.investigationNotes, 60, doc.y, { width: 490 });
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

    // Footer on current page only (avoid switchToPage issues)
    doc.fontSize(8).fillColor(COLORS.muted).text('Titanium Defense Group | Smart Claim Intake | www.wcreporting.com', 50, 750, { align: 'center', width: 512 });

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
    if (!req.body.formData) {
      return res.status(400).json({ success: false, error: 'No form data received' });
    }
    const formData = JSON.parse(req.body.formData);
    const files = req.files || [];
    const referenceNumber = 'FROI-' + Date.now().toString().slice(-8);
    console.log(`📋 Processing claim ${referenceNumber} for ${formData.entity === 'Other - Enter Manually' ? formData.customEntity : formData.entity}`);

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
          <p style="color:var(--titanium-accent);margin:8px 0 0;">Smart Claim Intake Report</p>
        </div>
        <div style="background:${priorityColor};padding:12px 20px;">
          <p style="color:white;margin:0;font-weight:bold;">PRIORITY: ${priority}</p>
        </div>
        <div style="padding:25px;background:#f8fafc;">
          <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid #e2e8f0;">
            <h2 style="color:#1a1f26;margin:0 0 15px;border-bottom:2px solid var(--titanium-accent);padding-bottom:10px;">Claim Summary</h2>
            <table style="width:100%;font-size:14px;">
              <tr><td style="padding:5px 0;color:#6e7681;width:140px;">Reference:</td><td style="font-weight:bold;">${referenceNumber}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Entity:</td><td style="font-weight:bold;">${formData.entity === 'Other - Enter Manually' ? formData.customEntity || 'N/A' : formData.entity || 'N/A'}</td></tr>
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
          <p style="color:var(--titanium-muted);margin:0;font-size:12px;">www.wcreporting.com</p>
        </div>
      </div>`;

    try {
      await transporter.sendMail({
        from: CONFIG.SMTP.auth.user,
        to: CONFIG.CLAIMS_EMAIL,
        subject: `[${priority.replace(/[^\w\s-]/g, '').trim()}] ${formData.firstName || ''} ${formData.lastName || ''} - ${formData.entity === 'Other - Enter Manually' ? formData.customEntity || '' : formData.entity || ''} - ${formData.dateOfInjury || ''}`,
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
                <p style="color:var(--titanium-muted);margin:0;font-size:12px;">www.wcreporting.com</p>
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
:root{--titanium-dark:#1e2a38;--titanium-navy:#2d3a4a;--titanium-slate:#3d4f63;--titanium-light:#4a6178;--titanium-accent:#5ba4e6;--titanium-accent2:#7eb8f0;--titanium-success:#34d399;--titanium-warning:#fbbf24;--titanium-danger:#f87171;--titanium-text:#f1f5f9;--titanium-muted:#94a3b8;--titanium-border:rgba(148,163,184,0.15);--glass-bg:rgba(45,58,74,0.6);--glass-border:rgba(148,163,184,0.12)}
body{font-family:'DM Sans',sans-serif;background:var(--titanium-dark);min-height:100vh;color:var(--titanium-text)}
body::before{content:'';position:fixed;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at top,rgba(91,164,230,0.08) 0%,transparent 50%),radial-gradient(ellipse at bottom right,rgba(52,211,153,0.05) 0%,transparent 50%);pointer-events:none;z-index:0}
.claim-intake-portal{position:relative;z-index:1}
.portal-header{background:linear-gradient(180deg,var(--titanium-navy) 0%,var(--titanium-dark) 100%);border-bottom:1px solid var(--glass-border);padding:16px 28px;position:sticky;top:0;z-index:100;backdrop-filter:blur(20px)}
.header-content{max-width:1280px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.brand{display:flex;align-items:center;gap:14px}
.brand-logo{width:48px;height:48px;background:linear-gradient(145deg,var(--titanium-slate) 0%,var(--titanium-navy) 100%);border:2px solid var(--titanium-light);border-radius:12px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.brand-logo::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent 40%,rgba(255,255,255,0.1) 50%,transparent 60%);animation:shimmer 3s infinite}
@keyframes shimmer{0%{transform:translateX(-100%) rotate(45deg)}100%{transform:translateX(100%) rotate(45deg)}}
.brand-logo svg{width:28px;height:28px;fill:white}
.brand-text h1{font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700;color:white;letter-spacing:-0.3px}
.brand-text p{font-size:11px;color:var(--titanium-muted);letter-spacing:0.5px}
.completion-badge{display:flex;align-items:center;gap:12px;background:var(--glass-bg);padding:10px 18px;border-radius:12px;border:1px solid var(--glass-border);backdrop-filter:blur(10px)}
.completion-bar{width:100px;height:8px;background:rgba(30,42,56,0.8);border-radius:4px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,0.3)}
.completion-fill{height:100%;background:linear-gradient(90deg,var(--titanium-success) 0%,#10b981 100%);border-radius:4px;transition:width 0.5s cubic-bezier(0.4,0,0.2,1);box-shadow:0 0 12px rgba(52,211,153,0.4)}
.completion-text{font-size:13px;font-weight:700;color:var(--titanium-success)}
.portal-body{display:flex;max-width:1280px;margin:0 auto;padding:24px;gap:24px}
.steps-sidebar{width:220px;flex-shrink:0}
.steps-list{background:var(--glass-bg);border-radius:16px;border:1px solid var(--glass-border);padding:12px;backdrop-filter:blur(10px)}
.step-item{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;cursor:pointer;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);margin-bottom:4px;border:1px solid transparent}
.step-item:hover{background:rgba(91,164,230,0.08);transform:translateX(4px)}
.step-item.active{background:linear-gradient(135deg,rgba(91,164,230,0.15) 0%,rgba(91,164,230,0.08) 100%);border-color:rgba(91,164,230,0.3);box-shadow:0 0 20px rgba(91,164,230,0.1)}
.step-icon{width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;background:var(--titanium-dark);border-radius:8px}
.step-item.active .step-icon{background:var(--titanium-accent);color:white}
.step-title{font-size:13px;font-weight:500;color:var(--titanium-muted);transition:color 0.2s}
.step-item.active .step-title{color:var(--titanium-accent2);font-weight:600}
.main-content{flex:1;min-width:0}
.step-content{background:var(--glass-bg);border-radius:20px;border:1px solid var(--glass-border);padding:28px;backdrop-filter:blur(10px);box-shadow:0 4px 30px rgba(0,0,0,0.2)}
.section-header{margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--glass-border);position:relative}
.section-header::after{content:'';position:absolute;bottom:-1px;left:0;width:60px;height:2px;background:linear-gradient(90deg,var(--titanium-accent),transparent)}
.section-header h2{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;color:white;margin-bottom:6px;letter-spacing:-0.3px}
.section-subtitle{font-size:14px;color:var(--titanium-muted)}
.highlight{color:var(--titanium-accent);font-weight:600}
.form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.form-group{display:flex;flex-direction:column;gap:6px}
.form-group.full-width{grid-column:1/-1}
.form-group label{font-size:12px;font-weight:600;color:var(--titanium-muted);text-transform:uppercase;letter-spacing:0.5px}
.required{color:var(--titanium-danger)}
.input-field{background:rgba(30,42,56,0.8);border:1px solid var(--titanium-border);border-radius:10px;padding:12px 14px;font-size:14px;color:var(--titanium-text);font-family:'DM Sans',sans-serif;width:100%;transition:all 0.2s}
.input-field:focus{outline:none;border-color:var(--titanium-accent);box-shadow:0 0 0 3px rgba(91,164,230,0.15),0 0 20px rgba(91,164,230,0.1)}
.input-field::placeholder{color:var(--titanium-light)}
.toggle-group{display:flex;gap:8px;flex-wrap:wrap}
.toggle-btn{padding:10px 18px;border-radius:10px;border:1px solid var(--titanium-border);background:rgba(30,42,56,0.6);color:var(--titanium-muted);font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s}
.toggle-btn:hover{border-color:var(--titanium-light);background:rgba(30,42,56,0.8)}
.toggle-btn.active{background:linear-gradient(135deg,rgba(91,164,230,0.2) 0%,rgba(91,164,230,0.1) 100%);border-color:var(--titanium-accent);color:var(--titanium-accent2);box-shadow:0 0 15px rgba(91,164,230,0.15)}
.toggle-btn.active.success{background:linear-gradient(135deg,rgba(52,211,153,0.2) 0%,rgba(52,211,153,0.1) 100%);border-color:var(--titanium-success);color:var(--titanium-success)}
.toggle-btn.active.warning{background:linear-gradient(135deg,rgba(251,191,36,0.2) 0%,rgba(251,191,36,0.1) 100%);border-color:var(--titanium-warning);color:var(--titanium-warning)}
.toggle-btn.active.danger{background:linear-gradient(135deg,rgba(248,113,113,0.15) 0%,rgba(248,113,113,0.08) 100%);border-color:var(--titanium-danger);color:var(--titanium-danger)}
.injury-type-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}
.injury-type-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border-radius:12px;border:1px solid var(--titanium-border);background:rgba(30,42,56,0.5);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s}
.injury-type-btn:hover{border-color:var(--titanium-light);transform:translateY(-2px)}
.injury-type-btn.active{background:linear-gradient(135deg,rgba(91,164,230,0.15) 0%,rgba(91,164,230,0.08) 100%);border-color:var(--titanium-accent);box-shadow:0 4px 20px rgba(91,164,230,0.15)}
.injury-icon{font-size:24px}
.injury-label{font-size:11px;color:var(--titanium-muted);text-align:center;font-weight:500}
.injury-type-btn.active .injury-label{color:var(--titanium-accent2)}
.smart-tips-panel{background:linear-gradient(135deg,rgba(91,164,230,0.1) 0%,rgba(91,164,230,0.05) 100%);border:1px solid rgba(91,164,230,0.2);border-radius:14px;padding:16px 18px;margin:18px 0}
.smart-tips-panel h4{font-size:14px;color:var(--titanium-accent);margin-bottom:12px;font-weight:700}
.smart-tips-panel ul{list-style:none}
.smart-tips-panel li{padding-left:20px;margin-bottom:8px;font-size:13px;color:var(--titanium-text);position:relative}
.smart-tips-panel li::before{content:'→';position:absolute;left:0;color:var(--titanium-accent)}
.body-parts-grid,.root-cause-grid,.corrective-grid,.fraud-grid{display:flex;flex-wrap:wrap;gap:8px}
.chip-btn{padding:8px 12px;border-radius:8px;border:1px solid var(--titanium-border);background:rgba(30,42,56,0.5);color:var(--titanium-muted);font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s}
.chip-btn:hover{border-color:var(--titanium-light);background:rgba(30,42,56,0.8)}
.chip-btn.active{background:linear-gradient(135deg,rgba(91,164,230,0.15) 0%,rgba(91,164,230,0.08) 100%);border-color:var(--titanium-accent);color:var(--titanium-accent2)}
.chip-btn.active.warning{background:linear-gradient(135deg,rgba(251,191,36,0.15) 0%,rgba(251,191,36,0.08) 100%);border-color:var(--titanium-warning);color:var(--titanium-warning)}
.chip-btn.active.success{background:linear-gradient(135deg,rgba(52,211,153,0.15) 0%,rgba(52,211,153,0.08) 100%);border-color:var(--titanium-success);color:var(--titanium-success)}
.chip-btn.active.danger{background:linear-gradient(135deg,rgba(248,113,113,0.12) 0%,rgba(248,113,113,0.06) 100%);border-color:var(--titanium-danger);color:var(--titanium-danger)}
.witness-card{background:rgba(30,42,56,0.5);border:1px solid var(--titanium-border);border-radius:12px;padding:16px;margin-top:14px}
.witness-header{font-size:13px;font-weight:700;color:var(--titanium-accent);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px}
.info-tip{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;background:linear-gradient(135deg,rgba(91,164,230,0.1) 0%,rgba(91,164,230,0.05) 100%);border-radius:12px;border-left:3px solid var(--titanium-accent);margin-top:12px;font-size:13px;color:var(--titanium-text)}
.disclaimer-box{background:linear-gradient(135deg,rgba(251,191,36,0.12) 0%,rgba(251,191,36,0.06) 100%);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:16px;font-size:14px;color:var(--titanium-warning);margin-bottom:18px}
.nav-buttons{display:flex;justify-content:space-between;margin-top:28px;padding-top:24px;border-top:1px solid var(--glass-border)}
.nav-btn{padding:14px 28px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;border:none;transition:all 0.25s cubic-bezier(0.4,0,0.2,1)}
.nav-btn.secondary{background:transparent;border:1px solid var(--titanium-border);color:var(--titanium-muted)}
.nav-btn.secondary:hover{border-color:var(--titanium-light);color:var(--titanium-text);background:rgba(30,42,56,0.5)}
.nav-btn.primary{background:linear-gradient(135deg,var(--titanium-success) 0%,#10b981 100%);color:white;box-shadow:0 4px 15px rgba(52,211,153,0.3)}
.nav-btn.primary:hover{transform:translateY(-2px);box-shadow:0 6px 25px rgba(52,211,153,0.4)}
.nav-btn.submit{background:linear-gradient(135deg,var(--titanium-accent) 0%,#3b82f6 100%);box-shadow:0 4px 15px rgba(91,164,230,0.3)}
.nav-btn.submit:hover{box-shadow:0 6px 25px rgba(91,164,230,0.4)}
.nav-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none!important}
.summary-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:24px 0}
.summary-section{background:rgba(30,42,56,0.6);border-radius:12px;padding:18px;border:1px solid var(--glass-border)}
.summary-section h4{font-size:11px;color:var(--titanium-accent);margin-bottom:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
.summary-section p{font-size:14px;color:var(--titanium-text);margin-bottom:4px}
.certification-box{background:linear-gradient(135deg,rgba(30,42,56,0.8) 0%,rgba(30,42,56,0.6) 100%);border:1px solid var(--glass-border);border-radius:12px;padding:20px;text-align:center;margin-top:20px}
.certification-box p{font-size:13px;color:var(--titanium-muted)}
.success-container{max-width:520px;margin:80px auto;text-align:center;padding:48px;background:var(--glass-bg);border-radius:24px;border:1px solid var(--glass-border);backdrop-filter:blur(10px)}
.success-icon{width:88px;height:88px;background:linear-gradient(135deg,rgba(52,211,153,0.2) 0%,rgba(52,211,153,0.1) 100%);border:2px solid var(--titanium-success);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 28px;font-size:44px;box-shadow:0 0 40px rgba(52,211,153,0.2)}
.ref-number{font-size:36px;font-family:'Space Grotesk',monospace;color:white;font-weight:700;margin:20px 0;letter-spacing:1px}
@media(max-width:900px){.portal-body{flex-direction:column}.steps-sidebar{width:100%}.steps-list{display:flex;overflow-x:auto;gap:8px;padding:10px}.step-item{flex-shrink:0;margin-bottom:0}.form-grid,.summary-grid{grid-template-columns:1fr}}
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
const ROOT_CAUSES=[{v:'no_training',l:'No Training Provided'},{v:'inadequate_training',l:'Inadequate Training'},{v:'training_not_followed',l:'Training Not Followed'},{v:'no_supervision',l:'Lack of Supervision'},{v:'inadequate_supervision',l:'Inadequate Supervision'},{v:'no_inspection',l:'No Inspection Procedures'},{v:'inspection_not_followed',l:'Inspection Not Followed'},{v:'equipment_failure',l:'Equipment Failure/Malfunction'},{v:'equipment_not_maintained',l:'Equipment Not Maintained'},{v:'wrong_equipment',l:'Wrong Equipment for Task'},{v:'no_ppe',l:'No PPE Provided'},{v:'ppe_not_worn',l:'PPE Not Worn'},{v:'improper_ppe',l:'Improper PPE for Task'},{v:'no_safe_handling',l:'No Safe Patient Handling'},{v:'safe_handling_not_followed',l:'Safe Handling Not Followed'},{v:'understaffed',l:'Understaffed/Overworked'},{v:'rushing',l:'Rushing/Time Pressure'},{v:'fatigue',l:'Employee Fatigue'},{v:'distraction',l:'Distraction/Inattention'},{v:'horseplay',l:'Horseplay/Misconduct'},{v:'shortcut_taken',l:'Shortcut Taken'},{v:'no_policies',l:'No Policies/Procedures'},{v:'policies_not_followed',l:'Policies Not Followed'},{v:'gap_in_policies',l:'Gap in Policies'},{v:'poor_housekeeping',l:'Poor Housekeeping'},{v:'wet_floor',l:'Wet/Slippery Floor'},{v:'poor_lighting',l:'Poor Lighting'},{v:'cluttered_area',l:'Cluttered Work Area'},{v:'weather_conditions',l:'Weather Conditions'},{v:'combative_patient',l:'Combative Patient/Resident'},{v:'no_deescalation',l:'No De-escalation Training'},{v:'communication_failure',l:'Communication Failure'},{v:'language_barrier',l:'Language Barrier'}];
const ROOT_CAUSE_CATEGORIES=[{v:'training',l:'🎓 Training Issues'},{v:'supervision',l:'👁️ Supervision'},{v:'equipment',l:'🔧 Equipment/PPE'},{v:'procedures',l:'📋 Policies/Procedures'},{v:'environment',l:'🏢 Work Environment'},{v:'behavior',l:'⚠️ Employee Behavior'},{v:'patient',l:'🏥 Patient Related'},{v:'other',l:'📝 Other'}];
const CORRECTIVE=[{v:'reviewed_procedures',l:'Reviewed Procedures w/ Employee'},{v:'observed_performance',l:'Observed Proper Performance'},{v:'reviewed_department',l:'Reviewed w/ All Dept Staff'},{v:'discipline_verbal',l:'Verbal Warning Issued'},{v:'discipline_written',l:'Written Warning Issued'},{v:'discipline_suspension',l:'Suspension'},{v:'discipline_termination',l:'Termination'},{v:'training_scheduled',l:'Training Scheduled'},{v:'training_completed',l:'Training Completed'},{v:'retraining_required',l:'Retraining Required'},{v:'new_procedures',l:'New Procedures Created'},{v:'procedures_updated',l:'Procedures Updated'},{v:'equipment_repaired',l:'Equipment Repaired'},{v:'equipment_replaced',l:'Equipment Replaced'},{v:'ppe_provided',l:'PPE Provided'},{v:'ppe_training',l:'PPE Training Conducted'},{v:'area_cleaned',l:'Area Cleaned/Organized'},{v:'lighting_improved',l:'Lighting Improved'},{v:'signage_added',l:'Warning Signs Added'},{v:'staffing_adjusted',l:'Staffing Levels Adjusted'},{v:'supervision_increased',l:'Supervision Increased'},{v:'safety_meeting',l:'Safety Meeting Held'},{v:'incident_review',l:'Incident Review Completed'},{v:'accountability_assigned',l:'Accountability Assigned'},{v:'engineering_control',l:'Engineering Control Added'},{v:'job_hazard_analysis',l:'Job Hazard Analysis Completed'}];
const FRAUD=[{v:'delayed_report',l:'Delayed Reporting'},{v:'monday_claim',l:'Monday Morning Claim'},{v:'friday_injury',l:'Friday Afternoon Injury'},{v:'no_witnesses',l:'No Witnesses'},{v:'conflicting_witness',l:'Conflicting Witness Accounts'},{v:'vague_description',l:'Vague/Changing Description'},{v:'inconsistent_story',l:'Inconsistent Story Over Time'},{v:'recent_discipline',l:'Recent Disciplinary Action'},{v:'pending_layoff',l:'Facing Layoff/Termination'},{v:'job_change',l:'Recent Job Change/Demotion'},{v:'new_employee',l:'Very New Employee (<90 days)'},{v:'history_claims',l:'History of Prior Claims'},{v:'prior_similar',l:'Prior Similar Injuries'},{v:'financial_issues',l:'Known Financial Difficulties'},{v:'second_job',l:'Works Second Job'},{v:'refuses_medical',l:'Refused Then Sought Treatment'},{v:'doctor_shops',l:'Changed Physicians Multiple Times'},{v:'excessive_treatment',l:'Excessive Treatment Requests'},{v:'missed_appointments',l:'Missed Medical Appointments'},{v:'restrictions_disputed',l:'Disputes Work Restrictions'},{v:'surveillance_potential',l:'Surveillance Recommended'},{v:'social_media',l:'Social Media Activity Contradicts'},{v:'attorney_immediate',l:'Attorney Retained Immediately'},{v:'settlement_demands',l:'Demanding Quick Settlement'},{v:'uncooperative',l:'Uncooperative with Investigation'},{v:'family_unaware',l:'Family Unaware of Injury'},{v:'no_impact',l:'No Visible Impact/Injury'},{v:'preexisting',l:'Possible Pre-existing Condition'},{v:'off_premises',l:'May Have Occurred Off Premises'},{v:'personal_issues',l:'Known Personal/Domestic Issues'},{v:'substance_abuse',l:'History of Substance Abuse'},{v:'malingering',l:'Signs of Malingering'}];
const FRAUD_CATEGORIES=[{v:'timing',l:'⏰ Timing Red Flags'},{v:'credibility',l:'🔍 Credibility Issues'},{v:'employment',l:'💼 Employment Factors'},{v:'medical',l:'🏥 Medical Red Flags'},{v:'behavioral',l:'⚠️ Behavioral Concerns'},{v:'investigation',l:'🔎 Needs Investigation'}];
const TIPS={slip_trip_fall:['Floor conditions?','Lighting?','Footwear?','Photo location','Third-party owner?'],struck_by:['What object?','PPE worn?','Secured?'],strain_sprain:['Lifting action?','Technique?','Trained?'],vehicle:['Police report','All parties','Insurance info','Subrogation!'],assault:['Patient violence?','De-escalation?','Prior incidents?']};
const STATES=['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function App(){
const[step,setStep]=S(0);
const[submitting,setSubmitting]=S(false);
const[result,setResult]=S(null);
const[showPreview,setShowPreview]=S(false);
const[validationErrors,setValidationErrors]=S([]);
const initData={firstName:'',lastName:'',mailingAddress:'',city:'',state:'',zipCode:'',phone:'',dateOfBirth:'',dateOfHire:'',ssn:'',occupation:'',entity:'',customEntity:'',dateOfInjury:'',timeOfInjury:'',dateReported:'',reportedImmediately:null,weeklyWage:'',employeeWorkType:'',accidentDescription:'',jobDuties:'',injuryType:'',natureOfInjury:'',bodyParts:[],customBodyPart:'',causeOfInjury:'',accidentStreet:'',accidentCity:'',accidentState:'',accidentZip:'',medicalTreatment:'',soughtMedicalTreatment:null,initialFacilityName:'',initialTreatmentDate:'',refusedTreatment:null,needsReferral:null,referralType:'',referralFacility:'',referralNotes:'',additionalTreatmentNeeded:null,followUpTreatmentType:'',followUpFacility:'',severeInjury:null,employeeRequestsHospital:null,witness1Name:'',witness1Phone:'',witness2Name:'',witness2Phone:'',hasVideo:null,videoLocation:'',hasWitnessStatement:null,hasEmployeeStatement:null,hasSupervisorStatement:null,supervisorComments:'',hasScenePhotos:null,hasInjuryPhotos:null,losingTime:null,dateLastWorked:'',lastDayPaid:'',stillBeingPaid:null,returnStatus:'',lightDutyAvailable:null,directCause:'',rootCauseCategory:'',rootCauseSymptoms:[],customRootCause:'',correctiveActions:[],customCorrectiveAction:'',proceduresInPlace:null,proceduresFollowed:null,validityConcerns:null,concernDetails:'',fraudIndicators:[],customRedFlag:'',investigationNotes:'',recommendDeny:null,recommendSIU:null,thirdPartyInvolved:null,thirdPartyDetails:'',submitterName:'',submitterPhone:'',submitterEmail:'',additionalComments:''};
const loadSaved=()=>{try{const saved=localStorage.getItem('wcr_draft');if(saved){const parsed=JSON.parse(saved);if(parsed.savedAt&&Date.now()-parsed.savedAt<86400000)return parsed.data}}catch(e){}return initData};
const[d,setD]=S(loadSaved);
const[uploadedFiles,setUploadedFiles]=S([]);
const[score,setScore]=S(0);
const[lastSaved,setLastSaved]=S(null);

E(()=>{const req=['firstName','lastName','entity','dateOfInjury','accidentDescription','injuryType','submitterName','submitterEmail'];const bon=['jobDuties','witness1Name','hasVideo','directCause','rootCauseSymptoms','correctiveActions','dateOfHire','occupation'];let s=0;req.forEach(f=>{if(d[f]&&(Array.isArray(d[f])?d[f].length>0:true))s+=8});bon.forEach(f=>{if(d[f]&&(Array.isArray(d[f])?d[f].length>0:d[f]!==null))s+=4.5});setScore(Math.min(100,Math.round(s)))},[d]);

E(()=>{const hasData=Object.values(d).some(v=>v&&(Array.isArray(v)?v.length>0:v!==''));if(hasData){try{localStorage.setItem('wcr_draft',JSON.stringify({data:d,savedAt:Date.now()}));setLastSaved(new Date().toLocaleTimeString())}catch(e){}}},[d]);

const clearDraft=()=>{localStorage.removeItem('wcr_draft');setD(initData);setStep(0);setLastSaved(null)};

const isValidEmail=(email)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const calcDaysToReport=()=>{if(!d.dateOfInjury||!d.dateReported)return null;const doi=new Date(d.dateOfInjury);const dor=new Date(d.dateReported);const diff=Math.floor((dor-doi)/(1000*60*60*24));return diff};

const getDateWarnings=()=>{const warnings=[];const today=new Date();today.setHours(23,59,59,999);if(d.dateOfInjury){const doi=new Date(d.dateOfInjury);if(doi>today)warnings.push('Date of Injury is in the future')}if(d.dateReported){const dor=new Date(d.dateReported);if(dor>today)warnings.push('Date Reported is in the future')}if(d.dateOfInjury&&d.dateReported){const doi=new Date(d.dateOfInjury);const dor=new Date(d.dateReported);if(dor<doi)warnings.push('Date Reported is before Date of Injury')}return warnings};

const validateForm=()=>{const errs=[];if(!d.firstName)errs.push('Employee First Name');if(!d.lastName)errs.push('Employee Last Name');if(!d.entity&&!d.customEntity)errs.push('Entity');if(!d.dateOfInjury)errs.push('Date of Injury');if(!d.accidentDescription)errs.push('Incident Description');if(!d.injuryType)errs.push('Injury Type');if(!d.submitterName)errs.push('Your Name');if(!d.submitterEmail)errs.push('Your Email');else if(!isValidEmail(d.submitterEmail))errs.push('Valid Email Format (example@domain.com)');const dateWarns=getDateWarnings();dateWarns.forEach(w=>errs.push(w));return errs};

const u=(f,v)=>setD(p=>({...p,[f]:v}));
const ta=(f,v)=>setD(p=>{const a=p[f]||[];return{...p,[f]:a.includes(v)?a.filter(x=>x!==v):[...a,v]}});

const steps=[{t:'Employee',i:'👤'},{t:'Claim',i:'📋'},{t:'Incident',i:'⚡'},{t:'Medical',i:'🏥'},{t:'Evidence',i:'👁️'},{t:'Work Status',i:'💼'},{t:'Root Cause',i:'🔍'},{t:'Flags',i:'🚩'},{t:'Submit',i:'✅'}];

const daysToReport=calcDaysToReport();

const handleSubmit=()=>{const errs=validateForm();if(errs.length>0){setValidationErrors(errs);return}setValidationErrors([]);submit()};

const submit=async()=>{setSubmitting(true);try{const fd=new FormData();fd.append('formData',JSON.stringify(d));if(uploadedFiles&&uploadedFiles.length>0){uploadedFiles.forEach(f=>fd.append('files',f))}const r=await fetch('/api/submit-claim',{method:'POST',body:fd});const j=await r.json();if(j.success){localStorage.removeItem('wcr_draft');setResult(j)}else alert('Error: '+(j.error||'Unknown error'))}catch(err){console.error('Submit error:',err);alert('Error submitting: '+err.message)}setSubmitting(false)};

if(result)return e('div',{className:'claim-intake-portal'},e('header',{className:'portal-header'},e('div',{className:'header-content'},e('div',{className:'brand'},e('div',{className:'brand-logo',dangerouslySetInnerHTML:{__html:'<svg viewBox="0 0 40 44" fill="white"><path d="M20 0L0 10v14c0 11 8.5 18.5 20 20 11.5-1.5 20-9 20-20V10L20 0zm0 4l16 8v12c0 8.8-6.8 14.8-16 16-9.2-1.2-16-7.2-16-16V12l16-8z"/><path d="M12 18c-1.5 0-3 1.5-3 3.5s1.5 3.5 3 3.5c1 0 2-.5 2.5-1.5.5 1 1.5 1.5 2.5 1.5h6c1 0 2-.5 2.5-1.5.5 1 1.5 1.5 2.5 1.5 1.5 0 3-1.5 3-3.5s-1.5-3.5-3-3.5c-1.5 0-2.5 1-3 2-.5-1-1.5-2-3-2h-4c-1.5 0-2.5 1-3 2-.5-1-1.5-2-3-2z"/><path d="M20 28l-4 4 4 4 4-4-4-4z"/></svg>'}}),e('div',{className:'brand-text'},e('h1',null,'TITANIUM'),e('p',null,'DEFENSE GROUP'))))),e('div',{className:'success-container'},e('div',{className:'success-icon'},'✓'),e('h2',{style:{color:'var(--titanium-success)',marginBottom:16}},'Claim Submitted!'),e('p',{style:{color:'var(--titanium-muted)'}},'Reference Number:'),e('div',{className:'ref-number'},result.referenceNumber),e('p',{style:{color:'var(--titanium-light)',margin:'24px 0'}},'Confirmation sent to '+d.submitterEmail),e('button',{className:'nav-btn primary',onClick:()=>location.reload()},'Submit Another')));

const inp=(f,p,t='text')=>e('input',{type:t,className:'input-field',value:d[f],onChange:x=>u(f,x.target.value),placeholder:p});
const sel=(f,opts,p)=>e('select',{className:'input-field',value:d[f],onChange:x=>u(f,x.target.value)},e('option',{value:''},p),...opts.map(o=>e('option',{key:o,value:o},o)));
const tog=(f,opts)=>e('div',{className:'toggle-group'},...opts.map(o=>e('button',{key:o.v,className:'toggle-btn'+(d[f]===o.v?' active'+(o.c?' '+o.c:''):''),onClick:()=>u(f,o.v)},o.l)));

const renderStep=()=>{
if(step===0)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Employee Information')),e('div',{className:'form-grid'},e('div',{className:'form-group'},e('label',null,'First Name ',e('span',{className:'required'},'*')),inp('firstName','First name')),e('div',{className:'form-group'},e('label',null,'Last Name ',e('span',{className:'required'},'*')),inp('lastName','Last name')),e('div',{className:'form-group full-width'},e('label',null,'Address'),inp('mailingAddress','Street')),e('div',{className:'form-group'},e('label',null,'City'),inp('city','City')),e('div',{className:'form-group'},e('label',null,'State'),sel('state',STATES,'State')),e('div',{className:'form-group'},e('label',null,'Zip'),inp('zipCode','Zip')),e('div',{className:'form-group'},e('label',null,'Phone'),inp('phone','Phone','tel')),e('div',{className:'form-group'},e('label',null,'DOB'),inp('dateOfBirth','','date')),e('div',{className:'form-group'},e('label',null,'Date of Hire'),inp('dateOfHire','','date')),e('div',{className:'form-group'},e('label',null,'SSN'),inp('ssn','XXX-XX-XXXX')),e('div',{className:'form-group'},e('label',null,'Occupation ',e('span',{className:'required'},'*')),inp('occupation','Job title'))));
if(step===1){const dateWarns=getDateWarnings();return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Claim Information')),e('div',{className:'form-group full-width'},e('label',null,'Entity ',e('span',{className:'required'},'*')),sel('entity',[...ENTITIES,'Other - Enter Manually'],'Select Entity'),d.entity==='Other - Enter Manually'?e('div',{style:{marginTop:8}},e('input',{type:'text',className:'input-field',value:d.customEntity,onChange:x=>u('customEntity',x.target.value),placeholder:'Enter entity/company name'})):null),e('div',{className:'form-grid',style:{marginTop:16}},e('div',{className:'form-group'},e('label',null,'Date of Injury ',e('span',{className:'required'},'*')),inp('dateOfInjury','','date')),e('div',{className:'form-group'},e('label',null,'Time'),inp('timeOfInjury','','time')),e('div',{className:'form-group'},e('label',null,'Date Reported'),inp('dateReported','','date')),e('div',{className:'form-group'},e('label',null,'Reported Immediately?'),tog('reportedImmediately',[{v:true,l:'Yes'},{v:false,l:'No',c:'warning'}])),e('div',{className:'form-group'},e('label',null,'Weekly Wage'),inp('weeklyWage','$0.00','number')),e('div',{className:'form-group'},e('label',null,'Work Type'),sel('employeeWorkType',['Full Time','Part Time','Per Diem'],'Select'))),dateWarns.length>0?e('div',{style:{marginTop:16,padding:12,background:'rgba(248,113,113,0.1)',borderRadius:8,border:'1px solid rgba(248,113,113,0.3)'}},e('p',{style:{fontSize:12,color:'var(--titanium-danger)',fontWeight:600}},'⚠️ Date Warning:'),e('ul',{style:{marginLeft:16,marginTop:4,fontSize:12,color:'var(--titanium-danger)'}},...dateWarns.map((w,i)=>e('li',{key:i},w)))):null,daysToReport!==null&&daysToReport>=0?e('div',{style:{marginTop:16,padding:12,background:daysToReport>3?'rgba(248,113,113,0.1)':daysToReport>0?'rgba(251,191,36,0.1)':'rgba(52,211,153,0.1)',borderRadius:8,border:daysToReport>3?'1px solid rgba(248,113,113,0.3)':daysToReport>0?'1px solid rgba(251,191,36,0.3)':'1px solid rgba(52,211,153,0.3)'}},e('p',{style:{fontSize:13,fontWeight:600,color:daysToReport>3?'var(--titanium-danger)':daysToReport>0?'var(--titanium-warning)':'var(--titanium-success)'}},daysToReport===0?'✓ Reported same day as injury':daysToReport===1?'⏱️ Reported 1 day after injury':'⏱️ Reported '+daysToReport+' days after injury'),daysToReport>3?e('p',{style:{fontSize:11,color:'var(--titanium-muted)',marginTop:4}},'Delayed reporting is a potential red flag'):null):null)}
if(step===2)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'What Happened?'),e('p',{className:'section-subtitle'},'Details matter. ',e('span',{className:'highlight'},"Don't hold back."))),e('div',{className:'form-group full-width'},e('label',null,'Description ',e('span',{className:'required'},'*')),e('textarea',{className:'input-field',rows:4,value:d.accidentDescription,onChange:x=>u('accidentDescription',x.target.value),placeholder:'Who, what, when, where, how...'})),e('div',{className:'form-group full-width',style:{marginTop:16}},e('label',null,'Injury Type ',e('span',{className:'required'},'*')),e('div',{className:'injury-type-grid'},...INJURY_TYPES.map(t=>e('button',{key:t.value,className:'injury-type-btn'+(d.injuryType===t.value?' active':''),onClick:()=>u('injuryType',t.value)},e('span',{className:'injury-icon'},t.icon),e('span',{className:'injury-label'},t.label))))),d.injuryType&&TIPS[d.injuryType]?e('div',{className:'smart-tips-panel'},e('h4',null,'🎯 Investigation Tips'),e('ul',null,...TIPS[d.injuryType].map((t,i)=>e('li',{key:i},t)))):null,e('div',{className:'form-grid',style:{marginTop:16}},e('div',{className:'form-group'},e('label',null,'Nature of Injury'),inp('natureOfInjury','Strain, Sprain...')),e('div',{className:'form-group'},e('label',null,'Cause'),inp('causeOfInjury','Lifting, Fall...'))),e('div',{className:'form-group full-width',style:{marginTop:16}},e('label',null,'Body Parts'),e('div',{className:'body-parts-grid'},...BODY_PARTS.map(p=>e('button',{key:p,className:'chip-btn'+(d.bodyParts.includes(p)?' active':''),onClick:()=>ta('bodyParts',p)},p))),e('div',{style:{marginTop:12}},e('label',{style:{fontSize:12,color:'var(--titanium-muted)',marginBottom:4,display:'block'}},'Other body part not listed? Enter below:'),e('input',{type:'text',className:'input-field',value:d.customBodyPart,onChange:x=>u('customBodyPart',x.target.value),placeholder:'e.g., Left index finger, Right great toe, etc.'}))));
if(step===3)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Medical Treatment')),e('div',{className:'form-group'},e('label',null,'Has the employee already received medical treatment?'),tog('soughtMedicalTreatment',[{v:true,l:'Yes'},{v:false,l:'No'}])),d.soughtMedicalTreatment===true?e('div',{style:{marginTop:16,padding:16,background:'rgba(35,134,54,0.1)',borderRadius:8,border:'1px solid rgba(35,134,54,0.3)'}},e('h4',{style:{color:'var(--titanium-success)',marginBottom:12,fontSize:13}},'✓ Initial Treatment Received'),e('div',{className:'form-grid'},e('div',{className:'form-group full-width'},e('label',null,'Facility Name'),inp('initialFacilityName','Hospital/Clinic name')),e('div',{className:'form-group'},e('label',null,'Treatment Date'),inp('initialTreatmentDate','','date'))),e('div',{style:{marginTop:16,borderTop:'1px solid rgba(139,148,158,0.2)',paddingTop:16}},e('div',{className:'form-group'},e('label',null,'Is additional/follow-up treatment needed?'),tog('additionalTreatmentNeeded',[{v:true,l:'Yes'},{v:false,l:'No'}])),d.additionalTreatmentNeeded===true?e('div',{style:{marginTop:12}},e('div',{className:'form-group'},e('label',null,'Type of follow-up treatment'),sel('followUpTreatmentType',['Physical Therapy','Specialist Referral','MRI/Imaging','Surgery Consult','Follow-up Appointment','Other'],'Select type')),e('div',{className:'form-group',style:{marginTop:12}},e('label',null,'Where is employee being referred?'),e('input',{type:'text',className:'input-field',value:d.followUpFacility,onChange:x=>u('followUpFacility',x.target.value),placeholder:'Facility name, doctor, or location...'}))):null)):null,d.soughtMedicalTreatment===false?e('div',{style:{marginTop:16}},e('div',{className:'form-group'},e('label',null,'Did the employee refuse treatment?'),tog('refusedTreatment',[{v:true,l:'Yes, Refused',c:'warning'},{v:false,l:'No'}])),d.refusedTreatment===true?e('div',{className:'info-tip',style:{background:'rgba(210,153,34,0.1)',border:'1px solid rgba(210,153,34,0.3)'}},'⚠️ Get signed treatment refusal form from employee'):null,d.refusedTreatment===false?e('div',{style:{marginTop:16,padding:16,background:'rgba(88,166,255,0.1)',borderRadius:8,border:'1px solid rgba(88,166,255,0.3)'}},e('h4',{style:{color:'var(--titanium-accent)',marginBottom:12,fontSize:13}},'🏥 Medical Referral Needed'),e('div',{className:'form-grid'},e('div',{className:'form-group'},e('label',null,'Is this a severe injury?'),tog('severeInjury',[{v:true,l:'Yes - Severe',c:'danger'},{v:false,l:'No'}])),e('div',{className:'form-group'},e('label',null,'Is employee requesting hospital?'),tog('employeeRequestsHospital',[{v:true,l:'Yes',c:'warning'},{v:false,l:'No'}]))),e('div',{style:{marginTop:16,padding:12,background:d.severeInjury===true||d.employeeRequestsHospital===true?'rgba(248,81,73,0.15)':'rgba(35,134,54,0.15)',borderRadius:6}},e('p',{style:{fontSize:13,fontWeight:'bold',color:d.severeInjury===true||d.employeeRequestsHospital===true?'var(--titanium-danger)':'var(--titanium-success)',marginBottom:8}},d.severeInjury===true||d.employeeRequestsHospital===true?'🏥 Hospital Referral Appropriate':'🏥 Refer to Urgent Care (Concentra Preferred)'),e('p',{style:{fontSize:12,color:'var(--titanium-muted)'}},d.severeInjury===true||d.employeeRequestsHospital===true?'Severe injury OR employee is requesting hospital - refer to nearest emergency room.':'Standard protocol: Refer employee to nearest Concentra or urgent care facility for evaluation.')),e('div',{className:'form-group',style:{marginTop:12}},e('label',null,'Referral Facility'),e('input',{type:'text',className:'input-field',value:d.referralFacility,onChange:x=>u('referralFacility',x.target.value),placeholder:d.severeInjury===true||d.employeeRequestsHospital===true?'Hospital name...':'Concentra or urgent care name...'})),e('div',{className:'form-group',style:{marginTop:12}},e('label',null,'Referral Notes'),e('input',{type:'text',className:'input-field',value:d.referralNotes,onChange:x=>u('referralNotes',x.target.value),placeholder:'Any additional referral details...'}))):null):null);
if(step===4)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Witnesses & Evidence')),e('div',{className:'form-group'},e('label',null,'Video Available?'),tog('hasVideo',[{v:true,l:'Yes',c:'success'},{v:false,l:'No'}]),d.hasVideo===true?e('div',{className:'info-tip'},'⚡ Preserve immediately! Systems auto-delete in 7-30 days.'):null),e('div',{className:'witness-card'},e('div',{className:'witness-header'},'Witness #1'),e('div',{className:'form-grid'},e('div',{className:'form-group'},inp('witness1Name','Name')),e('div',{className:'form-group'},inp('witness1Phone','Phone','tel')))),e('div',{className:'witness-card'},e('div',{className:'witness-header'},'Witness #2'),e('div',{className:'form-grid'},e('div',{className:'form-group'},inp('witness2Name','Name')),e('div',{className:'form-group'},inp('witness2Phone','Phone','tel')))),e('div',{style:{marginTop:20,borderTop:'1px solid rgba(139,148,158,0.2)',paddingTop:20}},e('h3',{style:{color:'var(--titanium-accent)',fontSize:14,marginBottom:16}},'📝 Statements & Documentation'),e('div',{className:'form-grid'},e('div',{className:'form-group'},e('label',null,'Witness Statement Obtained?'),tog('hasWitnessStatement',[{v:true,l:'Yes',c:'success'},{v:false,l:'No'},{v:'pending',l:'Pending'}])),e('div',{className:'form-group'},e('label',null,'Employee Statement Obtained?'),tog('hasEmployeeStatement',[{v:true,l:'Yes',c:'success'},{v:false,l:'No'},{v:'pending',l:'Pending'}])),e('div',{className:'form-group full-width'},e('label',null,'Supervisor Statement Obtained?'),tog('hasSupervisorStatement',[{v:true,l:'Yes',c:'success'},{v:false,l:'No'},{v:'pending',l:'Pending'}])),d.hasSupervisorStatement===true||d.hasSupervisorStatement==='pending'?e('div',{className:'form-group full-width'},e('label',{style:{fontSize:12,color:'var(--titanium-muted)'}},'Supervisor feedback on employee (performance, outside activities, previous injuries):'),e('textarea',{className:'input-field',rows:3,value:d.supervisorComments,onChange:x=>u('supervisorComments',x.target.value),placeholder:'Is this a good or problematic employee? Any known outside activities that could cause injury? History of prior injuries or complaints?'})):null),e('div',{style:{marginTop:16}},e('h4',{style:{color:'var(--titanium-muted)',fontSize:12,marginBottom:12}},'📷 Photos'),e('div',{className:'form-grid'},e('div',{className:'form-group'},e('label',null,'Photos of Scene?'),tog('hasScenePhotos',[{v:true,l:'Yes',c:'success'},{v:false,l:'No'},{v:'pending',l:'Will Obtain'}])),e('div',{className:'form-group'},e('label',null,'Photos of Injury?'),tog('hasInjuryPhotos',[{v:true,l:'Yes',c:'success'},{v:false,l:'No'},{v:'pending',l:'Will Obtain'}])))),e('div',{className:'info-tip',style:{marginTop:16}},'📤 You can upload documents on the final page or email them to the Titanium Defense team after submission.')));
if(step===5)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Work Status')),e('div',{className:'form-grid'},e('div',{className:'form-group'},e('label',null,'Losing Time?'),tog('losingTime',[{v:true,l:'Yes',c:'warning'},{v:false,l:'No',c:'success'}])),e('div',{className:'form-group'},e('label',null,'Date Last Worked'),inp('dateLastWorked','','date')),e('div',{className:'form-group'},e('label',null,'Last Day Paid'),inp('lastDayPaid','','date')),e('div',{className:'form-group'},e('label',null,'Still Being Paid?'),tog('stillBeingPaid',[{v:true,l:'Yes',c:'success'},{v:false,l:'No',c:'warning'}])),e('div',{className:'form-group'},e('label',null,'Return Status'),sel('returnStatus',['Has not returned','Full Duty','Light Duty'],'Select')),e('div',{className:'form-group'},e('label',null,'Light Duty Available?'),tog('lightDutyAvailable',[{v:true,l:'Yes',c:'success'},{v:false,l:'No',c:'warning'}]))));
if(step===6)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Root Cause Analysis'),e('p',{className:'section-subtitle'},'Ask "why" until you find the root. Select all that apply.')),e('div',{className:'form-group full-width'},e('label',null,'What directly caused the injury?'),e('textarea',{className:'input-field',rows:2,value:d.directCause,onChange:x=>u('directCause',x.target.value),placeholder:'Describe the immediate/direct cause of the injury...'})),e('div',{className:'form-group full-width',style:{marginTop:20}},e('label',null,'Root Cause Category'),e('p',{style:{fontSize:12,color:'var(--titanium-muted)',marginBottom:8}},'What underlying factors contributed to this incident?'),e('div',{className:'root-cause-grid'},...ROOT_CAUSE_CATEGORIES.map(c=>e('button',{key:c.v,className:'chip-btn'+(d.rootCauseCategory===c.v?' active':''),onClick:()=>u('rootCauseCategory',c.v)},c.l)))),e('div',{className:'form-group full-width',style:{marginTop:16}},e('label',null,'Specific Root Causes ',e('span',{style:{fontSize:11,color:'var(--titanium-muted)'}},'(select all that apply)')),e('div',{className:'root-cause-grid',style:{maxHeight:200,overflowY:'auto'}},...ROOT_CAUSES.map(c=>e('button',{key:c.v,className:'chip-btn'+(d.rootCauseSymptoms.includes(c.v)?' active warning':''),onClick:()=>ta('rootCauseSymptoms',c.v)},c.l))),e('div',{style:{marginTop:12}},e('label',{style:{fontSize:12,color:'var(--titanium-muted)',marginBottom:4,display:'block'}},'Other root cause not listed:'),e('input',{type:'text',className:'input-field',value:d.customRootCause,onChange:x=>u('customRootCause',x.target.value),placeholder:'Enter custom root cause...'}))),e('div',{style:{marginTop:24,borderTop:'1px solid rgba(139,148,158,0.2)',paddingTop:20}},e('div',{className:'section-header',style:{marginBottom:16}},e('h3',{style:{fontSize:16,color:'var(--titanium-accent)'}},'Corrective Actions'),e('p',{style:{fontSize:12,color:'var(--titanium-muted)'}},'What actions have been or will be taken to prevent recurrence?')),e('div',{className:'form-group full-width'},e('div',{className:'corrective-grid',style:{maxHeight:200,overflowY:'auto'}},...CORRECTIVE.map(c=>e('button',{key:c.v,className:'chip-btn'+(d.correctiveActions.includes(c.v)?' active success':''),onClick:()=>ta('correctiveActions',c.v)},c.l))),e('div',{style:{marginTop:12}},e('label',{style:{fontSize:12,color:'var(--titanium-muted)',marginBottom:4,display:'block'}},'Other corrective action not listed:'),e('input',{type:'text',className:'input-field',value:d.customCorrectiveAction,onChange:x=>u('customCorrectiveAction',x.target.value),placeholder:'Enter custom corrective action...'})))));
if(step===7)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Investigation Flags'),e('p',{className:'section-subtitle'},'Identify red flags for further investigation.')),e('div',{className:'disclaimer-box'},'⚠️ These are red flags for closer review, not accusations. Select all that apply.'),e('div',{className:'form-group'},e('label',null,'Do you have validity concerns about this claim?'),tog('validityConcerns',[{v:true,l:'Yes',c:'warning'},{v:false,l:'No'}])),d.validityConcerns===true?e('div',{className:'form-group full-width',style:{marginTop:12}},e('textarea',{className:'input-field',rows:2,value:d.concernDetails,onChange:x=>u('concernDetails',x.target.value),placeholder:'Explain your concerns in detail...'})):null,e('div',{className:'form-group full-width',style:{marginTop:20}},e('label',null,'Red Flag Indicators ',e('span',{style:{fontSize:11,color:'var(--titanium-muted)'}},'(select all that apply)')),e('div',{className:'fraud-grid',style:{maxHeight:250,overflowY:'auto'}},...FRAUD.map(f=>e('button',{key:f.v,className:'chip-btn'+(d.fraudIndicators.includes(f.v)?' active danger':''),onClick:()=>ta('fraudIndicators',f.v)},f.l))),e('div',{style:{marginTop:12}},e('label',{style:{fontSize:12,color:'var(--titanium-muted)',marginBottom:4,display:'block'}},'Other red flag not listed:'),e('input',{type:'text',className:'input-field',value:d.customRedFlag,onChange:x=>u('customRedFlag',x.target.value),placeholder:'Enter other red flag...'}))),e('div',{className:'form-group full-width',style:{marginTop:16}},e('label',null,'Investigation Notes'),e('textarea',{className:'input-field',rows:3,value:d.investigationNotes,onChange:x=>u('investigationNotes',x.target.value),placeholder:'What needs to be investigated further? Any specific concerns or follow-up items?'})),e('div',{style:{marginTop:20,padding:16,background:'rgba(248,81,73,0.1)',borderRadius:8,border:'1px solid rgba(248,81,73,0.3)'}},e('h4',{style:{color:'var(--titanium-danger)',marginBottom:12,fontSize:14}},'🚨 Recommendations'),e('div',{className:'form-grid'},e('div',{className:'form-group'},e('label',null,'Recommend Denial?'),tog('recommendDeny',[{v:true,l:'Yes',c:'danger'},{v:false,l:'No'}])),e('div',{className:'form-group'},e('label',null,'Refer to SIU?'),tog('recommendSIU',[{v:true,l:'Yes',c:'warning'},{v:false,l:'No'}])))),e('div',{style:{marginTop:20,borderTop:'1px solid rgba(139,148,158,0.2)',paddingTop:20}},e('div',{className:'form-group'},e('label',null,'Third Party Involved? (Subrogation)'),tog('thirdPartyInvolved',[{v:true,l:'Yes',c:'success'},{v:false,l:'No'},{v:'maybe',l:'Maybe'}]),(d.thirdPartyInvolved===true||d.thirdPartyInvolved==='maybe')?e('div',null,e('div',{className:'info-tip',style:{marginTop:8}},'💰 Subrogation potential! Preserve evidence.'),e('div',{className:'form-group',style:{marginTop:12}},e('input',{type:'text',className:'input-field',value:d.thirdPartyDetails,onChange:x=>u('thirdPartyDetails',x.target.value),placeholder:'Third party details (name, company, contact info)...'}))):null)));
if(step===8)return e('div',{className:'step-content'},e('div',{className:'section-header'},e('h2',null,'Submit Claim'),lastSaved?e('p',{style:{fontSize:11,color:'var(--titanium-success)'}},'✓ Draft auto-saved at '+lastSaved):null),e('div',{className:'info-tip',style:{marginBottom:20,background:'rgba(91,164,230,0.1)',border:'1px solid rgba(91,164,230,0.3)'}},'⏰ Claims should be submitted within 24 hours of the incident. You can still submit without all documents and gather them after.'),validationErrors.length>0?e('div',{style:{marginBottom:20,padding:16,background:'rgba(248,113,113,0.1)',borderRadius:10,border:'1px solid rgba(248,113,113,0.3)'}},e('h4',{style:{color:'var(--titanium-danger)',marginBottom:8,fontSize:14}},'⚠️ Required Fields Missing'),e('ul',{style:{marginLeft:20,fontSize:13,color:'var(--titanium-danger)'}},...validationErrors.map((err,i)=>e('li',{key:i},err)))):null,e('div',{style:{textAlign:'center',margin:'20px 0'}},e('div',{style:{display:'inline-block',width:80,height:80,borderRadius:'50%',background:'conic-gradient(var(--titanium-success) '+score+'%, rgba(139,148,158,0.2) '+score+'%)',position:'relative'}},e('div',{style:{position:'absolute',top:8,left:8,width:64,height:64,background:'var(--titanium-dark)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}},e('span',{style:{fontSize:24,fontWeight:'bold',color:'var(--titanium-success)'}},score+'%'))),e('div',{style:{color:'var(--titanium-muted)',marginTop:8,fontSize:13}},score>=80?'Excellent!':score>=60?'Good':'Add More')),e('div',{style:{display:'flex',gap:12,justifyContent:'center',marginBottom:20}},e('button',{className:'nav-btn secondary',onClick:()=>setShowPreview(!showPreview),style:{padding:'10px 20px'}},showPreview?'Hide Preview':'📋 Preview Summary'),e('button',{onClick:clearDraft,style:{padding:'10px 20px',background:'transparent',border:'1px solid rgba(248,113,113,0.3)',color:'var(--titanium-danger)',borderRadius:10,cursor:'pointer',fontSize:13}},'🗑️ Clear Draft')),showPreview?e('div',{style:{background:'rgba(30,42,56,0.8)',borderRadius:12,padding:20,marginBottom:20,border:'1px solid var(--glass-border)'}},e('h3',{style:{color:'var(--titanium-accent)',marginBottom:16,fontSize:16}},'Claim Summary Preview'),e('div',{className:'summary-grid'},e('div',{className:'summary-section'},e('h4',null,'Employee'),e('p',null,(d.firstName||'—')+' '+(d.lastName||'')),e('p',null,d.occupation||'—'),e('p',null,d.phone||'—')),e('div',{className:'summary-section'},e('h4',null,'Claim Details'),e('p',null,d.entity==='Other - Enter Manually'?d.customEntity||'—':d.entity||'—'),e('p',null,'DOI: '+(d.dateOfInjury||'—')),e('p',null,'Reported: '+(d.dateReported||'—'))),e('div',{className:'summary-section'},e('h4',null,'Incident'),e('p',null,'Type: '+(d.injuryType||'—')),e('p',null,'Body Parts: '+((d.bodyParts||[]).join(', ')||(d.customBodyPart||'—'))),e('p',null,'Nature: '+(d.natureOfInjury||'—'))),e('div',{className:'summary-section'},e('h4',null,'Work Status'),e('p',null,'Losing Time: '+(d.losingTime===true?'Yes':d.losingTime===false?'No':'—')),e('p',null,'Last Worked: '+(d.dateLastWorked||'—')),e('p',null,'Light Duty: '+(d.lightDutyAvailable===true?'Available':'—')))),d.accidentDescription?e('div',{style:{marginTop:16}},e('h4',{style:{color:'var(--titanium-accent)',fontSize:12,marginBottom:8}},'DESCRIPTION'),e('p',{style:{fontSize:13,color:'var(--titanium-text)',lineHeight:1.5}},d.accidentDescription)):null,(d.fraudIndicators&&d.fraudIndicators.length>0)||d.validityConcerns?e('div',{style:{marginTop:16,padding:12,background:'rgba(248,113,113,0.1)',borderRadius:8}},e('h4',{style:{color:'var(--titanium-danger)',fontSize:12,marginBottom:8}},'⚠️ FLAGS'),e('p',{style:{fontSize:12,color:'var(--titanium-danger)'}},d.fraudIndicators.length+' red flag(s) identified')):null):e('div',{className:'summary-grid'},e('div',{className:'summary-section'},e('h4',null,'Employee'),e('p',null,d.firstName+' '+d.lastName),e('p',null,d.occupation||'—')),e('div',{className:'summary-section'},e('h4',null,'Claim'),e('p',null,d.entity==='Other - Enter Manually'?d.customEntity||'—':d.entity||'—'),e('p',null,d.dateOfInjury||'—'))),e('div',{style:{marginTop:24,padding:16,background:'rgba(30,42,56,0.6)',borderRadius:10,border:'1px solid var(--glass-border)'}},e('h3',{style:{color:'var(--titanium-accent)',fontSize:14,marginBottom:12}},'📎 Upload Documents'),e('p',{style:{fontSize:12,color:'var(--titanium-muted)',marginBottom:12}},'Upload any available evidence: photos, statements, medical reports, etc.'),e('input',{type:'file',multiple:true,accept:'image/*,.pdf,.doc,.docx',onChange:x=>setUploadedFiles(Array.from(x.target.files)),style:{display:'none'},id:'file-upload'}),e('label',{htmlFor:'file-upload',className:'nav-btn secondary',style:{display:'inline-block',cursor:'pointer',marginBottom:12}},'Choose Files'),uploadedFiles.length>0?e('div',{style:{marginTop:8}},e('p',{style:{fontSize:12,color:'var(--titanium-success)',marginBottom:8}},uploadedFiles.length+' file(s) selected:'),e('ul',{style:{fontSize:11,color:'var(--titanium-muted)',marginLeft:16}},...uploadedFiles.map((f,i)=>e('li',{key:i},f.name)))):null,e('p',{style:{fontSize:11,color:'var(--titanium-light)',marginTop:12}},"Don't have all documents? No problem - submit now and email additional items to the Titanium Defense team.")),e('div',{className:'form-grid',style:{marginTop:20}},e('div',{className:'form-group'},e('label',null,'Your Name ',e('span',{className:'required'},'*')),inp('submitterName','Your name')),e('div',{className:'form-group'},e('label',null,'Your Phone'),inp('submitterPhone','Phone','tel')),e('div',{className:'form-group full-width'},e('label',null,'Your Email ',e('span',{className:'required'},'*')),inp('submitterEmail','you@company.com','email')),e('div',{className:'form-group full-width'},e('label',null,'Additional Comments'),e('textarea',{className:'input-field',rows:2,value:d.additionalComments,onChange:x=>u('additionalComments',x.target.value),placeholder:'Any other information relevant to this claim...'}))),e('div',{className:'certification-box'},e('p',null,e('strong',null,'THE ABOVE REPORT IS TRUE AND CORRECT.'))));
};

return e('div',{className:'claim-intake-portal'},e('header',{className:'portal-header'},e('div',{className:'header-content'},e('div',{className:'brand'},e('div',{className:'brand-logo',dangerouslySetInnerHTML:{__html:'<svg viewBox="0 0 40 44" fill="white"><path d="M20 0L0 10v14c0 11 8.5 18.5 20 20 11.5-1.5 20-9 20-20V10L20 0zm0 4l16 8v12c0 8.8-6.8 14.8-16 16-9.2-1.2-16-7.2-16-16V12l16-8z"/><path d="M12 18c-1.5 0-3 1.5-3 3.5s1.5 3.5 3 3.5c1 0 2-.5 2.5-1.5.5 1 1.5 1.5 2.5 1.5h6c1 0 2-.5 2.5-1.5.5 1 1.5 1.5 2.5 1.5 1.5 0 3-1.5 3-3.5s-1.5-3.5-3-3.5c-1.5 0-2.5 1-3 2-.5-1-1.5-2-3-2h-4c-1.5 0-2.5 1-3 2-.5-1-1.5-2-3-2z"/><path d="M20 28l-4 4 4 4 4-4-4-4z"/></svg>'}}),e('div',{className:'brand-text'},e('h1',null,'TITANIUM'),e('p',null,'DEFENSE GROUP'))),e('div',{className:'completion-badge'},e('div',{className:'completion-bar'},e('div',{className:'completion-fill',style:{width:score+'%'}})),e('span',{className:'completion-text'},score+'%'),lastSaved?e('span',{style:{marginLeft:8,fontSize:10,color:'var(--titanium-success)'}},'✓ Saved'):null))),e('div',{className:'portal-body'},e('aside',{className:'steps-sidebar'},e('div',{className:'steps-list'},...steps.map((s,i)=>e('div',{key:i,className:'step-item'+(i===step?' active':''),onClick:()=>setStep(i)},e('div',{className:'step-icon'},s.i),e('span',{className:'step-title'},s.t))))),e('main',{className:'main-content'},renderStep(),e('div',{className:'nav-buttons'},e('button',{className:'nav-btn secondary',onClick:()=>setStep(Math.max(0,step-1)),disabled:step===0,style:{opacity:step===0?0.5:1}},'← Back'),step<8?e('button',{className:'nav-btn primary',onClick:()=>setStep(step+1)},'Continue →'):e('button',{className:'nav-btn primary submit',disabled:submitting,onClick:handleSubmit},submitting?'Submitting...':'Submit Claim')))));
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
</script>
</body>
</html>`;
}

module.exports = app;
