const wrap = require('../middleware/wrap');
const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { checkAnomalies } = require('../services/anomaly');

const router = express.Router();

router.get('/public', wrap((req, res) => {
  const db = getDb();
  const fileStats = db.prepare(`
    SELECT COUNT(*) as total_files,
      SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status IN ('submitted','under_review') THEN 1 ELSE 0 END) as pending,
      ROUND(AVG(CASE WHEN status='approved' THEN (julianday(updated_at)-julianday(created_at))*24 END),1) as avg_hours
    FROM files
  `).get();
  const tenderStats = db.prepare(`
    SELECT COUNT(*) as total, SUM(budget) as total_value,
      SUM(CASE WHEN status='awarded' THEN 1 ELSE 0 END) as awarded FROM tenders
  `).get();
  const beneStats = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status='approved' THEN amount ELSE 0 END) as disbursed,
      SUM(CASE WHEN status='duplicate' THEN 1 ELSE 0 END) as duplicates_blocked
    FROM beneficiaries
  `).get();
  const ledgerCount = db.prepare('SELECT COUNT(*) as c FROM ledger').get().c;
  const alertCount  = db.prepare('SELECT COUNT(*) as c FROM alerts WHERE resolved=0').get().c;
  const recentActivity = db.prepare(
    'SELECT action_type,entity_type,entity_id,actor_email,timestamp FROM ledger ORDER BY id DESC LIMIT 10'
  ).all();
  const byDept = db.prepare(`
    SELECT d.name, d.name_kn, COUNT(f.id) as files,
      SUM(CASE WHEN f.status='approved' THEN 1 ELSE 0 END) as approved
    FROM departments d LEFT JOIN files f ON f.dept_id=d.id GROUP BY d.id
  `).all();
  res.json({ fileStats, tenderStats, beneStats, ledgerCount, alertCount, recentActivity, byDept });
}));

router.get('/admin', authenticate, authorize('admin', 'auditor'), wrap((req, res) => {
  const db = getDb();
  try { checkAnomalies(); } catch(e) { /* non-fatal */ }
  const alerts = db.prepare(`
    SELECT * FROM alerts WHERE resolved=0
    ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC
  `).all();
  const pendingFiles = db.prepare(`
    SELECT f.*, u.name as citizen_name, d.name as dept_name
    FROM files f JOIN users u ON u.id=f.citizen_id LEFT JOIN departments d ON d.id=f.dept_id
    WHERE f.status IN ('submitted','under_review','escalated') ORDER BY f.created_at ASC
  `).all();
  const budgets = db.prepare(`
    SELECT b.*, d.name as dept_name FROM budget_entries b JOIN departments d ON d.id=b.dept_id
  `).all();
  const users = db.prepare(
    'SELECT id,name,email,role,dept_id,is_active,created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json({ alerts, pendingFiles, budgets, users });
}));

router.patch('/alerts/:id/resolve', authenticate, authorize('admin', 'auditor'), wrap((req, res) => {
  const db = getDb();
  db.prepare('UPDATE alerts SET resolved=1 WHERE id=?').run(req.params.id);
  res.json({ success: true });
}));

router.get('/officer', authenticate, authorize('officer'), wrap((req, res) => {
  const db = getDb();
  const pending = db.prepare(`
    SELECT f.*, u.name as citizen_name
    FROM files f JOIN users u ON u.id=f.citizen_id
    WHERE (f.officer_id=? OR (f.officer_id IS NULL AND f.dept_id=?))
      AND f.status IN ('submitted','under_review')
    ORDER BY f.created_at ASC
  `).all(req.user.id, req.user.dept_id);
  const stats = db.prepare(`
    SELECT SUM(CASE WHEN status IN ('submitted','under_review') THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved,
           SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected
    FROM files WHERE officer_id=?
  `).get(req.user.id);
  res.json({ pending, stats });
}));

module.exports = router;
