const crypto = require('crypto');
const { getDb } = require('../db/schema');

function writeBlock({ actor_id, actor_email, action_type, entity_type, entity_id, payload }) {
  const db = getDb();

  const last = db.prepare('SELECT block_hash FROM ledger ORDER BY id DESC LIMIT 1').get();
  const prevHash = last ? last.block_hash : 'GENESIS_BLOCK_PRAJAKEEYA_000';

  const timestamp = new Date().toISOString();
  const payload_json = JSON.stringify(payload);
  const data = prevHash + timestamp + (actor_id || '') + action_type + entity_type + (entity_id || '') + payload_json;
  const block_hash = crypto.createHash('sha256').update(data).digest('hex');

  db.prepare(
    `INSERT INTO ledger (block_hash, prev_hash, actor_id, actor_email, action_type, entity_type, entity_id, payload_json, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(block_hash, prevHash, actor_id || null, actor_email || 'system', action_type, entity_type, entity_id || null, payload_json, timestamp);

  return block_hash;
}

function verifyChain() {
  const db = getDb();
  const blocks = db.prepare('SELECT * FROM ledger ORDER BY id ASC').all();

  let prevHash = 'GENESIS_BLOCK_PRAJAKEEYA_000';
  for (const block of blocks) {
    if (block.prev_hash !== prevHash) {
      return { valid: false, tampered_at: block.id, message: `Chain broken at block ${block.id}` };
    }
    const data = block.prev_hash + block.timestamp + (block.actor_id || '') + block.action_type + block.entity_type + (block.entity_id || '') + block.payload_json;
    const expected = crypto.createHash('sha256').update(data).digest('hex');
    if (expected !== block.block_hash) {
      return { valid: false, tampered_at: block.id, message: `Hash mismatch at block ${block.id} — DATA TAMPERED` };
    }
    prevHash = block.block_hash;
  }
  return { valid: true, total_blocks: blocks.length, message: 'Chain intact — no tampering detected' };
}

module.exports = { writeBlock, verifyChain };
