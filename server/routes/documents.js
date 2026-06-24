const wrap = require('../middleware/wrap');
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { writeBlock } = require('../services/ledger');
const crypto = require('crypto');

function genCertNumber(type) {
  const code = { income: 'INC', caste: 'CST', domicile: 'DOM', scheme_eligibility: 'SCH' }[type] || 'DOC';
  const yr = new Date().getFullYear();
  const rnd = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `KA-${code}-${yr}-${rnd}`;
}

const DOC_META = {
  income: {
    label: 'Income Certificate',
    label_kn: 'ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ',
    requires_aadhaar: true,
    validity_days: 365,
    issuing_authority: 'Revenue Department, Government of Karnataka',
    description: 'Certifies the annual income of the applicant as per government records.',
  },
  caste: {
    label: 'Caste / Category Certificate',
    label_kn: 'ಜಾತಿ ಪ್ರಮಾಣಪತ್ರ',
    requires_aadhaar: true,
    validity_days: 3650,
    issuing_authority: 'Social Welfare Department, Government of Karnataka',
    description: 'Certifies the caste/community category of the applicant.',
  },
  domicile: {
    label: 'Domicile / Residence Certificate',
    label_kn: 'ವಾಸಸ್ಥಾನ ಪ್ರಮಾಣಪತ್ರ',
    requires_aadhaar: true,
    validity_days: 180,
    issuing_authority: 'Revenue Department, Government of Karnataka',
    description: 'Certifies that the applicant is a resident of Karnataka.',
  },
  scheme_eligibility: {
    label: 'Scheme Eligibility Letter',
    label_kn: 'ಯೋಜನೆ ಅರ್ಹತಾ ಪತ್ರ',
    requires_aadhaar: false,
    validity_days: 90,
    issuing_authority: 'District Administration, Government of Karnataka',
    description: 'Certifies eligibility for the requested government scheme.',
  },
};

// POST /api/documents/generate — instant cert generation
router.post('/generate', authenticate, authorize('citizen'), (req, res) => {
  const db = getDb();
  const { doc_type, scheme_name, declared_income, category } = req.body;
  const user = req.user;

  if (!DOC_META[doc_type]) return res.status(400).json({ error: 'Invalid document type' });
  const meta = DOC_META[doc_type];

  // Check: citizen must have aadhaar if required
  const citizenRecord = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  if (meta.requires_aadhaar && !citizenRecord.aadhaar_id) {
    return res.status(422).json({
      error: 'Aadhaar ID not linked to your account. Please update your profile or visit the nearest CSC.',
      requires_aadhaar: true
    });
  }

  // Check if already issued and still valid
  const existing = db.prepare(`
    SELECT * FROM generated_documents
    WHERE citizen_id = ? AND doc_type = ? AND status = 'active'
    AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)
    ORDER BY issued_at DESC LIMIT 1
  `).get(user.id, doc_type);

  if (existing) {
    return res.status(409).json({
      error: 'A valid certificate of this type already exists.',
      existing_cert: existing.cert_number,
      valid_until: existing.valid_until,
      id: existing.id
    });
  }

  // Build certificate data
  const cert_number = genCertNumber(doc_type);
  const issued_at = new Date().toISOString();
  const valid_until_date = new Date();
  valid_until_date.setDate(valid_until_date.getDate() + meta.validity_days);

  const docData = {
    citizen_name: citizenRecord.name,
    aadhaar_masked: citizenRecord.aadhaar_id ? `XXXX-XXXX-${citizenRecord.aadhaar_id.slice(-4)}` : null,
    doc_type,
    cert_number,
    issued_at,
    valid_until: valid_until_date.toISOString(),
    issuing_authority: meta.issuing_authority,
    // Type-specific fields
    ...(doc_type === 'income' && { declared_annual_income: declared_income || 'As per government records', currency: 'INR' }),
    ...(doc_type === 'caste' && { category: category || 'OBC', caste: 'As per government records' }),
    ...(doc_type === 'domicile' && { state: 'Karnataka', district: 'Bengaluru Urban', years_of_residence: '15+' }),
    ...(doc_type === 'scheme_eligibility' && { scheme_name: scheme_name || 'General', eligibility_status: 'ELIGIBLE', basis: 'Income and category criteria met' }),
    digital_signature: crypto.createHash('sha256').update(`${cert_number}${user.id}${issued_at}`).digest('hex').toUpperCase().slice(0, 32),
    qr_data: `PRAJAKEEYA:${cert_number}:${user.id}:VERIFY`,
  };

  const result = db.prepare(`
    INSERT INTO generated_documents (citizen_id, doc_type, cert_number, citizen_name, citizen_aadhaar, data_json, issued_at, valid_until)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, doc_type, cert_number, citizenRecord.name, citizenRecord.aadhaar_id, JSON.stringify(docData), issued_at, valid_until_date.toISOString());

  writeBlock({
    actor_id: user.id, actor_email: user.email,
    action_type: 'DOCUMENT_GENERATED', entity_type: 'document', entity_id: result.lastInsertRowid,
    payload: { doc_type, cert_number, citizen: citizenRecord.name }
  });

  res.status(201).json({
    id: result.lastInsertRowid,
    cert_number,
    doc_type,
    meta,
    data: docData,
    issued_instantly: true,
    message: `${meta.label} issued instantly. Certificate Number: ${cert_number}`
  });
});

// GET /api/documents/my — citizen's documents
router.get('/my', authenticate, (req, res) => {
  const db = getDb();
  const docs = db.prepare(`
    SELECT * FROM generated_documents WHERE citizen_id = ? ORDER BY issued_at DESC
  `).all(req.user.id);
  const enriched = docs.map(d => ({
    ...d,
    data: JSON.parse(d.data_json),
    meta: DOC_META[d.doc_type] || {},
    is_expired: d.valid_until && new Date(d.valid_until) < new Date(),
  }));
  res.json(enriched);
});

// GET /api/documents/:id — get specific document
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM generated_documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'citizen' && doc.citizen_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  res.json({
    ...doc,
    data: JSON.parse(doc.data_json),
    meta: DOC_META[doc.doc_type] || {},
    is_expired: doc.valid_until && new Date(doc.valid_until) < new Date(),
  });
});

// GET /api/documents/types/available — what types can this citizen get
router.get('/types/available', authenticate, authorize('citizen'), (req, res) => {
  const db = getDb();
  const citizen = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const existing = db.prepare(`
    SELECT doc_type, cert_number, valid_until, status FROM generated_documents
    WHERE citizen_id = ? AND status = 'active'
  `).all(req.user.id);
  const existingMap = {};
  existing.forEach(e => { existingMap[e.doc_type] = e; });

  const types = Object.entries(DOC_META).map(([key, meta]) => ({
    key,
    ...meta,
    has_aadhaar: !!citizen.aadhaar_id,
    eligible: !meta.requires_aadhaar || !!citizen.aadhaar_id,
    existing: existingMap[key] || null,
  }));
  res.json(types);
});

module.exports = router;
