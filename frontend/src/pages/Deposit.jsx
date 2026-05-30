import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, X, Plus, ChevronDown, Info } from 'lucide-react';
import EncryptionVisualizer from '../components/EncryptionVisualizer';
import CryptoReceipt from '../components/CryptoReceipt';
import useVaultStore from '../store/useVaultStore';
import { encryptFile, hashFile, generateDepositorKeypair } from '../lib/crypto';
import { splitKey } from '../lib/shamir';
import { depositShard } from '../lib/api';

const INTERVALS = [
  { label: '1 minute (demo)', value: 60 },
  { label: '24 hours', value: 86400 },
  { label: '3 days', value: 259200 },
  { label: '7 days', value: 604800 },
  { label: '30 days', value: 2592000 },
];
const GRACE = [
  { label: '1 missed (strict)', value: 1 },
  { label: '2 missed (recommended)', value: 2 },
  { label: '3 missed (lenient)', value: 3 },
];

const PHASES = ['File Loaded', 'AES-256 Encrypt', 'Key Split 2-of-3', 'Route Shards', 'Vault Sealed'];

export default function Deposit() {
  const nav = useNavigate();
  const vizRef = useRef(null);
  const [file, setFile] = useState(null);
  const [hash, setHash] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [interval, setInterval_] = useState(60);
  const [grace, setGrace] = useState(2);
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState(-1);
  const [vizPhase, setVizPhase] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const { setVault, relayNodes } = useVaultStore();

  const handleFile = useCallback(async (f) => {
    setFile(f);
    setHash(null);
    setPhase(0);
    const h = await hashFile(f);
    setHash(h);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const addEmail = (raw) => {
    const email = raw.trim().replace(/,$/, '');
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !recipients.includes(email)) {
      setRecipients(r => [...r, email]);
    }
    setEmailInput('');
  };

  const handleDeposit = async () => {
    if (!file || recipients.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      setPhase(1);
      const { keyHex, ivHex, ciphertextB64 } = await encryptFile(file);
      const fileHash = await hashFile(file);

      setPhase(2);
      vizRef.current?.start();

      const { keypair, publicKeyB64 } = await generateDepositorKeypair();
      const shards = splitKey(keyHex, 3, 2);

      // Generate vault ID
      const vaultId = 'TS-' + Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().slice(0, 6);

      setPhase(3);
      const payload = {
        vaultId, shards, ciphertextB64, ivHex,
        fileHash, fileName: file.name,
        publicKeyB64, recipients,
        releaseMessage: message,
        heartbeatInterval: interval,
        gracePeriod: grace,
      };

      // Deposit to all relay nodes
      await Promise.all([0, 1, 2].map(i => depositShard(i, payload)));

      setPhase(4);

      setVault(
        vaultId,
        { fileName: file.name, fileSize: file.size, hash: fileHash, ivHex, recipients, message },
        keypair,
        publicKeyB64,
        interval,
        grace,
      );

      setReceipt({ vaultId, keypair, publicKeyB64 });
    } catch (e) {
      console.error(e);
      setError(e.message || 'Deposit failed. Are relay nodes running?');
      vizRef.current?.reset();
      setPhase(-1);
    } finally {
      setLoading(false);
    }
  };

  const canDeposit = file && recipients.length > 0 && !loading;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', zIndex: 1 }}>
      {/* LEFT — Form 42% */}
      <div style={{
        width: '42%', minWidth: 380, padding: '60px 40px',
        borderRight: '0.5px solid rgba(255,255,255,0.06)',
        overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        <div>
          <button
            onClick={() => nav('/')}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 24 }}
          >
            ← Back
          </button>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: '#e5e5e5', margin: '0 0 6px' }}>
            Deposit Evidence
          </h1>
          <p style={{ color: '#555', fontSize: 13, fontFamily: "'DM Sans',sans-serif", margin: 0 }}>
            Encrypted in your browser. Key shards distributed to 3 relay nodes.
          </p>
        </div>

        {/* File Upload */}
        <div>
          <label style={labelStyle}>Evidence File</label>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput').click()}
            style={{
              border: `1px dashed ${dragOver ? '#00f5ff' : file ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 10, padding: '24px 16px', cursor: 'pointer', textAlign: 'center',
              background: dragOver ? 'rgba(0,245,255,0.04)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s',
            }}
          >
            <input id="fileInput" type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
            {file ? (
              <div>
                <div style={{ color: '#00f5ff', fontSize: 13, fontWeight: 600, marginBottom: 4, fontFamily: "'DM Sans',sans-serif" }}>{file.name}</div>
                <div style={{ color: '#555', fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>{(file.size / 1024).toFixed(1)} KB</div>
                {hash && (
                  <div style={{ marginTop: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#a3a3a3' }}>
                    SHA-256: {hash.slice(0, 20)}...
                    <span style={{ marginLeft: 8, color: '#22c55e', fontSize: 10 }}>Encrypted in browser ✓</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Upload size={28} color="#555" style={{ marginBottom: 10 }} />
                <div style={{ color: '#a3a3a3', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>Drop file or click to browse</div>
                <div style={{ color: '#555', fontSize: 11, marginTop: 4, fontFamily: "'DM Sans',sans-serif" }}>Any file type — encrypted client-side</div>
              </div>
            )}
          </div>
        </div>

        {/* Recipients */}
        <div>
          <label style={labelStyle}>Recipient Emails</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {recipients.map(email => (
              <span key={email} style={chipStyle}>
                {email}
                <button onClick={() => setRecipients(r => r.filter(e => e !== email))} style={chipXStyle}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <input
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(emailInput); } }}
            onBlur={() => emailInput && addEmail(emailInput)}
            placeholder="email@example.com — Enter to add"
            style={inputStyle}
          />
        </div>

        {/* Heartbeat Interval */}
        <div>
          <label style={labelStyle}>Heartbeat Interval</label>
          <div style={{ position: 'relative' }}>
            <select
              value={interval}
              onChange={e => setInterval_(Number(e.target.value))}
              style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
            >
              {INTERVALS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} color="#555" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Grace Period */}
        <div>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            Grace Period
            <span title="How many missed heartbeats before release triggers" style={{ cursor: 'help' }}>
              <Info size={12} color="#555" />
            </span>
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={grace}
              onChange={e => setGrace(Number(e.target.value))}
              style={{ ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
            >
              {GRACE.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} color="#555" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Release Message */}
        <div>
          <label style={labelStyle}>Release Message <span style={{ color: '#555' }}>(optional)</span></label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Message to recipients when the switch triggers..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,45,85,0.08)', border: '0.5px solid rgba(255,45,85,0.3)',
            borderRadius: 8, padding: '12px 16px', color: '#ff2d55', fontSize: 12,
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleDeposit}
          disabled={!canDeposit}
          style={{
            background: canDeposit ? 'rgba(0,245,255,0.08)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${canDeposit ? '#00f5ff' : 'rgba(255,255,255,0.1)'}`,
            color: canDeposit ? '#00f5ff' : '#555',
            borderRadius: 10, padding: '14px 0', fontSize: 15,
            cursor: canDeposit ? 'pointer' : 'not-allowed',
            fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
            transition: 'all 0.2s', width: '100%',
          }}
        >
          {loading ? 'Encrypting & Depositing...' : 'Encrypt & Deposit →'}
        </button>

        {/* Step pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PHASES.map((p, i) => (
            <span key={p} style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 999,
              fontFamily: "'JetBrains Mono',monospace",
              background: phase >= i ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: phase >= i ? '#00f5ff' : '#555',
              border: `0.5px solid ${phase >= i ? '#00f5ff44' : 'transparent'}`,
              transition: 'all 0.3s',
            }}>
              {phase >= i ? '✓ ' : ''}{p}
            </span>
          ))}
        </div>
      </div>

      {/* RIGHT — Visualizer 58% */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <EncryptionVisualizer ref={vizRef} onPhaseChange={setVizPhase} />
        </div>
        <div style={{
          position: 'absolute', top: 20, left: 20, right: 20,
          fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#00f5ff', opacity: 0.6,
        }}>
          {vizPhase !== 'idle' && `// phase: ${vizPhase.toUpperCase()}`}
        </div>
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <CryptoReceipt
          vaultId={receipt.vaultId}
          evidence={useVaultStore.getState().evidence}
          publicKeyB64={receipt.publicKeyB64}
          relayNodes={relayNodes}
          onClose={() => nav('/dashboard')}
        />
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 12, color: '#a3a3a3', marginBottom: 8,
  fontFamily: "'DM Sans',sans-serif", fontWeight: 500, letterSpacing: 0.3,
};
const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.03)',
  border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8,
  color: '#e5e5e5', fontSize: 13, padding: '10px 14px',
  fontFamily: "'DM Sans',sans-serif", outline: 'none', boxSizing: 'border-box',
};
const chipStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'rgba(0,245,255,0.08)', border: '0.5px solid rgba(0,245,255,0.2)',
  borderRadius: 999, padding: '4px 10px', fontSize: 12, color: '#00f5ff',
  fontFamily: "'DM Sans',sans-serif",
};
const chipXStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#00f5ff', padding: 0, display: 'flex', alignItems: 'center',
};
