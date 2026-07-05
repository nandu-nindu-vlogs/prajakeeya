const Database = require('better-sqlite3');
const db = new Database('./prajakeeya.db');
console.log(JSON.stringify(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()));
for (const name of ['users','generated_documents','alerts']) {
  try {
    console.log(name, JSON.stringify(db.prepare(`SELECT * FROM ${name} LIMIT 2`).all()));
  } catch (e) {
    console.log(name, 'ERR', e.message);
  }
}
