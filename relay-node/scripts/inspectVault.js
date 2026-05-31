const path = require('path');
// require the local better-sqlite3 from this package to avoid NODE_PATH issues
const Database = require(path.join(__dirname, '..', 'node_modules', 'better-sqlite3'));
const args = process.argv.slice(2);
if (!args[0]) { console.error('Usage: node inspectVault.js <VAULT_ID>'); process.exit(2); }
const vaultId = args[0];
const NODE_ID = (process.env.NODE_ID || 'A').trim();
const dbPath = path.join(__dirname, `..`, `relay_${NODE_ID}.db`);
const db = new Database(dbPath);
const row = db.prepare('SELECT id, last_consensus, missed_heartbeats, last_heartbeat FROM vaults WHERE id=?').get(vaultId);
console.log(row);
process.exit(0);
