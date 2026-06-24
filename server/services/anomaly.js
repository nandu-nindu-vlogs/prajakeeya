const { getDb } = require('../db/schema');

function checkAnomalies() {
  const db = getDb();
  const alerts = [];

  // 1. SLA breach — files stuck > sla_hours without update
  const breached = db.prepare(`
    SELECT f.id, f.title, f.sla_hours, f.created_at, f.status,
           u.email as citizen_email
    FROM files f JOIN users u ON u.id = f.citizen_id
    WHERE f.status IN ('submitted','under_review')
    AND (julianday('now') - julianday(f.created_at)) * 24 > f.sla_hours
  `).all();

  for (const f of breached) {
    const exists = db.prepare(
      `SELECT id FROM alerts WHERE type='sla_breach' AND entity_id=? AND entity_type='file' AND resolved=0`
    ).get(f.id);
    if (!exists) {
      db.prepare(
        `INSERT INTO alerts (type, severity, message, entity_type, entity_id) VALUES (?,?,?,?,?)`
      ).run('sla_breach', 'high', `File #${f.id} "${f.title}" has exceeded ${f.sla_hours}h SLA — status: ${f.status}`, 'file', f.id);
      alerts.push({ type: 'sla_breach', file_id: f.id });
    }
  }

  // 2. Sudden approval speed — officer approving files in < 5 minutes
  const fastApprovals = db.prepare(`
    SELECT a.actor_id, u.email, COUNT(*) as count
    FROM file_actions a JOIN users u ON u.id = a.actor_id
    WHERE a.action = 'approved'
    AND a.created_at >= datetime('now', '-1 hour')
    GROUP BY a.actor_id
    HAVING count >= 5
  `).all();

  for (const fa of fastApprovals) {
    const exists = db.prepare(
      `SELECT id FROM alerts WHERE type='rapid_approval' AND entity_id=? AND entity_type='user' AND resolved=0 AND created_at >= datetime('now','-1 hour')`
    ).get(fa.actor_id);
    if (!exists) {
      db.prepare(
        `INSERT INTO alerts (type, severity, message, entity_type, entity_id) VALUES (?,?,?,?,?)`
      ).run('rapid_approval', 'critical', `Officer ${fa.email} approved ${fa.count} files in the last hour — possible rubber-stamping`, 'user', fa.actor_id);
      alerts.push({ type: 'rapid_approval', actor_id: fa.actor_id });
    }
  }

  // 3. Vendor concentration — same vendor winning > 60% of tenders in a dept
  const vendorConc = db.prepare(`
    SELECT b.vendor_name, t.dept_id, COUNT(*) as wins,
           (SELECT COUNT(*) FROM tenders t2 WHERE t2.dept_id = t.dept_id AND t2.status = 'awarded') as total
    FROM bids b JOIN tenders t ON t.id = b.tender_id
    WHERE t.winner_bid_id = b.id
    GROUP BY b.vendor_name, t.dept_id
  `).all();

  for (const vc of vendorConc) {
    if (vc.total > 1 && (vc.wins / vc.total) > 0.6) {
      const exists = db.prepare(
        `SELECT id FROM alerts WHERE type='vendor_concentration' AND message LIKE ? AND resolved=0`
      ).get(`%${vc.vendor_name}%`);
      if (!exists) {
        db.prepare(
          `INSERT INTO alerts (type, severity, message, entity_type, entity_id) VALUES (?,?,?,?,?)`
        ).run('vendor_concentration', 'high', `Vendor "${vc.vendor_name}" has won ${vc.wins}/${vc.total} tenders in dept #${vc.dept_id} (${Math.round(vc.wins/vc.total*100)}%) — investigate`, 'department', vc.dept_id);
        alerts.push({ type: 'vendor_concentration', vendor: vc.vendor_name });
      }
    }
  }

  // 4. Budget overspend warning
  const budgets = db.prepare(`
    SELECT b.*, d.name as dept_name FROM budget_entries b JOIN departments d ON d.id = b.dept_id
    WHERE b.spent / b.allocated > 0.85
  `).all();

  for (const bg of budgets) {
    const exists = db.prepare(
      `SELECT id FROM alerts WHERE type='budget_warning' AND entity_id=? AND entity_type='department' AND resolved=0`
    ).get(bg.dept_id);
    if (!exists) {
      const pct = Math.round(bg.spent / bg.allocated * 100);
      db.prepare(
        `INSERT INTO alerts (type, severity, message, entity_type, entity_id) VALUES (?,?,?,?,?)`
      ).run('budget_warning', pct >= 95 ? 'critical' : 'high', `${bg.dept_name} has consumed ${pct}% of annual budget — immediate review required`, 'department', bg.dept_id);
      alerts.push({ type: 'budget_warning', dept: bg.dept_name });
    }
  }

  return alerts;
}

module.exports = { checkAnomalies };
