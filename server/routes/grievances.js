const wrap = require('../middleware/wrap');
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { writeBlock } = require('../services/ledger');

function genTicket() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GRV-${ts}-${rnd}`;
}

// GET /api/grievances — list (citizen: own, officer/admin/auditor: all)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const { user } = req;
  let rows;
  if (user.role === 'citizen') {
    rows = db.prepare(`
      SELECT g.*, u.name as citizen_name, d.name as dept_name,
             a.name as assigned_name,
             (SELECT COUNT(*) FROM grievance_updates WHERE grievance_id = g.id) as update_count
      FROM grievances g
      LEFT JOIN users u ON g.citizen_id = u.id
      LEFT JOIN departments d ON g.dept_id = d.id
      LEFT JOIN users a ON g.assigned_to = a.id
      WHERE g.citizen_id = ?
      ORDER BY g.created_at DESC
    `).all(user.id);
  } else {
    rows = db.prepare(`
      SELECT g.*, u.name as citizen_name, d.name as dept_name,
             a.name as assigned_name,
             (SELECT COUNT(*) FROM grievance_updates WHERE grievance_id = g.id) as update_count
      FROM grievances g
      LEFT JOIN users u ON g.citizen_id = u.id
      LEFT JOIN departments d ON g.dept_id = d.id
      LEFT JOIN users a ON g.assigned_to = a.id
      ORDER BY g.created_at DESC
    `).all();
  }
  res.json(rows);
});

// GET /api/grievances/stats
router.get('/stats', authenticate, authorize('officer', 'admin', 'auditor'), (req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM grievances').get().c;
  const open = db.prepare("SELECT COUNT(*) as c FROM grievances WHERE status IN ('open','in_progress','escalated')").get().c;
  const resolved = db.prepare("SELECT COUNT(*) as c FROM grievances WHERE status = 'resolved'").get().c;
  const critical = db.prepare("SELECT COUNT(*) as c FROM grievances WHERE priority = 'critical' AND status != 'resolved'").get().c;
  const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM grievances GROUP BY category').all();
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM grievances GROUP BY status').all();
  // avg resolution time in hours
  const avgRes = db.prepare(`
    SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24) as avg_hours
    FROM grievances WHERE resolved_at IS NOT NULL
  `).get();
  res.json({ total, open, resolved, critical, byCategory, byStatus, avg_resolution_hours: Math.round(avgRes.avg_hours || 0) });
});

// GET /api/grievances/:id — detail with timeline
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const { user } = req;
  const g = db.prepare(`
    SELECT g.*, u.name as citizen_name, u.email as citizen_email, u.aadhaar_id,
           d.name as dept_name, a.name as assigned_name
    FROM grievances g
    LEFT JOIN users u ON g.citizen_id = u.id
    LEFT JOIN departments d ON g.dept_id = d.id
    LEFT JOIN users a ON g.assigned_to = a.id
    WHERE g.id = ?
  `).get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Not found' });
  if (user.role === 'citizen' && g.citizen_id !== user.id) return res.status(403).json({ error: 'Forbidden' });
  const updates = db.prepare(`
    SELECT * FROM grievance_updates WHERE grievance_id = ? ORDER BY created_at ASC
  `).all(g.id);
  // SLA hours elapsed
  const hoursElapsed = (Date.now() - new Date(g.created_at).getTime()) / 3600000;
  const slaBreached = hoursElapsed > g.sla_hours && g.status !== 'resolved' && g.status !== 'closed';
  res.json({ ...g, updates, hours_elapsed: Math.round(hoursElapsed), sla_breached: slaBreached });
});

// POST /api/grievances — citizen creates grievance
router.post('/', authenticate, authorize('citizen'), (req, res) => {
  const db = getDb();
  const { subject, description, category = 'service', dept_id, priority = 'medium' } = req.body;
  if (!subject || !description) return res.status(400).json({ error: 'Subject and description are required' });

  const ticket_id = genTicket();
  const stmt = db.prepare(`
    INSERT INTO grievances (ticket_id, citizen_id, dept_id, subject, description, category, priority, sla_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, 72)
  `);
  const result = stmt.run(ticket_id, req.user.id, dept_id || null, subject, description, category, priority);
  const grievance = db.prepare('SELECT * FROM grievances WHERE id = ?').get(result.lastInsertRowid);

  // Initial timeline entry
  db.prepare(`
    INSERT INTO grievance_updates (grievance_id, actor_id, actor_name, actor_role, action, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(grievance.id, req.user.id, req.user.name, 'citizen', 'FILED', `Grievance filed by citizen. Ticket ID: ${ticket_id}`);

  // Raise alert
  db.prepare(`
    INSERT INTO alerts (type, severity, message, entity_type, entity_id)
    VALUES ('GRIEVANCE_FILED', 'medium', ?, 'grievance', ?)
  `).run(`New grievance: ${subject} (${ticket_id})`, grievance.id);

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: 'GRIEVANCE_FILED', entity_type: 'grievance', entity_id: grievance.id,
    payload: { ticket_id, subject, category, priority }
  });

  res.status(201).json({ ...grievance, ticket_id });
});

// POST /api/grievances/:id/respond — officer adds update
router.post('/:id/respond', authenticate, authorize('officer', 'admin'), (req, res) => {
  const db = getDb();
  const { note, action = 'RESPONDED', status } = req.body;
  if (!note) return res.status(400).json({ error: 'Note is required' });

  const g = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Not found' });

  const updates = {};
  if (status && ['open','in_progress','resolved','escalated','closed'].includes(status)) {
    updates.status = status;
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
      updates.resolution_note = note;
    }
  }
  if (action === 'ASSIGNED' || action === 'RESPONDED') {
    updates.assigned_to = req.user.id;
    updates.status = updates.status || 'in_progress';
  }

  if (Object.keys(updates).length > 0) {
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE grievances SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(...Object.values(updates), g.id);
  }

  db.prepare(`
    INSERT INTO grievance_updates (grievance_id, actor_id, actor_name, actor_role, action, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(g.id, req.user.id, req.user.name, req.user.role, action, note);

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: `GRIEVANCE_${action}`, entity_type: 'grievance', entity_id: g.id,
    payload: { note, status: updates.status }
  });

  res.json({ success: true, status: updates.status || g.status });
});

// POST /api/grievances/:id/escalate
router.post('/:id/escalate', authenticate, (req, res) => {
  const db = getDb();
  const g = db.prepare('SELECT * FROM grievances WHERE id = ?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Not found' });

  db.prepare("UPDATE grievances SET status = 'escalated', priority = 'critical', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(g.id);
  db.prepare(`
    INSERT INTO grievance_updates (grievance_id, actor_id, actor_name, actor_role, action, note)
    VALUES (?, ?, ?, ?, 'ESCALATED', 'Escalated due to SLA breach or citizen request')
  `).run(g.id, req.user.id, req.user.name, req.user.role);

  db.prepare("INSERT INTO alerts (type, severity, message, entity_type, entity_id) VALUES ('GRIEVANCE_ESCALATED','critical',?,'grievance',?)")
    .run(`Grievance ${g.ticket_id} escalated: ${g.subject}`, g.id);

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: 'GRIEVANCE_ESCALATED', entity_type: 'grievance', entity_id: g.id,
    payload: { ticket_id: g.ticket_id }
  });

  res.json({ success: true });
});

module.exports = router;
