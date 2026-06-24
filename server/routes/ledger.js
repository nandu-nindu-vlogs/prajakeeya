const wrap = require('../middleware/wrap');
const express = require('express');
const { getDb } = require('../db/schema');
const { authenticate, authorize } = require('../middleware/auth');
const { verifyChain } = require('../services/ledger');

const router = express.Router();

// GET /api/ledger — paginated
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const entity_type = req.query.entity_type;
  const entity_id = req.query.entity_id;

  let query = 'SELECT l.*, u.name as actor_name FROM ledger l LEFT JOIN users u ON u.id = l.actor_id';
  const params = [];

  if (entity_type && entity_id) {
    query += ' WHERE l.entity_type = ? AND l.entity_id = ?';
    params.push(entity_type, entity_id);
  } else if (entity_type) {
    query += ' WHERE l.entity_type = ?';
    params.push(entity_type);
  }

  query += ' ORDER BY l.id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM ledger').get().c;

  res.json({ rows, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/ledger/verify — integrity check
router.get('/verify', authenticate, authorize('auditor', 'admin'), (req, res) => {
  const result = verifyChain();
  res.json(result);
});

// GET /api/ledger/public — public audit trail (limited fields)
router.get('/public', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT l.id, l.action_type, l.entity_type, l.entity_id, l.actor_email, l.timestamp,
           SUBSTR(l.block_hash, 1, 16) || '...' as block_hash_short
    FROM ledger l
    ORDER BY l.id DESC
    LIMIT 50
  `).all();
  res.json(rows);
});

module.exports = router;
