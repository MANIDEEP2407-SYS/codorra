const Database = require('better-sqlite3');
const path = require('path');

const NODE_ID = (process.env.NODE_ID || 'A').trim();
// each relay node gets its own sqlite db file
const dbPath = path.join(__dirname, `relay_${NODE_ID}.db`);

const db = new Database(dbPath);

// WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// main tables - vaults hold the encrypted data, audit_log tracks everything,
// consensus_shards stores shards received from peer nodes during release
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
    recipient_pgp_keys TEXT,
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

// simple helper to append to the audit trail
function logEvent(vaultId, event, detail = '') {
  db.prepare('INSERT INTO audit_log (vault_id, event, detail, ts) VALUES (?, ?, ?, ?)')
    .run(vaultId, event, detail, Date.now());
}

// Lightweight migration: ensure expected optional columns exist (handles existing DBs)
try {
  const cols = db.prepare("PRAGMA table_info(vaults)").all().map(c => c.name);
  const ensureColumn = (name, type) => {
    if (!cols.includes(name)) {
      db.prepare(`ALTER TABLE vaults ADD COLUMN ${name} ${type}`).run();
      logEvent('MIGRATION', 'SCHEMA_CHANGED', `added column ${name}`);
    }
  };

  ensureColumn('recipient_pgp_keys', 'TEXT');
  ensureColumn('missed_heartbeats', 'INTEGER DEFAULT 0');
  ensureColumn('last_heartbeat', 'INTEGER');
  ensureColumn('created_at', 'INTEGER');
  ensureColumn('last_consensus', 'INTEGER');
} catch (e) {
  console.error('DB migration check failed:', e.message);
}

module.exports = { db, logEvent };
