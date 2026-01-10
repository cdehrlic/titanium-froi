// ===========================================
// TITANIUM DEFENSE GROUP - FROI CLAIMS PORTAL
// Single-file full-stack application
// ===========================================

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===========================================
// CONFIGURATION - UPDATE THESE VALUES
// ===========================================

const CONFIG = {
  // Where claims are sent
  CLAIMS_EMAIL: 'Chad@Titaniumdg.com',
  
  // Your SMTP settings (Gmail example)
  SMTP: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'your-email@gmail.com',
      pass: process.env.SMTP_PASS || 'your-app-password'
    }
  },
  
  COMPANY: {
    name: 'Titanium Defense Group',
    email: 'claims@titaniumdg.com',
    phone: '(555) 123-4567'
  }
};

// ===========================================
// MIDDLEWARE
// ===========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 20 }
});

// ===========================================
// EMAIL SETUP
// ===========================================

const transporter = nodemailer.createTransport(CONFIG.SMTP);

// ===========================================
// PDF GENERATION
// ===========================================

function generateClaimPDF(formData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('TITANIUM DEFENSE GROUP', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text("Employer's First Report of Work-Related Injury/Illness", { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    const addSection = (title, fields) => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text(title);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#cbd5e1');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      fields.forEach(([label, value]) => {
        if (value && value !== 'undefined' && value !== 'null') {
          doc.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(String(value));
        }
      });
      doc.moveDown();
    };

    addSection('Employee Personal Information', [
      ['Name', `${formData.firstName} ${formData.lastName}`],
      ['Address', `${formData.mailingAddress}, ${formData.city}, ${formData.state} ${formData.zipCode}`],
      ['Phone', formData.phone],
      ['Date of Birth', formData.dateOfBirth],
      ['Date of Hire', formData.dateOfHire],
      ['Gender', formData.gender],
      ['SSN', formData.ssn ? `XXX-XX-${formData.ssn.slice(-4)}` : 'N/A'],
      ['Occupation', formData.occupation],
      ['Preferred Language', formData.preferredLanguage]
    ]);

    addSection('Injury Information', [
      ['Date of Injury', formData.dateOfInjury],
      ['Time of Injury', `${formData.timeOfInjury} ${formData.timeOfInjuryPeriod}`],
      ['Nature of Injury', formData.natureOfInjury],
      ['Body Part Injured', formData.bodyPartInjured],
      ['Cause of Injury', formData.causeOfInjury],
      ['Medical Treatment', formData.medicalTreatment],
      ['Treatment Facility', formData.facilityName],
      ['Resulted in Death', formData.resultedInDeath]
    ]);

    if (formData.accidentDescription) {
      doc.font('Helvetica-Bold').text('Accident Description:');
      doc.font('Helvetica').text(formData.accidentDescription);
      doc.moveDown();
    }

    addSection('Work Status', [
      ['Losing Time from Work', formData.losingTime],
      ['Date Last Worked', formData.dateLastWorked],
      ['Return Status', formData.returnStatus],
      ['Return Date', formData.returnDate]
    ]);

    addSection('Accident Location', [
      ['Facility Location', `${formData.facilityStreet || ''} ${formData.facilityCity || ''}, ${formData.facilityState || ''} ${formData.facilityZip || ''}`],
      ['Accident Location', `${formData.accidentStreet || ''} ${formData.accidentCity || ''}, ${formData.accidentState || ''} ${formData.accidentZip || ''}`]
    ]);

    addSection('Submitted By', [
      ['Name', formData.submitterName],
      ['Phone', formData.submitterPhone],
      ['Email', formData.submitterEmail]
    ]);

    if (formData.redFlags) {
      doc.moveDown();
      doc.font('Helvetica-Bold').fillColor('#dc2626').text('⚠️ Red Flags / Prior Injuries:');
      doc.font('Helvetica').fillColor('#334155').text(formData.redFlags);
    }

    doc.end();
  });
}

// ===========================================
// API ROUTES
// ===========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/submit-claim', upload.any(), async (req, res) => {
  try {
    const formData = JSON.parse(req.body.formData);
    const files = req.files || [];
    const referenceNumber = `FROI-${Date.now().toString().slice(-8)}`;

    console.log(`📋 Processing claim ${referenceNumber} for ${formData.firstName} ${formData.lastName}`);

    // Generate PDF
    const pdfBuffer = await generateClaimPDF(formData);

    // Prepare attachments
    const attachments = [{
      filename: `${referenceNumber}-Summary.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }];

    files.forEach(file => {
      attachments.push({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype
      });
    });

    // Send to Chad
    await transporter.sendMail({
      from: `"${CONFIG.COMPANY.name} Claims" <${CONFIG.SMTP.auth.user}>`,
      to: CONFIG.CLAIMS_EMAIL,
      subject: `🚨 New FROI Claim - ${formData.firstName} ${formData.lastName} - ${formData.dateOfInjury}`,
      html: `
        <h2>New Workers' Compensation Claim</h2>
        <p><strong>Reference:</strong> ${referenceNumber}</p>
        <p><strong>Employee:</strong> ${formData.firstName} ${formData.lastName}</p>
        <p><strong>Date of Injury:</strong> ${formData.dateOfInjury}</p>
        <p><strong>Nature of Injury:</strong> ${formData.natureOfInjury}</p>
        <p><strong>Body Part:</strong> ${formData.bodyPartInjured}</p>
        <p><strong>Submitted By:</strong> ${formData.submitterName} (${formData.submitterEmail})</p>
        ${formData.redFlags ? `<p style="color:red;"><strong>⚠️ Red Flags:</strong> ${formData.redFlags}</p>` : ''}
        <hr>
        <p>See attached PDF for complete details. ${files.length} additional document(s) attached.</p>
      `,
      attachments
    });

    // Send confirmation to submitter
    if (formData.submitterEmail) {
      await transporter.sendMail({
        from: `"${CONFIG.COMPANY.name}" <${CONFIG.SMTP.auth.user}>`,
        to: formData.submitterEmail,
        subject: `Claim Confirmation - ${referenceNumber}`,
        html: `
          <h2>Claim Submitted Successfully</h2>
          <p>Your FROI claim for <strong>${formData.firstName} ${formData.lastName}</strong> has been received.</p>
          <p><strong>Reference Number:</strong> ${referenceNumber}</p>
          <p>Our team will review and follow up if needed.</p>
          <p>Thank you,<br>${CONFIG.COMPANY.name}</p>
        `
      });
    }

    console.log(`✅ Claim ${referenceNumber} sent to ${CONFIG.CLAIMS_EMAIL}`);
    res.json({ success: true, referenceNumber });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================
// SERVE THE FRONTEND
// ===========================================

const HTML_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Titanium Defense Group - Workers' Comp Claims</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    .loading-spinner { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState } = React;

    function App() {
      const [currentStep, setCurrentStep] = useState(0);
      const [submitting, setSubmitting] = useState(false);
      const [submitted, setSubmitted] = useState(false);
      const [referenceNumber, setReferenceNumber] = useState('');
      const [formData, setFormData] = useState({
        firstName: '', lastName: '', mailingAddress: '', city: '', state: '', zipCode: '',
        phone: '', dateOfHire: '', dateOfBirth: '', gender: '', ssn: '', occupation: '', preferredLanguage: '',
        dateOfInjury: '', timeOfInjury: '', timeOfInjuryPeriod: 'AM', workStartTime: '', workStartPeriod: 'AM',
        dateReported: '', weeklyWage: '', daysPerWeek: '', workWeekType: '', workDays: [],
        employeeWorkType: '', isContractEmployee: '',
        paidInFull: '', stillBeingPaid: '', medicalTreatment: '', facilityName: '',
        resultedInDeath: '', natureOfInjury: '', bodyPartInjured: '', causeOfInjury: '', accidentDescription: '',
        losingTime: '', dateLastWorked: '', returnStatus: '', returnDate: '',
        facilityStreet: '', facilityCity: '', facilityState: '', facilityZip: '',
        accidentStreet: '', accidentCity: '', accidentState: '', accidentZip: '',
        witnesses: [{ name: '', phone: '' }, { name: '', phone: '' }, { name: '', phone: '' }],
        submitterName: '', submitterPhone: '', submitterEmail: '', additionalComments: '', redFlags: '',
        claimantStatement: [], witnessStatements: [], medicalRecords: [], photos: [], otherDocs: []
      });

      const steps = ['Employee Info', 'Claim Details', 'Injury Info', 'Work Status', 'Location', 'Submit'];
      const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

      const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
      
      const updateWitness = (index, field, value) => {
        const newWitnesses = [...formData.witnesses];
        newWitnesses[index][field] = value;
        setFormData(prev => ({ ...prev, witnesses: newWitnesses }));
      };

      const handleSubmit = async () => {
        setSubmitting(true);
        const submitData = new FormData();
        const formFields = { ...formData };
        ['claimantStatement', 'witnessStatements', 'medicalRecords', 'photos', 'otherDocs'].forEach(key => {
          if (formData[key]?.length > 0) {
            formData[key].forEach((file, i) => submitData.append(key + '_' + i, file));
          }
          delete formFields[key];
        });
        submitData.append('formData', JSON.stringify(formFields));

        try {
          const response = await fetch('/api/submit-claim', { method: 'POST', body: submitData });
          const result = await response.json();
          if (result.success) {
            setReferenceNumber(result.referenceNumber);
            setSubmitted(true);
          } else {
            alert('Error submitting claim. Please try again.');
          }
        } catch (error) {
          alert('Error submitting claim. Please try again.');
        }
        setSubmitting(false);
      };

      const Input = ({ label, field, type = 'text', required, className = '' }) => (
        <div className={className}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
          <input type={type} value={formData[field]} onChange={e => updateField(field, e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none" />
        </div>
      );

      const Select = ({ label, field, options, required, className = '' }) => (
        <div className={className}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
          <select value={formData[field]} onChange={e => updateField(field, e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none bg-white">
            <option value="">Select...</option>
            {options.map(opt => <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>)}
          </select>
        </div>
      );

      const Radio = ({ label, field, options }) => (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
          <div className="flex flex-wrap gap-4">
            {options.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name={field} value={opt.value} checked={formData[field] === opt.value}
                  onChange={e => updateField(field, e.target.value)} className="w-4 h-4" />
                <span className="text-sm text-slate-600">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      );

      const FileUpload = ({ label, field, icon }) => (
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 font-medium text-slate-700"><span>{icon}</span>{label}</label>
            <span className="text-xs text-slate-400">Optional</span>
          </div>
          {formData[field]?.length > 0 && (
            <div className="space-y-2 mb-3">
              {formData[field].map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                  <span className="text-sm text-slate-700">{file.name}</span>
                  <button type="button" onClick={() => updateField(field, formData[field].filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-slate-50">
            <span className="text-sm text-slate-600">Click to upload</span>
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
              onChange={e => { updateField(field, [...(formData[field] || []), ...Array.from(e.target.files)]); e.target.value = ''; }} />
          </label>
        </div>
      );

      if (submitted) {
        return (
          <div className="min-h-screen bg-slate-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Claim Submitted!</h2>
              <p className="text-slate-600 mb-4">Your claim for <strong>{formData.firstName} {formData.lastName}</strong> has been submitted.</p>
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-600"><strong>Reference #:</strong> {referenceNumber}</p>
                <p className="text-sm text-slate-600"><strong>Sent to:</strong> Chad@Titaniumdg.com</p>
              </div>
              <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800">
                Submit Another Claim
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-100">
          {/* Header */}
          <header className="bg-slate-700 text-white">
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 50 50" className="w-10 h-10" fill="white">
                  <path d="M25 5 L45 15 L45 25 L25 45 L5 25 L5 15 Z" fill="none" stroke="white" strokeWidth="2"/>
                  <path d="M15 20 L25 30 L35 20" fill="none" stroke="white" strokeWidth="2"/>
                  <path d="M20 17 L25 22 L30 17" fill="none" stroke="white" strokeWidth="1.5"/>
                </svg>
                <div>
                  <div className="font-bold tracking-wider">TITANIUM</div>
                  <div className="text-xs tracking-widest text-slate-300">DEFENSE GROUP</div>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="text-slate-300">Workers' Compensation</div>
                <div className="font-medium">First Report of Injury</div>
              </div>
            </div>
          </header>

          {/* Progress */}
          <div className="bg-white border-b shadow-sm">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                {steps.map((step, i) => (
                  <div key={step} className="flex items-center">
                    <div className={\`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium \${
                      i < currentStep ? 'bg-green-500 text-white' : i === currentStep ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-500'
                    }\`}>{i < currentStep ? '✓' : i + 1}</div>
                    <span className={\`ml-2 text-sm hidden sm:block \${i === currentStep ? 'font-medium text-slate-800' : 'text-slate-500'}\`}>{step}</span>
                    {i < steps.length - 1 && <div className={\`w-8 sm:w-12 h-0.5 mx-2 \${i < currentStep ? 'bg-green-500' : 'bg-slate-200'}\`} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
              
              {/* Step 0: Employee Info */}
              {currentStep === 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Employee Personal Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input label="First Name" field="firstName" required />
                    <Input label="Last Name" field="lastName" required />
                    <Input label="Mailing Address" field="mailingAddress" required className="md:col-span-2" />
                    <Input label="City" field="city" required />
                    <div className="grid grid-cols-2 gap-4">
                      <Select label="State" field="state" options={states} required />
                      <Input label="Zip Code" field="zipCode" required />
                    </div>
                    <Input label="Phone Number" field="phone" type="tel" required />
                    <Input label="Date of Hire" field="dateOfHire" type="date" required />
                    <Input label="Date of Birth" field="dateOfBirth" type="date" required />
                    <Radio label="Gender" field="gender" options={[{value:'male',label:'Male'},{value:'female',label:'Female'},{value:'unknown',label:'Unknown'}]} />
                    <Input label="Social Security Number" field="ssn" required />
                    <Input label="Occupation" field="occupation" required />
                    <Input label="Preferred Language" field="preferredLanguage" className="md:col-span-2" />
                  </div>
                </div>
              )}

              {/* Step 1: Claim Details */}
              {currentStep === 1 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Employee Claim Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Date of Injury" field="dateOfInjury" type="date" required />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Time of Injury</label>
                      <div className="flex gap-2">
                        <input type="time" value={formData.timeOfInjury} onChange={e => updateField('timeOfInjury', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg" />
                        <select value={formData.timeOfInjuryPeriod} onChange={e => updateField('timeOfInjuryPeriod', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                          <option>AM</option><option>PM</option>
                        </select>
                      </div>
                    </div>
                    <Input label="Date Reported" field="dateReported" type="date" required />
                    <Input label="Estimated Weekly Wage" field="weeklyWage" type="number" />
                    <Input label="Days Per Week" field="daysPerWeek" type="number" />
                    <Select label="Work Week Type" field="workWeekType" options={[{value:'standard',label:'Standard'},{value:'fixed',label:'Fixed'},{value:'varied',label:'Varied'}]} />
                    <Select label="Employee Work Type" field="employeeWorkType" options={[{value:'fulltime',label:'Full Time'},{value:'parttime',label:'Part Time'},{value:'perdiem',label:'Per Diem'}]} />
                    <Radio label="Contract/Agency Employee?" field="isContractEmployee" options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]} />
                  </div>
                </div>
              )}

              {/* Step 2: Injury Info */}
              {currentStep === 2 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Employee Injury</h3>
                  <div className="space-y-4">
                    <Radio label="Was employee paid in full on date of injury?" field="paidInFull" options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]} />
                    <Radio label="Is employee still being paid?" field="stillBeingPaid" options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]} />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Initial medical treatment?</label>
                      <div className="space-y-2">
                        {[{value:'none',label:'No medical treatment'},{value:'minor',label:'Minor on-site/clinic treatment'},{value:'hospital',label:'Hospitalization > 24 hours'}].map(opt => (
                          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="medicalTreatment" value={opt.value} checked={formData.medicalTreatment === opt.value}
                              onChange={e => updateField('medicalTreatment', e.target.value)} className="w-4 h-4" />
                            <span className="text-sm text-slate-600">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Input label="Treatment Facility Name" field="facilityName" />
                    <Radio label="Did injury result in death?" field="resultedInDeath" options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]} />
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input label="Nature of Injury" field="natureOfInjury" required />
                      <Input label="Body Part Injured" field="bodyPartInjured" required />
                    </div>
                    <Input label="Cause of Injury" field="causeOfInjury" required />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Accident Description <span className="text-red-500">*</span></label>
                      <textarea value={formData.accidentDescription} onChange={e => updateField('accidentDescription', e.target.value)}
                        rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Work Status */}
              {currentStep === 3 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Employee Work Status</h3>
                  <div className="space-y-4">
                    <Radio label="Is employee losing time from work?" field="losingTime" options={[{value:'yes',label:'Yes'},{value:'no',label:'No'}]} />
                    <Input label="Date Last Worked" field="dateLastWorked" type="date" />
                    <Radio label="Released to return to work?" field="returnStatus" options={[{value:'no',label:'No'},{value:'fullduty',label:'Full Duty'},{value:'restrictions',label:'With Restrictions'}]} />
                    <Input label="Return to Work Date" field="returnDate" type="date" />
                  </div>
                </div>
              )}

              {/* Step 4: Location & Witnesses */}
              {currentStep === 4 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Accident Location & Witnesses</h3>
                  <div className="mb-6">
                    <h4 className="font-medium text-slate-700 mb-3">Facility Location</h4>
                    <div className="grid md:grid-cols-4 gap-4">
                      <Input label="Street" field="facilityStreet" className="md:col-span-2" />
                      <Input label="City" field="facilityCity" />
                      <div className="grid grid-cols-2 gap-2">
                        <Select label="State" field="facilityState" options={states} />
                        <Input label="Zip" field="facilityZip" />
                      </div>
                    </div>
                  </div>
                  <div className="mb-6">
                    <h4 className="font-medium text-slate-700 mb-3">Accident Location</h4>
                    <div className="grid md:grid-cols-4 gap-4">
                      <Input label="Street" field="accidentStreet" className="md:col-span-2" />
                      <Input label="City" field="accidentCity" />
                      <div className="grid grid-cols-2 gap-2">
                        <Select label="State" field="accidentState" options={states} />
                        <Input label="Zip" field="accidentZip" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-700 mb-3">Witnesses</h4>
                    {formData.witnesses.map((w, i) => (
                      <div key={i} className="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg mb-2">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Witness {i+1} Name</label>
                          <input type="text" value={w.name} onChange={e => updateWitness(i, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                          <input type="tel" value={w.phone} onChange={e => updateWitness(i, 'phone', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Submit */}
              {currentStep === 5 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Reporting Information</h3>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <Input label="Your Name" field="submitterName" required />
                    <Input label="Your Phone" field="submitterPhone" type="tel" required />
                    <Input label="Your Email" field="submitterEmail" type="email" required className="md:col-span-2" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Additional Comments</label>
                    <textarea value={formData.additionalComments} onChange={e => updateField('additionalComments', e.target.value)}
                      rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none" />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Red Flags / Prior Injuries</label>
                    <textarea value={formData.redFlags} onChange={e => updateField('redFlags', e.target.value)}
                      rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none" />
                  </div>
                  
                  <h4 className="font-semibold text-slate-800 mb-4">Supporting Documents</h4>
                  <div className="space-y-3 mb-6">
                    <FileUpload label="Claimant's Statement" field="claimantStatement" icon="📝" />
                    <FileUpload label="Witness Statements" field="witnessStatements" icon="👥" />
                    <FileUpload label="Medical Records" field="medicalRecords" icon="🏥" />
                    <FileUpload label="Photos" field="photos" icon="📷" />
                    <FileUpload label="Other Documents" field="otherDocs" icon="📎" />
                  </div>
                  
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800"><strong>Please review before submitting.</strong> By submitting, you certify this information is accurate.</p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <button onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 0}
                  className={\`px-6 py-2.5 rounded-lg font-medium \${currentStep === 0 ? 'bg-slate-100 text-slate-400' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}\`}>
                  ← Back
                </button>
                {currentStep < steps.length - 1 ? (
                  <button onClick={() => setCurrentStep(prev => prev + 1)}
                    className="px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800">
                    Continue →
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting}
                    className={\`px-8 py-2.5 rounded-lg font-medium text-white flex items-center gap-2 \${submitting ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}\`}>
                    {submitting ? <><svg className="loading-spinner w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Submitting...</> : 'Submit Claim'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-slate-800 text-slate-400 py-6 mt-8">
            <div className="max-w-4xl mx-auto px-4 text-center text-sm">
              <p>© 2025 Titanium Defense Group. All rights reserved.</p>
            </div>
          </footer>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.send(HTML_PAGE);
});

// ===========================================
// START SERVER
// ===========================================

app.listen(PORT, () => {
  console.log('');
  console.log('===========================================');
  console.log('⚡ TITANIUM DEFENSE GROUP - FROI PORTAL');
  console.log('===========================================');
  console.log(\`🚀 Server running at http://localhost:\${PORT}\`);
  console.log(\`📧 Claims will be sent to: \${CONFIG.CLAIMS_EMAIL}\`);
  console.log('===========================================');
});
