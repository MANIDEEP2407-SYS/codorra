import { useState } from 'react';

// receipt modal after deposit
export default function CryptoReceipt({ vaultId, evidence, publicKeyB64, relayNodes, onClose }) {
  const [copied, setCopied] = useState(false);

  const receipt = {
    vaultId,
    createdAt: new Date().toISOString(),
    algorithm: 'AES-256-GCM + Shamir(2,3) + ECDSA-P256',
    fileHash: evidence?.hash,
    fileName: evidence?.fileName,
    recipients: evidence?.recipients,
    relays: relayNodes.map(n => ({ id: n.id, name: n.name })),
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `satyaraksha-receipt-${vaultId}.json`;
    a.click();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, padding: 28, maxWidth: 480, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#5cb85c', fontSize: 18, fontWeight: 600 }}>✓ Vault Sealed</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div style={{ background: '#0d0d0d', borderRadius: 6, padding: 14, marginBottom: 14, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.9 }}>
          <div style={{ color: '#888' }}>Vault ID</div>
          <div style={{ color: '#4a9eff', fontSize: 14, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            {vaultId}
            <button onClick={() => { navigator.clipboard.writeText(vaultId); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              style={{ background: 'none', border: '1px solid #333', borderRadius: 3, color: copied ? '#5cb85c' : '#888', cursor: 'pointer', fontSize: 10, padding: '1px 6px' }}>
              {copied ? '✓' : 'copy'}
            </button>
          </div>
          <div style={{ color: '#888' }}>Algorithm</div>
          <div style={{ color: '#ccc', marginBottom: 6 }}>AES-256-GCM + Shamir(2,3) + ECDSA-P256</div>
          <div style={{ color: '#888' }}>SHA-256</div>
          <div style={{ color: '#ccc', wordBreak: 'break-all', fontSize: 10 }}>{evidence?.hash}</div>
        </div>

        <p style={{ color: '#888', fontSize: 12, marginBottom: 14 }}>
          Save your Vault ID — you need it for the dashboard and heartbeats.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={download} style={{
            flex: 1, background: 'transparent', border: '1px solid #4a9eff',
            color: '#4a9eff', borderRadius: 6, padding: '9px 0', cursor: 'pointer', fontSize: 13,
          }}>Download Receipt</button>
          <button onClick={onClose} style={{
            flex: 1, background: '#4a9eff', border: 'none',
            color: '#fff', borderRadius: 6, padding: '9px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>Dashboard →</button>
        </div>
      </div>
    </div>
  );
}
