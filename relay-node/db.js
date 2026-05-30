const Database = require('better-sqlite3');
const path = require('path');

const NODE_ID = (process.env.NODE_ID || 'A').trim();
const dbPath = path.join(__dirname, `relay_${NODE_ID}.db`);

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS vaults (
    id TEXT PRIMARY KEY,
    shard TEXT,
    ciphertext TEXT,
    iv_hex TEXT,
    file_hash TEXT,
    file_name TEXT,
    public_key TEXT,
    recipients TEXT,
    release_message TEXT,
    heartbeat_interval INTEGER DEFAULT 60,
    grace_period INTEGER DEFAULT 2,
    missed_heartbeats INTEGER DEFAULT 0,
    last_heartbeat INTEGER,
    released INTEGER DEFAULT 0,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vault_id TEXT,
    event TEXT,
    detail TEXT,
    ts INTEGER
  );

  CREATE TABLE IF NOT EXISTS consensus_shards (
    vault_id TEXT,
    from_node TEXT,
    shard TEXT,
    received_at INTEGER,
    PRIMARY KEY (vault_id, from_node)
  );
`);

function logEvent(vaultId, event, detail = '') {
  db.prepare('INSERT INTO audit_log (vault_id, event, detail, ts) VALUES (?, ?, ?, ?)')
    .run(vaultId, event, detail, Date.now());
}

module.exports = { db, logEvent };
