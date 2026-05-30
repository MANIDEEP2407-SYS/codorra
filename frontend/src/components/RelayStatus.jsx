import { useEffect } from 'react';
import useVaultStore from '../store/useVaultStore';
import { getRelayStatus } from '../lib/api';

const NODE_COLORS = { A: '#00f5ff', B: '#c026d3', C: '#f59e0b' };

export default function RelayStatus() {
  const { relayNodes, vaultId, setRelayStatus } = useVaultStore();

  useEffect(() => {
    if (!vaultId) return;
    const poll = async () => {
      for (let i = 0; i < relayNodes.length; i++) {
        try {
          const data = await getRelayStatus(i, vaultId);
          setRelayStatus(relayNodes[i].id, data.online ?? true, data.ping, data.shardStored);
        } catch {
          setRelayStatus(relayNodes[i].id, false, null, false);
        }
      }
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [vaultId, relayNodes, setRelayStatus]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
      {relayNodes.map(node => {
        const color = NODE_COLORS[node.id];
        return (
          <div
            key={node.id}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `0.5px solid ${node.online ? color : 'rgba(255,45,85,0.4)'}`,
              borderRadius: 12,
              padding: '16px 18px',
              boxShadow: node.online ? `0 0 18px ${color}18` : 'none',
              transition: 'all 0.4s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color }}>
                {node.name}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: node.online ? '#22c55e' : '#ff2d55',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: node.online ? '#22c55e' : '#ff2d55',
                  display: 'inline-block',
                  animation: node.online ? 'dotPulse 2s ease-in-out infinite' : 'none',
                }} />
                {node.online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#a3a3a3', lineHeight: 1.8 }}>
              <div style={{ color: node.shardStored ? color : '#666' }}>
                SHARD_{node.id}: {node.shardStored ? 'stored ✓' : 'pending...'}
              </div>
              <div>Ping: {node.ping != null ? `${node.ping}ms` : '—'}</div>
              <div style={{ color: '#555', fontSize: 9, marginTop: 4 }}>
                relay-{node.name.toLowerCase()}.ts.local
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
