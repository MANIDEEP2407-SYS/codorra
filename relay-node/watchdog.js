const cron = require('node-cron');
const axios = require('axios');
const { db, logEvent } = require('./db');
const { attemptRelease } = require('./consensus');

// prevents re-entry in case cron fires while we are still checking
let isRunning = false;

function startWatchdog() {
  // runs every minute to check if anyone missed their heartbeat
  // (60s in demo = 1 day real-world)
  cron.schedule('* * * * *', async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await checkVaults();
    } finally {
      isRunning = false;
    }
  });
  console.log('[WATCHDOG] Started — checking every 60s');
}

// loop through all unreleased vaults and see who's gone quiet
async function checkVaults() {
  const vaults = db.prepare('SELECT * FROM vaults WHERE released=0').all();
  const now = Date.now();

  for (const vault of vaults) {
    if (!vault.last_heartbeat) continue;

    const elapsed = now - vault.last_heartbeat;
    const deadline = vault.heartbeat_interval * 1000;

    // if they haven't checked in within the interval, bump the missed count
    if (elapsed > deadline) {
      const newMissed = vault.missed_heartbeats + 1;
      db.prepare('UPDATE vaults SET missed_heartbeats=? WHERE id=?').run(newMissed, vault.id);
      logEvent(vault.id, 'HEARTBEAT_MISSED', `missed=${newMissed}/${vault.grace_period}`);

      console.log(`[WATCHDOG] Vault ${vault.id}: missed ${newMissed}/${vault.grace_period}`);

      // once they've missed enough heartbeats, start the release process
      if (newMissed >= vault.grace_period) {
        console.log(`[WATCHDOG] Grace period exceeded for ${vault.id} — initiating consensus`);
        logEvent(vault.id, 'CONSENSUS_INITIATING', `node=${process.env.NODE_ID}`);
        await initiateConsensus({ ...vault, missed_heartbeats: newMissed });
      }
    }
  }
}

// send our shard to all peers so they can try to reconstruct
async function initiateConsensus(vault) {
  let peerUrls = [];
  try {
    peerUrls = JSON.parse(process.env.PEER_URLS || '[]');
  } catch {}

  const results = await Promise.allSettled(
    peerUrls.map(url =>
      axios.post(`${url}/consensus`, {
        vaultId: vault.id,
        requestingNode: process.env.NODE_ID,
        shard: vault.shard,
      }, { timeout: 10000 })
    )
  );

  results.forEach((r, i) => {
    const event = r.status === 'fulfilled' ? 'CONSENSUS_PEER_OK' : 'CONSENSUS_PEER_FAIL';
    const detail = r.status === 'fulfilled'
      ? `peer=${i} resp=${JSON.stringify(r.value.data).slice(0, 50)}`
      : `peer=${i} err=${r.reason?.message}`;
    logEvent(vault.id, event, detail);
  });

  // Also attempt release locally with peer shards
  try {
    const freshVault = db.prepare('SELECT * FROM vaults WHERE id=?').get(vault.id);
    if (freshVault && !freshVault.released) {
      await attemptRelease(freshVault, null, null);
    }
  } catch (e) {
    logEvent(vault.id, 'LOCAL_RELEASE_FAILED', e.message);
  }
}

module.exports = { startWatchdog, checkVaults };
