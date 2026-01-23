import React, { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// SMART CLAIM INTAKE PORTAL - TITANIUM DEFENSE GROUP
// Premium Workers' Compensation Reporting Interface for WCReporting.com
// MERGED VERSION: Original data fields + Smart investigation features
// ═══════════════════════════════════════════════════════════════════════════════

const SmartClaimIntake = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // ═══ EMPLOYEE PERSONAL INFORMATION ═══
    firstName: '',
    lastName: '',
    mailingAddress: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    dateOfBirth: '',
    dateOfHire: '',
    gender: '',
    ssn: '',
    occupation: '',
    preferredLanguage: 'english',
    
    // ═══ CLAIM / EMPLOYER INFORMATION ═══
    entity: '',
    dateOfInjury: '',
    timeOfInjury: '',
    dateReported: '',
    reportedImmediately: null,
    weeklyWage: '',
    employeeWorkType: '',
    
    // ═══ INCIDENT DETAILS ═══
    accidentDescription: '',
    jobDuties: '',
    injuryType: '',
    natureOfInjury: '',
    bodyParts: [],
    causeOfInjury: '',
    
    // ═══ ACCIDENT LOCATION ═══
    accidentStreet: '',
    accidentCity: '',
    accidentState: '',
    accidentZip: '',
    
    // ═══ MEDICAL TREATMENT ═══
    medicalTreatment: '',
    soughtMedicalTreatment: null,
    facilityName: '',
    facilityStreet: '',
    facilityCity: '',
    facilityState: '',
    facilityZip: '',
    treatmentDate: '',
    refusedTreatment: null,
    resultedInDeath: 'no',
    
    // ═══ WITNESSES & EVIDENCE ═══
    witness1Name: '',
    witness1Phone: '',
    witness1Statement: '',
    witness2Name: '',
    witness2Phone: '',
    witness2Statement: '',
    hasVideo: null,
    videoLocation: '',
    photosAvailable: null,
    
    // ═══ WORK STATUS ═══
    losingTime: null,
    dateLastWorked: '',
    dateBeganLosingTime: '',
    returnStatus: '',
    workSchedule: '',
    offDays: '',
    salaryContinuation: null,
    lightDutyAvailable: null,
    lightDutyAssigned: null,
    
    // ═══ ROOT CAUSE ANALYSIS ═══
    directCause: '',
    rootCauseSymptoms: [],
    correctiveActions: [],
    proceduresInPlace: null,
    proceduresFollowed: null,
    trainingProvided: null,
    trainingFrequency: '',
    lastTrainingDate: '',
    disciplinePolicy: null,
    disciplineApplied: null,
    
    // ═══ INVESTIGATION FLAGS ═══
    validityConcerns: null,
    concernDetails: '',
    fraudIndicators: [],
    redFlags: '',
    
    // ═══ SUBROGATION ═══
    thirdPartyInvolved: null,
    thirdPartyDetails: '',
    
    // ═══ SUBMISSION ═══
    submitterName: '',
    submitterPhone: '',
    submitterEmail: '',
    additionalComments: '',
    preparedDate: ''
  });

  const [completionScore, setCompletionScore] = useState(0);

  // ═══ DROPDOWN OPTIONS ═══
  const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

  const entities = [
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
    'New Premier Management LLC'
  ];

  const injuryTypes = [
    { value: 'slip_trip_fall', label: 'Slip, Trip, or Fall', icon: '⚠️' },
    { value: 'struck_by', label: 'Struck By Object', icon: '💥' },
    { value: 'strain_sprain', label: 'Strain / Sprain / Overexertion', icon: '💪' },
    { value: 'cut_laceration', label: 'Cut / Laceration / Puncture', icon: '🩹' },
    { value: 'burn', label: 'Burn (Heat/Chemical/Electrical)', icon: '🔥' },
    { value: 'caught_in', label: 'Caught In / Between', icon: '⚙️' },
    { value: 'vehicle', label: 'Motor Vehicle Incident', icon: '🚗' },
    { value: 'assault', label: 'Assault / Violence', icon: '🚨' },
    { value: 'exposure', label: 'Chemical / Toxic Exposure', icon: '☣️' },
    { value: 'repetitive', label: 'Repetitive Motion / Cumulative', icon: '🔄' },
    { value: 'other', label: 'Other', icon: '📋' }
  ];

  const bodyPartOptions = [
    'Head', 'Face', 'Eye(s)', 'Ear(s)', 'Neck', 'Shoulder - Left', 'Shoulder - Right',
    'Upper Arm - Left', 'Upper Arm - Right', 'Elbow - Left', 'Elbow - Right',
    'Forearm - Left', 'Forearm - Right', 'Wrist - Left', 'Wrist - Right',
    'Hand - Left', 'Hand - Right', 'Finger(s) - Left', 'Finger(s) - Right',
    'Upper Back', 'Lower Back', 'Chest', 'Abdomen', 'Hip - Left', 'Hip - Right',
    'Upper Leg - Left', 'Upper Leg - Right', 'Knee - Left', 'Knee - Right',
    'Lower Leg - Left', 'Lower Leg - Right', 'Ankle - Left', 'Ankle - Right',
    'Foot - Left', 'Foot - Right', 'Toe(s) - Left', 'Toe(s) - Right', 'Multiple Body Parts'
  ];

  const rootCauseDeterminations = [
    { value: 'no_inspection', label: 'No Inspection Procedures' },
    { value: 'gap_inspection', label: 'Gap in Inspection Procedures' },
    { value: 'inspection_not_followed', label: 'Inspection Procedures Not Followed' },
    { value: 'no_safe_handling', label: 'No Safe Patient Handling Procedures' },
    { value: 'gap_safe_handling', label: 'Gap in Safe Patient Handling Procedures' },
    { value: 'safe_handling_not_followed', label: 'Safe Patient Handling Not Followed' },
    { value: 'combative_no_trigger', label: 'Combative Resident - No Identified Trigger' },
    { value: 'combative_identified', label: 'Combative Resident - Identified Trigger' },
    { value: 'no_deescalation', label: 'No De-escalation Procedures' },
    { value: 'deescalation_not_followed', label: 'De-escalation Procedures Not Followed' },
    { value: 'no_ppe', label: 'No Applicable PPE/Footwear Requirements' },
    { value: 'ppe_not_worn', label: 'Required PPE/Footwear Not Worn' },
    { value: 'no_policies', label: 'No Applicable Policies/Procedures' },
    { value: 'gap_policies', label: 'Gap in Applicable Policies/Procedures' },
    { value: 'policies_not_followed', label: 'Policies/Procedures Not Followed' }
  ];

  const correctiveActionOptions = [
    { value: 'reviewed_procedures', label: 'Reviewed Proper Procedures with Employee' },
    { value: 'observed_performance', label: 'Observed Employee Performing Procedures Properly' },
    { value: 'reviewed_department', label: 'Reviewed Incident with All Department Employees' },
    { value: 'discipline_applied', label: 'Employee Disciplined for Disregarding Procedures' },
    { value: 'accountability_assigned', label: 'Accountability/Risk Owner Assigned' },
    { value: 'incentive_program', label: 'Established Incentive Program for Compliance' },
    { value: 'established_training', label: 'Established Training(s)' },
    { value: 'increased_training', label: 'Increased Training Frequency' },
    { value: 'adjusted_procedures', label: 'Adjusted or Expanded Existing Procedures' },
    { value: 'new_procedures', label: 'Established New Procedures' }
  ];

  const fraudIndicators = [
    { value: 'delayed_report', label: 'Delayed reporting (not immediate)' },
    { value: 'monday_claim', label: 'Monday morning claim' },
    { value: 'no_witnesses', label: 'No witnesses to incident' },
    { value: 'vague_description', label: 'Vague or inconsistent description' },
    { value: 'recent_discipline', label: 'Recent disciplinary action' },
    { value: 'pending_layoff', label: 'Facing layoff or termination' },
    { value: 'new_employee', label: 'Very new employee' },
    { value: 'history_claims', label: 'History of prior claims' },
    { value: 'financial_issues', label: 'Known financial difficulties' },
    { value: 'refuses_medical', label: 'Initially refused then changed mind' },
    { value: 'family_unaware', label: 'Family unaware of injury' },
    { value: 'excessive_time', label: 'More time off than injury warrants' },
    { value: 'settlement_demands', label: 'Demanding quick settlement' },
    { value: 'changes_physician', label: 'Changed physician after release' }
  ];

  // ═══ SMART TIPS BY INJURY TYPE ═══
  const smartTips = {
    slip_trip_fall: ["Document floor conditions: wet, uneven, debris, ice?", "Note lighting conditions", "Check footwear compliance", "Photograph exact location", "Third-party property owner? (subrogation potential)"],
    struck_by: ["What object struck the employee?", "Was proper PPE worn?", "Was object properly secured?", "Any equipment malfunctions?"],
    strain_sprain: ["What was the specific lifting/movement action?", "Was proper lifting technique used?", "Was employee trained on safe lifting?", "Were mechanical aids available but not used?"],
    vehicle: ["Obtain police report", "Document all parties involved", "Get insurance info of other parties", "Strong subrogation potential - preserve all evidence"],
    assault: ["Was this patient/client violence?", "Were de-escalation procedures followed?", "Any prior incidents with this individual?", "Review care plan if applicable"],
    burn: ["What was the heat/chemical source?", "Was proper PPE available and used?", "Review safety data sheets if chemical"],
    caught_in: ["Was equipment properly guarded?", "Any lockout/tagout violations?", "Machine maintenance current?"]
  };

  // ═══ COMPLETION SCORE CALCULATION ═══
  useEffect(() => {
    const required = ['firstName', 'lastName', 'entity', 'dateOfInjury', 'timeOfInjury', 'accidentDescription', 'injuryType', 'submitterName', 'submitterEmail'];
    const bonus = ['jobDuties', 'witness1Name', 'hasVideo', 'directCause', 'rootCauseSymptoms', 'correctiveActions', 'proceduresInPlace', 'validityConcerns', 'dateOfHire', 'occupation'];
    let score = 0;
    required.forEach(f => { if (formData[f] && (Array.isArray(formData[f]) ? formData[f].length > 0 : true)) score += 7; });
    bonus.forEach(f => { if (formData[f] && (Array.isArray(formData[f]) ? formData[f].length > 0 : formData[f] !== null)) score += 3.7; });
    setCompletionScore(Math.min(100, Math.round(score)));
  }, [formData]);

  // ═══ FORM HELPERS ═══
  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const toggleArray = (field, value) => setFormData(prev => {
    const arr = prev[field] || [];
    return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
  });

  // ═══ STEPS CONFIGURATION ═══
  const steps = [
    { id: 'employee', title: 'Employee Info', icon: '👤' },
    { id: 'claim', title: 'Claim Info', icon: '📋' },
    { id: 'incident', title: 'Incident Details', icon: '⚡' },
    { id: 'medical', title: 'Medical', icon: '🏥' },
    { id: 'evidence', title: 'Witnesses & Evidence', icon: '👁️' },
    { id: 'workstatus', title: 'Work Status', icon: '💼' },
    { id: 'rootcause', title: 'Root Cause', icon: '🔍' },
    { id: 'flags', title: 'Investigation', icon: '🚩' },
    { id: 'submit', title: 'Submit', icon: '✅' }
  ];

  // ═══ REUSABLE COMPONENTS ═══
  const InfoTip = ({ children }) => (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'14px 16px', background:'rgba(88,166,255,0.08)', borderRadius:10, borderLeft:'3px solid #58a6ff', marginTop:12 }}>
      <span>💡</span><span style={{ fontSize:13, color:'#8b949e', lineHeight:1.5 }}>{children}</span>
    </div>
  );

  const WhyMatters = ({ children }) => (
    <div style={{ fontSize:12, color:'#6e7681', marginTop:6, fontStyle:'italic' }}>
      <span style={{ color:'#58a6ff', fontWeight:500, fontStyle:'normal' }}>Why this matters:</span> {children}
    </div>
  );

  const StateSelect = ({ value, onChange, id }) => (
    <select id={id} value={value} onChange={onChange} className="input-field">
      <option value="">Select State</option>
      {states.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: EMPLOYEE PERSONAL INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════
  const renderEmployeeInfo = () => (
    <div className="step-content">
      <div className="section-header">
        <h2>Employee Personal Information</h2>
        <p className="section-subtitle">Enter the injured employee's details as they appear on payroll records.</p>
      </div>
      
      <div className="form-grid">
        <div className="form-group">
          <label>First Name <span className="required">*</span></label>
          <input type="text" value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} placeholder="Legal first name" className="input-field" />
        </div>
        <div className="form-group">
          <label>Last Name <span className="required">*</span></label>
          <input type="text" value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} placeholder="Legal last name" className="input-field" />
        </div>
      </div>

      <div className="form-group full-width" style={{marginTop:16}}>
        <label>Mailing Address</label>
        <input type="text" value={formData.mailingAddress} onChange={(e) => updateField('mailingAddress', e.target.value)} placeholder="Street address" className="input-field" />
      </div>

      <div className="form-grid" style={{marginTop:16}}>
        <div className="form-group">
          <label>City</label>
          <input type="text" value={formData.city} onChange={(e) => updateField('city', e.target.value)} placeholder="City" className="input-field" />
        </div>
        <div className="form-group">
          <label>State</label>
          <StateSelect value={formData.state} onChange={(e) => updateField('state', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Zip Code</label>
          <input type="text" value={formData.zipCode} onChange={(e) => updateField('zipCode', e.target.value)} placeholder="Zip" className="input-field" />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="(555) 555-5555" className="input-field" />
        </div>
      </div>

      <div className="form-grid" style={{marginTop:16}}>
        <div className="form-group">
          <label>Date of Birth</label>
          <input type="date" value={formData.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} className="input-field" />
        </div>
        <div className="form-group">
          <label>Date of Hire</label>
          <input type="date" value={formData.dateOfHire} onChange={(e) => updateField('dateOfHire', e.target.value)} className="input-field" />
          <WhyMatters>New employees (0-1 years) have significantly higher claim rates. This helps identify training gaps.</WhyMatters>
        </div>
        <div className="form-group">
          <label>Gender</label>
          <select value={formData.gender} onChange={(e) => updateField('gender', e.target.value)} className="input-field">
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className="form-group">
          <label>SSN</label>
          <input type="text" value={formData.ssn} onChange={(e) => updateField('ssn', e.target.value)} placeholder="XXX-XX-XXXX" className="input-field" />
        </div>
      </div>

      <div className="form-grid" style={{marginTop:16}}>
        <div className="form-group">
          <label>Occupation / Job Title <span className="required">*</span></label>
          <input type="text" value={formData.occupation} onChange={(e) => updateField('occupation', e.target.value)} placeholder="e.g., CNA, LPN, Housekeeper" className="input-field" />
        </div>
        <div className="form-group">
          <label>Preferred Language</label>
          <select value={formData.preferredLanguage} onChange={(e) => updateField('preferredLanguage', e.target.value)} className="input-field">
            <option value="english">English</option>
            <option value="spanish">Spanish</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: CLAIM INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════
  const renderClaimInfo = () => (
    <div className="step-content">
      <div className="section-header">
        <h2>Claim Information</h2>
        <p className="section-subtitle">Entity, dates, and wage information for the claim.</p>
      </div>

      <div className="form-group full-width">
        <label>Entity <span className="required">*</span></label>
        <select value={formData.entity} onChange={(e) => updateField('entity', e.target.value)} className="input-field">
          <option value="">Select Entity</option>
          {entities.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <p style={{fontSize:12, color:'#6e7681', marginTop:6}}>If unsure, check the payroll for the correct entity name.</p>
      </div>

      <div className="form-grid" style={{marginTop:20}}>
        <div className="form-group">
          <label>Date of Injury <span className="required">*</span></label>
          <input type="date" value={formData.dateOfInjury} onChange={(e) => updateField('dateOfInjury', e.target.value)} className="input-field" />
        </div>
        <div className="form-group">
          <label>Time of Injury <span className="required">*</span></label>
          <input type="time" value={formData.timeOfInjury} onChange={(e) => updateField('timeOfInjury', e.target.value)} className="input-field" />
        </div>
        <div className="form-group">
          <label>Date Reported</label>
          <input type="date" value={formData.dateReported} onChange={(e) => updateField('dateReported', e.target.value)} className="input-field" />
        </div>
        <div className="form-group">
          <label>Reported Immediately?</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${formData.reportedImmediately === true ? 'active' : ''}`} onClick={() => updateField('reportedImmediately', true)}>Yes</button>
            <button className={`toggle-btn ${formData.reportedImmediately === false ? 'active warning' : ''}`} onClick={() => updateField('reportedImmediately', false)}>No</button>
          </div>
          {formData.reportedImmediately === false && <InfoTip>Delayed reporting can be a fraud indicator. Document the reason for delay.</InfoTip>}
        </div>
      </div>

      <div className="form-grid" style={{marginTop:20}}>
        <div className="form-group">
          <label>Estimated Weekly Wage</label>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#6e7681'}}>$</span>
            <input type="number" value={formData.weeklyWage} onChange={(e) => updateField('weeklyWage', e.target.value)} placeholder="0.00" className="input-field" style={{paddingLeft:28}} />
          </div>
        </div>
        <div className="form-group">
          <label>Employee Work Type</label>
          <select value={formData.employeeWorkType} onChange={(e) => updateField('employeeWorkType', e.target.value)} className="input-field">
            <option value="">Select</option>
            <option value="fulltime">Full Time</option>
            <option value="parttime">Part Time</option>
            <option value="seasonal">Seasonal</option>
            <option value="perdiem">Per Diem</option>
          </select>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: INCIDENT DETAILS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderIncidentDetails = () => (
    <div className="step-content">
      <div className="section-header">
        <h2>What Happened?</h2>
        <p className="section-subtitle">The more detail here, the better your investigation. <span className="highlight">Don't hold back.</span></p>
      </div>

      <div className="form-group full-width">
        <label>Describe the accident in detail <span className="required">*</span></label>
        <textarea value={formData.accidentDescription} onChange={(e) => updateField('accidentDescription', e.target.value)} placeholder="Who was involved? What exactly happened? What were the conditions? Be as specific as possible..." className="input-field textarea-large" rows={5} />
        <WhyMatters>Detailed narratives reveal inconsistencies, identify root causes, and support or challenge claim validity.</WhyMatters>
      </div>

      <div className="form-group full-width" style={{marginTop:20}}>
        <label>What job duties was the employee performing?</label>
        <textarea value={formData.jobDuties} onChange={(e) => updateField('jobDuties', e.target.value)} placeholder="Specific task being performed at the time of injury..." className="input-field" rows={2} />
      </div>

      <div className="form-group full-width" style={{marginTop:20}}>
        <label>Type of Injury / Incident <span className="required">*</span></label>
        <div className="injury-type-grid">
          {injuryTypes.map(type => (
            <button key={type.value} className={`injury-type-btn ${formData.injuryType === type.value ? 'active' : ''}`} onClick={() => updateField('injuryType', type.value)}>
              <span className="injury-icon">{type.icon}</span>
              <span className="injury-label">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {formData.injuryType && smartTips[formData.injuryType] && (
        <div className="smart-tips-panel">
          <h4>🎯 Smart Investigation Tips for {injuryTypes.find(t => t.value === formData.injuryType)?.label}</h4>
          <ul>{smartTips[formData.injuryType].map((tip, i) => <li key={i}>{tip}</li>)}</ul>
        </div>
      )}

      <div className="form-grid" style={{marginTop:20}}>
        <div className="form-group">
          <label>Nature of Injury</label>
          <input type="text" value={formData.natureOfInjury} onChange={(e) => updateField('natureOfInjury', e.target.value)} placeholder="Strain, Sprain, Fracture, Contusion..." className="input-field" />
        </div>
        <div className="form-group">
          <label>Cause of Injury</label>
          <input type="text" value={formData.causeOfInjury} onChange={(e) => updateField('causeOfInjury', e.target.value)} placeholder="Lifting, Fall, MVA, Patient handling..." className="input-field" />
        </div>
      </div>

      <div className="form-group full-width" style={{marginTop:20}}>
        <label>Body Parts Injured (select all that apply)</label>
        <div className="body-parts-grid">
          {bodyPartOptions.map(part => (
            <button key={part} className={`body-part-btn ${formData.bodyParts.includes(part) ? 'active' : ''}`} onClick={() => toggleArray('bodyParts', part)}>{part}</button>
          ))}
        </div>
      </div>

      <div style={{marginTop:24, paddingTop:20, borderTop:'1px solid rgba(139,148,158,0.15)'}}>
        <h3 style={{fontSize:16, fontWeight:600, color:'#f0f6fc', marginBottom:16}}>Accident Location</h3>
        <div className="form-grid">
          <div className="form-group" style={{gridColumn:'1 / -1'}}>
            <label>Street Address</label>
            <input type="text" value={formData.accidentStreet} onChange={(e) => updateField('accidentStreet', e.target.value)} placeholder="Street address where accident occurred" className="input-field" />
          </div>
          <div className="form-group">
            <label>City</label>
            <input type="text" value={formData.accidentCity} onChange={(e) => updateField('accidentCity', e.target.value)} placeholder="City" className="input-field" />
          </div>
          <div className="form-group">
            <label>State</label>
            <StateSelect value={formData.accidentState} onChange={(e) => updateField('accidentState', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Zip</label>
            <input type="text" value={formData.accidentZip} onChange={(e) => updateField('accidentZip', e.target.value)} placeholder="Zip" className="input-field" />
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: MEDICAL TREATMENT
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMedical = () => (
    <div className="step-content">
      <div className="section-header">
        <h2>Medical Treatment</h2>
        <p className="section-subtitle">Document any medical care sought or declined.</p>
      </div>

      <div className="form-group">
        <label>Medical Treatment Level</label>
        <select value={formData.medicalTreatment} onChange={(e) => updateField('medicalTreatment', e.target.value)} className="input-field">
          <option value="">Select</option>
          <option value="none">No medical treatment</option>
          <option value="firstaid">First aid only</option>
          <option value="minor">Minor clinic/urgent care</option>
          <option value="er">Emergency room</option>
          <option value="hospital">Hospitalization 24+ hours</option>
        </select>
      </div>

      <div className="form-group" style={{marginTop:16}}>
        <label>Has the employee sought medical treatment?</label>
        <div className="toggle-group">
          <button className={`toggle-btn ${formData.soughtMedicalTreatment === true ? 'active' : ''}`} onClick={() => updateField('soughtMedicalTreatment', true)}>Yes</button>
          <button className={`toggle-btn ${formData.soughtMedicalTreatment === false ? 'active' : ''}`} onClick={() => updateField('soughtMedicalTreatment', false)}>No</button>
        </div>
      </div>

      {formData.soughtMedicalTreatment === true && (
        <div style={{marginTop:20, padding:20, background:'rgba(22,27,34,0.5)', borderRadius:12, border:'1px solid rgba(139,148,158,0.15)'}}>
          <h4 style={{fontSize:14, fontWeight:600, color:'#c9d1d9', marginBottom:16}}>Treatment Facility</h4>
          <div className="form-group">
            <label>Facility Name</label>
            <input type="text" value={formData.facilityName} onChange={(e) => updateField('facilityName', e.target.value)} placeholder="Hospital, clinic, or urgent care name" className="input-field" />
          </div>
          <div className="form-group" style={{marginTop:12}}>
            <label>Facility Address</label>
            <input type="text" value={formData.facilityStreet} onChange={(e) => updateField('facilityStreet', e.target.value)} placeholder="Street address" className="input-field" />
          </div>
          <div className="form-grid" style={{marginTop:12}}>
            <div className="form-group">
              <input type="text" value={formData.facilityCity} onChange={(e) => updateField('facilityCity', e.target.value)} placeholder="City" className="input-field" />
            </div>
            <div className="form-group">
              <StateSelect value={formData.facilityState} onChange={(e) => updateField('facilityState', e.target.value)} />
            </div>
            <div className="form-group">
              <input type="text" value={formData.facilityZip} onChange={(e) => updateField('facilityZip', e.target.value)} placeholder="Zip" className="input-field" />
            </div>
          </div>
          <div className="form-group" style={{marginTop:12}}>
            <label>Date of Treatment</label>
            <input type="date" value={formData.treatmentDate} onChange={(e) => updateField('treatmentDate', e.target.value)} className="input-field" />
          </div>
        </div>
      )}

      {formData.soughtMedicalTreatment === false && (
        <div className="form-group" style={{marginTop:16}}>
          <label>Did employee refuse medical treatment?</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${formData.refusedTreatment === true ? 'active' : ''}`} onClick={() => updateField('refusedTreatment', true)}>Yes, Refused</button>
            <button className={`toggle-btn ${formData.refusedTreatment === false ? 'active' : ''}`} onClick={() => updateField('refusedTreatment', false)}>Not Offered / N/A</button>
          </div>
          {formData.refusedTreatment === true && <InfoTip>A signed Employee Refusal of Medical Treatment form should be completed and uploaded with this claim.</InfoTip>}
        </div>
      )}

      <div className="form-group" style={{marginTop:20}}>
        <label>Did injury result in death?</label>
        <div className="toggle-group">
          <button className={`toggle-btn ${formData.resultedInDeath === 'yes' ? 'active warning' : ''}`} onClick={() => updateField('resultedInDeath', 'yes')}>Yes</button>
          <button className={`toggle-btn ${formData.resultedInDeath === 'no' ? 'active' : ''}`} onClick={() => updateField('resultedInDeath', 'no')}>No</button>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: WITNESSES & EVIDENCE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderEvidence = () => (
    <div className="step-content">
      <div className="section-header">
        <h2>Witnesses & Evidence</h2>
        <p className="section-subtitle">Evidence collected within 48 hours is most valuable. Every detail counts.</p>
      </div>

      <div className="form-group">
        <label>Is there surveillance video of the incident?</label>
        <div className="toggle-group">
          <button className={`toggle-btn ${formData.hasVideo === true ? 'active success' : ''}`} onClick={() => updateField('hasVideo', true)}>Yes</button>
          <button className={`toggle-btn ${formData.hasVideo === false ? 'active' : ''}`} onClick={() => updateField('hasVideo', false)}>No</button>
          <button className={`toggle-btn ${formData.hasVideo === 'checking' ? 'active' : ''}`} onClick={() => updateField('hasVideo', 'checking')}>Checking</button>
        </div>
        {formData.hasVideo === true && (
          <>
            <input type="text" value={formData.videoLocation} onChange={(e) => updateField('videoLocation', e.target.value)} placeholder="Where is the video stored? Has it been preserved?" className="input-field" style={{marginTop:12}} />
            <InfoTip>⚡ CRITICAL: Ensure video is preserved immediately. Many systems auto-delete within 7-30 days.</InfoTip>
          </>
        )}
      </div>

      <div className="form-group" style={{marginTop:20}}>
        <label>Are photos of the scene/injury available?</label>
        <div className="toggle-group">
          <button className={`toggle-btn ${formData.photosAvailable === true ? 'active success' : ''}`} onClick={() => updateField('photosAvailable', true)}>Yes</button>
          <button className={`toggle-btn ${formData.photosAvailable === false ? 'active' : ''}`} onClick={() => updateField('photosAvailable', false)}>No</button>
        </div>
      </div>

      <div style={{marginTop:24, paddingTop:20, borderTop:'1px solid rgba(139,148,158,0.15)'}}>
        <h3 style={{fontSize:16, fontWeight:600, color:'#f0f6fc', marginBottom:8}}>Witnesses</h3>
        <WhyMatters>Witness statements within 48 hours are critical. Note lighting, footwear, and conditions observed.</WhyMatters>
        
        <div className="witness-card" style={{marginTop:16}}>
          <div className="witness-header">Witness #1</div>
          <div className="form-grid">
            <div className="form-group">
              <input type="text" value={formData.witness1Name} onChange={(e) => updateField('witness1Name', e.target.value)} placeholder="Name" className="input-field" />
            </div>
            <div className="form-group">
              <input type="tel" value={formData.witness1Phone} onChange={(e) => updateField('witness1Phone', e.target.value)} placeholder="Phone" className="input-field" />
            </div>
          </div>
          <div className="form-group" style={{marginTop:12}}>
            <textarea value={formData.witness1Statement} onChange={(e) => updateField('witness1Statement', e.target.value)} placeholder="Brief statement or observations..." className="input-field" rows={2} />
          </div>
        </div>

        <div className="witness-card" style={{marginTop:12}}>
          <div className="witness-header">Witness #2</div>
          <div className="form-grid">
            <div className="form-group">
              <input type="text" value={formData.witness2Name} onChange={(e) => updateField('witness2Name', e.target.value)} placeholder="Name" className="input-field" />
            </div>
            <div className="form-group">
              <input type="tel" value={formData.witness2Phone} onChange={(e) => updateField('witness2Phone', e.target.value)} placeholder="Phone" className="input-field" />
            </div>
          </div>
          <div className="form-group" style={{marginTop:12}}>
            <textarea value={formData.witness2Statement} onChange={(e) => updateField('witness2Statement', e.target.value)} placeholder="Brief statement or observations..." className="input-field" rows={2} />
          </div>
        </div>

        {!formData.witness1Name && !formData.witness2Name && (
          <p style={{fontSize:13, color:'#d29922', marginTop:12, fontStyle:'italic'}}>No witnesses? Note that — it can be a fraud indicator.</p>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: WORK STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderWorkStatus = () => (
    <div className="step-content">
      <div className="section-header">
        <h2>Work Status & Lost Time</h2>
        <p className="section-subtitle">Understanding work impact helps manage indemnity exposure.</p>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Is the employee losing time from work?</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${formData.losingTime === true ? 'active warning' : ''}`} onClick={() => updateField('losingTime', true)}>Yes</button>
            <button className={`toggle-btn ${formData.losingTime === false ? 'active success' : ''}`} onClick={() => updateField('losingTime', false)}>No</button>
          </div>
        </div>
        <div className="form-group">
          <label>Date Last Worked</label>
          <input type="date" value={formData.dateLastWorked} onChange={(e) => updateField('dateLastWorked', e.target.value)} className="input-field" />
        </div>
      </div>

      {formData.losingTime === true && (
        <div className="form-group" style={{marginTop:16}}>
          <label>Date Began Losing Time</label>
          <input type="date" value={formData.dateBeganLosingTime} onChange={(e) => updateField('dateBeganLosingTime', e.target.value)} className="input-field" />
        </div>
      )}

      <div className="form-group" style={{marginTop:16}}>
        <label>Return to Work Status</label>
        <select value={formData.returnStatus} onChange={(e) => updateField('returnStatus', e.target.value)} className="input-field">
          <option value="">Select</option>
          <option value="no">Has not returned</option>
          <option value="fullduty">Returned - Full Duty</option>
          <option value="restrictions">Returned - With Restrictions (Light Duty)</option>
        </select>
      </div>

      <div className="form-grid" style={{marginTop:16}}>
        <div className="form-group">
          <label>Work Schedule (days per week)</label>
          <input type="text" value={formData.workSchedule} onChange={(e) => updateField('workSchedule', e.target.value)} placeholder="e.g., 5 days, Mon-Fri" className="input-field" />
        </div>
        <div className="form-group">
          <label>Regular Off Days</label>
          <input type="text" value={formData.offDays} onChange={(e) => updateField('offDays', e.target.value)} placeholder="e.g., Saturday, Sunday" className="input-field" />
        </div>
      </div>

      <div className="form-grid" style={{marginTop:16}}>
        <div className="form-group">
          <label>On salary continuation?</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${formData.salaryContinuation === true ? 'active' : ''}`} onClick={() => updateField('salaryContinuation', true)}>Yes</button>
            <button className={`toggle-btn ${formData.salaryContinuation === false ? 'active' : ''}`} onClick={() => updateField('salaryContinuation', false)}>No</button>
          </div>
        </div>
        <div className="form-group">
          <label>Is light duty available?</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${formData.lightDutyAvailable === true ? 'active success' : ''}`} onClick={() => updateField('lightDutyAvailable', true)}>Yes</button>
            <button className={`toggle-btn ${formData.lightDutyAvailable === false ? 'active warning' : ''}`} onClick={() => updateField('lightDutyAvailable', false)}>No</button>
          </div>
          {formData.lightDutyAvailable === false && <InfoTip>Consider developing a light duty program — it significantly reduces lost time claims.</InfoTip>}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7: ROOT CAUSE ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderRootCause = () => (
    <div className="step-content">
      <div className="section-header">
        <h2>Root Cause Analysis</h2>
        <p className="section-subtitle">Identifying the ROOT cause — not just the direct cause — prevents future incidents.<br/><span className="highlight">Ask "why" until you can't anymore.</span></p>
      </div>

      <div className="root-cause-explainer">
        <h4>Example Event Chain:</h4>
        <div className="event-chain">
          <span className="chain-item direct">Slip/Trip/Fall</span>
          <span className="chain-arrow">→</span>
          <span className="chain-item symptom">Wet Floor</span>
          <span className="chain-arrow">→</span>
          <span className="chain-item symptom">Leaking Pipe</span>
          <span className="chain-arrow">→</span>
          <span className="chain-item symptom">Failure to Inspect</span>
          <span className="chain-arrow">→</span>
          <span className="chain-item root">No Inspection Procedures</span>
        </div>
        <p className="chain-legend"><span className="legend-direct">Direct Cause</span> → <span className="legend-symptom">Symptoms</span> → <span className="legend-root">Root Cause</span></p>
      </div>

      <div className="form-group full-width">
        <label>Direct Cause of Injury</label>
        <input type="text" value={formData.directCause} onChange={(e) => updateField('directCause', e.target.value)} placeholder="e.g., Slip/Trip/Fall, Struck by Object, Strain from Lifting..." className="input-field" />
      </div>

      <div className="form-group full-width" style={{marginTop:20}}>
        <label>Root Cause Determination (select all that apply)</label>
        <div className="root-cause-grid">
          {rootCauseDeterminations.map(cause => (
            <button key={cause.value} className={`root-cause-btn ${formData.rootCauseSymptoms.includes(cause.value) ? 'active' : ''}`} onClick={() => toggleArray('rootCauseSymptoms', cause.value)}>{cause.label}</button>
          ))}
        </div>
      </div>

      <div className="procedures-section">
        <h3>Procedures & Training</h3>
        <div className="form-group">
          <label>Are there specific procedures in place relating to this incident?</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${formData.proceduresInPlace === true ? 'active' : ''}`} onClick={() => updateField('proceduresInPlace', true)}>Yes</button>
            <button className={`toggle-btn ${formData.proceduresInPlace === false ? 'active warning' : ''}`} onClick={() => updateField('proceduresInPlace', false)}>No</button>
          </div>
        </div>

        {formData.proceduresInPlace === true && (
          <>
            <div className="form-group" style={{marginTop:16}}>
              <label>Were the procedures followed?</label>
              <div className="toggle-group">
                <button className={`toggle-btn ${formData.proceduresFollowed === true ? 'active success' : ''}`} onClick={() => updateField('proceduresFollowed', true)}>Yes</button>
                <button className={`toggle-btn ${formData.proceduresFollowed === false ? 'active warning' : ''}`} onClick={() => updateField('proceduresFollowed', false)}>No</button>
              </div>
            </div>

            {formData.proceduresFollowed === false && (
              <>
                <div className="form-group" style={{marginTop:16}}>
                  <label>Was training provided on the procedures?</label>
                  <div className="toggle-group">
                    <button className={`toggle-btn ${formData.trainingProvided === true ? 'active' : ''}`} onClick={() => updateField('trainingProvided', true)}>Yes</button>
                    <button className={`toggle-btn ${formData.trainingProvided === false ? 'active warning' : ''}`} onClick={() => updateField('trainingProvided', false)}>No</button>
                  </div>
                </div>

                {formData.trainingProvided === true && (
                  <div className="form-grid" style={{marginTop:16}}>
                    <div className="form-group">
                      <label>Training Frequency</label>
                      <input type="text" value={formData.trainingFrequency} onChange={(e) => updateField('trainingFrequency', e.target.value)} placeholder="e.g., Annually, Quarterly" className="input-field" />
                    </div>
                    <div className="form-group">
                      <label>Last Training Date</label>
                      <input type="date" value={formData.lastTrainingDate} onChange={(e) => updateField('lastTrainingDate', e.target.value)} className="input-field" />
                    </div>
                  </div>
                )}

                <div className="form-group" style={{marginTop:16}}>
                  <label>Is there a discipline policy for failure to follow procedures?</label>
                  <div className="toggle-group">
                    <button className={`toggle-btn ${formData.disciplinePolicy === true ? 'active' : ''}`} onClick={() => updateField('disciplinePolicy', true)}>Yes</button>
                    <button className={`toggle-btn ${formData.disciplinePolicy === false ? 'active' : ''}`} onClick={() => updateField('disciplinePolicy', false)}>No</button>
                  </div>
                </div>

                {formData.disciplinePolicy === true && (
                  <div className="form-group" style={{marginTop:16}}>
                    <label>Was discipline applied?</label>
                    <div className="toggle-group">
                      <button className={`toggle-btn ${formData.disciplineApplied === true ? 'active' : ''}`} onClick={() => updateField('disciplineApplied', true)}>Yes</button>
                      <button className={`toggle-btn ${formData.disciplineApplied === false ? 'active' : ''}`} onClick={() => updateField('disciplineApplied', false)}>No</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="form-group full-width" style={{marginTop:24}}>
        <label>Corrective Actions Taken (select all that apply)</label>
        <div className="corrective-actions-grid">
          {correctiveActionOptions.map(action => (
            <button key={action.value} className={`corrective-btn ${formData.correctiveActions.includes(action.value) ? 'active' : ''}`} onClick={() => toggleArray('correctiveActions', action.value)}>{action.label}</button>
          ))}
        </div>
        <InfoTip>Corrective actions demonstrate proactive risk management and can reduce future premiums.</InfoTip>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 8: INVESTIGATION FLAGS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderInvestigation = () => (
    <div className="step-content">
      <div className="section-header">
        <h2>Investigation Flags</h2>
        <p className="section-subtitle">These questions help identify claims that may need closer review.</p>
      </div>

      <div className="disclaimer-box"><strong>Important:</strong> No single indicator proves fraud. These are red flags that warrant closer investigation, not conclusions.</div>

      <div className="form-group">
        <label>Do you have any reason to question the validity of this claim?</label>
        <div className="toggle-group">
          <button className={`toggle-btn ${formData.validityConcerns === true ? 'active warning' : ''}`} onClick={() => updateField('validityConcerns', true)}>Yes</button>
          <button className={`toggle-btn ${formData.validityConcerns === false ? 'active' : ''}`} onClick={() => updateField('validityConcerns', false)}>No</button>
        </div>
      </div>

      {formData.validityConcerns === true && (
        <div className="form-group full-width" style={{marginTop:16}}>
          <label>Please explain your concerns:</label>
          <textarea value={formData.concernDetails} onChange={(e) => updateField('concernDetails', e.target.value)} placeholder="Describe why you have concerns about this claim..." className="input-field" rows={3} />
        </div>
      )}

      <div className="form-group full-width" style={{marginTop:20}}>
        <label>Fraud Indicators Present (select any that apply)</label>
        <p style={{fontSize:12, color:'#6e7681', marginBottom:12}}>These are observational flags only — not accusations.</p>
        <div className="fraud-indicators-grid">
          {fraudIndicators.map(indicator => (
            <button key={indicator.value} className={`fraud-btn ${formData.fraudIndicators.includes(indicator.value) ? 'active' : ''}`} onClick={() => toggleArray('fraudIndicators', indicator.value)}>{indicator.label}</button>
          ))}
        </div>
      </div>

      <div className="form-group full-width" style={{marginTop:20}}>
        <label>Red Flags / Prior Injuries (free text)</label>
        <textarea value={formData.redFlags} onChange={(e) => updateField('redFlags', e.target.value)} placeholder="Note any additional concerns, prior related injuries, or suspicious circumstances..." className="input-field" rows={3} />
      </div>

      <div className="subrogation-section">
        <h3>Subrogation Potential</h3>
        <WhyMatters>If a third party caused or contributed to the injury, costs may be recoverable.</WhyMatters>
        <div className="form-group" style={{marginTop:16}}>
          <label>Was a third party involved or potentially responsible?</label>
          <div className="toggle-group">
            <button className={`toggle-btn ${formData.thirdPartyInvolved === true ? 'active success' : ''}`} onClick={() => updateField('thirdPartyInvolved', true)}>Yes</button>
            <button className={`toggle-btn ${formData.thirdPartyInvolved === false ? 'active' : ''}`} onClick={() => updateField('thirdPartyInvolved', false)}>No</button>
            <button className={`toggle-btn ${formData.thirdPartyInvolved === 'maybe' ? 'active' : ''}`} onClick={() => updateField('thirdPartyInvolved', 'maybe')}>Possible</button>
          </div>
        </div>
        {(formData.thirdPartyInvolved === true || formData.thirdPartyInvolved === 'maybe') && (
          <>
            <div className="form-group full-width" style={{marginTop:16}}>
              <label>Third Party Details</label>
              <textarea value={formData.thirdPartyDetails} onChange={(e) => updateField('thirdPartyDetails', e.target.value)} placeholder="Property owner, contractor, vehicle driver, manufacturer, etc..." className="input-field" rows={2} />
            </div>
            <InfoTip>For subrogation: Preserve evidence immediately. Issue preservation letter within 48 hours. Identify property owner, obtain insurance information, photograph scene.</InfoTip>
          </>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 9: SUBMIT
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSubmit = () => (
    <div className="step-content">
      <div className="section-header">
        <h2>Review & Submit</h2>
        <p className="section-subtitle">Verify the information and submit your claim.</p>
      </div>

      <div className="completion-summary">
        <div className="completion-score">
          <div className="score-circle" style={{ '--score': completionScore }}><span className="score-value">{completionScore}%</span></div>
          <div className="score-label">{completionScore >= 80 ? 'Excellent Detail' : completionScore >= 60 ? 'Good Coverage' : 'Consider Adding More'}</div>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-section">
          <h4>Employee</h4>
          <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
          <p><strong>Occupation:</strong> {formData.occupation || '—'}</p>
          <p><strong>DOH:</strong> {formData.dateOfHire || '—'}</p>
        </div>
        <div className="summary-section">
          <h4>Claim</h4>
          <p><strong>Entity:</strong> {formData.entity || '—'}</p>
          <p><strong>Date:</strong> {formData.dateOfInjury || '—'} at {formData.timeOfInjury || '—'}</p>
          <p><strong>Type:</strong> {injuryTypes.find(t => t.value === formData.injuryType)?.label || '—'}</p>
        </div>
        <div className="summary-section">
          <h4>Evidence</h4>
          <p><strong>Video:</strong> {formData.hasVideo === true ? 'Yes' : formData.hasVideo === false ? 'No' : '—'}</p>
          <p><strong>Witness 1:</strong> {formData.witness1Name || 'None'}</p>
          <p><strong>Witness 2:</strong> {formData.witness2Name || 'None'}</p>
        </div>
        <div className="summary-section">
          <h4>Flags</h4>
          <p><strong>Validity Concerns:</strong> {formData.validityConcerns === true ? 'Yes' : 'No'}</p>
          <p><strong>Fraud Indicators:</strong> {formData.fraudIndicators.length} flagged</p>
          <p><strong>Subrogation:</strong> {formData.thirdPartyInvolved === true ? 'Yes' : formData.thirdPartyInvolved === 'maybe' ? 'Possible' : 'No'}</p>
        </div>
      </div>

      <div style={{marginTop:24, paddingTop:20, borderTop:'1px solid rgba(139,148,158,0.15)'}}>
        <h3 style={{fontSize:16, fontWeight:600, color:'#f0f6fc', marginBottom:16}}>Submitter Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Your Name <span className="required">*</span></label>
            <input type="text" value={formData.submitterName} onChange={(e) => updateField('submitterName', e.target.value)} placeholder="Your full name" className="input-field" />
          </div>
          <div className="form-group">
            <label>Your Phone <span className="required">*</span></label>
            <input type="tel" value={formData.submitterPhone} onChange={(e) => updateField('submitterPhone', e.target.value)} placeholder="(555) 555-5555" className="input-field" />
          </div>
          <div className="form-group" style={{gridColumn:'1 / -1'}}>
            <label>Your Email <span className="required">*</span></label>
            <input type="email" value={formData.submitterEmail} onChange={(e) => updateField('submitterEmail', e.target.value)} placeholder="you@company.com" className="input-field" />
            <p style={{fontSize:12, color:'#6e7681', marginTop:6}}>A confirmation email will be sent to this address.</p>
          </div>
        </div>
      </div>

      <div className="form-group full-width" style={{marginTop:20}}>
        <label>Additional Comments</label>
        <textarea value={formData.additionalComments} onChange={(e) => updateField('additionalComments', e.target.value)} placeholder="Any other details that should be noted..." className="input-field" rows={3} />
      </div>

      <div className="form-group full-width" style={{marginTop:16}}>
        <label>Upload Documents (Optional)</label>
        <div style={{padding:20, border:'2px dashed rgba(139,148,158,0.3)', borderRadius:12, textAlign:'center', background:'rgba(22,27,34,0.3)'}}>
          <input type="file" id="files" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{display:'none'}} />
          <label htmlFor="files" style={{cursor:'pointer', color:'#58a6ff'}}>
            <div style={{fontSize:32, marginBottom:8}}>📎</div>
            <div>Click to upload files</div>
            <div style={{fontSize:12, color:'#6e7681', marginTop:4}}>PDF, JPG, PNG, DOC, DOCX (max 10MB each)</div>
          </label>
        </div>
      </div>

      <div className="certification-box">
        <p><strong>THE ABOVE REPORT IS TRUE AND CORRECT.</strong></p>
        <p>By submitting this claim, you certify that the information provided is accurate to the best of your knowledge.</p>
      </div>
    </div>
  );

  // ═══ STEP RENDERER ═══
  const renderStep = () => {
    switch(currentStep) {
      case 0: return renderEmployeeInfo();
      case 1: return renderClaimInfo();
      case 2: return renderIncidentDetails();
      case 3: return renderMedical();
      case 4: return renderEvidence();
      case 5: return renderWorkStatus();
      case 6: return renderRootCause();
      case 7: return renderInvestigation();
      case 8: return renderSubmit();
      default: return renderEmployeeInfo();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="claim-intake-portal">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .claim-intake-portal { font-family: 'DM Sans', sans-serif; background: linear-gradient(145deg, #0d1117 0%, #161b22 50%, #1a1f26 100%); min-height: 100vh; color: #e6edf3; }
        .portal-header { background: linear-gradient(180deg, rgba(45, 50, 58, 0.95) 0%, rgba(22, 27, 34, 0.98) 100%); border-bottom: 1px solid rgba(139, 148, 158, 0.2); padding: 16px 32px; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(20px); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .brand { display: flex; align-items: center; gap: 16px; }
        .brand-logo { width: 48px; height: 48px; background: linear-gradient(135deg, #58a6ff 0%, #1f6feb 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: white; box-shadow: 0 4px 12px rgba(88, 166, 255, 0.3); }
        .brand-text h1 { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 600; color: #f0f6fc; letter-spacing: -0.5px; }
        .brand-text p { font-size: 11px; color: #8b949e; margin-top: 2px; }
        .completion-badge { display: flex; align-items: center; gap: 12px; background: rgba(45, 50, 58, 0.6); padding: 10px 16px; border-radius: 12px; border: 1px solid rgba(139, 148, 158, 0.2); }
        .completion-bar { width: 100px; height: 8px; background: rgba(139, 148, 158, 0.2); border-radius: 4px; overflow: hidden; }
        .completion-fill { height: 100%; background: linear-gradient(90deg, #238636 0%, #2ea043 100%); border-radius: 4px; transition: width 0.5s ease; }
        .completion-text { font-size: 13px; font-weight: 600; color: #8b949e; }
        .portal-body { display: flex; max-width: 1400px; margin: 0 auto; padding: 24px; gap: 24px; }
        .steps-sidebar { width: 240px; flex-shrink: 0; position: sticky; top: 100px; height: fit-content; }
        .steps-list { background: rgba(45, 50, 58, 0.4); border-radius: 16px; border: 1px solid rgba(139, 148, 158, 0.15); padding: 12px; }
        .step-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; margin-bottom: 2px; }
        .step-item:hover { background: rgba(88, 166, 255, 0.08); }
        .step-item.active { background: rgba(88, 166, 255, 0.15); border: 1px solid rgba(88, 166, 255, 0.3); }
        .step-item.completed { opacity: 0.7; }
        .step-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; background: rgba(139, 148, 158, 0.15); }
        .step-item.active .step-icon { background: rgba(88, 166, 255, 0.2); }
        .step-item.completed .step-icon { background: rgba(35, 134, 54, 0.2); }
        .step-title { font-size: 13px; font-weight: 500; color: #c9d1d9; }
        .step-item.active .step-title { color: #58a6ff; }
        .main-content { flex: 1; min-width: 0; }
        .step-content { background: rgba(45, 50, 58, 0.4); border-radius: 20px; border: 1px solid rgba(139, 148, 158, 0.15); padding: 28px; }
        .section-header { margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid rgba(139, 148, 158, 0.15); }
        .section-header h2 { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 600; color: #f0f6fc; margin-bottom: 6px; }
        .section-subtitle { font-size: 14px; color: #8b949e; line-height: 1.5; }
        .section-subtitle .highlight { color: #58a6ff; font-weight: 500; }
        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { font-size: 13px; font-weight: 500; color: #c9d1d9; }
        .required { color: #f85149; }
        .input-field { background: rgba(22, 27, 34, 0.8); border: 1px solid rgba(139, 148, 158, 0.25); border-radius: 10px; padding: 12px 14px; font-size: 14px; color: #e6edf3; font-family: 'DM Sans', sans-serif; transition: all 0.2s ease; width: 100%; }
        .input-field:focus { outline: none; border-color: #58a6ff; box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15); }
        .input-field::placeholder { color: #6e7681; }
        .textarea-large { min-height: 100px; resize: vertical; }
        .toggle-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .toggle-btn { padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(139, 148, 158, 0.25); background: rgba(22, 27, 34, 0.6); color: #8b949e; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; font-family: 'DM Sans', sans-serif; }
        .toggle-btn:hover { border-color: rgba(139, 148, 158, 0.4); background: rgba(22, 27, 34, 0.8); }
        .toggle-btn.active { background: rgba(88, 166, 255, 0.15); border-color: #58a6ff; color: #58a6ff; }
        .toggle-btn.active.success { background: rgba(35, 134, 54, 0.15); border-color: #238636; color: #3fb950; }
        .toggle-btn.active.warning { background: rgba(210, 153, 34, 0.15); border-color: #d29922; color: #e3b341; }
        .injury-type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .injury-type-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 12px; border-radius: 12px; border: 1px solid rgba(139, 148, 158, 0.2); background: rgba(22, 27, 34, 0.5); cursor: pointer; transition: all 0.2s ease; font-family: 'DM Sans', sans-serif; }
        .injury-type-btn:hover { border-color: rgba(139, 148, 158, 0.4); transform: translateY(-2px); }
        .injury-type-btn.active { background: rgba(88, 166, 255, 0.12); border-color: #58a6ff; box-shadow: 0 4px 12px rgba(88, 166, 255, 0.15); }
        .injury-icon { font-size: 24px; }
        .injury-label { font-size: 12px; color: #c9d1d9; text-align: center; font-weight: 500; }
        .smart-tips-panel { background: linear-gradient(135deg, rgba(88, 166, 255, 0.08) 0%, rgba(31, 111, 235, 0.05) 100%); border: 1px solid rgba(88, 166, 255, 0.2); border-radius: 14px; padding: 18px 20px; margin: 20px 0; }
        .smart-tips-panel h4 { font-size: 14px; color: #58a6ff; margin-bottom: 12px; font-weight: 600; }
        .smart-tips-panel ul { list-style: none; }
        .smart-tips-panel li { position: relative; padding-left: 18px; margin-bottom: 8px; font-size: 13px; color: #c9d1d9; line-height: 1.4; }
        .smart-tips-panel li::before { content: '→'; position: absolute; left: 0; color: #58a6ff; }
        .body-parts-grid, .root-cause-grid, .corrective-actions-grid, .fraud-indicators-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .body-part-btn, .root-cause-btn, .corrective-btn, .fraud-btn { padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(139, 148, 158, 0.2); background: rgba(22, 27, 34, 0.5); color: #8b949e; font-size: 12px; cursor: pointer; transition: all 0.2s ease; font-family: 'DM Sans', sans-serif; }
        .body-part-btn:hover, .root-cause-btn:hover, .corrective-btn:hover, .fraud-btn:hover { border-color: rgba(139, 148, 158, 0.4); }
        .body-part-btn.active { background: rgba(88, 166, 255, 0.12); border-color: #58a6ff; color: #58a6ff; }
        .root-cause-btn.active { background: rgba(210, 153, 34, 0.12); border-color: #d29922; color: #e3b341; }
        .corrective-btn.active { background: rgba(35, 134, 54, 0.12); border-color: #238636; color: #3fb950; }
        .fraud-btn.active { background: rgba(248, 81, 73, 0.1); border-color: rgba(248, 81, 73, 0.4); color: #f85149; }
        .witness-card { background: rgba(22, 27, 34, 0.5); border: 1px solid rgba(139, 148, 158, 0.15); border-radius: 12px; padding: 16px; }
        .witness-header { font-size: 13px; font-weight: 600; color: #58a6ff; margin-bottom: 12px; }
        .root-cause-explainer { background: rgba(22, 27, 34, 0.6); border-radius: 14px; padding: 20px; margin-bottom: 24px; }
        .root-cause-explainer h4 { font-size: 13px; color: #8b949e; margin-bottom: 14px; }
        .event-chain { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
        .chain-item { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; }
        .chain-item.direct { background: rgba(248, 81, 73, 0.15); color: #f85149; border: 1px solid rgba(248, 81, 73, 0.3); }
        .chain-item.symptom { background: rgba(210, 153, 34, 0.15); color: #e3b341; border: 1px solid rgba(210, 153, 34, 0.3); }
        .chain-item.root { background: rgba(35, 134, 54, 0.15); color: #3fb950; border: 1px solid rgba(35, 134, 54, 0.3); }
        .chain-arrow { color: #6e7681; font-size: 16px; }
        .chain-legend { font-size: 11px; color: #6e7681; }
        .legend-direct { color: #f85149; margin-right: 8px; }
        .legend-symptom { color: #e3b341; margin: 0 8px; }
        .legend-root { color: #3fb950; margin-left: 8px; }
        .procedures-section, .subrogation-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(139, 148, 158, 0.15); }
        .procedures-section h3, .subrogation-section h3 { font-size: 16px; font-weight: 600; color: #f0f6fc; margin-bottom: 16px; }
        .disclaimer-box { background: rgba(210, 153, 34, 0.1); border: 1px solid rgba(210, 153, 34, 0.3); border-radius: 10px; padding: 14px; font-size: 13px; color: #e3b341; margin-bottom: 20px; }
        .completion-summary { display: flex; justify-content: center; margin-bottom: 28px; }
        .completion-score { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .score-circle { width: 100px; height: 100px; border-radius: 50%; background: conic-gradient(#238636 calc(var(--score) * 1%), rgba(139, 148, 158, 0.2) calc(var(--score) * 1%)); display: flex; align-items: center; justify-content: center; position: relative; }
        .score-circle::before { content: ''; position: absolute; width: 80px; height: 80px; background: #1a1f26; border-radius: 50%; }
        .score-value { position: relative; font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: #3fb950; }
        .score-label { font-size: 13px; color: #8b949e; font-weight: 500; }
        .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
        .summary-section { background: rgba(22, 27, 34, 0.5); border-radius: 12px; padding: 16px; border: 1px solid rgba(139, 148, 158, 0.15); }
        .summary-section h4 { font-size: 13px; color: #58a6ff; margin-bottom: 10px; font-weight: 600; }
        .summary-section p { font-size: 12px; color: #c9d1d9; margin-bottom: 6px; }
        .summary-section strong { color: #8b949e; }
        .certification-box { background: rgba(22, 27, 34, 0.6); border: 1px solid rgba(139, 148, 158, 0.2); border-radius: 12px; padding: 20px; text-align: center; margin-top: 20px; }
        .certification-box p:first-child { font-size: 13px; color: #f0f6fc; margin-bottom: 6px; }
        .certification-box p:last-child { font-size: 12px; color: #8b949e; }
        .nav-buttons { display: flex; justify-content: space-between; margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(139, 148, 158, 0.15); }
        .nav-btn { padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: 'DM Sans', sans-serif; }
        .nav-btn.secondary { background: transparent; border: 1px solid rgba(139, 148, 158, 0.3); color: #8b949e; }
        .nav-btn.secondary:hover { border-color: rgba(139, 148, 158, 0.5); color: #c9d1d9; }
        .nav-btn.primary { background: linear-gradient(135deg, #238636 0%, #2ea043 100%); border: none; color: white; box-shadow: 0 4px 12px rgba(35, 134, 54, 0.3); }
        .nav-btn.primary:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(35, 134, 54, 0.4); }
        .nav-btn.submit { background: linear-gradient(135deg, #58a6ff 0%, #1f6feb 100%); box-shadow: 0 4px 12px rgba(88, 166, 255, 0.3); }
        .nav-btn.submit:hover { box-shadow: 0 6px 16px rgba(88, 166, 255, 0.4); }
        @media (max-width: 1024px) {
          .portal-body { flex-direction: column; }
          .steps-sidebar { width: 100%; position: static; }
          .steps-list { display: flex; overflow-x: auto; gap: 8px; padding: 10px; }
          .step-item { flex-shrink: 0; margin-bottom: 0; padding: 10px 12px; }
          .form-grid, .summary-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <header className="portal-header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-logo">TDG</div>
            <div className="brand-text">
              <h1>Smart Claim Intake</h1>
              <p>Titanium Defense Group • WCReporting.com</p>
            </div>
          </div>
          <div className="completion-badge">
            <div className="completion-bar">
              <div className="completion-fill" style={{ width: `${completionScore}%` }} />
            </div>
            <span className="completion-text">{completionScore}%</span>
          </div>
        </div>
      </header>

      <div className="portal-body">
        <aside className="steps-sidebar">
          <div className="steps-list">
            {steps.map((step, index) => (
              <div key={step.id} className={`step-item ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`} onClick={() => setCurrentStep(index)}>
                <div className="step-icon">{step.icon}</div>
                <span className="step-title">{step.title}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="main-content">
          {renderStep()}
          <div className="nav-buttons">
            <button className="nav-btn secondary" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} style={{ opacity: currentStep === 0 ? 0.5 : 1 }}>← Back</button>
            {currentStep < steps.length - 1 ? (
              <button className="nav-btn primary" onClick={() => setCurrentStep(currentStep + 1)}>Continue →</button>
            ) : (
              <button className="nav-btn primary submit">Submit Claim</button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SmartClaimIntake;
