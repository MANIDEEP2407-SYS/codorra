import { create } from 'zustand';

const useVaultStore = create((set, get) => ({
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

  setThreatLevel: (level) => set({ threatLevel: level }),
  setPhase: (phase) => set({ phase }),

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

  setRelayStatus: (id, online, ping, shardStored) =>
    set(state => ({
      relayNodes: state.relayNodes.map(n =>
        n.id === id ? { ...n, online, ping, shardStored } : n
      )
    })),

  sendHeartbeat: () => set(state => ({
    lastHeartbeat: Date.now(),
    secondsRemaining: state.heartbeatInterval,
    threatLevel: 'safe',
    missedHeartbeats: 0,
  })),

  triggerRelease: (etherealUrl) => set({ released: true, etherealUrl }),

  appendAuditLog: (entries) => set(state => {
    const existing = new Set(state.auditLog.map(e => `${e.ts}-${e.event}`));
    const fresh = entries.filter(e => !existing.has(`${e.ts}-${e.event}`));
    return { auditLog: [...fresh, ...state.auditLog].slice(0, 200) };
  }),

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
}));

export default useVaultStore;
