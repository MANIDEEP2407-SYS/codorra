import { useState } from 'react';

export default function CryptoReceipt({ vaultId, evidence, publicKeyB64, relayNodes, onClose }) {
  const [copied, setCopied] = useState(false);

  const receipt = {
    vaultId,
    createdAt: new Date().toISOString(),
    algorithm: 'AES-256-GCM + Shamir(2,3) + ECDSA-P256',
    fileHash: evidence?.hash,
    fileName: evidence?.fileName,
    recipients: evidence?.recipients,
    publicKeyFingerprint: publicKeyB64?.slice(0, 20) + '...',
    relays: relayNodes.map(n => ({ id: n.id, name: n.name, url: n.url })),
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `truthswitch-receipt-${vaultId}.json`;
    a.click();
  };

  const copy = () => {
    navigator.clipboard.writeText(vaultId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#111', border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 16, padding: 32, maxWidth: 520, width: '100%',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#22c55e', fontFamily: "'Syne',sans-serif", fontSize: 18 }}>
            ✓ Vault Sealed
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <div style={{
          background: '#0a0a0a', borderRadius: 8, padding: 16, marginBottom: 16,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.9,
        }}>
          <div style={{ color: '#a3a3a3' }}>Vault ID</div>
          <div style={{ color: '#00f5ff', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{vaultId}</span>
            <button onClick={copy} style={{
              background: 'none', border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: 4, color: copied ? '#22c55e' : '#a3a3a3',
              cursor: 'pointer', fontSize: 10, padding: '2px 8px',
            }}>
              {copied ? '✓' : 'copy'}
            </button>
          </div>
          <div style={{ color: '#a3a3a3' }}>Algorithm</div>
          <div style={{ color: '#e5e5e5', marginBottom: 8 }}>AES-256-GCM + Shamir(2,3) + ECDSA-P256</div>
          <div style={{ color: '#a3a3a3' }}>File Hash (SHA-256)</div>
          <div style={{ color: '#e5e5e5', wordBreak: 'break-all', marginBottom: 8, fontSize: 10 }}>{evidence?.hash}</div>
          <div style={{ color: '#a3a3a3' }}>Recipients</div>
          <div style={{ color: '#e5e5e5' }}>{evidence?.recipients?.join(', ')}</div>
        </div>

        <p style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 16 }}>
          Save your Vault ID. You'll need it to access the dashboard and send heartbeats.
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={download} style={{
            flex: 1, background: 'none', border: '1px solid #00f5ff',
            color: '#00f5ff', borderRadius: 8, padding: '10px 0',
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
          }}>
            Download Receipt
          </button>
          <button onClick={onClose} style={{
            flex: 1, background: 'rgba(0,245,255,0.08)', border: '1px solid #00f5ff',
            color: '#00f5ff', borderRadius: 8, padding: '10px 0',
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
          }}>
            View Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
