const wrap = require('../middleware/wrap');
const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { writeBlock } = require('../services/ledger');

const router = express.Router();

// GET /api/projects — public: all projects
router.get('/', wrap((req, res) => {
  const db = getDb();
  const { status, category, dept_id } = req.query;
  let sql = `
    SELECT p.*, d.name as dept_name, d.name_kn as dept_name_kn,
      (SELECT COUNT(*) FROM project_objections po WHERE po.project_id = p.id) as objection_count,
      (SELECT COUNT(*) FROM project_updates pu WHERE pu.project_id = p.id) as update_count
    FROM projects p
    LEFT JOIN departments d ON d.id = p.dept_id
    WHERE p.is_public = 1
  `;
  const params = [];
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (category) { sql += ' AND p.category = ?'; params.push(category); }
  if (dept_id) { sql += ' AND p.dept_id = ?'; params.push(dept_id); }
  sql += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(sql).all(...params));
}));

// GET /api/projects/stats — public stats
router.get('/stats', wrap((req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM projects WHERE is_public=1').get().c;
  const ongoing = db.prepare("SELECT COUNT(*) as c FROM projects WHERE status='ongoing' AND is_public=1").get().c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM projects WHERE status='completed' AND is_public=1").get().c;
  const delayed = db.prepare("SELECT COUNT(*) as c FROM projects WHERE status='delayed' AND is_public=1").get().c;
  const totalBudget = db.prepare('SELECT COALESCE(SUM(budget),0) as s FROM projects WHERE is_public=1').get().s;
  const totalSpent = db.prepare('SELECT COALESCE(SUM(actual_cost),0) as s FROM projects WHERE is_public=1').get().s;
  const byCategory = db.prepare(`SELECT category, COUNT(*) as count, SUM(budget) as total_budget FROM projects WHERE is_public=1 GROUP BY category`).all();
  const byStatus = db.prepare(`SELECT status, COUNT(*) as count FROM projects WHERE is_public=1 GROUP BY status`).all();
  res.json({ total, ongoing, completed, delayed, totalBudget, totalSpent, byCategory, byStatus });
}));

// GET /api/projects/:id — public project detail
router.get('/:id', wrap((req, res) => {
  const db = getDb();
  const project = db.prepare(`
    SELECT p.*, d.name as dept_name, d.name_kn as dept_name_kn,
      u.name as contractor_display_name,
      cp.company_name, cp.contractor_type, cp.license_no, cp.experience_years, cp.verified as contractor_verified
    FROM projects p
    LEFT JOIN departments d ON d.id = p.dept_id
    LEFT JOIN users u ON u.id = p.contractor_id
    LEFT JOIN contractor_profiles cp ON cp.user_id = p.contractor_id
    WHERE p.id = ? AND p.is_public = 1
  `).get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const updates = db.prepare(`
    SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at ASC
  `).all(req.params.id);

  const objections = db.prepare(`
    SELECT po.*, u.name as citizen_display_name
    FROM project_objections po
    LEFT JOIN users u ON u.id = po.citizen_id
    WHERE po.project_id = ? AND po.is_public = 1
    ORDER BY po.created_at DESC
  `).all(req.params.id);

  res.json({ ...project, updates, objections });
}));

// POST /api/projects/:id/objections — citizen raises objection
router.post('/:id/objections', authenticate, authorize('citizen'), wrap((req, res) => {
  const { subject, description, category } = req.body;
  if (!subject || !description) return res.status(400).json({ error: 'subject and description required' });

  const db = getDb();
  const project = db.prepare('SELECT id FROM projects WHERE id=? AND is_public=1').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const user = db.prepare('SELECT name FROM users WHERE id=?').get(req.user.id);

  const r = db.prepare(`
    INSERT INTO project_objections (project_id, citizen_id, citizen_name, subject, description, category)
    VALUES (?,?,?,?,?,?)
  `).run(
    req.params.id, req.user.id, user.name,
    subject, description, category || 'query'
  );

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: 'OBJECTION_FILED', entity_type: 'project', entity_id: Number(req.params.id),
    payload: { subject, category: category || 'query' },
  });

  res.status(201).json({ id: r.lastInsertRowid, message: 'Objection filed successfully. It is publicly visible.' });
}));

// POST /api/projects/:id/respond/:objId — officer responds to objection
router.post('/:id/respond/:objId', authenticate, authorize('officer','admin'), wrap((req, res) => {
  const { response } = req.body;
  if (!response) return res.status(400).json({ error: 'response required' });

  const db = getDb();
  db.prepare(`
    UPDATE project_objections SET status='answered', response=?, responded_by=?, responded_at=CURRENT_TIMESTAMP
    WHERE id=? AND project_id=?
  `).run(response, req.user.id, req.params.objId, req.params.id);

  res.json({ success: true });
}));

// GET /api/projects/contractor/my — contractor sees own projects
router.get('/contractor/my', authenticate, authorize('contractor'), wrap((req, res) => {
  const db = getDb();
  const projects = db.prepare(`
    SELECT p.*, d.name as dept_name
    FROM projects p
    LEFT JOIN departments d ON d.id = p.dept_id
    WHERE p.contractor_id = ?
    ORDER BY p.created_at DESC
  `).all(req.user.id);

  const bids = db.prepare(`
    SELECT b.*, t.title as tender_title, t.budget, t.status as tender_status, t.deadline
    FROM bids b
    JOIN tenders t ON t.id = b.tender_id
    WHERE b.contractor_id = ?
    ORDER BY b.submitted_at DESC
  `).all(req.user.id);

  res.json({ projects, bids });
}));

// POST /api/projects/:id/updates — officer/contractor posts update
router.post('/:id/updates', authenticate, authorize('officer','admin','contractor'), wrap((req, res) => {
  const { update_type, description, completion_pct } = req.body;
  if (!update_type || !description) return res.status(400).json({ error: 'update_type and description required' });

  const db = getDb();
  const user = db.prepare('SELECT name, role FROM users WHERE id=?').get(req.user.id);

  const r = db.prepare(`
    INSERT INTO project_updates (project_id, actor_id, actor_name, actor_role, update_type, description, completion_pct)
    VALUES (?,?,?,?,?,?,?)
  `).run(req.params.id, req.user.id, user.name, user.role, update_type, description, completion_pct || null);

  if (completion_pct !== undefined) {
    db.prepare('UPDATE projects SET completion_pct=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(completion_pct, req.params.id);
  }

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: 'PROJECT_UPDATE', entity_type: 'project', entity_id: Number(req.params.id),
    payload: { update_type, completion_pct },
  });

  res.status(201).json({ id: r.lastInsertRowid });
}));

module.exports = router;
