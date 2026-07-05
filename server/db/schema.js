const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'prajakeeya.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = OFF'); // off during migration
    initSchema();
    runMigrations();
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, name_kn TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, name_kn TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('citizen','officer','admin','auditor','contractor')),
      aadhaar_id TEXT UNIQUE,
      dept_id INTEGER REFERENCES departments(id),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contractor_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
      company_name TEXT NOT NULL,
      contractor_type TEXT NOT NULL,
      license_no TEXT, gst_no TEXT, pan_no TEXT,
      experience_years INTEGER DEFAULT 0,
      turnover_cr REAL DEFAULT 0,
      address TEXT, specialization TEXT,
      verified INTEGER DEFAULT 0,
      verified_by INTEGER REFERENCES users(id),
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, description TEXT, category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','under_review','approved','rejected','escalated','closed')),
      citizen_id INTEGER NOT NULL REFERENCES users(id),
      officer_id INTEGER REFERENCES users(id),
      dept_id INTEGER REFERENCES departments(id),
      sla_hours INTEGER DEFAULT 48,
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
      document_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS file_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL REFERENCES files(id),
      actor_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL, note TEXT,
      from_status TEXT, to_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS beneficiaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, aadhaar_id TEXT NOT NULL,
      scheme TEXT NOT NULL, amount REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','verified','approved','rejected','duplicate')),
      verified_by INTEGER REFERENCES users(id),
      bank_account TEXT, transfer_ref TEXT, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tenders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, description TEXT,
      dept_id INTEGER REFERENCES departments(id),
      budget REAL NOT NULL, deadline DATETIME NOT NULL,
      status TEXT DEFAULT 'open' CHECK(status IN ('open','closed','awarded','cancelled')),
      criteria_json TEXT DEFAULT '[]',
      winner_bid_id INTEGER,
      category TEXT DEFAULT 'General',
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tender_id INTEGER NOT NULL REFERENCES tenders(id),
      contractor_id INTEGER REFERENCES users(id),
      vendor_name TEXT NOT NULL, vendor_email TEXT NOT NULL,
      amount REAL NOT NULL, technical_score REAL DEFAULT 0,
      proposal TEXT, score REAL,
      conflict_flag INTEGER DEFAULT 0,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      revealed INTEGER DEFAULT 0, is_winner INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tender_id INTEGER REFERENCES tenders(id),
      vendor_name TEXT NOT NULL, amount REAL NOT NULL, description TEXT,
      status TEXT DEFAULT 'created' CHECK(status IN ('created','gr_submitted','invoice_submitted','matched','paid','blocked')),
      match_status TEXT, mismatch_reason TEXT, paid_at DATETIME,
      dept_id INTEGER REFERENCES departments(id),
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goods_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
      received_by INTEGER REFERENCES users(id),
      quantity_received INTEGER, notes TEXT,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
      invoice_number TEXT NOT NULL, amount REAL NOT NULL,
      status TEXT DEFAULT 'submitted' CHECK(status IN ('submitted','matched','rejected','paid')),
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, description TEXT,
      dept_id INTEGER REFERENCES departments(id),
      tender_id INTEGER REFERENCES tenders(id),
      po_id INTEGER REFERENCES purchase_orders(id),
      contractor_id INTEGER REFERENCES users(id),
      contractor_name TEXT,
      budget REAL, actual_cost REAL DEFAULT 0,
      start_date DATE, expected_end_date DATE, actual_end_date DATE,
      status TEXT DEFAULT 'planning' CHECK(status IN ('planning','ongoing','completed','delayed','suspended','cancelled')),
      completion_pct INTEGER DEFAULT 0,
      location TEXT, category TEXT,
      is_public INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      actor_id INTEGER REFERENCES users(id),
      actor_name TEXT, actor_role TEXT,
      update_type TEXT NOT NULL CHECK(update_type IN ('milestone','progress','delay','issue','completion','photo')),
      description TEXT NOT NULL,
      completion_pct INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project_objections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      citizen_id INTEGER REFERENCES users(id),
      citizen_name TEXT,
      subject TEXT NOT NULL, description TEXT NOT NULL,
      category TEXT DEFAULT 'query' CHECK(category IN ('query','objection','complaint','suggestion')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open','answered','closed')),
      response TEXT, responded_by INTEGER REFERENCES users(id),
      responded_at DATETIME,
      is_public INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_hash TEXT NOT NULL UNIQUE, prev_hash TEXT NOT NULL,
      actor_id INTEGER, actor_email TEXT,
      action_type TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id INTEGER,
      payload_json TEXT NOT NULL, timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
      message TEXT NOT NULL, entity_type TEXT, entity_id INTEGER,
      resolved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budget_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dept_id INTEGER REFERENCES departments(id),
      fiscal_year INTEGER NOT NULL, allocated REAL NOT NULL, spent REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS grievances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      citizen_id INTEGER NOT NULL REFERENCES users(id),
      dept_id INTEGER REFERENCES departments(id),
      subject TEXT NOT NULL, description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'service' CHECK(category IN ('delay','corruption','service','other')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','escalated','closed')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
      assigned_to INTEGER REFERENCES users(id),
      sla_hours INTEGER DEFAULT 72, resolution_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS grievance_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grievance_id INTEGER NOT NULL REFERENCES grievances(id),
      actor_id INTEGER NOT NULL REFERENCES users(id),
      actor_name TEXT, actor_role TEXT, action TEXT NOT NULL, note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS generated_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizen_id INTEGER NOT NULL REFERENCES users(id),
      doc_type TEXT NOT NULL CHECK(doc_type IN ('income','caste','domicile','scheme_eligibility')),
      cert_number TEXT UNIQUE NOT NULL, citizen_name TEXT NOT NULL, citizen_aadhaar TEXT,
      data_json TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','revoked')),
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP, valid_until DATETIME
    );
  `);
}

function rebuildTablesWithLegacyUserReference() {
  const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL AND sql LIKE '%users_old%'").all();
  if (!tables.length) return;

  console.log('[MIGRATE] Rebuilding tables that still reference legacy users_old table...');
  const originalForeignKeys = db.pragma('foreign_keys');
  db.pragma('foreign_keys = OFF');

  try {
    for (const { name, sql } of tables) {
      const tempName = `${name}_new`;
      const rebuiltSql = sql.replace(/CREATE TABLE\s+"?\w+"?\s*\(/i, `CREATE TABLE ${tempName} (`).replace(/users_old/g, 'users');
      db.exec(rebuiltSql);
      db.exec(`INSERT INTO ${tempName} SELECT * FROM ${name}`);
      db.exec(`DROP TABLE ${name}`);
      db.exec(`ALTER TABLE ${tempName} RENAME TO ${name}`);
      console.log(`[MIGRATE] Rebuilt ${name}`);
    }
  } finally {
    db.pragma(`foreign_keys = ${originalForeignKeys}`);
  }
}

function runMigrations() {
  rebuildTablesWithLegacyUserReference();

  // Migration: rebuild users table if it doesn't support 'contractor' role
  // (old DB has a CHECK constraint that excludes contractor)
  try {
    const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!info) {
      const legacy = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users_old'").get();
      if (legacy) {
        console.log('[MIGRATE] Restoring users table from users_old...');
        db.exec('ALTER TABLE users_old RENAME TO users');
      }
    } else if (!info.sql.includes("'contractor'")) {
      console.log('[MIGRATE] Upgrading users table to support contractor role...');
      db.exec(`
        DROP TABLE IF EXISTS users_new;
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL, name_kn TEXT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('citizen','officer','admin','auditor','contractor')),
          aadhaar_id TEXT UNIQUE,
          dept_id INTEGER REFERENCES departments(id),
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO users_new (id, name, name_kn, email, password_hash, role, aadhaar_id, dept_id, is_active, created_at)
        SELECT id, name, name_kn, email, password_hash, role, aadhaar_id, dept_id, is_active, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
      console.log('[MIGRATE] users table upgraded.');
    }
  } catch(e) {
    console.error('[MIGRATE] users migration error:', e.message);
  }

  // Remove stale backup table if present from a previous failed migration.
  try {
    const legacy = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users_old'").get();
    if (legacy) {
      db.exec('DROP TABLE users_old');
    }
  } catch(_) {}

  // Migration: ensure new tables exist (for existing DBs)
  // contractor_profiles, projects, project_updates, project_objections
  // These use CREATE TABLE IF NOT EXISTS so they're safe to re-run — already done in initSchema
  // Just verify alerts table has the right columns
  try {
    db.prepare('SELECT resolved FROM alerts LIMIT 1').get();
  } catch(e) {
    // alerts table missing resolved column — old schema
    try { db.exec('ALTER TABLE alerts ADD COLUMN resolved INTEGER DEFAULT 0'); } catch(_) {}
  }
}

module.exports = { getDb };
