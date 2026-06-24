const wrap = require('../middleware/wrap');
const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { writeBlock } = require('../services/ledger');

const router = express.Router();

// GET /api/tenders
router.get('/', wrap((req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.*, d.name as dept_name, u.name as created_by_name,
           (SELECT COUNT(*) FROM bids b WHERE b.tender_id = t.id) as bid_count
    FROM tenders t
    LEFT JOIN departments d ON d.id = t.dept_id
    LEFT JOIN users u ON u.id = t.created_by
    ORDER BY t.created_at DESC
  `).all();
  res.json(rows);
}));

// GET /api/tenders/:id
router.get('/:id', wrap((req, res) => {
  const db = getDb();
  const tender = db.prepare(`
    SELECT t.*, d.name as dept_name
    FROM tenders t LEFT JOIN departments d ON d.id = t.dept_id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!tender) return res.status(404).json({ error: 'Not found' });

  tender.criteria = JSON.parse(tender.criteria_json || '[]');

  const now = new Date();
  const deadline = new Date(tender.deadline);
  const bids = db.prepare(`
    SELECT b.*, u.name as contractor_display_name, cp.company_name, cp.contractor_type
    FROM bids b
    LEFT JOIN users u ON u.id = b.contractor_id
    LEFT JOIN contractor_profiles cp ON cp.user_id = b.contractor_id
    WHERE b.tender_id = ? ORDER BY b.submitted_at ASC
  `).all(tender.id);

  const reveal = now > deadline || tender.status !== 'open';
  const sanitized = bids.map(b => ({
    ...b,
    amount:   reveal ? b.amount   : null,
    proposal: reveal ? b.proposal : null,
    technical_score: reveal ? b.technical_score : null,
  }));

  res.json({ ...tender, bids: sanitized });
}));

// POST /api/tenders — admin creates
router.post('/', authenticate, authorize('admin'), wrap((req, res) => {
  const { title, description, dept_id, budget, deadline, criteria, category } = req.body;
  if (!title || !budget || !deadline) return res.status(400).json({ error: 'title, budget, deadline required' });

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO tenders (title, description, dept_id, budget, deadline, criteria_json, category, created_by)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(title, description || '', dept_id || 1, budget, deadline,
        JSON.stringify(criteria || []), category || 'General', req.user.id);

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: 'TENDER_CREATE', entity_type: 'tender', entity_id: result.lastInsertRowid,
    payload: { title, budget, deadline },
  });

  res.status(201).json({ id: result.lastInsertRowid });
}));

// POST /api/tenders/:id/bid — CONTRACTOR ONLY
router.post('/:id/bid', authenticate, authorize('contractor'), wrap((req, res) => {
  const { amount, technical_score, proposal } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount required' });

  const db = getDb();
  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(req.params.id);
  if (!tender) return res.status(404).json({ error: 'Tender not found' });
  if (tender.status !== 'open') return res.status(400).json({ error: 'Tender is not open for bids' });
  if (new Date() > new Date(tender.deadline)) return res.status(400).json({ error: 'Bid deadline has passed' });

  const profile = db.prepare('SELECT * FROM contractor_profiles WHERE user_id=?').get(req.user.id);
  if (!profile) return res.status(400).json({ error: 'Complete your contractor profile before bidding' });

  const existing = db.prepare('SELECT id FROM bids WHERE tender_id=? AND contractor_id=?').get(tender.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'You have already submitted a bid for this tender' });

  const result = db.prepare(
    `INSERT INTO bids (tender_id, contractor_id, vendor_name, vendor_email, amount, technical_score, proposal)
     VALUES (?,?,?,?,?,?,?)`
  ).run(tender.id, req.user.id, profile.company_name, req.user.email,
        parseFloat(amount), parseFloat(technical_score) || 0, proposal || '');

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: 'BID_SUBMIT', entity_type: 'bid', entity_id: result.lastInsertRowid,
    payload: { tender_id: tender.id, vendor_name: profile.company_name, amount: parseFloat(amount) },
  });

  res.status(201).json({ id: result.lastInsertRowid, message: 'Bid submitted and sealed until deadline' });
}));

// POST /api/tenders/:id/award — admin auto-scores and awards
router.post('/:id/award', authenticate, authorize('admin'), wrap((req, res) => {
  const db = getDb();
  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(req.params.id);
  if (!tender) return res.status(404).json({ error: 'Tender not found' });
  if (tender.status === 'awarded') return res.status(400).json({ error: 'Already awarded' });

  const bids = db.prepare('SELECT * FROM bids WHERE tender_id = ? ORDER BY amount ASC').all(tender.id);
  if (bids.length === 0) return res.status(400).json({ error: 'No bids to evaluate' });

  const criteria = JSON.parse(tender.criteria_json || '[]');
  const minAmt = Math.min(...bids.map(b => b.amount));
  const priceWeight = criteria.find(c => c.name === 'Price')?.weight ?? 40;
  const techWeight = 100 - priceWeight;

  let winner = null, maxScore = -1;
  for (const bid of bids) {
    const priceScore = (minAmt / bid.amount) * priceWeight;
    const techScore  = ((bid.technical_score || 0) / 100) * techWeight;
    const total = parseFloat((priceScore + techScore).toFixed(2));
    db.prepare('UPDATE bids SET score=?, revealed=1 WHERE id=?').run(total, bid.id);
    if (total > maxScore) { maxScore = total; winner = { ...bid, composite_score: total }; }
  }

  db.prepare('UPDATE bids SET is_winner=1 WHERE id=?').run(winner.id);
  db.prepare("UPDATE tenders SET status='awarded', winner_bid_id=? WHERE id=?").run(winner.id, tender.id);

  writeBlock({
    actor_id: req.user.id, actor_email: req.user.email,
    action_type: 'TENDER_AWARD', entity_type: 'tender', entity_id: tender.id,
    payload: { winner_vendor: winner.vendor_name, amount: winner.amount, score: maxScore, total_bids: bids.length },
  });

  res.json({ success: true, winner: { vendor_name: winner.vendor_name, amount: winner.amount, composite_score: maxScore } });
}));

// GET /api/tenders/contractor/my-bids — contractor sees own bids
router.get('/contractor/my-bids', authenticate, authorize('contractor'), wrap((req, res) => {
  const db = getDb();
  const bids = db.prepare(`
    SELECT b.*, t.title as tender_title, t.budget, t.status as tender_status, t.deadline, d.name as dept_name
    FROM bids b
    JOIN tenders t ON t.id = b.tender_id
    LEFT JOIN departments d ON d.id = t.dept_id
    WHERE b.contractor_id = ?
    ORDER BY b.submitted_at DESC
  `).all(req.user.id);
  res.json(bids);
}));

// GET /api/tenders/contractor/profile — get contractor profile
router.get('/contractor/profile', authenticate, authorize('contractor'), wrap((req, res) => {
  const db = getDb();
  const profile = db.prepare(`
    SELECT cp.*, u.name, u.email, u.created_at as member_since
    FROM contractor_profiles cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.user_id=?
  `).get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
}));

// PUT /api/tenders/contractor/profile — update profile
router.put('/contractor/profile', authenticate, authorize('contractor'), wrap((req, res) => {
  const { company_name, contractor_type, license_no, gst_no, pan_no, experience_years, turnover_cr, address, specialization } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT id FROM contractor_profiles WHERE user_id=?').get(req.user.id);
  if (existing) {
    db.prepare(`UPDATE contractor_profiles SET company_name=?, contractor_type=?, license_no=?, gst_no=?,
      pan_no=?, experience_years=?, turnover_cr=?, address=?, specialization=? WHERE user_id=?`).run(
      company_name, contractor_type, license_no, gst_no, pan_no,
      experience_years, turnover_cr, address, specialization, req.user.id
    );
  } else {
    db.prepare(`INSERT INTO contractor_profiles (user_id, company_name, contractor_type, license_no, gst_no, pan_no, experience_years, turnover_cr, address, specialization)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      req.user.id, company_name, contractor_type, license_no, gst_no, pan_no,
      experience_years, turnover_cr, address, specialization
    );
  }
  res.json({ success: true });
}));

module.exports = router;
