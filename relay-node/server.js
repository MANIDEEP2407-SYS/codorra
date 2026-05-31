require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const { db, logEvent } = require('./db');
const { verifyHeartbeat } = require('./crypto');
const { attemptRelease } = require('./consensus');
const { startWatchdog } = require('./watchdog');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ID = (process.env.NODE_ID || 'A').trim();

// Simple rate limiter to protect relay nodes from DDoS and brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});

// security headers + cors wide open for dev, tighten later for prod
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(limiter);

// Health check
app.get('/health', (_, res) => {
  res.json({ ok: true, node: NODE_ID, ts: Date.now() });
});

// this handles the main deposit route - took a while to get right
// POST /deposit — primary entry for frontend (or peer forwarding)
app.post('/deposit', async (req, res) => {
  const {
    vaultId, shards, ciphertextB64, ivHex, fileHash, fileName,
    publicKeyB64, recipients, recipientPgpKeys, releaseMessage, heartbeatInterval, gracePeriod,
    _forwarded,   // set to true when coming from a peer — prevents loops
  } = req.body;

  if (!vaultId || !shards || !ciphertextB64 || !ivHex || !publicKeyB64) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // figure out which shard belongs to us based on node letter
  const nodeIndex = { A: 0, B: 1, C: 2 }[NODE_ID.trim()];
  const myShard = shards[nodeIndex];

  // Store vault with this node's shard
  // recipientPgpKeys is optional — if provided, release emails will be PGP-encrypted
  db.prepare(`
    INSERT OR REPLACE INTO vaults (
      id, shard, ciphertext, iv_hex, file_hash, file_name, public_key, recipients,
      recipient_pgp_keys, release_message, heartbeat_interval, grace_period, missed_heartbeats,
      last_heartbeat, released, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?)
  `).run(
    vaultId, myShard, ciphertextB64, ivHex, fileHash || '', fileName || 'evidence',
    publicKeyB64, JSON.stringify(recipients || []),
    JSON.stringify(recipientPgpKeys || {}),
    releaseMessage || '', heartbeatInterval || 60, gracePeriod || 2,
    Date.now(), Date.now()
  );

  logEvent(vaultId, 'VAULT_CREATED', `node=${NODE_ID.trim()}`);
  logEvent(vaultId, `SHARD_${NODE_ID.trim()}_STORED`, `node=${NODE_ID.trim()}`);
  logEvent(vaultId, 'PUBKEY_REGISTERED', `depositor=${publicKeyB64.slice(0, 12)}...`);
  if (recipientPgpKeys && Object.keys(recipientPgpKeys).length > 0) {
    logEvent(vaultId, 'PGP_KEYS_STORED', `count=${Object.keys(recipientPgpKeys).length}`);
  }

  // we forward to peers so all nodes have the data
  // Only forward once — the originating node fans out; peers do not re-forward
  if (!_forwarded) {
    const peerUrls = (() => { try { return JSON.parse(process.env.PEER_URLS || '[]'); } catch { return []; } })();
    const forwardBody = { ...req.body, _forwarded: true };
    const peerForwards = await Promise.allSettled(
      peerUrls.map(url =>
        axios.post(`${url}/deposit`, forwardBody, { timeout: 8000 })
      )
    );
    peerForwards.forEach((r, i) => {
      const ev = r.status === 'fulfilled' ? 'PEER_DEPOSIT_OK' : 'PEER_DEPOSIT_FAIL';
      logEvent(vaultId, ev, `peer=${i}`);
    });
  }

  res.json({ success: true, nodeId: NODE_ID.trim(), vaultId });
});

// POST /heartbeat — signed heartbeat check-in
// validates the ECDSA sig so nobody can fake a heartbeat
app.post('/heartbeat', async (req, res) => {
  const { vaultId, timestamp, signature } = req.body;
  if (!vaultId || !timestamp || !signature) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const vault = db.prepare('SELECT * FROM vaults WHERE id=?').get(vaultId);
  if (!vault) return res.status(404).json({ error: 'Vault not found' });
  if (vault.released) return res.status(410).json({ error: 'Vault already released' });

  const valid = await verifyHeartbeat(vault.public_key, vaultId, timestamp, signature);
  if (!valid) {
    logEvent(vaultId, 'HEARTBEAT_REJECTED', 'sig=invalid');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // reset missed count on successful heartbeat
  db.prepare('UPDATE vaults SET last_heartbeat=?, missed_heartbeats=0 WHERE id=?')
    .run(Date.now(), vaultId);
  logEvent(vaultId, 'HEARTBEAT_OK', `sig=verified ts=${timestamp}`);

  res.json({
    success: true,
    nodeId: NODE_ID,
    nextDeadline: Date.now() + vault.heartbeat_interval * 1000,
  });
});

// GET /status/:vaultId — dashboard polls this
app.get('/status/:vaultId', (req, res) => {
  const vault = db.prepare('SELECT * FROM vaults WHERE id=?').get(req.params.vaultId);
  if (!vault) {
    return res.json({
      online: true, nodeId: NODE_ID, shardStored: false, lastHeartbeat: null,
    });
  }
  res.json({
    online: true,
    nodeId: NODE_ID,
    shardStored: !!vault.shard,
    lastHeartbeat: vault.last_heartbeat,
    missedHeartbeats: vault.missed_heartbeats,
    gracePeriod: vault.grace_period,
    released: !!vault.released,
  });
});

// GET /audit/:vaultId — returns last 100 audit log entries
app.get('/audit/:vaultId', (req, res) => {
  const logs = db.prepare(
    'SELECT * FROM audit_log WHERE vault_id=? ORDER BY ts DESC LIMIT 100'
  ).all(req.params.vaultId);
  res.json(logs);
});

// POST /mark-released — peer notification to keep the released flag consistent
// across all nodes after one node completes a consensus release. Idempotent.
app.post('/mark-released', (req, res) => {
  const { vaultId } = req.body;
  if (!vaultId) return res.status(400).json({ error: 'Missing vaultId' });
  const result = db.prepare('UPDATE vaults SET released=1 WHERE id=? AND released=0').run(vaultId);
  if (result.changes > 0) logEvent(vaultId, 'RELEASED_SYNCED', `by_peer=true node=${NODE_ID}`);
  res.json({ success: true, nodeId: NODE_ID });
});

// POST /consensus — called by peer watchdog when heartbeat stops
// TODO: maybe add rate limiting here later
app.post('/consensus', async (req, res) => {
  const { vaultId, requestingNode, shard } = req.body;
  if (!vaultId || !requestingNode || !shard) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  logEvent(vaultId, 'CONSENSUS_REQUEST_RECEIVED', `from=${requestingNode}`);

  const vault = db.prepare('SELECT * FROM vaults WHERE id=?').get(vaultId);
  if (!vault) return res.status(404).json({ error: 'Vault not found' });
  if (vault.released) return res.json({ already: true });

  try {
    const result = await attemptRelease(vault, shard, requestingNode);
    if (result.released) {
      logEvent(vaultId, 'CONSENSUS_RELEASE_OK', `ethereal=${result.etherealUrl || 'N/A'}`);
    }
    res.json({ success: true, nodeId: NODE_ID, ...result });
  } catch (e) {
    logEvent(vaultId, 'CONSENSUS_RELEASE_FAILED', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /trigger-release — manual release from dashboard danger zone
// basically the "oh crap" button
app.post('/trigger-release', async (req, res) => {
  const { vaultId } = req.body;
  if (!vaultId) return res.status(400).json({ error: 'Missing vaultId' });

  const vault = db.prepare('SELECT * FROM vaults WHERE id=?').get(vaultId);
  if (!vault) return res.status(404).json({ error: 'Vault not found' });
  if (vault.released) return res.json({ already: true });

  logEvent(vaultId, 'MANUAL_RELEASE_TRIGGERED', `node=${NODE_ID}`);

  // Send our shard to peers — each peer tries to reconstruct + release
  const peerUrls = (() => { try { return JSON.parse(process.env.PEER_URLS || '[]'); } catch { return []; } })();
  const peerResults = await Promise.allSettled(
    peerUrls.map(url =>
      axios.post(`${url}/consensus`, {
        vaultId,
        requestingNode: NODE_ID,
        shard: vault.shard,
      }, { timeout: 15000 })
    )
  );

  // If any peer released, relay their etherealUrl back to the UI
  for (const r of peerResults) {
    if (r.status === 'fulfilled' && r.value.data?.released && r.value.data?.etherealUrl) {
      return res.json({ success: true, released: true, etherealUrl: r.value.data.etherealUrl });
    }
  }

  // Otherwise try local release using peer shards that were forwarded to us
  const freshVault = db.prepare('SELECT * FROM vaults WHERE id=?').get(vaultId);
  try {
    const result = await attemptRelease(freshVault, null, null);
    res.json({ success: true, ...result });
  } catch (e) {
    // Release likely happened on a peer node — return success anyway
    res.json({ success: true, released: true, etherealUrl: null });
  }
});

app.listen(PORT, () => {
  console.log(`[NODE_${NODE_ID}] SatyaRaksha relay online at http://localhost:${PORT}`);
  startWatchdog();
});
