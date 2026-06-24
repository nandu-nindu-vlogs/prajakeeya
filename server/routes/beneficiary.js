const wrap = require('../middleware/wrap');
const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { writeBlock } = require('../services/ledger');

const router = express.Router();

// GET /api/beneficiaries
router.get('/', authenticate, authorize('officer', 'admin', 'auditor'), (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT b.*, u.name as verified_by_name
    FROM beneficiaries b
    LEFT JOIN users u ON u.id = b.verified_by
    ORDER BY b.created_at DESC
  `).all();
  res.json(rows);
});

// POST /api/beneficiaries — add new
router.post('/', authenticate, authorize('officer', 'admin'), (req, res) => {
  const { name, aadhaar_id, scheme, amount, bank_account } = req.body;
  if (!name || !aadhaar_id || !scheme || !amount) {
    return res.status(400).json({ error: 'name, aadhaar_id, scheme, amount required' });
  }

  const db = getDb();

  // Dedup check — same Aadhaar + same scheme
  const duplicate = db.prepare(
    `SELECT id FROM beneficiaries WHERE aadhaar_id = ? AND scheme = ? AND status != 'rejected'`
  ).get(aadhaar_id, scheme);

  if (duplicate) {
    // Mark new as duplicate
    const result = db.prepare(
      `INSERT INTO beneficiaries (name, aadhaar_id, scheme, amount, status, bank_account, notes) VALUES (?,?,?,?,'duplicate',?,?)`
    ).run(name, aadhaar_id, scheme, amount, bank_account || null, `Duplicate of beneficiary #${duplicate.id}`);

    // Raise alert
    db.prepare(
      `INSERT INTO alerts (type, severity, message, entity_type, entity_id) VALUES (?,?,?,?,?)`
    ).run('duplicate_beneficiary', 'critical', `Duplicate Aadhaar ${aadhaar_id} in scheme "${scheme}" — ghost beneficiary attempt blocked`, 'beneficiary', result.lastInsertRowid);

    writeBlock({
      actor_id: req.user.id, actor_email: req.user.email,
      action_type: 'BENEFICIARY_DUPLICATE_BLOCKED',
      entity_type: 'beneficiary', entity_id: result.lastInsertRowid,
      payload: { aadhaar_id, scheme, original_id: duplicate.id }
    });

    return res.status(409).json({ error: 'DUPLICATE DETECTED: Aadhaar already enrolled in this scheme', duplicate_of: duplicate.id });
  }

  const result = db.prepare(
    `INSERT INTO beneficiaries (name, aadhaar_id, scheme, amount, bank_account, status) VALUES (?,?,?,?,?,'pending')`
  ).run(name, aadhaar_id, scheme, amount, bank_account || null);

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: 'BENEFICIARY_ADD',
    entity_type: 'beneficiary', entity_id: result.lastInsertRowid,
    payload: { name, scheme, amount }
  });

  res.status(201).json({ id: result.lastInsertRowid, message: 'Beneficiary added' });
});

// PATCH /api/beneficiaries/:id/verify
router.patch('/:id/verify', authenticate, authorize('officer', 'admin'), (req, res) => {
  const { approved, notes } = req.body;
  const db = getDb();
  const bene = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(req.params.id);
  if (!bene) return res.status(404).json({ error: 'Not found' });

  const newStatus = approved ? 'verified' : 'rejected';
  db.prepare('UPDATE beneficiaries SET status=?, verified_by=?, notes=? WHERE id=?')
    .run(newStatus, req.user.id, notes || null, bene.id);

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: approved ? 'BENEFICIARY_VERIFY' : 'BENEFICIARY_REJECT',
    entity_type: 'beneficiary', entity_id: bene.id,
    payload: { notes, new_status: newStatus }
  });

  res.json({ success: true, new_status: newStatus });
});

// PATCH /api/beneficiaries/:id/transfer — release DBT
router.patch('/:id/transfer', authenticate, authorize('admin'), (req, res) => {
  const { transfer_ref } = req.body;
  const db = getDb();
  const bene = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(req.params.id);
  if (!bene) return res.status(404).json({ error: 'Not found' });
  if (bene.status !== 'verified') return res.status(400).json({ error: 'Beneficiary must be verified first' });

  const ref = transfer_ref || `DBT-${Date.now()}`;
  db.prepare('UPDATE beneficiaries SET status=\'approved\', transfer_ref=? WHERE id=?').run(ref, bene.id);

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: 'BENEFICIARY_TRANSFER',
    entity_type: 'beneficiary', entity_id: bene.id,
    payload: { transfer_ref: ref, amount: bene.amount, scheme: bene.scheme }
  });

  res.json({ success: true, transfer_ref: ref });
});

module.exports = router;
