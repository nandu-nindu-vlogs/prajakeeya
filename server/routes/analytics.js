const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { authenticate, authorize } = require('../middleware/auth');
const wrap = require('../middleware/wrap');

router.get('/overview', authenticate, authorize('officer', 'admin', 'auditor'), wrap((req, res) => {
  const db = getDb();

  const totalFiles         = db.prepare('SELECT COUNT(*) as c FROM files').get().c;
  const approvedFiles      = db.prepare("SELECT COUNT(*) as c FROM files WHERE status='approved'").get().c;
  const pendingFiles       = db.prepare("SELECT COUNT(*) as c FROM files WHERE status IN ('submitted','under_review','escalated')").get().c;
  const totalCitizens      = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='citizen'").get().c;
  const totalBeneficiaries = db.prepare('SELECT COUNT(*) as c FROM beneficiaries').get().c;
  const duplicatesBlocked  = db.prepare("SELECT COUNT(*) as c FROM beneficiaries WHERE status='duplicate'").get().c;
  const totalTenders       = db.prepare('SELECT COUNT(*) as c FROM tenders').get().c;
  const openAlerts         = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE resolved=0").get().c;
  const totalGrievances    = db.prepare('SELECT COUNT(*) as c FROM grievances').get().c;
  const openGrievances     = db.prepare("SELECT COUNT(*) as c FROM grievances WHERE status IN ('open','in_progress','escalated')").get().c;
  const docsIssued         = db.prepare('SELECT COUNT(*) as c FROM generated_documents').get().c;

  const byDept = db.prepare(`
    SELECT d.name as dept, COUNT(f.id) as total,
      SUM(CASE WHEN f.status='approved'  THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN f.status='rejected'  THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN f.status IN ('submitted','under_review') THEN 1 ELSE 0 END) as pending
    FROM departments d LEFT JOIN files f ON f.dept_id = d.id
    GROUP BY d.id, d.name ORDER BY total DESC
  `).all();

  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM files GROUP BY status ORDER BY count DESC').all();

  const trend = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM files WHERE created_at >= DATE('now','-14 days')
    GROUP BY DATE(created_at) ORDER BY date ASC
  `).all();

  const grievanceCats = db.prepare('SELECT category, COUNT(*) as count FROM grievances GROUP BY category').all();

  res.json({
    kpis: {
      totalFiles, approvedFiles, pendingFiles, totalCitizens,
      totalBeneficiaries, duplicatesBlocked, totalTenders, openAlerts,
      totalGrievances, openGrievances, docsIssued,
      approvalRate: totalFiles > 0 ? Math.round((approvedFiles / totalFiles) * 100) : 0,
    },
    byDept, byStatus, trend, grievanceCats,
  });
}));

router.get('/sla', authenticate, authorize('officer', 'admin', 'auditor'), wrap((req, res) => {
  const db = getDb();

  const slaBreaches = db.prepare(`
    SELECT f.id, f.title, f.category, f.status, f.sla_hours, f.created_at,
           d.name as dept, u.name as citizen_name,
           ROUND((julianday('now') - julianday(f.created_at)) * 24, 1) as hours_elapsed
    FROM files f
    LEFT JOIN departments d ON f.dept_id = d.id
    LEFT JOIN users u ON f.citizen_id = u.id
    WHERE f.status IN ('submitted','under_review','escalated')
      AND (julianday('now') - julianday(f.created_at)) * 24 > f.sla_hours
    ORDER BY hours_elapsed DESC LIMIT 20
  `).all();

  const avgByDept = db.prepare(`
    SELECT d.name as dept,
      ROUND(AVG((julianday(f.updated_at) - julianday(f.created_at)) * 24), 1) as avg_hours,
      COUNT(*) as total,
      SUM(CASE WHEN (julianday(f.updated_at) - julianday(f.created_at)) * 24 <= f.sla_hours THEN 1 ELSE 0 END) as within_sla
    FROM files f LEFT JOIN departments d ON f.dept_id = d.id
    WHERE f.status IN ('approved','rejected','closed')
    GROUP BY d.id, d.name
  `).all();

  const totalResolved = db.prepare("SELECT COUNT(*) as c FROM files WHERE status IN ('approved','rejected','closed')").get().c;
  const withinSla = db.prepare(`
    SELECT COUNT(*) as c FROM files
    WHERE status IN ('approved','rejected','closed')
      AND (julianday(updated_at) - julianday(created_at)) * 24 <= sla_hours
  `).get().c;

  const complianceRate = totalResolved > 0 ? Math.round((withinSla / totalResolved) * 100) : 100;

  res.json({ slaBreaches, avgByDept, complianceRate, totalResolved, withinSla });
}));

router.get('/officers', authenticate, authorize('officer', 'admin', 'auditor'), wrap((req, res) => {
  const db = getDb();

  const scores = db.prepare(`
    SELECT u.id as officer_id, u.name as officer_name, u.email as officer_email,
           d.name as dept,
           COUNT(fa.id) as total_actions,
           SUM(CASE WHEN fa.action IN ('approve','approved') THEN 1 ELSE 0 END) as approved_count,
           SUM(CASE WHEN fa.action IN ('reject','rejected')  THEN 1 ELSE 0 END) as rejected_count,
           ROUND(AVG((julianday(f.updated_at) - julianday(f.created_at)) * 24), 1) as avg_response_hrs
    FROM users u
    LEFT JOIN departments d ON d.id = u.dept_id
    LEFT JOIN file_actions fa ON fa.actor_id = u.id
    LEFT JOIN files f ON f.id = fa.file_id AND f.officer_id = u.id
    WHERE u.role = 'officer'
    GROUP BY u.id, u.name, u.email, d.name
    ORDER BY total_actions DESC
  `).all();

  res.json({ scores });
}));

router.get('/fraud', authenticate, authorize('admin', 'auditor'), wrap((req, res) => {
  const db = getDb();

  const alertSummary = db.prepare(`
    SELECT type, severity, COUNT(*) as count
    FROM alerts WHERE created_at >= DATETIME('now','-30 days')
    GROUP BY type, severity ORDER BY count DESC
  `).all();

  const duplicateBeneficiaries = db.prepare(`
    SELECT id, aadhaar_id, name, scheme, amount, notes, created_at
    FROM beneficiaries WHERE status='duplicate'
    ORDER BY created_at DESC
  `).all();

  const invoiceMismatches = db.prepare(`
    SELECT po.id, po.vendor_name, po.amount as po_amount, po.description,
           po.mismatch_reason, po.match_status,
           d.name as dept_name,
           i.amount as invoice_amount,
           ABS(COALESCE(i.amount, 0) - po.amount) as difference
    FROM purchase_orders po
    LEFT JOIN departments d ON d.id = po.dept_id
    LEFT JOIN invoices i ON i.po_id = po.id
    WHERE po.match_status = 'mismatch'
    ORDER BY difference DESC LIMIT 10
  `).all();

  const vendorConcentration = db.prepare(`
    SELECT po.vendor_name, COUNT(*) as contracts, SUM(po.amount) as total_value
    FROM purchase_orders po
    GROUP BY po.vendor_name
    ORDER BY total_value DESC LIMIT 8
  `).all();

  const allAlerts = db.prepare(
    "SELECT * FROM alerts WHERE resolved=0 ORDER BY created_at DESC LIMIT 50"
  ).all();

  // Officers who approved many files suspiciously fast
  const rapidApprovals = db.prepare(`
    SELECT u.id as officer_id, u.name as officer_name, u.email as officer_email,
      COUNT(fa.id) as file_count,
      ROUND(AVG((julianday(fa.created_at) - julianday(f.created_at)) * 24), 2) as avg_hours
    FROM file_actions fa
    JOIN users u ON u.id = fa.actor_id
    JOIN files f ON f.id = fa.file_id
    WHERE fa.action IN ('approve','approved') AND u.role = 'officer'
    GROUP BY u.id, u.name, u.email
    HAVING COUNT(fa.id) >= 2
    ORDER BY avg_hours ASC LIMIT 10
  `).all();

  const corruptionCount = db.prepare(
    "SELECT COUNT(*) as c FROM grievances WHERE category='corruption'"
  ).get().c;

  res.json({
    alertSummary, duplicateBeneficiaries, vendorConcentration,
    invoiceMismatches, allAlerts, rapidApprovals, corruptionCount
  });
}));

module.exports = router;
