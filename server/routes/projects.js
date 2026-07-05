const wrap = require('../middleware/wrap');
const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { writeBlock } = require('../services/ledger');

const router = express.Router();

// In-memory demo store for negative-id demo projects (non-persistent, used for UI/demo only)
const demoStore = { objections: {}, updates: {} };

const DEMO_PROJECT_MAP = {
  '-1': { id: -1, title: 'Demo Road Repair - Jayanagar', description: 'Road resurfacing and drainage repair in Jayanagar ward.', category: 'Road Infrastructure', status: 'ongoing', completion_pct: 10, budget: 500000, actual_cost: 50000, location: 'Jayanagar, Bengaluru', contractor_name: 'Rajesh Constructions Pvt Ltd', is_public: 1 },
  '-2': { id: -2, title: 'Demo PHC - Yelahanka', description: 'Primary Health Center construction with OPD and lab.', category: 'Healthcare Infrastructure', status: 'completed', completion_pct: 100, budget: 1200000, actual_cost: 1180000, location: 'Yelahanka', contractor_name: 'BuildRight Infra Solutions', is_public: 1 },
  '-3': { id: -3, title: 'Demo Smart Meters - North Zone', description: 'Installation of 5000 IoT water meters.', category: 'Water Infrastructure', status: 'ongoing', completion_pct: 20, budget: 450000, actual_cost: 85000, location: 'Bengaluru North Zone', contractor_name: 'AquaTech Water Solutions', is_public: 1 },
  '-4': { id: -4, title: 'Demo School Building - Kolar', description: 'New government high school with smart classrooms.', category: 'Education Infrastructure', status: 'delayed', completion_pct: 25, budget: 1800000, actual_cost: 450000, location: 'Kolar Town', contractor_name: 'BuildRight Infra Solutions', is_public: 1 },
  '-5': { id: -5, title: 'Demo Rural Roads - Tumkur', description: 'Connectivity works for 8 villages, all-weather roads.', category: 'Road Infrastructure', status: 'planning', completion_pct: 0, budget: 620000, actual_cost: 0, location: 'Tumkur District', contractor_name: 'Rajesh Constructions Pvt Ltd', is_public: 1 },
};

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
  if (!project) {
    // fallback to demo project for negative ids
    const pid = String(req.params.id);
    if (Number(pid) < 0 && DEMO_PROJECT_MAP[pid]) {
      const demo = DEMO_PROJECT_MAP[pid];
      // default demo updates if none in store
      const updates = demoStore.updates[pid] || [
        { id: -201, actor_name: 'Rajesh Constructions', actor_role: 'contractor', update_type: 'milestone', description: 'Site survey and clearing complete.', created_at: '2026-04-10', completion_pct: 5 },
        { id: -202, actor_name: 'Rajesh Constructions', actor_role: 'contractor', update_type: 'progress', description: 'GSB layer laid for first 6km.', created_at: '2026-05-02', completion_pct: 15 },
        { id: -203, actor_name: 'Officer Nagaraj', actor_role: 'officer', update_type: 'progress', description: 'DBM application started at km 0-4.', created_at: '2026-06-20', completion_pct: demo.completion_pct },
      ];

      // default demo objections if none in store
      const objections = demoStore.objections[pid] || [
        { id: -301, citizen_name: 'Priya Sharma', subject: 'Dust nuisance during works', description: 'Heavy dust near residences; request water sprinkling.', category: 'objection', status: 'open', created_at: '2026-06-12' },
        { id: -302, citizen_name: 'Ravi Kumar', subject: 'Traffic diversion plan unclear', description: 'Please display diversion maps.', category: 'query', status: 'answered', response: 'Diversion maps uploaded on site.', responded_at: '2026-06-18' },
      ];

      return res.json({ ...demo, updates, objections });
    }
    return res.status(404).json({ error: 'Project not found' });
  }

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
  const dbProject = db.prepare('SELECT id FROM projects WHERE id=? AND is_public=1').get(req.params.id);
  if (!dbProject) {
    // allow objections for demo projects (negative ids) stored in memory
    const pid = String(req.params.id);
    if (Number(pid) < 0 && DEMO_PROJECT_MAP[pid]) {
      const user = db.prepare('SELECT name FROM users WHERE id=?').get(req.user.id) || { name: req.user.name || 'Demo Citizen' };
      const obj = {
        id: Date.now() % 1000000 * -1,
        citizen_name: user.name,
        subject,
        description,
        category: category || 'query',
        status: 'open',
        created_at: new Date().toISOString(),
      };
      demoStore.objections[pid] = demoStore.objections[pid] || [];
      demoStore.objections[pid].unshift(obj);

      writeBlock({
        actor_id: req.user.id, actor_email: req.user.email,
        action_type: 'OBJECTION_FILED_DEMO', entity_type: 'project', entity_id: Number(req.params.id),
        payload: { subject, category: category || 'query' },
      });

      return res.status(201).json({ id: obj.id, message: 'Objection filed successfully (demo).' });
    }
    return res.status(404).json({ error: 'Project not found' });
  }

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

  // if project exists in DB, insert there; otherwise allow demo project updates (in-memory)
  const dbProject = db.prepare('SELECT id FROM projects WHERE id=?').get(req.params.id);
  if (dbProject) {
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

    return res.status(201).json({ id: r.lastInsertRowid });
  }

  // demo project path
  const pid = String(req.params.id);
  if (Number(pid) < 0 && DEMO_PROJECT_MAP[pid]) {
    const obj = {
      id: Date.now() % 1000000 * -1,
      actor_name: user.name,
      actor_role: user.role,
      update_type,
      description,
      completion_pct: completion_pct || null,
      created_at: new Date().toISOString(),
    };
    demoStore.updates[pid] = demoStore.updates[pid] || [];
    demoStore.updates[pid].push(obj);

    if (completion_pct !== undefined && DEMO_PROJECT_MAP[pid]) {
      DEMO_PROJECT_MAP[pid].completion_pct = completion_pct;
    }

    writeBlock({
      actor_id: req.user.id, actor_email: req.user.email,
      action_type: 'PROJECT_UPDATE_DEMO', entity_type: 'project', entity_id: Number(req.params.id),
      payload: { update_type, completion_pct },
    });

    return res.status(201).json({ id: obj.id });
  }

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
