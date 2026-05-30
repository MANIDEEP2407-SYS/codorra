import { useEffect } from 'react';
import useVaultStore from '../store/useVaultStore';
import { getRelayStatus } from '../lib/api';

// shows status of the 3 relay nodes
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
      {relayNodes.map(node => (
        <div key={node.id} style={{
          background: '#111', border: `1px solid ${node.online ? '#2a2a2a' : '#3a2020'}`,
          borderRadius: 8, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#ddd' }}>{node.name}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: node.online ? '#5cb85c' : '#e85050', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: node.online ? '#5cb85c' : '#e85050', display: 'inline-block' }} />
              {node.online ? 'Online' : 'Offline'}
            </span>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#777', lineHeight: 1.8 }}>
            <div>SHARD_{node.id}: {node.shardStored ? 'stored ✓' : 'pending...'}</div>
            <div>Ping: {node.ping != null ? `${node.ping}ms` : '—'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
