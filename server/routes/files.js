const wrap = require('../middleware/wrap');
const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { writeBlock } = require('../services/ledger');

const router = express.Router();

// GET /api/files — list (role-filtered)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  let rows;
  const { role, id, dept_id } = req.user;

  if (role === 'citizen') {
    rows = db.prepare(`
      SELECT f.*, u.name as officer_name, d.name as dept_name
      FROM files f
      LEFT JOIN users u ON u.id = f.officer_id
      LEFT JOIN departments d ON d.id = f.dept_id
      WHERE f.citizen_id = ?
      ORDER BY f.created_at DESC
    `).all(id);
  } else if (role === 'officer') {
    rows = db.prepare(`
      SELECT f.*, u.name as citizen_name, d.name as dept_name
      FROM files f
      LEFT JOIN users u ON u.id = f.citizen_id
      LEFT JOIN departments d ON d.id = f.dept_id
      WHERE f.officer_id = ? OR (f.officer_id IS NULL AND f.dept_id = ?)
      ORDER BY f.created_at DESC
    `).all(id, dept_id);
  } else {
    // admin / auditor — see all
    rows = db.prepare(`
      SELECT f.*, c.name as citizen_name, o.name as officer_name, d.name as dept_name
      FROM files f
      LEFT JOIN users c ON c.id = f.citizen_id
      LEFT JOIN users o ON o.id = f.officer_id
      LEFT JOIN departments d ON d.id = f.dept_id
      ORDER BY f.created_at DESC
    `).all();
  }
  res.json(rows);
});

// GET /api/files/:id — detail with actions
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const file = db.prepare(`
    SELECT f.*, c.name as citizen_name, c.email as citizen_email,
           o.name as officer_name, d.name as dept_name
    FROM files f
    LEFT JOIN users c ON c.id = f.citizen_id
    LEFT JOIN users o ON o.id = f.officer_id
    LEFT JOIN departments d ON d.id = f.dept_id
    WHERE f.id = ?
  `).get(req.params.id);

  if (!file) return res.status(404).json({ error: 'File not found' });

  // Citizens can only see their own files
  if (req.user.role === 'citizen' && file.citizen_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const actions = db.prepare(`
    SELECT fa.*, u.name as actor_name, u.role as actor_role
    FROM file_actions fa JOIN users u ON u.id = fa.actor_id
    WHERE fa.file_id = ?
    ORDER BY fa.created_at ASC
  `).all(req.params.id);

  // SLA calculation
  const hoursElapsed = (Date.now() - new Date(file.created_at).getTime()) / 3600000;
  const sla_remaining = Math.max(0, file.sla_hours - hoursElapsed);
  const sla_breached = hoursElapsed > file.sla_hours && !['approved', 'rejected', 'closed'].includes(file.status);

  res.json({ ...file, actions, sla_remaining: Math.round(sla_remaining), sla_breached });
});

// POST /api/files — citizen submits
router.post('/', authenticate, authorize('citizen'), (req, res) => {
  const { title, description, category, dept_id } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'Title and category required' });

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO files (title, description, category, citizen_id, dept_id, status) VALUES (?, ?, ?, ?, ?, 'submitted')`
  ).run(title, description || '', category, req.user.id, dept_id || 1);

  const fileId = result.lastInsertRowid;

  db.prepare(
    `INSERT INTO file_actions (file_id, actor_id, action, note, to_status) VALUES (?, ?, 'submitted', ?, 'submitted')`
  ).run(fileId, req.user.id, 'Application submitted by citizen');

  writeBlock({
    actor_id: req.user.id,
    actor_email: req.user.email,
    action_type: 'FILE_SUBMIT',
    entity_type: 'file',
    entity_id: fileId,
    payload: { title, category, dept_id }
  });

  res.status(201).json({ id: fileId, message: 'Application submitted successfully' });
});

// PATCH /api/files/:id/action — officer acts
router.patch('/:id/action', authenticate, authorize('officer', 'admin'), (req, res) => {
  const { action, note } = req.body;
  const validActions = { approve: 'approved', reject: 'rejected', review: 'under_review', escalate: 'escalated' };
  if (!validActions[action]) return res.status(400).json({ error: 'Invalid action' });

  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (['approved', 'rejected'].includes(file.status)) {
    return res.status(400).json({ error: 'File is already closed' });
  }

  const newStatus = validActions[action];
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE files SET status = ?, officer_id = ?, updated_at = ? WHERE id = ?`
  ).run(newStatus, req.user.id, now, file.id);

  db.prepare(
    `INSERT INTO file_actions (file_id, actor_id, action, note, from_status, to_status) VALUES (?,?,?,?,?,?)`
  ).run(file.id, req.user.id, action, note || '', file.status, newStatus);

  writeBlock({
    actor_id: req.user.id,
    actor_email: req.user.email,
    action_type: `FILE_${action.toUpperCase()}`,
    entity_type: 'file',
    entity_id: file.id,
    payload: { note, from: file.status, to: newStatus }
  });

  res.json({ success: true, new_status: newStatus });
});

// GET /api/files/public/stats — public transparency stats
router.get('/public/stats', (req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status IN ('submitted','under_review') THEN 1 ELSE 0 END) as pending,
      AVG(CASE WHEN status = 'approved'
          THEN (julianday(updated_at) - julianday(created_at)) * 24 END) as avg_resolution_hours
    FROM files
  `).get();
  res.json(stats);
});

module.exports = router;
