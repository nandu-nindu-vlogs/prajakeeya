const wrap = require('../middleware/wrap');
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/schema');
const { sign, authenticate } = require('../middleware/auth');
const { writeBlock } = require('../services/ledger');

const router = express.Router();

// POST /api/auth/register — supports citizen and contractor
router.post('/register', wrap(async (req, res) => {
  const { name, email, password, aadhaar_id, role,
          company_name, contractor_type, license_no, gst_no, pan_no, experience_years, address, specialization } = req.body;

  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });

  const allowedSelfRoles = ['citizen', 'contractor'];
  const finalRole = allowedSelfRoles.includes(role) ? role : 'citizen';

  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  if (aadhaar_id) {
    const dup = db.prepare('SELECT id FROM users WHERE aadhaar_id = ?').get(aadhaar_id);
    if (dup) return res.status(409).json({ error: 'Aadhaar ID already linked to another account' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, aadhaar_id) VALUES (?,?,?,?,?)`
  ).run(name, email, password_hash, finalRole, aadhaar_id || null);

  const uid = result.lastInsertRowid;

  // If contractor, create profile stub
  if (finalRole === 'contractor' && company_name) {
    db.prepare(`
      INSERT INTO contractor_profiles (user_id, company_name, contractor_type, license_no, gst_no, pan_no, experience_years, address, specialization)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(uid, company_name, contractor_type || 'General', license_no || '', gst_no || '', pan_no || '',
           parseInt(experience_years) || 0, address || '', specialization || '');
  }

  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(uid);
  const token = sign(user);

  writeBlock({
    actor_id: uid, actor_email: email,
    action_type: 'USER_REGISTER', entity_type: 'user', entity_id: uid,
    payload: { name, email, role: finalRole },
  });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

// POST /api/auth/login
router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = sign(user);

  writeBlock({
    actor_id: user.id, actor_email: user.email,
    action_type: 'USER_LOGIN', entity_type: 'user', entity_id: user.id,
    payload: { email },
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, dept_id: user.dept_id }
  });
}));

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare(
    `SELECT u.id, u.name, u.name_kn, u.email, u.role, u.aadhaar_id, u.dept_id, d.name as dept_name
     FROM users u LEFT JOIN departments d ON d.id = u.dept_id WHERE u.id = ?`
  ).get(req.user.id);
  res.json(user);
});

module.exports = router;
