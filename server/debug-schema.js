const Database = require('better-sqlite3');
const db = new Database('./prajakeeya.db');
const rows = db.prepare("SELECT name, sql FROM sqlite_master WHERE sql IS NOT NULL AND sql LIKE '%users_old%'").all();
console.log(JSON.stringify(rows, null, 2));
