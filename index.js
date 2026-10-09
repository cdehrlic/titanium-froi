const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
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
  CONTACT_EMAIL: process.env.CONTACT_EMAIL || 'info@comp-shield.com',
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

// ---- Host-based domain split ----------------------------------------------
// comp-shield.com  = full marketing site + CompShield-branded claim portal (cs-*.html)
// wcreporting.com  = Titanium-branded claim reporting portal only
// Any other host (e.g. Railway's *.up.railway.app) is served normally.
const PORTAL_PATHS = ['/report', '/portal', '/followup', '/statement', '/livewell'];
const isCSHost = req => ((req.headers.host || '').split(':')[0].replace(/^www\./, '').toLowerCase()) === 'comp-shield.com';
const siteBase = req => isCSHost(req) ? 'https://www.comp-shield.com' : CONFIG.BASE_URL;
app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0].replace(/^www\./, '').toLowerCase();
  const p = req.path;
  const isPortal = PORTAL_PATHS.some(x => p === x || p.startsWith(x + '/'))
    || p === '/index.html' || p === '/portal.html' || p === '/followup.html';
  const isApi = p.startsWith('/api/');
  const isAsset = /\.(css|js|mjs|svg|png|jpe?g|webp|gif|ico|pdf|xml|txt|json|woff2?|ttf|map|webmanifest)$/i.test(p);

  if (host === 'wcreporting.com') {
    if (p === '/') return res.redirect(302, '/report');
    if (!isPortal && !isApi && !isAsset) {
      return res.redirect(301, 'https://www.comp-shield.com' + req.originalUrl);
    }
  } else if (host === 'comp-shield.com') {
    // Serve CompShield-branded portal files for direct .html hits
    // (route-level handlers below cover /report, /portal, /statement/:token)
    if (p === '/index.html') return res.sendFile(path.join(__dirname, 'cs-report.html'));
    if (p === '/portal.html') return res.sendFile(path.join(__dirname, 'cs-portal.html'));
    if (p === '/followup.html') return res.sendFile(path.join(__dirname, 'cs-followup.html'));
  }
  next();
});

// Serve static files from current directory.
// index:false so "/" falls through to our explicit home.html route (below)
// instead of express.static auto-serving index.html.
app.use(express.static(__dirname, { index: false }));

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

// ── Outbound mail safety net ──────────────────────────────────────────────────
// Gmail hard-rejects any message over 25MB, and MIME base64 inflates payloads by
// ~37%. Uploads are capped per-file (25MB x 25 files) but never in aggregate, so
// a claim with a few phone photos could silently blow the limit: the notification
// to the claims team would be rejected while the attachment-free confirmation to
// the submitter went through, leaving nobody aware the claim had arrived.
const MAX_ATTACHMENT_BYTES = 18 * 1024 * 1024;

const attachmentBytes = list => list.reduce((n, a) => n + (a && a.content ? a.content.length : 0), 0);
const mb = bytes => (bytes / (1024 * 1024)).toFixed(1) + 'MB';

// Drop the largest attachments until the message fits, so the claim report and
// signed statements (small) survive and only bulky media is shed.
function fitAttachments(list, limit = MAX_ATTACHMENT_BYTES) {
  if (attachmentBytes(list) <= limit) return { kept: list, dropped: [] };
  const sized = list.map((a, i) => ({ a, i, size: a && a.content ? a.content.length : 0 }));
  const kept = [];
  const dropped = [];
  let total = 0;
  for (const item of [...sized].sort((x, y) => x.size - y.size)) {
    if (total + item.size <= limit) { kept.push(item); total += item.size; }
    else dropped.push(item);
  }
  kept.sort((x, y) => x.i - y.i);
  dropped.sort((x, y) => x.i - y.i);
  return { kept: kept.map(k => k.a), dropped: dropped.map(d => d.a) };
}

// One sentence for the email body naming what had to be left off.
const droppedNote = dropped => dropped.length
  ? `${dropped.length} file(s) totalling ${mb(attachmentBytes(dropped))} exceeded the 25MB email limit and could not be attached: ${dropped.map(d => d.filename).join(', ')}. The claim was received in full — ask the submitter to send these separately.`
  : null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 4xx and socket failures are transient; a 5xx rejection (too large, bad
// recipient) will fail the same way every time, so don't burn retries on it.
const isTransientSmtpError = err => {
  const code = err && err.responseCode;
  if (typeof code === 'number') return code >= 400 && code < 500;
  return ['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNRESET', 'EDNS', 'EENVELOPE'].includes(err && err.code);
};

async function sendMailWithRetry(message, { attempts = 3, label = 'email' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await transporter.sendMail(message);
    } catch (err) {
      lastErr = err;
      if (attempt === attempts || !isTransientSmtpError(err)) break;
      const wait = 1000 * Math.pow(2, attempt - 1);
      console.warn(`⚠️  ${label}: attempt ${attempt}/${attempts} failed (${err.message}); retrying in ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

// Last resort when a claims notification cannot be delivered: a tiny, plain
// message with no attachments, so a claim is never lost in silence.
async function sendFallbackAlert({ referenceNumber, entityName, summaryRows, reason }) {
  const rows = summaryRows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6e7681;">${h(k)}:</td><td style="font-weight:bold;">${h(v || 'N/A')}</td></tr>`).join('');
  await sendMailWithRetry({
    from: CONFIG.SMTP.auth.user,
    to: CONFIG.CLAIMS_EMAIL,
    subject: `[ACTION REQUIRED] ${referenceNumber} received - notification email failed`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;">
        <div style="background:#b91c1c;padding:20px;text-align:center;">
          <h2 style="color:white;margin:0;">Claim received - full notification failed to send</h2>
        </div>
        <div style="padding:20px;background:#f8fafc;">
          <p style="margin:0 0 14px;">A claim came in but its notification email could not be delivered. The details below are all that could be sent; retrieve the full record and attachments from the portal.</p>
          <table style="font-size:14px;">${rows}</table>
          <p style="margin:16px 0 0;font-size:13px;color:#6e7681;">Reason: ${h(reason)}</p>
        </div>
      </div>`
  }, { attempts: 2, label: 'fallback alert' });
}

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
  'Towne Home Care / Towne Staffing LLC',
  'Towne Homecare Payroll, LLC / Towne Kids',
  'Live Well Healthcare Solutions',
  'Advanced Care Agency / Baybay',
  'Esky Care',
  'New Premier Management LLC'
];

// ═══════════════════════════════════════════════════════════════════════════════
// LABEL MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════════
const INJURY_TYPE_LABELS = {
  'slip_trip_fall': 'Slip, Trip, or Fall',
  'fall_height': 'Fall from Height',
  'electrocution': 'Electrocution',
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
function buildFollowUpLink(referenceNumber, formData, base) {
  const name = encodeURIComponent((formData.firstName || '') + ' ' + (formData.lastName || ''));
  const dob = encodeURIComponent(formData.dateOfBirth || '');
  const doi = encodeURIComponent(formData.dateOfInjury || '');
  const entity = encodeURIComponent(getEntityName(formData));
  const industry = encodeURIComponent(formData.industry || 'healthcare');
  const lang = formData.primaryLanguage === 'Spanish' ? '&lang=es' : '';
  return `${base || CONFIG.BASE_URL}/followup.html?ref=${encodeURIComponent(referenceNumber)}&name=${name}&dob=${dob}&doi=${doi}&entity=${entity}&industry=${industry}${lang}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// Escape user-entered text before it goes into an HTML email.
function h(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// True when a value was actually answered (not null, blank, or an empty list).
function isFilled(v) {
  return v !== null && v !== undefined
    && !(typeof v === 'string' && v.trim() === '')
    && !(Array.isArray(v) && v.length === 0);
}

// Red flags the system can detect on its own from the dates and times on a report.
// Mirrors autoFlags() in portal.html so the submitter sees the same list.
function parseISODate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
function toMinutes(t) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function computeAutoFlags(fd) {
  const flags = [];
  const DAY = 86400000;
  const doi = parseISODate(fd.dateOfInjury);
  const reported = parseISODate(fd.dateReported);
  const hire = parseISODate(fd.dateOfHire);
  if (doi !== null) {
    if (doi > Date.now()) flags.push('Date of injury is in the future');
    if (new Date(doi).getUTCDay() === 1) flags.push('Injury date falls on a Monday');
  }
  if (doi !== null && reported !== null) {
    const lag = Math.round((reported - doi) / DAY);
    if (lag < 0) flags.push('Date reported is before the date of injury');
    else if (lag >= 2) flags.push('Reported ' + lag + ' days after the injury');
  }
  if (doi !== null && hire !== null) {
    const tenure = Math.round((doi - hire) / DAY);
    if (tenure < 0) flags.push('Date of injury is before the date of hire');
    else if (tenure < 90) flags.push('Injured ' + tenure + ' day' + (tenure === 1 ? '' : 's') + ' after hire');
  }
  const inj = toMinutes(fd.timeOfInjury);
  const start = toMinutes(fd.timeWorkdayBegan);
  // Only flag when the injury is shortly before the start time, so overnight shifts are not flagged.
  if (inj !== null && start !== null && inj < start && start - inj <= 8 * 60) {
    flags.push('Injury time is before the workday began');
  }
  return flags;
}

// Spanish to English translation of statement answers (optional).
// Needs ANTHROPIC_API_KEY on the server. Returns null when no key is set; throws on API errors.
const TRANSLATE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
async function translateToEnglish(fields) {
  const entries = Object.entries(fields || {}).filter(([, v]) => typeof v === 'string' && v.trim());
  if (!entries.length) return {};
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: TRANSLATE_MODEL,
        max_tokens: 4000,
        system: 'You translate workers\' compensation statements from Spanish to English for a claims file. ' +
          'Translate faithfully and literally. Keep the speaker\'s meaning, uncertainty, and word choice. ' +
          'Do not summarize, correct, clean up, or add anything. If a value is already English, return it unchanged. ' +
          'Return only a JSON object with the same keys, where each value is the English text.',
        messages: [{ role: 'user', content: JSON.stringify(Object.fromEntries(entries)) }]
      })
    });
    if (!res.ok) throw new Error('translation service returned ' + res.status);
    const json = await res.json();
    const text = (json.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end < start) throw new Error('translation response was not readable');
    return JSON.parse(text.slice(start, end + 1));
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('translation timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF LAYOUT HELPERS (statements and root cause)
// ═══════════════════════════════════════════════════════════════════════════════
const PDF_COLORS = { dark: '#1a1f26', accent: '#5ba4e6', label: '#475569', text: '#111827', muted: '#6e7681', danger: '#b91c1c', translation: '#1e40af' };
const PDF_BOTTOM = 715;

function makePdfWriter(doc) {
  const L = 50, W = 512;
  const ensure = need => { if (doc.y + need > PDF_BOTTOM) { doc.addPage(); doc.y = 50; } };
  return {
    ensure,
    header(title, subtitle) {
      doc.rect(0, 0, 612, 70).fill(PDF_COLORS.dark);
      doc.fontSize(18).font('Helvetica-Bold').fillColor('white').text(title, L, 22, { width: W });
      doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text(subtitle, L, 46, { width: W });
      doc.y = 88;
    },
    banner(text, color) {
      const height = doc.heightOfString(text, { width: W - 20 }) + 16;
      ensure(height + 10);
      const top = doc.y;
      doc.rect(L, top, W, height).fill(color);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('white').text(text, L + 10, top + 8, { width: W - 20 });
      doc.y = top + height + 12;
    },
    section(title, subtitle) {
      ensure(60);
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(PDF_COLORS.dark).text(title.toUpperCase(), L, doc.y, { width: W });
      if (subtitle) doc.font('Helvetica-Oblique').fontSize(8).fillColor(PDF_COLORS.muted).text(subtitle, L, doc.y, { width: W });
      const y = doc.y + 3;
      doc.moveTo(L, y).lineTo(L + 200, y).lineWidth(1).stroke(PDF_COLORS.accent);
      doc.y = y + 8;
    },
    // A question and its answer. altLabel shows under the label (Spanish wording), translation under the answer.
    field(label, value, altLabel, translation) {
      ensure(42);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(PDF_COLORS.label).text(label, L, doc.y, { width: W });
      if (altLabel) doc.font('Helvetica-Oblique').fontSize(8).fillColor(PDF_COLORS.muted).text(altLabel, L, doc.y, { width: W });
      doc.moveDown(0.15);
      doc.font('Helvetica').fontSize(10).fillColor(PDF_COLORS.text).text(String(value), L, doc.y, { width: W });
      if (translation) {
        doc.moveDown(0.15);
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(PDF_COLORS.translation).text('English translation: ' + translation, L, doc.y, { width: W });
      }
      doc.moveDown(0.6);
    },
    bullets(items) {
      items.forEach(item => {
        ensure(16);
        doc.font('Helvetica').fontSize(10).fillColor(PDF_COLORS.text).text('\u2022  ' + item, L + 6, doc.y, { width: W - 6 });
        doc.moveDown(0.2);
      });
      doc.moveDown(0.4);
    },
    paragraph(text, opts = {}) {
      ensure(30);
      doc.font(opts.font || 'Helvetica').fontSize(opts.size || 9).fillColor(opts.color || '#333333').text(text, L, doc.y, { width: W });
      doc.moveDown(0.6);
    },
    // Footer on every page: document name, claim reference, page numbers, and the hash on the last page.
    footer(label, hash) {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const bottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.muted)
          .text(label + '  |  Page ' + (i - range.start + 1) + ' of ' + range.count, L, 748, { width: W, align: 'center', lineBreak: false });
        if (hash && i === range.start + range.count - 1) {
          doc.fontSize(7).fillColor('#94a3b8').text('Document Hash: ' + hash, L, 760, { width: W, align: 'center', lineBreak: false });
        }
        doc.page.margins.bottom = bottom;
      }
    }
  };
}

function pdfToBuffer(build) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER', bufferPages: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      build(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATEMENT PDFs (witness and claimant)
// ═══════════════════════════════════════════════════════════════════════════════
const RELATIONSHIP_LABELS = { coworker: 'Coworker', supervisor: 'Supervisor', manager: 'Manager', other: 'Other' };
const OBSERVATION_LABELS = { saw: 'Yes, saw the injury happen', after: 'No, arrived right after it happened', heard: 'No, heard about it later' };
const PRIOR_INJURY_LABELS = { no: 'No', yes_same: 'Yes, same body part', yes_work: 'Yes, prior work injury', yes_other: 'Yes, other injury' };
const ABLE_TO_WORK_LABELS = { yes_full: 'Yes, full duties', yes_light: 'Yes, light duty', no: 'No, unable to work' };
const YES_NO_LABELS = { yes: 'Yes', no: 'No', unsure: 'Not sure' };

// [key, English question, Spanish question, code map (optional), translate free text?]
const STATEMENT_LAYOUT = {
  witness: {
    title: 'WITNESS STATEMENT',
    titleEs: 'Declaración de testigo',
    nameKey: 'witnessName',
    sections: [
      { title: 'Witness Information', es: 'Información del testigo', fields: [
        ['witnessName', 'Name', 'Nombre'],
        ['witnessPhone', 'Phone', 'Teléfono'],
        ['witnessEmail', 'Email', 'Correo electrónico'],
        ['relationship', 'Relationship to the injured worker', 'Relación con el empleado lesionado', RELATIONSHIP_LABELS],
        ['witnessLocation', 'Where the witness was during the incident', '¿Dónde estaba usted durante el incidente?', null, true]
      ]},
      { title: 'What the Witness Observed', es: 'Lo que observó el testigo', fields: [
        ['observation', 'Did the witness see the injury happen?', '¿Vio usted cuando ocurrió la lesión?', OBSERVATION_LABELS],
        ['statement', 'Statement', 'Declaración', null, true],
        ['claimantSaidAfter', 'What the injured worker said right after', '¿Qué dijo el empleado justo después?', null, true],
        ['othersPresent', 'Other people present', 'Otras personas presentes', null, true],
        ['conditions', 'Conditions at the time (lighting, floor, equipment)', 'Condiciones en ese momento (iluminación, piso, equipo)', null, true]
      ]}
    ],
    certify: name => 'I, ' + name + ', certify that the above statement is true and correct to the best of my knowledge. I understand that this statement may be used in connection with a workers\' compensation claim and that providing false information may result in legal consequences.'
  },
  claimant: {
    title: 'CLAIMANT STATEMENT',
    titleEs: 'Declaración del empleado',
    nameKey: 'claimantName',
    sections: [
      { title: 'Claimant Information', es: 'Información del empleado', fields: [
        ['claimantName', 'Name', 'Nombre'],
        ['dateOfBirth', 'Date of birth', 'Fecha de nacimiento'],
        ['claimantPhone', 'Phone', 'Teléfono'],
        ['claimantEmail', 'Email', 'Correo electrónico'],
        ['employer', 'Employer', 'Empleador'],
        ['jobTitle', 'Job title', 'Puesto']
      ]},
      { title: 'The Incident', es: 'El incidente', fields: [
        ['incidentDescription', 'What happened, in the worker\'s own words', 'Lo que pasó, en sus propias palabras', null, true],
        ['firstReportedDate', 'Date the injury was first reported', 'Fecha en que reportó la lesión por primera vez'],
        ['firstReportedTo', 'Who it was first reported to', '¿A quién se lo reportó primero?', null, true]
      ]},
      { title: 'Injury and Work Status', es: 'Lesión y estado de trabajo', fields: [
        ['bodyPartsInjured', 'Body parts injured', 'Partes del cuerpo lesionadas', null, true],
        ['currentSymptoms', 'Current symptoms', 'Síntomas actuales', null, true],
        ['medicalTreatment', 'Medical treatment received', 'Tratamiento médico recibido', null, true],
        ['ableToWork', 'Able to work?', '¿Puede trabajar?', ABLE_TO_WORK_LABELS]
      ]},
      { title: 'Prior Injuries and Other Work', es: 'Lesiones anteriores y otros trabajos', fields: [
        ['priorInjury', 'Prior injury to this or another body part?', '¿Ha tenido una lesión antes?', PRIOR_INJURY_LABELS],
        ['priorInjuryBodyPart', 'Prior injury: body part', 'Lesión anterior: parte del cuerpo', null, true],
        ['priorInjuryYear', 'Prior injury: year', 'Lesión anterior: año'],
        ['priorClaimFiled', 'Prior injury: was a claim filed?', 'Lesión anterior: ¿presentó un reclamo?', YES_NO_LABELS],
        ['priorDoctors', 'Doctors seen for prior injuries', 'Médicos que lo atendieron por lesiones anteriores', null, true],
        ['otherEmployment', 'Other jobs or side work', 'Otros trabajos o trabajos extra', null, true],
        ['outsideActivities', 'Activities outside work (sports, hobbies, second job duties)', 'Actividades fuera del trabajo (deportes, pasatiempos)', null, true]
      ]}
    ],
    certify: name => 'I, ' + name + ', certify that the information provided above is true and correct to the best of my knowledge. I understand that this statement will be used in connection with my workers\' compensation claim. I acknowledge that providing false or misleading information may result in denial of benefits and/or legal consequences including criminal prosecution.'
  }
};

// Keys whose answers are free text and should be translated when the statement is in Spanish.
function statementTranslateKeys(kind) {
  const keys = [];
  STATEMENT_LAYOUT[kind].sections.forEach(s => s.fields.forEach(f => { if (f[4]) keys.push(f[0]); }));
  return keys;
}

function buildStatementPDF(kind, data, signatureData, opts) {
  opts = opts || {};
  signatureData = signatureData || {};
  const layout = STATEMENT_LAYOUT[kind];
  const signed = opts.signed !== false;
  const spanish = data.language === 'es';
  const translations = opts.translations || {};
  const entityName = data.entityName || 'Workers Compensation Claim';
  if (kind === 'claimant' && !isFilled(data.employer)) data = { ...data, employer: entityName };

  return pdfToBuffer(doc => {
    const w = makePdfWriter(doc);
    w.header(layout.title + (spanish ? '  /  ' + layout.titleEs : ''), entityName + ' | www.wcreporting.com');

    if (!signed) {
      w.banner('UNSIGNED: this statement was submitted without a signature. Treat it as an unsigned account until a signed copy is obtained.', PDF_COLORS.danger);
    }

    w.section('Claim');
    w.field('Claim reference', data.claimRef || 'N/A');
    if (isFilled(data.dateOfInjury)) w.field('Date of injury', data.dateOfInjury);
    w.field('Statement date', new Date().toLocaleDateString('en-US'));
    if (spanish) {
      const note = opts.translationNote
        || (Object.keys(translations).length ? 'Given in Spanish. The original answers are shown with an English translation under each one.' : 'Given in Spanish. Original answers shown.');
      w.field('Language', note);
    }

    layout.sections.forEach(section => {
      const rows = section.fields.filter(f => isFilled(data[f[0]]) || f[0] === 'statement' || f[0] === 'incidentDescription');
      if (!rows.length) return;
      w.section(section.title, spanish ? section.es : null);
      section.fields.forEach(([key, label, labelEs, codes, translate]) => {
        let value = data[key];
        if (!isFilled(value)) {
          if (key === 'statement' || key === 'incidentDescription') value = 'No statement provided.';
          else return;
        }
        if (codes) value = codes[value] || value;
        const translation = spanish && translate ? translations[key] : null;
        w.field(label, value, spanish ? labelEs : null, translation && translation !== data[key] ? translation : null);
      });
    });

    if (data.hasAudioRecording) {
      w.section('Audio');
      w.paragraph('An audio recording of this statement is attached to the same email as this PDF.', { size: 10 });
    }

    w.section('Signature');
    const signerName = signatureData.typedName || data.typedName || data[layout.nameKey] || '';
    if (signed) {
      w.paragraph(layout.certify(signerName || '[name not provided]'));
      if (signatureData.signatureImage) {
        try {
          const sigBuffer = Buffer.from(String(signatureData.signatureImage).replace(/^data:image\/\w+;base64,/, ''), 'base64');
          w.ensure(75);
          const sigTop = doc.y;
          doc.image(sigBuffer, 50, sigTop, { width: 200, height: 60 });
          doc.y = sigTop + 68;
        } catch (e) {
          w.paragraph('[Drawn signature could not be rendered; typed signature below]');
        }
      }
      w.field('Typed name', signatureData.typedName || 'N/A');
      w.field('Date signed', signatureData.signedAt || new Date().toISOString());
      w.field('IP address', signatureData.ipAddress || 'N/A');
      const legal = 'This document was electronically signed in accordance with the Electronic Signatures in Global and National Commerce Act (E-SIGN Act, 15 U.S.C. \u00A7 7001 et seq.) and the Uniform Electronic Transactions Act (UETA). The signer consented to conduct this transaction electronically and acknowledged that an electronic signature has the same legal effect as a handwritten signature.';
      const boxH = doc.font('Helvetica').fontSize(8).heightOfString(legal, { width: 492 }) + 26;
      w.ensure(boxH + 10);
      const top = doc.y;
      doc.rect(50, top, 512, boxH).fill('#f0f6fc');
      doc.font('Helvetica-Bold').fontSize(8).fillColor(PDF_COLORS.muted).text('ELECTRONIC SIGNATURE CERTIFICATION', 60, top + 8, { width: 492 });
      doc.font('Helvetica').fontSize(8).fillColor(PDF_COLORS.muted).text(legal, 60, doc.y + 2, { width: 492 });
      doc.y = top + boxH + 8;
    } else {
      w.paragraph('Not signed. The person did not complete the electronic signature for this statement.', { size: 10, font: 'Helvetica-Bold', color: PDF_COLORS.danger });
      if (isFilled(signatureData.typedName)) w.field('Name typed (not signed)', signatureData.typedName);
    }

    w.footer(layout.title + (signed ? '' : ' (UNSIGNED)') + '  |  ' + (data.claimRef || ''), signatureData.documentHash);
  });
}

function generateWitnessStatementPDF(data, signatureData, opts) {
  return buildStatementPDF('witness', data, signatureData, opts);
}

function generateClaimantStatementPDF(data, signatureData, opts) {
  return buildStatementPDF('claimant', data, signatureData, opts);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT CAUSE ANALYSIS PDF
// ═══════════════════════════════════════════════════════════════════════════════
function hasRootCauseContent(rc) {
  return !!rc && (isFilled(rc.directCause) || isFilled(rc.factors) || isFilled(rc.actions)
    || typeof rc.proceduresExisted === 'boolean' || typeof rc.trainingProvided === 'boolean');
}

function generateRootCausePDF(rc, referenceNumber, entityName) {
  const yn = v => v === true ? 'Yes' : v === false ? 'No' : null;
  return pdfToBuffer(doc => {
    const w = makePdfWriter(doc);
    w.header('ROOT CAUSE ANALYSIS', (entityName || 'Workers Compensation Claim') + ' | www.wcreporting.com');
    w.section('Claim');
    w.field('Claim reference', referenceNumber || 'N/A');
    if (isFilled(rc.dateOfInjury)) w.field('Date of injury', rc.dateOfInjury);
    w.field('Completed', new Date().toLocaleDateString('en-US'));
    if (isFilled(rc.completedBy)) w.field('Completed by', rc.completedBy);

    w.section('Cause');
    w.field('Direct cause of the incident', isFilled(rc.directCause) ? rc.directCause : 'Not provided');
    if (yn(rc.proceduresExisted)) w.field('Were procedures in place?', yn(rc.proceduresExisted));
    if (yn(rc.trainingProvided)) w.field('Was training provided?', yn(rc.trainingProvided));

    w.section('Contributing Factors');
    if (isFilled(rc.factors)) w.bullets(rc.factors); else w.paragraph('None selected.', { size: 10 });

    w.section('Corrective Actions');
    if (isFilled(rc.actions)) w.bullets(rc.actions); else w.paragraph('None selected.', { size: 10 });

    w.footer('ROOT CAUSE ANALYSIS  |  ' + (referenceNumber || ''));
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

    // ── Helpers for complete, clean reporting ──────────────────────────────────
    // Present? (skip null/undefined/blank strings/empty arrays)
    const has = v => v !== null && v !== undefined
      && !(typeof v === 'string' && v.trim() === '')
      && !(Array.isArray(v) && v.length === 0);
    // Boolean → Yes/No (null/undefined = unanswered → skipped)
    const yesNo = v => v === true ? 'Yes' : v === false ? 'No' : null;
    // Map an array of coded values to friendly labels using a label map
    const mapCodes = (arr, MAP) => Array.isArray(arr)
      ? arr.map(c => (MAP && MAP[c]) || c).join(', ')
      : '';
    // Add a field only when it has a value
    function addFieldIf(label, value) { if (has(value)) addField(label, value); }
    // Page-break-aware wrapped paragraph for long free-text fields
    function addLongText(label, text) {
      if (!has(text)) return;
      if (doc.y > 680) { doc.addPage(); doc.y = 50; }
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.muted).text(label + ':', 60, doc.y);
      doc.moveDown(0.2);
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text(text, 60, doc.y, { width: 490 });
      doc.moveDown(0.5);
    }

    // ── 1. EMPLOYEE PERSONAL INFORMATION ───────────────────────────────────────
    addSection('EMPLOYEE PERSONAL INFORMATION');
    addFieldRow([{ label: 'Name', value: (formData.firstName || '') + ' ' + (formData.lastName || '') }, { label: 'DOB', value: formData.dateOfBirth }]);
    addFieldRow([{ label: 'Phone', value: formData.phone }, { label: 'Date of Hire', value: formData.dateOfHire }]);
    addFieldRow([{ label: 'SSN', value: formData.ssn || 'N/A' }, { label: 'Occupation', value: formData.occupation }]);
    if (has(formData.mailingAddress) || has(formData.city) || has(formData.state) || has(formData.zipCode)) {
      const addressParts = [formData.mailingAddress, formData.city, formData.state, formData.zipCode].filter(Boolean);
      addField('Address', addressParts.join(', '));
    }
    addFieldIf('Weekly Wage', formData.weeklyWage);
    addFieldIf('Employment Type', formData.workType);
    addFieldIf('Days Worked Per Week', formData.daysPerWeek);
    addFieldIf('Primary Language', formData.primaryLanguage === 'Other' ? (formData.primaryLanguageOther || 'Other') : formData.primaryLanguage);
    if (has(formData.normalSchedule) || has(formData.hoursPerWeek)) {
      addFieldRow([{ label: 'Normal Schedule', value: formData.normalSchedule }, { label: 'Hours/Week', value: formData.hoursPerWeek }]);
    }

    // ── 2. CLAIM INFORMATION ───────────────────────────────────────────────────
    addSection('CLAIM INFORMATION');
    addField('Entity', entityName);
    addFieldRow([{ label: 'Date of Injury', value: formData.dateOfInjury }, { label: 'Time', value: formData.timeOfInjury }]);
    addFieldIf('Time Workday Began', formData.timeWorkdayBegan);
    addFieldRow([{ label: 'Date Reported', value: formData.dateReported }, { label: 'Reported Immediately', value: formData.reportedImmediately === true ? 'Yes' : formData.reportedImmediately === false ? 'NO (delayed)' : 'N/A' }]);

    // ── 3. INCIDENT DETAILS ────────────────────────────────────────────────────
    addSection('INCIDENT DETAILS');
    addField('Injury Type', INJURY_TYPE_LABELS[formData.injuryType] || formData.injuryType);
    addFieldIf('Nature of Injury', formData.natureOfInjury);
    addFieldIf('Cause of Injury', formData.causeOfInjury);
    const bodyPartsList = [
      ...(Array.isArray(formData.bodyParts) ? formData.bodyParts : (formData.bodyParts ? [formData.bodyParts] : [])),
      formData.customBodyPart
    ].filter(Boolean);
    addField('Body Parts', bodyPartsList.join(', '));
    // Worksite & accident location
    const wsParts = [formData.worksiteStreet, formData.worksiteCity, formData.worksiteState, formData.worksiteZip].filter(Boolean).join(', ');
    const worksiteLoc = [formData.worksiteName, wsParts].filter(Boolean).join(' — ');
    addFieldIf('Worksite Location', worksiteLoc);
    if (formData.accidentAtWorksite === false) {
      const loc = [formData.accidentStreet, formData.accidentCity, formData.accidentState, formData.accidentZip].filter(Boolean).join(', ');
      addField('Accident Location', loc ? loc + ' (off-site)' : 'Off-site (address not provided)');
    } else if (formData.accidentAtWorksite === true) {
      addField('Accident Location', worksiteLoc ? 'Same as worksite — ' + worksiteLoc : 'At worksite');
    }
    addLongText('Job Duties at Time of Injury', formData.jobDutiesAtTime);
    addLongText('Description', formData.accidentDescription);

    // ── 4. MEDICAL TREATMENT ───────────────────────────────────────────────────
    addSection('MEDICAL TREATMENT');
    addField('Treatment Received', formData.soughtMedicalTreatment === true ? 'Yes' : formData.soughtMedicalTreatment === false ? 'No' : 'N/A');
    addFieldIf('Facility', formData.initialFacilityName);
    addFieldIf('Treating Physician', formData.treatingPhysician);
    addFieldIf('Treatment Date', formData.treatmentDate);
    addFieldIf('Treatment Type', formData.treatmentType);
    addLongText('Treatment Notes', formData.treatmentNotes);
    addFieldIf('Severe Injury', yesNo(formData.severeInjury));
    addFieldIf('Employee Requested Hospital', yesNo(formData.employeeRequestedHospital));
    addFieldIf('Work Restrictions Given', yesNo(formData.workRestrictionsGiven));
    addLongText('Restriction Details', formData.restrictionDetails);
    addFieldIf('Refused Treatment', yesNo(formData.refusedTreatment));
    addFieldIf('Refusal Reason', formData.refusalReason);
    addFieldIf('Refusal Form Signed', yesNo(formData.refusalFormSigned));
    addFieldIf('Post-Accident Drug Test', { yes: 'Yes', no: 'No', not_required: 'Not required by policy' }[formData.postAccidentDrugTest]);
    addFieldIf('OSHA Recordable', { yes: 'Yes', no: 'No', unknown: 'Unknown' }[formData.oshaRecordable]);
    // Referral
    if (has(formData.referralType) || has(formData.referralFacility) || has(formData.referralPhone) || has(formData.referralAddress) || has(formData.referralNotes)) {
      addFieldIf('Referral Type', formData.referralType);
      addFieldIf('Referral Facility', formData.referralFacility);
      addFieldIf('Referral Phone', formData.referralPhone);
      addFieldIf('Referral Address', formData.referralAddress);
      addLongText('Referral Notes', formData.referralNotes);
    }

    // ── 5. WORK STATUS, WAGE & DISABILITY ──────────────────────────────────────
    addSection('WORK STATUS, WAGE & DISABILITY');
    addFieldRow([{ label: 'Losing Time', value: formData.losingTime === true ? 'YES (lost-time claim)' : formData.losingTime === false ? 'No' : 'N/A' }, { label: 'Date Last Worked', value: formData.dateLastWorked || 'N/A' }]);
    addFieldIf('Last Day Paid', formData.lastDayPaid);
    addFieldIf('Disability Began', formData.disabilityBeganDate);
    addFieldIf('Return Status', formData.returnStatus);
    addFieldIf('Expected Return Date', formData.expectedReturnDate);
    addFieldIf('Actual Return Date', formData.actualReturnDate);
    addFieldIf('Still Being Paid', yesNo(formData.stillBeingPaid));
    addFieldIf('Wages Paid for Date of Injury', yesNo(formData.paidDayOfInjury));
    // Salary continuation
    if (formData.hasSalaryContinuation !== null && formData.hasSalaryContinuation !== undefined) {
      addFieldIf('Salary Continuation', yesNo(formData.hasSalaryContinuation));
      addFieldIf('Continuation Duration', formData.salaryContinuationDuration);
      addFieldIf('Continuation End Date', formData.salaryContinuationEndDate);
      addLongText('Continuation Notes', formData.salaryContinuationNotes);
    }
    // PTO
    if (formData.ptoUsed !== null && formData.ptoUsed !== undefined) {
      addFieldIf('PTO Used', yesNo(formData.ptoUsed));
      addFieldIf('PTO Hours Used', formData.ptoHoursUsed);
    }
    // Light duty
    if (has(formData.lightDutyAvailable) || has(formData.lightDutyOffered) || has(formData.lightDutyAccepted) || has(formData.lightDutyStartDate) || has(formData.lightDutyDescription)) {
      addFieldIf('Light Duty Available', yesNo(formData.lightDutyAvailable));
      addFieldIf('Light Duty Offered', yesNo(formData.lightDutyOffered));
      addFieldIf('Light Duty Accepted', yesNo(formData.lightDutyAccepted));
      addFieldIf('Light Duty Start Date', formData.lightDutyStartDate);
      addLongText('Light Duty Description', formData.lightDutyDescription);
    }

    // ── 6. WITNESSES ───────────────────────────────────────────────────────────
    const hasW1 = has(formData.witness1Name) || has(formData.witness1Phone) || has(formData.witness1Email) || has(formData.witness1Statement);
    const hasW2 = has(formData.witness2Name) || has(formData.witness2Phone) || has(formData.witness2Email) || has(formData.witness2Statement);
    const extraWitnesses = Array.isArray(formData.witnesses) ? formData.witnesses.filter(w => w && (w.name || w.phone || w.statement)) : [];
    if (hasW1 || hasW2 || extraWitnesses.length) {
      addSection('WITNESSES');
      if (hasW1) {
        addFieldIf('Witness 1 Name', formData.witness1Name);
        addFieldIf('Witness 1 Phone', formData.witness1Phone);
        addFieldIf('Witness 1 Email', formData.witness1Email);
        addFieldIf('Witness 1 Relationship', formData.witness1Relationship);
        addLongText('Witness 1 Statement', formData.witness1Statement);
      }
      if (hasW2) {
        addFieldIf('Witness 2 Name', formData.witness2Name);
        addFieldIf('Witness 2 Phone', formData.witness2Phone);
        addFieldIf('Witness 2 Email', formData.witness2Email);
        addFieldIf('Witness 2 Relationship', formData.witness2Relationship);
        addLongText('Witness 2 Statement', formData.witness2Statement);
      }
      extraWitnesses.forEach((w, i) => {
        addFieldIf('Witness ' + (i + 3) + ' Name', w.name);
        addFieldIf('Witness ' + (i + 3) + ' Phone', w.phone);
        addFieldIf('Witness ' + (i + 3) + ' Relationship', w.relationship);
        addLongText('Witness ' + (i + 3) + ' Statement', w.statement);
      });
    }

    // ── 7. SUPERVISOR ──────────────────────────────────────────────────────────
    if (has(formData.supervisorName) || has(formData.supervisorPhone) || has(formData.supervisorComments)) {
      addSection('SUPERVISOR');
      if (has(formData.supervisorName) || has(formData.supervisorPhone)) {
        addFieldRow([{ label: 'Supervisor', value: formData.supervisorName }, { label: 'Supervisor Phone', value: formData.supervisorPhone }]);
      }
      addLongText('Supervisor Comments', formData.supervisorComments);
    }

    // ── 8. EVIDENCE & DOCUMENTATION ────────────────────────────────────────────
    const cnt = a => Array.isArray(a) ? a.length : 0;
    const evidenceFlags = ['hasScenePhotos', 'hasInjuryPhotos', 'hasVideo', 'hasWitnessStatement', 'hasEmployeeStatement'];
    const hasEvidence = evidenceFlags.some(f => formData[f] !== null && formData[f] !== undefined)
      || cnt(formData.scenePhotoFiles) || cnt(formData.injuryPhotoFiles) || cnt(formData.videoFiles) || cnt(formData.evidenceDocFiles)
      || has(formData.videoLocation) || has(formData.videoNotes);
    if (hasEvidence) {
      addSection('EVIDENCE & DOCUMENTATION');
      addFieldIf('Scene Photos', yesNo(formData.hasScenePhotos));
      if (cnt(formData.scenePhotoFiles)) addField('Scene Photo Files', String(cnt(formData.scenePhotoFiles)));
      addFieldIf('Injury Photos', yesNo(formData.hasInjuryPhotos));
      if (cnt(formData.injuryPhotoFiles)) addField('Injury Photo Files', String(cnt(formData.injuryPhotoFiles)));
      addFieldIf('Video Available', yesNo(formData.hasVideo));
      addFieldIf('Video Location', formData.videoLocation);
      addFieldIf('Video System Type', formData.videoSystemType);
      addFieldIf('Video Preserved', yesNo(formData.videoPreserved));
      addLongText('Video Notes', formData.videoNotes);
      if (cnt(formData.videoFiles)) addField('Video Files', String(cnt(formData.videoFiles)));
      addFieldIf('Witness Statement Collected', yesNo(formData.hasWitnessStatement));
      addFieldIf('Employee Statement Collected', yesNo(formData.hasEmployeeStatement));
      if (cnt(formData.evidenceDocFiles)) addField('Additional Documents', String(cnt(formData.evidenceDocFiles)));
    }

    // ── 9. ROOT CAUSE ANALYSIS ─────────────────────────────────────────────────
    const rcFactors = mapCodes(formData.rootCauseSymptoms, ROOT_CAUSE_LABELS);
    const hasRootCause = has(formData.directCause) || has(rcFactors) || has(formData.customRootCause)
      || [formData.proceduresInPlace, formData.proceduresFollowed, formData.trainingProvided].some(v => v !== null && v !== undefined)
      || has(formData.trainingType) || has(formData.trainingFrequency) || has(formData.lastTrainingDate);
    if (hasRootCause) {
      addSection('ROOT CAUSE ANALYSIS', '#334155');
      addFieldIf('Direct Cause', formData.directCause);
      addFieldIf('Contributing Factors', rcFactors);
      addFieldIf('Additional Cause Notes', formData.customRootCause);
      addFieldIf('Procedures in Place', yesNo(formData.proceduresInPlace));
      addFieldIf('Procedures Followed', yesNo(formData.proceduresFollowed));
      addFieldIf('Training Provided', yesNo(formData.trainingProvided));
      addFieldIf('Training Type', formData.trainingType);
      addFieldIf('Training Frequency', formData.trainingFrequency);
      addFieldIf('Last Training Date', formData.lastTrainingDate);
    }

    // ── 10. CORRECTIVE ACTIONS ─────────────────────────────────────────────────
    const caActions = mapCodes(formData.correctiveActions, CORRECTIVE_LABELS);
    if (has(caActions) || has(formData.customCorrectiveAction) || has(formData.correctiveActionNotes)) {
      addSection('CORRECTIVE ACTIONS', '#334155');
      addFieldIf('Actions Taken', caActions);
      addFieldIf('Additional Action', formData.customCorrectiveAction);
      addLongText('Corrective Action Notes', formData.correctiveActionNotes);
    }

    // ── 11. INVESTIGATION FLAGS / FRAUD INDICATORS ─────────────────────────────
    const fraudFlags = mapCodes(formData.fraudIndicators, FRAUD_LABELS);
    const autoFlags = computeAutoFlags(formData);
    const hasInvestigation = autoFlags.length > 0 || formData.validityConcerns === true || has(fraudFlags) || has(formData.concernDetails)
      || has(formData.customRedFlag) || has(formData.investigationNotes)
      || formData.recommendDeny === true || formData.recommendSIU === true;
    if (hasInvestigation) {
      addSection('INVESTIGATION FLAGS / FRAUD INDICATORS', COLORS.danger);
      if (autoFlags.length) addLongText('Detected From Report Dates', autoFlags.map(f => '\u2022 ' + f).join('\n'));
      addFieldIf('Validity Concerns', yesNo(formData.validityConcerns));
      addLongText('Concern Details', formData.concernDetails);
      addFieldIf('Fraud Indicators', fraudFlags);
      addFieldIf('Additional Red Flag', formData.customRedFlag);
      addLongText('Investigation Notes', formData.investigationNotes);
      addFieldIf('Recommend Deny', yesNo(formData.recommendDeny));
      addFieldIf('Deny Reason', formData.denyReason);
      addFieldIf('Recommend SIU Referral', yesNo(formData.recommendSIU));
      addFieldIf('SIU Reason', formData.siuReason);
    }

    // ── 12. THIRD PARTY / SUBROGATION ──────────────────────────────────────────
    const hasThirdParty = formData.thirdPartyInvolved === true
      || has(formData.thirdPartyName) || has(formData.thirdPartyCompany) || has(formData.thirdPartyPhone)
      || has(formData.thirdPartyInsurance) || has(formData.subrogationType) || has(formData.thirdPartyDetails);
    if (hasThirdParty) {
      addSection('THIRD PARTY / SUBROGATION', COLORS.success);
      addFieldIf('Third Party Involved', yesNo(formData.thirdPartyInvolved));
      addFieldIf('Third Party Name', formData.thirdPartyName);
      addFieldIf('Third Party Company', formData.thirdPartyCompany);
      addFieldIf('Third Party Phone', formData.thirdPartyPhone);
      addFieldIf('Third Party Insurance', formData.thirdPartyInsurance);
      addFieldIf('Subrogation Type', formData.subrogationType);
      addLongText('Third Party Details', formData.thirdPartyDetails);
    }

    // ── 13. SUBMITTED BY ───────────────────────────────────────────────────────
    addSection('SUBMITTED BY');
    addFieldRow([{ label: 'Name', value: formData.submitterName }, { label: 'Email', value: formData.submitterEmail }]);
    if (has(formData.submitterTitle) || has(formData.submitterPhone)) {
      addFieldRow([{ label: 'Title', value: formData.submitterTitle }, { label: 'Phone', value: formData.submitterPhone }]);
    }
    if (formData.ccEmails && formData.ccEmails.trim()) {
      addField('CC', formData.ccEmails.trim());
    }

    doc.fontSize(8).fillColor(COLORS.muted).text(entityName + ' | Workers Compensation Claim | www.wcreporting.com', 50, 750, { align: 'center', width: 512 });

    doc.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '3.4' }));
app.get('/health', (req, res) => res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() }));
app.get('/api/entities', (req, res) => res.json(isCSHost(req) ? [] : ENTITIES));

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

    const link = `${siteBase(req)}/statement/${token}`;

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
    const { kept: statementAttachments, dropped: droppedStatementFiles } = fitAttachments(attachments);
    const statementDropNote = droppedNote(droppedStatementFiles);
    if (statementDropNote) console.warn(`⚠️  ${linkData.claimRef}: ${statementDropNote}`);
    try {
      await sendMailWithRetry({
        from: CONFIG.SMTP.auth.user,
        to: CONFIG.CLAIMS_EMAIL,
        subject: `[${linkData.type.toUpperCase()}] ${linkData.claimRef} - ${formData.witnessName || formData.claimantName || formData.patientName || 'Statement'} Received`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;">
            <div style="background:#1a1f26;padding:20px;text-align:center;">
              <h2 style="color:white;margin:0;">${linkData.type === 'hipaa' ? 'HIPAA Authorization' : linkData.type.charAt(0).toUpperCase() + linkData.type.slice(1) + ' Statement'} Received</h2>
            </div>
            <div style="padding:20px;background:#f8fafc;">
              <p><strong>Entity:</strong> ${h(linkData.entityName || 'N/A')}</p>
              <p><strong>Claim:</strong> ${h(linkData.claimRef)}</p>
              <p><strong>Type:</strong> ${h(linkData.type)}</p>
              <p><strong>Signed By:</strong> ${h(signatureData.typedName || 'N/A')}</p>
              <p><strong>Signed At:</strong> ${h(signatureData.signedAt)}</p>
              <p><strong>IP Address:</strong> ${h(signatureData.ipAddress)}</p>
              <p><strong>Document Hash:</strong> <code style="font-size:10px;">${signatureData.documentHash}</code></p>
              ${formData.hasAudioRecording ? '<p><strong>Audio recording attached</strong></p>' : ''}
              ${statementDropNote ? `<p style="color:#b91c1c;"><strong>${h(statementDropNote)}</strong></p>` : ''}
            </div>
          </div>`,
        attachments: statementAttachments
      }, { label: 'statement email' });
      console.log(`✅ ${linkData.type} statement received for ${linkData.claimRef}`);
    } catch (emailErr) {
      console.error('❌ Statement email failed after retries:', emailErr.message);
      try {
        await sendFallbackAlert({
          referenceNumber: linkData.claimRef,
          entityName: linkData.entityName || 'N/A',
          reason: emailErr.message,
          summaryRows: [
            ['Entity', linkData.entityName],
            ['Statement Type', linkData.type],
            ['Signed By', signatureData.typedName],
            ['Signed At', signatureData.signedAt]
          ]
        });
        console.log(`✅ Fallback alert sent for ${linkData.claimRef}`);
      } catch (fallbackErr) {
        console.error('❌ Fallback alert also failed:', fallbackErr.message);
      }
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
    
    // Parse CC emails
    const ccEmails = formData.ccEmails ? formData.ccEmails.split(',').map(e => e.trim()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) : [];
    
    // Parse any inline statement PDFs
    const inlineStatements = req.body.inlineStatements ? JSON.parse(req.body.inlineStatements) : [];
    
    // Get entity name
    const entityName = getEntityName(formData);

    // Build follow-up link for root cause & statements
    const followUpLink = buildFollowUpLink(referenceNumber, formData, siteBase(req));
    
    console.log(`📋 Processing claim ${referenceNumber} for ${entityName}`);

    const problems = [];
    const attachments = [];
    try {
      const pdfBuffer = await generateClaimPDF(formData, referenceNumber);
      attachments.push({ filename: `${referenceNumber}-ClaimReport.pdf`, content: pdfBuffer, contentType: 'application/pdf' });
    } catch (pdfErr) {
      console.error('Claim PDF generation error:', pdfErr.message);
      problems.push(`The claim report PDF could not be generated (${pdfErr.message}). The claim was still received; the summary below and any uploads are attached. Resubmit or contact support to regenerate the PDF.`);
    }
    const autoFlags = computeAutoFlags(formData);
    
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

    // Shed oversized media before the send so the notification itself survives.
    const { kept: claimAttachments, dropped: droppedAttachments } = fitAttachments(attachments);
    const claimDropNote = droppedNote(droppedAttachments);
    if (claimDropNote) {
      problems.push(claimDropNote);
      console.warn(`⚠️  ${referenceNumber}: ${droppedAttachments.length} attachment(s) omitted, ${mb(attachmentBytes(droppedAttachments))} over the limit`);
    }

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
          <h1 style="color:white;margin:0;">${h(entityName)}</h1>
          <p style="color:#5ba4e6;margin:8px 0 0;">Workers Compensation Claim Report</p>
        </div>
        <div style="background:${priorityColor};padding:12px 20px;">
          <p style="color:white;margin:0;font-weight:bold;">PRIORITY: ${priority}</p>
        </div>
        <div style="padding:25px;background:#f8fafc;">
          ${problems.length ? `
          <div style="background:#fee2e2;border:1px solid #dc2626;padding:15px;margin-bottom:20px;border-radius:8px;">
            <h3 style="color:#b91c1c;margin:0 0 8px;">Attention: a document is missing</h3>
            ${problems.map(p => `<p style="margin:4px 0;font-size:13px;color:#7f1d1d;">${h(p)}</p>`).join('')}
          </div>` : ''}
          <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid #e2e8f0;">
            <h2 style="color:#1a1f26;margin:0 0 15px;border-bottom:2px solid #5ba4e6;padding-bottom:10px;">Claim Summary</h2>
            <table style="width:100%;font-size:14px;">
              <tr><td style="padding:5px 0;color:#6e7681;width:140px;">Reference:</td><td style="font-weight:bold;">${referenceNumber}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Entity:</td><td style="font-weight:bold;">${h(entityName)}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Employee:</td><td>${h(formData.firstName || '')} ${h(formData.lastName || '')}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Date of Injury:</td><td>${h(formData.dateOfInjury || 'N/A')}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Injury Type:</td><td>${h(INJURY_TYPE_LABELS[formData.injuryType] || formData.injuryType || 'N/A')}</td></tr>
              <tr><td style="padding:5px 0;color:#6e7681;">Losing Time:</td><td style="${formData.losingTime === true ? 'color:#dc2626;font-weight:bold;' : ''}">${formData.losingTime === true ? 'YES' : 'No'}</td></tr>
              ${autoFlags.length ? `<tr><td style="padding:5px 0;color:#6e7681;vertical-align:top;">Date Flags:</td><td style="color:#b45309;font-weight:bold;">${autoFlags.map(h).join('<br/>')}</td></tr>` : ''}
            </table>
          </div>
          ${inlineStatements.length > 0 ? `
          <div style="background:#dcfce7;border:1px solid #16a34a;padding:15px;margin-bottom:20px;border-radius:8px;">
            <h3 style="color:#16a34a;margin:0 0 10px;">✓ E-Signed Documents Attached</h3>
            <ul style="margin:5px 0;font-size:13px;">
              ${inlineStatements.map(s => `<li>${h(s.filename)}${s.audioFiles && s.audioFiles.length > 0 ? ' <strong>(+ Audio Recording)</strong>' : ''}</li>`).join('')}
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
            <a href="${h(followUpLink)}" style="display:inline-block;background:#5ba4e6;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">Open Follow-Up Form</a>
          </div>
          <p style="font-size:13px;color:#6e7681;">Submitted by: ${h(formData.submitterName || 'N/A')} (${h(formData.submitterEmail || 'N/A')})</p>
        </div>
        <div style="background:#1a1f26;padding:20px;text-align:center;">
          <p style="color:#94a3b8;margin:0;font-size:12px;">www.wcreporting.com</p>
        </div>
      </div>`;

    let claimEmailError = null;
    try {
      await sendMailWithRetry({
        from: CONFIG.SMTP.auth.user,
        to: CONFIG.CLAIMS_EMAIL,
        cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
        subject: `[${priority.replace(/[^\w\s-]/g, '').trim()}] ${formData.firstName || ''} ${formData.lastName || ''} - ${entityName} - ${formData.dateOfInjury || ''}`,
        html: emailHtml,
        attachments: claimAttachments
      }, { label: 'claim email' });
      console.log(`✅ Claim email sent to ${CONFIG.CLAIMS_EMAIL}${ccEmails.length > 0 ? ' (CC: ' + ccEmails.join(', ') + ')' : ''} with ${claimAttachments.length} attachments (${audioFileCount} audio)${droppedAttachments.length ? `, ${droppedAttachments.length} omitted over size limit` : ''}`);
    } catch (err) {
      claimEmailError = err.message;
      console.error('❌ Claim email failed after retries:', err.message);
      try {
        await sendFallbackAlert({
          referenceNumber,
          entityName,
          reason: err.message,
          summaryRows: [
            ['Entity', entityName],
            ['Employee', `${formData.firstName || ''} ${formData.lastName || ''}`.trim()],
            ['Date of Injury', formData.dateOfInjury],
            ['Priority', priority.replace(/[^\w\s-]/g, '').trim()],
            ['Submitted By', `${formData.submitterName || 'N/A'} (${formData.submitterEmail || 'N/A'})`]
          ]
        });
        console.log(`✅ Fallback alert sent to ${CONFIG.CLAIMS_EMAIL} for ${referenceNumber}`);
      } catch (fallbackErr) {
        console.error('❌ Fallback alert also failed:', fallbackErr.message);
      }
    }

    // Confirmation to submitter (with follow-up link)
    if (formData.submitterEmail) {
      try {
        await transporter.sendMail({
          from: CONFIG.SMTP.auth.user,
          to: formData.submitterEmail,
          cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
          subject: `Claim Confirmation - ${referenceNumber} - ${entityName}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#1a1f26;padding:25px;text-align:center;">
                <h1 style="color:white;margin:0;">${h(entityName)}</h1>
              </div>
              <div style="padding:30px;background:#f8fafc;">
                <div style="background:#dcfce7;border:1px solid #16a34a;padding:20px;border-radius:8px;text-align:center;margin-bottom:25px;">
                  <h2 style="color:#16a34a;margin:0;">✓ Claim Submitted Successfully</h2>
                </div>
                <p>Your claim for <strong>${h(formData.firstName || '')} ${h(formData.lastName || '')}</strong> has been received.</p>
                <div style="background:white;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #e2e8f0;text-align:center;">
                  <p style="margin:0 0 10px;font-size:14px;"><strong>Reference Number:</strong></p>
                  <p style="margin:0;font-size:24px;font-family:monospace;font-weight:bold;">${referenceNumber}</p>
                </div>
                <div style="background:#eff6ff;border:1px solid #5ba4e6;padding:15px;margin:20px 0;border-radius:8px;">
                  <h3 style="color:#1a1f26;margin:0 0 8px;">Next Step: Complete Follow-Up</h3>
                  <p style="margin:0 0 12px;font-size:13px;color:#334155;">Submit root cause analysis, witness statements, and claimant statements using the link below:</p>
                  <a href="${h(followUpLink)}" style="display:inline-block;background:#5ba4e6;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">Complete Follow-Up</a>
                </div>
                <p style="color:#64748b;">Our team will review and follow up if needed.</p>
              </div>
            </div>`
        });
        console.log(`✅ Confirmation sent to ${formData.submitterEmail}${ccEmails.length > 0 ? ' (CC: ' + ccEmails.join(', ') + ')' : ''}`);
      } catch (err) {
        console.error('❌ Confirmation email error:', err.message);
      }
    }

    res.json({
      success: true,
      referenceNumber,
      ...(claimEmailError ? { warning: 'Your claim was received, but our internal notification could not be delivered. Please keep your reference number and contact us to confirm receipt.' } : {}),
      ...(droppedAttachments.length ? { omittedAttachments: droppedAttachments.map(a => a.filename) } : {})
    });
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
    const { referenceNumber, entity, rootCause, witnessStatement, claimantStatement, witnessSigned, claimantSigned, dateOfInjury } = req.body;

    if (!referenceNumber) {
      return res.status(400).json({ error: 'Missing reference number' });
    }

    const entityName = entity || 'Workers Compensation Claim';
    const rootCauseData = JSON.parse(rootCause || '{}');
    const witnessData = JSON.parse(witnessStatement || '{}');
    const claimantData = JSON.parse(claimantStatement || '{}');
    const files = req.files || [];
    const wSigned = witnessSigned === 'true';
    const cSigned = claimantSigned === 'true';

    // A statement is included if it was signed OR if anyone typed into it. Unsigned ones are stamped UNSIGNED.
    const hasWitness = wSigned || ['witnessName', 'statement', 'claimantSaidAfter', 'witnessLocation'].some(k => isFilled(witnessData[k]));
    const hasClaimant = cSigned || ['incidentDescription', 'bodyPartsInjured', 'currentSymptoms', 'priorDoctors', 'otherEmployment'].some(k => isFilled(claimantData[k]));
    const hasRoot = hasRootCauseContent(rootCauseData);

    if (!hasWitness && !hasClaimant && !hasRoot && files.length === 0) {
      return res.status(400).json({ error: 'Nothing was filled in. Complete at least one statement or the root cause analysis before submitting.' });
    }

    const problems = [];
    const attachments = [];
    const safeName = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const hasAudio = field => !!files.find(f => f.fieldname === field);

    // Translate Spanish answers to English (only when the statement was given in Spanish).
    async function translateStatement(kind, data, label) {
      if (data.language !== 'es') return {};
      const keys = statementTranslateKeys(kind);
      const toTranslate = {};
      keys.forEach(k => { if (isFilled(data[k])) toTranslate[k] = data[k]; });
      try {
        const result = await translateToEnglish(toTranslate);
        if (result === null) {
          problems.push(`${label} was given in Spanish. No English translation was added because ANTHROPIC_API_KEY is not set on the server.`);
          return {};
        }
        return result;
      } catch (err) {
        problems.push(`${label} was given in Spanish, but the English translation failed (${err.message}). The original Spanish answers are in the PDF.`);
        return {};
      }
    }

    const [witnessEn, claimantEn] = await Promise.all([
      hasWitness ? translateStatement('witness', witnessData, 'The witness statement') : {},
      hasClaimant ? translateStatement('claimant', claimantData, 'The claimant statement') : {}
    ]);

    // Witness statement PDF
    if (hasWitness) {
      try {
        const sigData = {
          typedName: witnessData.typedName,
          signatureImage: wSigned ? (witnessData.signature || null) : null,
          signedAt: new Date().toISOString(),
          ipAddress: getClientIP(req),
          documentHash: generateDocumentHash({ witnessData, type: 'witness-followup' })
        };
        const pdf = await generateWitnessStatementPDF({
          ...witnessData,
          claimRef: referenceNumber,
          entityName,
          dateOfInjury: witnessData.dateOfInjury || dateOfInjury,
          hasAudioRecording: hasAudio('witnessAudio')
        }, sigData, { signed: wSigned, translations: witnessEn });
        attachments.push({
          filename: `${safeName(entityName)}-WitnessStatement${wSigned ? '' : '-UNSIGNED'}-${safeName(witnessData.witnessName) || 'Unknown'}-${referenceNumber}.pdf`,
          content: pdf,
          contentType: 'application/pdf'
        });
      } catch (pdfErr) {
        console.error('Witness PDF generation error:', pdfErr.message);
        problems.push(`The witness statement PDF could not be generated (${pdfErr.message}). The witness's answers are in the body of this email.`);
      }
    }

    // Claimant statement PDF
    if (hasClaimant) {
      try {
        const sigData = {
          typedName: claimantData.typedName,
          signatureImage: cSigned ? (claimantData.signature || null) : null,
          signedAt: new Date().toISOString(),
          ipAddress: getClientIP(req),
          documentHash: generateDocumentHash({ claimantData, type: 'claimant-followup' })
        };
        const pdf = await generateClaimantStatementPDF({
          ...claimantData,
          claimRef: referenceNumber,
          entityName,
          dateOfInjury: claimantData.dateOfInjury || dateOfInjury,
          hasAudioRecording: hasAudio('claimantAudio')
        }, sigData, { signed: cSigned, translations: claimantEn });
        attachments.push({
          filename: `${safeName(entityName)}-ClaimantStatement${cSigned ? '' : '-UNSIGNED'}-${referenceNumber}.pdf`,
          content: pdf,
          contentType: 'application/pdf'
        });
      } catch (pdfErr) {
        console.error('Claimant PDF generation error:', pdfErr.message);
        problems.push(`The claimant statement PDF could not be generated (${pdfErr.message}). The claimant's answers are in the body of this email.`);
      }
    }

    // Root cause analysis PDF
    if (hasRoot) {
      try {
        const pdf = await generateRootCausePDF({ ...rootCauseData, dateOfInjury }, referenceNumber, entityName);
        attachments.push({ filename: `${safeName(entityName)}-RootCauseAnalysis-${referenceNumber}.pdf`, content: pdf, contentType: 'application/pdf' });
      } catch (pdfErr) {
        console.error('Root cause PDF generation error:', pdfErr.message);
        problems.push(`The root cause analysis PDF could not be generated (${pdfErr.message}). The answers are in the body of this email.`);
      }
    }

    // Audio recordings
    files.forEach(file => {
      attachments.push({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype || 'audio/webm'
      });
    });

    // Shed oversized media before the body is built, so the note reaches both.
    const { kept: followUpAttachments, dropped: droppedFollowUpFiles } = fitAttachments(attachments);
    const followUpDropNote = droppedNote(droppedFollowUpFiles);
    if (followUpDropNote) {
      problems.push(followUpDropNote);
      console.warn(`⚠️  ${referenceNumber}: ${followUpDropNote}`);
    }

    // ── Plain-text summary ──
    const label = (map, v) => (map && map[v]) || v;
    const line = (name, v) => isFilled(v) ? `${name}: ${Array.isArray(v) ? v.join(', ') : v}\n` : '';
    let summary = `CLAIM FOLLOW-UP SUBMITTED\nReference: ${referenceNumber}\nEntity: ${entityName}\nSubmitted: ${new Date().toLocaleString()}\n\n`;
    if (problems.length) summary += `ATTENTION:\n${problems.map(p => '- ' + p).join('\n')}\n\n`;
    if (hasRoot) {
      summary += `=== ROOT CAUSE ANALYSIS ===\n`;
      summary += line('Direct Cause', rootCauseData.directCause);
      if (typeof rootCauseData.proceduresExisted === 'boolean') summary += `Procedures in Place: ${rootCauseData.proceduresExisted ? 'Yes' : 'No'}\n`;
      if (typeof rootCauseData.trainingProvided === 'boolean') summary += `Training Provided: ${rootCauseData.trainingProvided ? 'Yes' : 'No'}\n`;
      summary += line('Contributing Factors', rootCauseData.factors);
      summary += line('Corrective Actions', rootCauseData.actions);
      summary += '\n';
    }
    if (hasWitness) {
      summary += `=== WITNESS STATEMENT (${wSigned ? 'SIGNED' : 'UNSIGNED'})${witnessData.language === 'es' ? ' [Spanish]' : ''} ===\n`;
      summary += line('Witness', witnessData.witnessName);
      summary += line('Relationship', label(RELATIONSHIP_LABELS, witnessData.relationship));
      summary += line('Saw It Happen', label(OBSERVATION_LABELS, witnessData.observation));
      summary += line('Location During Incident', witnessData.witnessLocation);
      summary += line('Statement', witnessData.statement);
      summary += line('Statement (English)', witnessEn.statement);
      summary += line('Injured Worker Said Right After', witnessData.claimantSaidAfter);
      summary += line('Others Present', witnessData.othersPresent);
      summary += line('Conditions', witnessData.conditions);
      summary += line(wSigned ? 'Signed By' : 'Name Typed (not signed)', witnessData.typedName);
      summary += '\n';
    }
    if (hasClaimant) {
      summary += `=== CLAIMANT STATEMENT (${cSigned ? 'SIGNED' : 'UNSIGNED'})${claimantData.language === 'es' ? ' [Spanish]' : ''} ===\n`;
      summary += line('Claimant', claimantData.claimantName);
      summary += line('DOB', claimantData.dateOfBirth);
      summary += line('Description', claimantData.incidentDescription);
      summary += line('Description (English)', claimantEn.incidentDescription);
      summary += line('First Reported', [claimantData.firstReportedDate, claimantData.firstReportedTo].filter(Boolean).join(' to '));
      summary += line('Body Parts', claimantData.bodyPartsInjured);
      summary += line('Symptoms', claimantData.currentSymptoms);
      summary += line('Able to Work', label(ABLE_TO_WORK_LABELS, claimantData.ableToWork));
      summary += line('Prior Injury', label(PRIOR_INJURY_LABELS, claimantData.priorInjury));
      summary += line('Prior Injury Detail', [claimantData.priorInjuryBodyPart, claimantData.priorInjuryYear, isFilled(claimantData.priorClaimFiled) ? 'claim filed: ' + label(YES_NO_LABELS, claimantData.priorClaimFiled) : ''].filter(Boolean).join(', '));
      summary += line('Prior Doctors', claimantData.priorDoctors);
      summary += line('Other Jobs', claimantData.otherEmployment);
      summary += line('Outside Activities', claimantData.outsideActivities);
      summary += line(cSigned ? 'Signed By' : 'Name Typed (not signed)', claimantData.typedName);
    }

    // ── HTML email ──
    const row = (name, v, en) => isFilled(v)
      ? `<p style="margin:6px 0;"><strong>${h(name)}:</strong> ${h(Array.isArray(v) ? v.join(', ') : v)}${en && en !== v ? `<br/><em style="color:#1e40af;">English: ${h(en)}</em>` : ''}</p>`
      : '';
    const chips = (arr, bg, border) => (arr || []).map(x => `<span style="display:inline-block;background:${bg};border:1px solid ${border};padding:2px 8px;border-radius:4px;margin:2px;font-size:12px;">${h(x)}</span>`).join(' ');
    const status = signed => signed
      ? '<span style="color:#16a34a;">(Signed)</span>'
      : '<span style="color:#dc2626;">(UNSIGNED)</span>';
    const card = (title, body) => `
          <div style="background:white;border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid #e2e8f0;">
            <h3 style="color:#1a1f26;margin:0 0 12px;border-bottom:2px solid #5ba4e6;padding-bottom:8px;">${title}</h3>
            ${body}
          </div>`;

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;">
        <div style="background:#1a1f26;padding:25px;text-align:center;">
          <h1 style="color:white;margin:0;">Follow-Up Received</h1>
          <p style="color:#5ba4e6;margin:8px 0 0;">${h(referenceNumber)} | ${h(entityName)}</p>
        </div>
        <div style="padding:25px;background:#f8fafc;">
          ${problems.length ? `
          <div style="background:#fee2e2;border:1px solid #dc2626;padding:15px;margin-bottom:20px;border-radius:8px;">
            <h3 style="color:#b91c1c;margin:0 0 8px;">Attention</h3>
            ${problems.map(p => `<p style="margin:4px 0;font-size:13px;color:#7f1d1d;">${h(p)}</p>`).join('')}
          </div>` : ''}
          ${hasRoot ? card('Root Cause Analysis', `
            ${row('Direct Cause', rootCauseData.directCause)}
            ${typeof rootCauseData.proceduresExisted === 'boolean' ? `<p style="margin:6px 0;"><strong>Procedures in Place:</strong> ${rootCauseData.proceduresExisted ? 'Yes' : '<span style="color:#dc2626;font-weight:bold;">No</span>'}</p>` : ''}
            ${typeof rootCauseData.trainingProvided === 'boolean' ? `<p style="margin:6px 0;"><strong>Training Provided:</strong> ${rootCauseData.trainingProvided ? 'Yes' : '<span style="color:#dc2626;font-weight:bold;">No</span>'}</p>` : ''}
            ${isFilled(rootCauseData.factors) ? `<p style="margin:6px 0;"><strong>Contributing Factors (${rootCauseData.factors.length}):</strong><br/>${chips(rootCauseData.factors, '#fef3c7', '#d97706')}</p>` : ''}
            ${isFilled(rootCauseData.actions) ? `<p style="margin:6px 0;"><strong>Corrective Actions (${rootCauseData.actions.length}):</strong><br/>${chips(rootCauseData.actions, '#dcfce7', '#16a34a')}</p>` : ''}`) : ''}
          ${hasWitness ? card(`Witness Statement ${status(wSigned)}${witnessData.language === 'es' ? ' <span style="color:#64748b;font-size:13px;">Spanish</span>' : ''}`, `
            ${row('Witness', witnessData.witnessName)}
            ${row('Relationship', label(RELATIONSHIP_LABELS, witnessData.relationship))}
            ${row('Saw It Happen', label(OBSERVATION_LABELS, witnessData.observation))}
            ${row('Location During Incident', witnessData.witnessLocation, witnessEn.witnessLocation)}
            ${row('Statement', witnessData.statement, witnessEn.statement)}
            ${row('Injured Worker Said Right After', witnessData.claimantSaidAfter, witnessEn.claimantSaidAfter)}
            ${row('Others Present', witnessData.othersPresent, witnessEn.othersPresent)}
            ${row('Conditions', witnessData.conditions, witnessEn.conditions)}
            ${wSigned ? `<p style="color:#16a34a;font-weight:bold;">Signed by: ${h(witnessData.typedName)}</p>` : '<p style="color:#dc2626;font-weight:bold;">Not signed</p>'}`) : ''}
          ${hasClaimant ? card(`Claimant Statement ${status(cSigned)}${claimantData.language === 'es' ? ' <span style="color:#64748b;font-size:13px;">Spanish</span>' : ''}`, `
            ${row('Claimant', claimantData.claimantName)}
            ${row('Description', claimantData.incidentDescription, claimantEn.incidentDescription)}
            ${row('First Reported', [claimantData.firstReportedDate, claimantData.firstReportedTo].filter(Boolean).join(' to '))}
            ${row('Body Parts', claimantData.bodyPartsInjured, claimantEn.bodyPartsInjured)}
            ${row('Symptoms', claimantData.currentSymptoms, claimantEn.currentSymptoms)}
            ${row('Able to Work', label(ABLE_TO_WORK_LABELS, claimantData.ableToWork))}
            ${row('Prior Injury', label(PRIOR_INJURY_LABELS, claimantData.priorInjury))}
            ${row('Prior Injury Detail', [claimantData.priorInjuryBodyPart, claimantData.priorInjuryYear, isFilled(claimantData.priorClaimFiled) ? 'claim filed: ' + label(YES_NO_LABELS, claimantData.priorClaimFiled) : ''].filter(Boolean).join(', '))}
            ${row('Prior Doctors', claimantData.priorDoctors, claimantEn.priorDoctors)}
            ${row('Other Jobs', claimantData.otherEmployment, claimantEn.otherEmployment)}
            ${row('Outside Activities', claimantData.outsideActivities, claimantEn.outsideActivities)}
            ${cSigned ? `<p style="color:#16a34a;font-weight:bold;">Signed by: ${h(claimantData.typedName)}</p>` : '<p style="color:#dc2626;font-weight:bold;">Not signed</p>'}`) : ''}
          ${files.length > 0 ? `
          <div style="background:#dbeafe;border:1px solid #3b82f6;padding:12px;margin-bottom:15px;border-radius:8px;">
            <p style="color:#1d4ed8;margin:0;font-weight:bold;">${files.length} audio recording(s) attached</p>
          </div>` : ''}
        </div>
        <div style="background:#1a1f26;padding:20px;text-align:center;">
          <p style="color:#94a3b8;margin:0;font-size:12px;">www.wcreporting.com</p>
        </div>
      </div>`;

    const parts = [hasWitness && (wSigned ? 'Witness' : 'Witness (unsigned)'), hasClaimant && (cSigned ? 'Claimant' : 'Claimant (unsigned)'), hasRoot && 'Root Cause'].filter(Boolean);
    try {
      await sendMailWithRetry({
        from: CONFIG.SMTP.auth.user,
        to: CONFIG.CLAIMS_EMAIL,
        subject: `[FOLLOW-UP]${problems.length ? ' [ATTENTION]' : ''} ${referenceNumber} - ${entityName} - ${parts.join(', ') || 'Audio'}`,
        html: emailHtml,
        text: summary,
        attachments: followUpAttachments
      }, { label: 'follow-up email' });
    } catch (err) {
      console.error('❌ Follow-up email failed after retries:', err.message);
      try {
        await sendFallbackAlert({
          referenceNumber,
          entityName,
          reason: err.message,
          summaryRows: [['Entity', entityName], ['Sections', parts.join(', ') || 'Audio']]
        });
        console.log(`✅ Fallback alert sent for follow-up ${referenceNumber}`);
      } catch (fallbackErr) {
        console.error('❌ Fallback alert also failed:', fallbackErr.message);
      }
      throw err; // keep the 500 so the submitter knows to resend
    }

    console.log(`✅ Follow-up received for ${referenceNumber} (${followUpAttachments.length} attachments${problems.length ? ', ' + problems.length + ' problem(s)' : ''})`);
    res.json({ success: true, referenceNumber, problems });
  } catch (error) {
    console.error('Follow-up submission error:', error);
    res.status(500).json({ error: 'Failed to submit follow-up' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT / LEAD CAPTURE
// ═══════════════════════════════════════════════════════════════════════════════
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const { name, company, email, phone, employees, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }
    const ip = getClientIP(req);
    const esc = s => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

    // Respond immediately; deliver emails in the background so a slow/misconfigured
    // mail server never blocks the visitor's form submission.
    res.json({ success: true });

    // Notify CompShield
    transporter.sendMail({
        from: CONFIG.SMTP.auth.user,
        to: CONFIG.CONTACT_EMAIL,
        replyTo: email,
        subject: `[New Lead] ${name}${company ? ' — ' + company : ''}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#111827;padding:22px;text-align:center;">
              <h2 style="color:#fff;margin:0;">CompShield — New Website Inquiry</h2>
              <p style="color:#7ab5f5;margin:6px 0 0;font-size:13px;">Workers' Comp Claims Defense</p>
            </div>
            <div style="padding:24px;background:#f8fafc;">
              <table style="width:100%;font-size:14px;border-collapse:collapse;">
                <tr><td style="padding:6px 0;color:#64748b;width:120px;">Name:</td><td style="font-weight:bold;">${esc(name)}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Company:</td><td>${esc(company) || 'N/A'}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Email:</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Phone:</td><td>${esc(phone) || 'N/A'}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Employees:</td><td>${esc(employees) || 'N/A'}</td></tr>
              </table>
              <div style="margin-top:16px;padding:16px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
                <p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;">Message</p>
                <p style="margin:0;white-space:pre-wrap;">${esc(message)}</p>
              </div>
              <p style="margin-top:14px;color:#94a3b8;font-size:12px;">Submitted ${new Date().toLocaleString()} · IP ${esc(ip)}</p>
            </div>
          </div>`
    })
      .then(() => console.log(`✅ Lead received from ${email}`))
      .catch(err => console.error('Lead email error:', err.message));

    // Auto-acknowledge the prospect (also background)
    transporter.sendMail({
      from: CONFIG.SMTP.auth.user,
      to: email,
      subject: 'Thanks for contacting CompShield',
      html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#111827;padding:24px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:22px;">CompShield</h1>
              <p style="color:#7ab5f5;margin:6px 0 0;font-size:12px;">Workers' Compensation Claims Defense &amp; Cost Control</p>
            </div>
            <div style="padding:28px;background:#f8fafc;">
              <p>Hi ${esc(name.split(' ')[0])},</p>
              <p>Thanks for reaching out to CompShield. We received your message and a specialist will follow up shortly to schedule your free claim review.</p>
              <p>In the meantime, if you need to report a claim, you can use our secure WC Reporting portal at <a href="${CONFIG.BASE_URL}/report">${CONFIG.BASE_URL.replace(/^https?:\/\//,'')}/report</a>.</p>
              <p style="margin-top:20px;color:#64748b;">— The CompShield Team<br><span style="font-size:12px;">Workers' Comp Claims Defense</span></p>
            </div>
          </div>`
    }).catch(err => console.error('Ack email error:', err.message));
  } catch (error) {
    console.error('Contact error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEWSLETTER SUBSCRIBE
// ═══════════════════════════════════════════════════════════════════════════════
const subscribeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { ok: false, error: 'Too many requests. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false
});

const SUBSCRIBERS_FILE = path.join(__dirname, 'data', 'subscribers.jsonl');

// Append a subscriber to the local JSONL file (best effort; Railway disk is ephemeral).
function appendSubscriberLocal(entry) {
  try {
    fs.mkdirSync(path.dirname(SUBSCRIBERS_FILE), { recursive: true });
    let existing = '';
    try { existing = fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'); } catch (e) { /* new file */ }
    const dup = existing.split('\n').some(l => {
      try { return JSON.parse(l).email === entry.email; } catch (e) { return false; }
    });
    if (!dup) fs.appendFileSync(SUBSCRIBERS_FILE, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error('subscriber local persist error:', e.message);
  }
}

// Durable store: append to data/subscribers.jsonl in the GitHub repo.
// Requires GITHUB_TOKEN env var (Contents read+write on cdehrlic/titanium-froi).
// Without the token, signups still land in the local file and in the notify email.
async function persistSubscriberGitHub(entry) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  const apiPath = 'data/subscribers.jsonl';
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'comp-shield-site',
    'Content-Type': 'application/json'
  };
  const line = JSON.stringify(entry) + '\n';
  for (let attempt = 0; attempt < 2; attempt++) {
    let sha = null, content = '';
    const getRes = await fetch('https://api.github.com/repos/cdehrlic/titanium-froi/contents/' + apiPath + '?ref=main', { headers });
    if (getRes.ok) {
      const j = await getRes.json();
      sha = j.sha;
      content = Buffer.from(j.content || '', 'base64').toString('utf8');
    } else if (getRes.status !== 404) {
      throw new Error('github read failed: ' + getRes.status);
    }
    const dup = content.split('\n').some(l => {
      try { return JSON.parse(l).email === entry.email; } catch (e) { return false; }
    });
    if (dup) return true;
    const putRes = await fetch('https://api.github.com/repos/cdehrlic/titanium-froi/contents/' + apiPath, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'newsletter signup ' + entry.email,
        content: Buffer.from(content + line).toString('base64'),
        branch: 'main',
        ...(sha ? { sha } : {})
      })
    });
    if (putRes.ok) return true;
    if (putRes.status === 409 && attempt === 0) continue; // sha race: re-read and retry once
    throw new Error('github write failed: ' + putRes.status);
  }
  return false;
}

app.post('/api/subscribe', subscribeLimiter, async (req, res) => {
  try {
    const { email, source, hp } = req.body || {};
    if (hp) return res.json({ ok: true }); // honeypot: bots get a fake success
    const clean = String(email || '').trim().toLowerCase();
    if (clean.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }
    const entry = {
      email: clean,
      source: String(source || '').slice(0, 60),
      ip: getClientIP(req),
      ts: new Date().toISOString()
    };
    res.json({ ok: true });
    // Persist in the background so storage latency never blocks the visitor.
    appendSubscriberLocal(entry);
    persistSubscriberGitHub(entry)
      .then(ok => { if (ok) console.log('newsletter signup stored: ' + clean); })
      .catch(e => console.error('subscriber github persist error:', e.message));
    // Notify CompShield in real time (durable record even if storage fails).
    transporter.sendMail({
      from: 'CompShield <info@comp-shield.com>',
      to: CONFIG.CONTACT_EMAIL,
      subject: '[Newsletter] New subscriber: ' + clean,
      text: 'New newsletter signup\n\nEmail: ' + clean + '\nSource: ' + (entry.source || 'n/a') + '\nTime: ' + entry.ts
    }).catch(e => console.error('subscriber notify error:', e.message));
  } catch (e) {
    console.error('subscribe error:', e);
    if (!res.headersSent) res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERVE HTML FILES  (marketing site + portal)
// ═══════════════════════════════════════════════════════════════════════════════
const sendPage = file => (req, res) => res.sendFile(path.join(__dirname, file));

app.get('/', sendPage('home.html'));
app.get('/services', sendPage('services.html'));
app.get('/process', sendPage('process.html'));
app.get('/about', sendPage('about.html'));
app.get('/contact', sendPage('contact.html'));
app.get('/resources', sendPage('resources.html'));
app.get('/resources/claim-files', sendPage('claim-files.html'));
app.get('/resources/claim-files/the-midnight-injury', sendPage('post-midnight-injury.html'));
app.get('/resources/claim-files/the-ladder-was-still-standing', sendPage('post-ladder-standing.html'));
app.get('/resources/claim-files/the-accepted-claim-that-almost-got-away', sendPage('post-accepted-claim.html'));
app.get('/resources/claim-files/four-days-before-the-fall', sendPage('post-four-days.html'));
app.get('/resources/claim-files/the-job-offer-that-capped-the-claim', sendPage('post-light-duty.html'));
app.get('/resources/claim-files/the-answer-was-in-the-bloodwork', sendPage('post-bloodwork.html'));
app.get('/resources/claim-files/the-1099-that-wasnt', sendPage('post-1099.html'));
app.get('/resources/claim-files/the-first-hour-after-the-fall', sendPage('post-first-hour.html'));
app.get('/resources/claim-files/the-second-case-hiding-in-the-claim', sendPage('post-subrogation.html'));
app.get('/resources/claim-files/when-the-old-job-is-gone', sendPage('post-vocrehab.html'));
app.get('/resources/claim-files/the-benefit-you-have-to-keep-earning', sendPage('post-attachment.html'));
app.get('/resources/claim-files/the-money-hiding-in-the-medical-bills', sendPage('post-medical-mgmt.html'));
app.get('/resources/claim-files/what-a-finger-is-worth', sendPage('post-slu.html'));
app.get('/resources/claim-files/when-the-carrier-knew-before-you-did', sendPage('post-notice.html'));
app.get('/resources/claim-files/it-happened-at-work', sendPage('post-compensability.html'));
app.get('/resources/claim-files/which-injury-are-you-paying-for', sendPage('post-apportionment.html'));
app.get('/resources/claim-files/when-the-claim-gets-a-lawyer', sendPage('post-when-the-claim-gets-a-lawyer.html'));
app.get('/resources/claim-files/the-exam-that-cut-the-reserve', sendPage('post-the-exam-that-cut-the-reserve.html'));
app.get('/resources/claim-files/the-claim-that-was-two-lawsuits', sendPage('post-the-claim-that-was-two-lawsuits.html'));
app.get('/resources/claim-files/the-five-hundred-dollar-burn', sendPage('post-the-five-hundred-dollar-burn.html'));
app.get('/resources/claim-files/the-most-expensive-injury-in-healthcare', sendPage('post-the-most-expensive-injury-in-healthcare.html'));
app.get('/audit', sendPage('audit.html'));
app.get('/privacy', sendPage('privacy.html'));
app.get('/newsletter', sendPage('newsletter.html'));
app.get('/share-your-story', sendPage('share-your-story.html'));
app.get('/resources/experience-mod-calculator', sendPage('tool-emr.html'));
app.get('/resources/cost-of-a-claim', sendPage('tool-claim-cost.html'));
app.get('/resources/savings-estimator', sendPage('tool-savings.html'));
app.get('/resources/cost-toolkit', sendPage('toolkit.html'));
app.get('/resources/lower-experience-mod', sendPage('guide-experience-mod.html'));
app.get('/resources/fight-a-workers-comp-claim', sendPage('guide-fight-claim.html'));
app.get('/resources/code-rule-59', sendPage('guide-code-rule-59.html'));
app.get('/resources/workers-comp-audit', sendPage('guide-workers-comp-audit.html')); app.get('/resources/first-24-hours-injury', sendPage('guide-first-24-hours.html'));
app.get('/resources/ny-workers-comp-rate-cut-2026', sendPage('post-ny-workers-comp-rate-cut-2026.html'));
app.get('/resources/surveillance-playbook', sendPage('post-surveillance-playbook.html'));
app.get('/resources/section-32-settlement-guide', sendPage('post-section32-settlements.html'));
app.get('/resources/contractor-test', sendPage('post-contractor-test.html'));
app.get('/report', (req, res) => res.sendFile(path.join(__dirname, isCSHost(req) ? 'cs-report.html' : 'index.html')));
app.get('/portal', (req, res) => res.sendFile(path.join(__dirname, isCSHost(req) ? 'cs-portal.html' : 'portal.html')));
app.get('/livewell', (req, res) => res.sendFile(path.join(__dirname, 'livewell-portal.html')));

app.get('/statement/:token', (req, res) => {
  res.sendFile(path.join(__dirname, isCSHost(req) ? 'cs-statement.html' : 'statement.html'));
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
