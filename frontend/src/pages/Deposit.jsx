import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import EncryptionVisualizer from '../components/EncryptionVisualizer';
import CryptoReceipt from '../components/CryptoReceipt';
import useVaultStore from '../store/useVaultStore';
import { encryptFile, hashFile, generateDepositorKeypair } from '../lib/crypto';
import { splitKey } from '../lib/shamir';
import { depositShard } from '../lib/api';

// heartbeat options - 1 min is good for demo, real users pick 24h+
const INTERVALS = [
  { label: '1 minute (demo)', value: 60 },
  { label: '24 hours', value: 86400 },
  { label: '3 days', value: 259200 },
  { label: '7 days', value: 604800 },
  { label: '30 days', value: 2592000 },
];
const GRACE = [
  { label: '1 missed (strict)', value: 1 },
  { label: '2 missed (default)', value: 2 },
  { label: '3 missed (lenient)', value: 3 },
];
const PHASES = ['File Loaded', 'AES-256 Encrypt', 'Key Split 2-of-3', 'Route Shards', 'Vault Sealed'];

export default function Deposit() {
  const nav = useNavigate();
  const vizRef = useRef(null);

  const [file, setFile] = useState(null);
  const [hash, setHash] = useState(null);
  // recipients is now an array of { email, pgpKey }
  const [recipients, setRecipients] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  // pgpInput tied to the current email being added - optional
  const [pgpInput, setPgpInput] = useState('');
  const [showPgpField, setShowPgpField] = useState(false);
  const [interval, setInterval_] = useState(60);
  const [grace, setGrace] = useState(2);
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [vizPhase, setVizPhase] = useState('idle');

  const { setVault, relayNodes } = useVaultStore();

  // hash file as soon as its selected
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
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  // validate PGP key format - just a basic check
  const isValidPgpKey = (key) => key.trim().startsWith('-----BEGIN PGP PUBLIC KEY BLOCK');

  const addRecipient = (raw) => {
    const email = raw.trim().replace(/,$/, '');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailInput('');
      return;
    }
    if (recipients.some(r => r.email === email)) {
      setEmailInput('');
      return;
    }
    const pgpKey = pgpInput.trim();
    // pgp key is optional - if given, must look valid
    if (pgpKey && !isValidPgpKey(pgpKey)) {
      setError('PGP key format invalid. It should start with: -----BEGIN PGP PUBLIC KEY BLOCK-----');
      return;
    }
    setRecipients(r => [...r, { email, pgpKey: pgpKey || null }]);
    setEmailInput('');
    setPgpInput('');
    setShowPgpField(false);
    setError(null);
  };

  const removeRecipient = (email) => {
    setRecipients(r => r.filter(x => x.email !== email));
  };

  // main deposit flow
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

      const vaultId = 'SR-' + Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().slice(0, 6);

      setPhase(3);

      // Build flat email list and keyed pgp map { email: armoredKey }
      const emailList = recipients.map(r => r.email);
      const pgpMap = {};
      recipients.forEach(r => { if (r.pgpKey) pgpMap[r.email] = r.pgpKey; });

      const payload = {
        vaultId, shards, ciphertextB64, ivHex, fileHash,
        fileName: file.name, publicKeyB64,
        recipients: emailList,
        recipientPgpKeys: pgpMap,
        releaseMessage: message, heartbeatInterval: interval, gracePeriod: grace,
      };
      await Promise.all([0, 1, 2].map(i => depositShard(i, payload)));

      setPhase(4);
      setVault(vaultId,
        { fileName: file.name, fileSize: file.size, hash: fileHash, ivHex, recipients: emailList, message },
        keypair, publicKeyB64, interval, grace
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
      {/* left panel - form */}
      <div style={{
        width: '42%', minWidth: 360, padding: '40px 32px',
        borderRight: '1px solid #1e1e1e', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div>
          <button onClick={() => nav('/')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 20 }}>
            ← Back
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#eee', marginBottom: 4 }}>
            Deposit Evidence
          </h1>
          <p style={{ color: '#666', fontSize: 13 }}>
            Encrypted in your browser. Key shards go to 3 relay nodes.
          </p>
        </div>

        {/* file upload */}
        <div>
          <label style={labelStyle}>Evidence File</label>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput').click()}
            style={{
              border: `1px dashed ${dragOver ? '#4a9eff' : file ? '#4a9eff55' : '#333'}`,
              borderRadius: 8, padding: '20px 16px', cursor: 'pointer', textAlign: 'center',
              background: dragOver ? '#4a9eff08' : '#141414',
            }}
          >
            <input id="fileInput" type="file" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
            {file ? (
              <div>
                <div style={{ color: '#4a9eff', fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{file.name}</div>
                <div style={{ color: '#666', fontSize: 11 }}>{(file.size / 1024).toFixed(1)} KB</div>
                {hash && (
                  <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 10, color: '#888' }}>
                    SHA-256: {hash.slice(0, 20)}...
                    <span style={{ marginLeft: 8, color: '#5cb85c' }}>✓ hashed</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
                <div style={{ color: '#888', fontSize: 13 }}>Drop file here or click to browse</div>
                <div style={{ color: '#555', fontSize: 11, marginTop: 3 }}>Any file type — encrypted client-side</div>
              </div>
            )}
          </div>
        </div>

        {/* recipients section */}
        <div>
          <label style={labelStyle}>Recipient Emails</label>
          <div style={{ color: '#555', fontSize: 11, marginBottom: 8 }}>
            These people will receive the evidence if your heartbeat stops.
          </div>

          {/* existing recipients */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
            {recipients.map(({ email, pgpKey }) => (
              <div key={email} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#1a2a3a', border: '1px solid #2a3a4a', borderRadius: 6,
                padding: '6px 10px', fontSize: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#8ab4f8' }}>{email}</span>
                  {pgpKey ? (
                    <span style={{ fontSize: 10, background: '#1a3a1a', color: '#5cb85c', padding: '2px 6px', borderRadius: 3, border: '1px solid #2a4a2a' }}>
                      🔒 PGP
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: '#555' }}>no PGP</span>
                  )}
                </div>
                <button
                  onClick={() => removeRecipient(email)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0, fontSize: 14 }}
                >×</button>
              </div>
            ))}
          </div>

          {/* add new recipient */}
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 6, padding: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Email address *</div>
              <input
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addRecipient(emailInput); } }}
                placeholder="email@example.com"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* toggle PGP key input */}
            <div style={{ marginBottom: 8 }}>
              <button
                onClick={() => setShowPgpField(v => !v)}
                style={{
                  background: 'none', border: '1px solid #2a3a4a', color: '#8ab4f8',
                  borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                }}
              >
                {showPgpField ? '▲ Hide PGP key' : '🔒 Add PGP public key (optional)'}
              </button>
            </div>

            {showPgpField && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                  PGP public key — email attachment will be encrypted (optional)
                </div>
                <textarea
                  value={pgpInput}
                  onChange={e => setPgpInput(e.target.value)}
                  placeholder={'-----BEGIN PGP PUBLIC KEY BLOCK-----\n...\n-----END PGP PUBLIC KEY BLOCK-----'}
                  rows={5}
                  style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 10, resize: 'vertical' }}
                />
                <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
                  Get your public key from Keybase, keys.openpgp.org, or <code>gpg --export --armor your@email.com</code>
                </div>
              </div>
            )}

            <button
              onClick={() => addRecipient(emailInput)}
              disabled={!emailInput.trim()}
              style={{
                background: emailInput.trim() ? '#1a2a3a' : '#111',
                border: `1px solid ${emailInput.trim() ? '#2a4a6a' : '#222'}`,
                color: emailInput.trim() ? '#8ab4f8' : '#444',
                borderRadius: 4, padding: '5px 14px', fontSize: 12, cursor: emailInput.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              + Add Recipient
            </button>
          </div>
        </div>

        {/* heartbeat interval */}
        <div>
          <label style={labelStyle}>Heartbeat Interval</label>
          <select value={interval} onChange={e => setInterval_(Number(e.target.value))}>
            {INTERVALS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* grace period */}
        <div>
          <label style={labelStyle}>Grace Period</label>
          <select value={grace} onChange={e => setGrace(Number(e.target.value))}>
            {GRACE.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* release message */}
        <div>
          <label style={labelStyle}>Release Message <span style={{ color: '#555' }}>(optional)</span></label>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Message to include when evidence is released..."
            rows={3} style={{ resize: 'vertical' }}
          />
        </div>

        {/* error */}
        {error && (
          <div style={{ background: '#2a1515', border: '1px solid #4a2020', borderRadius: 6, padding: '10px 14px', color: '#e85050', fontSize: 12, fontFamily: 'monospace' }}>
            {error}
          </div>
        )}

        {/* submit */}
        <button onClick={handleDeposit} disabled={!canDeposit} style={{
          background: canDeposit ? '#4a9eff' : '#222', border: 'none',
          color: canDeposit ? '#fff' : '#555', borderRadius: 8,
          padding: '12px 0', fontSize: 14, fontWeight: 600,
          cursor: canDeposit ? 'pointer' : 'not-allowed', width: '100%',
        }}>
          {loading ? 'Encrypting...' : 'Encrypt & Deposit →'}
        </button>

        {/* progress steps */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PHASES.map((p, i) => (
            <span key={p} style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace',
              background: phase >= i ? '#1a2a3a' : '#151515',
              color: phase >= i ? '#4a9eff' : '#444',
              border: `1px solid ${phase >= i ? '#2a3a4a' : '#1a1a1a'}`,
            }}>
              {phase >= i ? '✓ ' : ''}{p}
            </span>
          ))}
        </div>
      </div>

      {/* right panel - visualizer */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <EncryptionVisualizer ref={vizRef} onPhaseChange={setVizPhase} />
        </div>
        {vizPhase !== 'idle' && (
          <div style={{ position: 'absolute', top: 16, left: 16, fontFamily: 'monospace', fontSize: 10, color: '#4a9eff', opacity: 0.5 }}>
            phase: {vizPhase}
          </div>
        )}
      </div>

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
  display: 'block', fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 500,
};
