const wrap = require('../middleware/wrap');
const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { writeBlock } = require('../services/ledger');

const router = express.Router();

// GET /api/finance/pos
router.get('/pos', authenticate, authorize('officer', 'admin', 'auditor'), wrap((req, res) => {
  const db = getDb();
  const pos = db.prepare(`
    SELECT po.*, d.name as dept_name,
           gr.id as gr_id, gr.received_at, gr.quantity_received,
           inv.id as inv_id, inv.invoice_number, inv.amount as inv_amount, inv.status as inv_status
    FROM purchase_orders po
    LEFT JOIN departments d ON d.id = po.dept_id
    LEFT JOIN goods_receipts gr ON gr.po_id = po.id
    LEFT JOIN invoices inv ON inv.po_id = po.id
    ORDER BY po.created_at DESC
  `).all();
  res.json(pos);
}));

// POST /api/finance/pos
router.post('/pos', authenticate, authorize('officer', 'admin'), wrap((req, res) => {
  const { vendor_name, amount, description, dept_id } = req.body;
  if (!vendor_name || !amount) return res.status(400).json({ error: 'vendor_name and amount required' });

  const db = getDb();
  const deptId = dept_id || req.user.dept_id || 1;

  const budget = db.prepare(
    `SELECT * FROM budget_entries WHERE dept_id=? AND fiscal_year=2026`
  ).get(deptId);

  if (budget && (budget.spent + parseFloat(amount)) > budget.allocated) {
    return res.status(400).json({
      error: 'BUDGET CEILING EXCEEDED — Purchase order blocked',
      allocated: budget.allocated,
      spent: budget.spent,
      requested: amount,
      shortfall: (budget.spent + parseFloat(amount)) - budget.allocated,
    });
  }

  const result = db.prepare(
    `INSERT INTO purchase_orders (vendor_name, amount, description, dept_id, created_by, status) VALUES (?,?,?,?,?,'created')`
  ).run(vendor_name, parseFloat(amount), description || '', deptId, req.user.id);

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: 'PO_CREATE', entity_type: 'purchase_order', entity_id: result.lastInsertRowid,
    payload: { vendor_name, amount, dept_id: deptId },
  });

  res.status(201).json({ id: result.lastInsertRowid, message: 'Purchase Order created' });
}));

// POST /api/finance/pos/:id/gr — record goods received
router.post('/pos/:id/gr', authenticate, authorize('officer', 'admin'), wrap((req, res) => {
  const { quantity_received, notes } = req.body;
  const db = getDb();
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id=?').get(req.params.id);
  if (!po) return res.status(404).json({ error: 'PO not found' });
  if (po.status !== 'created') return res.status(400).json({ error: `Cannot record GR — PO status is '${po.status}'` });

  db.prepare(`INSERT INTO goods_receipts (po_id, received_by, quantity_received, notes) VALUES (?,?,?,?)`)
    .run(po.id, req.user.id, quantity_received || 1, notes || '');

  db.prepare(`UPDATE purchase_orders SET status='gr_submitted' WHERE id=?`).run(po.id);

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: 'GOODS_RECEIVED', entity_type: 'purchase_order', entity_id: po.id,
    payload: { quantity_received, notes },
  });

  res.json({ success: true, message: 'Goods Receipt recorded. Ready for invoice submission.' });
}));

// POST /api/finance/pos/:id/invoice — submit invoice & trigger 3-way match
router.post('/pos/:id/invoice', authenticate, authorize('officer', 'admin'), wrap((req, res) => {
  const { invoice_amount } = req.body;
  if (!invoice_amount) return res.status(400).json({ error: 'invoice_amount required' });

  const db = getDb();
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id=?').get(req.params.id);
  if (!po) return res.status(404).json({ error: 'PO not found' });
  if (po.status !== 'gr_submitted') return res.status(400).json({ error: `3-Way Match requires GR first. Current status: '${po.status}'` });

  const gr = db.prepare('SELECT * FROM goods_receipts WHERE po_id=?').get(po.id);
  if (!gr) return res.status(400).json({ error: '3-WAY MATCH FAILED: No Goods Receipt found.' });

  const amt = parseFloat(invoice_amount);
  const tolerance = 0.01; // 1%
  const pct_diff = Math.abs(amt - po.amount) / po.amount;

  const inv_num = `INV-${Date.now().toString(36).toUpperCase()}`;

  if (pct_diff > tolerance) {
    // MISMATCH — block payment
    db.prepare(`INSERT INTO invoices (po_id, invoice_number, amount, status) VALUES (?,?,?,'rejected')`)
      .run(po.id, inv_num, amt);
    db.prepare(`UPDATE purchase_orders SET status='invoice_submitted', match_status='mismatch', mismatch_reason=? WHERE id=?`)
      .run(`Invoice ₹${amt.toLocaleString('en-IN')} ≠ PO ₹${po.amount.toLocaleString('en-IN')}. Difference: ₹${Math.abs(amt - po.amount).toLocaleString('en-IN')}. Payment blocked.`, po.id);
    db.prepare(`INSERT INTO alerts (type,severity,message,entity_type,entity_id) VALUES (?,?,?,?,?)`)
      .run('invoice_mismatch','critical',`Invoice mismatch on PO-${po.id}: ₹${amt} vs PO ₹${po.amount}. PAYMENT BLOCKED.`,'purchase_order', po.id);

    return res.status(400).json({
      match_status: 'mismatch',
      reason: `Invoice ₹${amt} does not match PO ₹${po.amount}`,
      po_amount: po.amount, invoice_amount: amt,
      difference: Math.abs(amt - po.amount),
    });
  }

  // MATCH — auto-release payment
  db.prepare(`INSERT INTO invoices (po_id, invoice_number, amount, status) VALUES (?,?,?,'matched')`)
    .run(po.id, inv_num, amt);
  db.prepare(`UPDATE purchase_orders SET status='matched', match_status='matched', paid_at=CURRENT_TIMESTAMP WHERE id=?`).run(po.id);
  db.prepare(`UPDATE budget_entries SET spent=spent+? WHERE dept_id=? AND fiscal_year=2026`).run(amt, po.dept_id);

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: '3WAY_MATCH_PASS', entity_type: 'purchase_order', entity_id: po.id,
    payload: { invoice_number: inv_num, amount: amt, match: 'PASS', payment_released: true },
  });

  res.json({ match_status: 'matched', message: `✅ 3-Way Match PASSED — Payment of ₹${amt.toLocaleString('en-IN')} auto-released`, invoice_number: inv_num });
}));

// GET /api/finance/budget
router.get('/budget', authenticate, authorize('admin', 'auditor', 'officer'), wrap((req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT b.*, d.name as dept_name FROM budget_entries b
    JOIN departments d ON d.id = b.dept_id
    ORDER BY b.dept_id
  `).all();
  const departments = rows.map(r => ({
    ...r,
    name: r.dept_name,
    utilized: r.spent,
  }));
  res.json({ departments });
}));

module.exports = router;
