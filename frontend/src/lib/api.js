import axios from 'axios';

// relay node URLs - defaults to localhost for development
// in production these would be different servers
const RELAY_URLS = [
  import.meta.env.VITE_RELAY_A || 'http://localhost:3001',
  import.meta.env.VITE_RELAY_B || 'http://localhost:3002',
  import.meta.env.VITE_RELAY_C || 'http://localhost:3003',
];

// create axios clients for each relay node
// 120s timeout — large encrypted payloads (multi-file) need time to upload
const clients = RELAY_URLS.map(url =>
  axios.create({ baseURL: url, timeout: 120000 })
);

// deposit encrypted evidence + shard to a specific relay node
export async function depositShard(nodeIndex, payload) {
  const { data } = await clients[nodeIndex].post('/deposit', payload);
  return data;
}

// send heartbeat to ALL relay nodes at once
// we use allSettled so one failing doesnt block the others
export async function sendHeartbeat(vaultId, timestamp, signature) {
  return Promise.allSettled(
    clients.map(c => c.post('/heartbeat', { vaultId, timestamp, signature }))
  );
}

// check if a specific relay node is online and has our shard
export async function getRelayStatus(nodeIndex, vaultId) {
  const start = Date.now();
  const { data } = await clients[nodeIndex].get(`/status/${vaultId}`);
  return { ...data, ping: Date.now() - start };
}

// get audit log entries from a relay node
export async function getAuditLog(nodeIndex, vaultId) {
  const { data } = await clients[nodeIndex].get(`/audit/${vaultId}`);
  return data;
}

// trigger manual release (consensus) through a relay node
export async function triggerConsensus(nodeIndex, vaultId) {
  const { data } = await clients[nodeIndex].post('/trigger-release', { vaultId });
  return data;
}

// reset a specific vault across all nodes (demo cleanup)
export async function resetVault(vaultId) {
  const { data } = await clients[0].post('/reset-vault', { vaultId });
  return data;
}

// wipe ALL demo data across all nodes
export async function resetAll() {
  const { data } = await clients[0].post('/reset-all');
  return data;
}

export { RELAY_URLS };
