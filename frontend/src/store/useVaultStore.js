import { create } from 'zustand';

// global state for the whole app
// keeps track of the vault, heartbeat timing, relay status, etc
const useVaultStore = create((set, get) => ({
  // vault info
  vaultId: null,
  threatLevel: 'safe',         // safe | warning | critical
  heartbeatInterval: 60,       // seconds between heartbeats
  secondsRemaining: 60,        // countdown timer
  lastHeartbeat: null,
  released: false,

  // crypto keys (stay in memory only, never persisted)
  depositorKeypair: null,
  publicKeyB64: null,

  // evidence metadata
  evidence: null,

  // relay node status
  relayNodes: [
    { id: 'A', name: 'Alpha', url: 'http://localhost:3001', online: true, ping: null, shardStored: false },
    { id: 'B', name: 'Beta',  url: 'http://localhost:3002', online: true, ping: null, shardStored: false },
    { id: 'C', name: 'Gamma', url: 'http://localhost:3003', online: true, ping: null, shardStored: false },
  ],

  phase: 'idle',
  auditLog: [],
  gracePeriod: 2,
  missedHeartbeats: 0,
  etherealUrl: null,

  // actions
  setThreatLevel: (level) => set({ threatLevel: level }),
  setPhase: (phase) => set({ phase }),

  // called after successful deposit
  setVault: (vaultId, evidence, keypair, publicKeyB64, heartbeatInterval, gracePeriod) =>
    set({
      vaultId,
      evidence,
      depositorKeypair: keypair,
      publicKeyB64,
      heartbeatInterval,
      gracePeriod,
      secondsRemaining: heartbeatInterval,
      lastHeartbeat: Date.now(),
    }),

  // update a specific relay node's status
  setRelayStatus: (id, online, ping, shardStored) =>
    set(state => ({
      relayNodes: state.relayNodes.map(n =>
        n.id === id ? { ...n, online, ping, shardStored } : n
      )
    })),

  // reset timer after sending heartbeat
  sendHeartbeat: () => set(state => ({
    lastHeartbeat: Date.now(),
    secondsRemaining: state.heartbeatInterval,
    threatLevel: 'safe',
    missedHeartbeats: 0,
  })),

  triggerRelease: (etherealUrl) => set({ released: true, etherealUrl }),

  // merge new audit log entries, avoiding duplicates
  appendAuditLog: (entries) => set(state => {
    const existing = new Set(state.auditLog.map(e => `${e.ts}-${e.event}`));
    const fresh = entries.filter(e => !existing.has(`${e.ts}-${e.event}`));
    return { auditLog: [...fresh, ...state.auditLog].slice(0, 200) };
  }),

  // countdown tick - runs every second
  // also updates threat level based on how much time is left
  tickCountdown: () => {
    const s = get().secondsRemaining;
    const interval = get().heartbeatInterval;
    const newS = Math.max(0, s - 1);
    const pct = newS / interval;
    set({
      secondsRemaining: newS,
      threatLevel: pct > 0.5 ? 'safe' : pct > 0.15 ? 'warning' : 'critical',
    });
  },

  incrementMissed: () => set(state => ({
    missedHeartbeats: state.missedHeartbeats + 1,
  })),

  // full reset — clears all state back to defaults (for demo resets)
  resetStore: () => set({
    vaultId: null,
    threatLevel: 'safe',
    heartbeatInterval: 60,
    secondsRemaining: 60,
    lastHeartbeat: null,
    released: false,
    depositorKeypair: null,
    publicKeyB64: null,
    evidence: null,
    relayNodes: [
      { id: 'A', name: 'Alpha', url: 'http://localhost:3001', online: true, ping: null, shardStored: false },
      { id: 'B', name: 'Beta',  url: 'http://localhost:3002', online: true, ping: null, shardStored: false },
      { id: 'C', name: 'Gamma', url: 'http://localhost:3003', online: true, ping: null, shardStored: false },
    ],
    phase: 'idle',
    auditLog: [],
    gracePeriod: 2,
    missedHeartbeats: 0,
    etherealUrl: null,
  }),
}));

export default useVaultStore;
