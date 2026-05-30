import { useEffect, useRef, useState } from 'react';
import useVaultStore from '../store/useVaultStore';

// cinematic release sequence - fullscreen terminal-style animation
export default function CinematicRelease({ onClose }) {
  const { vaultId, evidence, etherealUrl } = useVaultStore();
  const [lines, setLines] = useState([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const timerRefs = useRef([]);

  const SEQUENCE = [
    { t: 0,    text: '> SILENCE DETECTED — heartbeat timeout exceeded', color: '#e85050' },
    { t: 500,  text: '> contacting relay nodes for consensus...', color: '#e8a040' },
    { t: 900,  text: '> Node Alpha responded — SHARD_A acquired', color: '#4a9eff' },
    { t: 1300, text: '> Node Beta responded — SHARD_B acquired', color: '#4a9eff' },
    { t: 1600, text: '> Node Gamma — SHARD_C acquired (redundant)', color: '#777' },
    { t: 2000, text: '> THRESHOLD MET: 2-of-3 shards collected', color: '#ccc' },
    { t: 2400, text: `> decrypting vault [${vaultId}]...`, color: '#8a5cf5' },
  ];

  useEffect(() => {
    // show text lines one by one
    SEQUENCE.forEach(({ t, text, color }) => {
      timerRefs.current.push(setTimeout(() => {
        setLines(prev => [...prev, { text, color }]);
      }, t));
    });

    // progress bar
    timerRefs.current.push(setTimeout(() => {
      let p = 0;
      const iv = setInterval(() => {
        p += 2;
        setProgress(Math.min(p, 100));
        if (p >= 100) clearInterval(iv);
      }, 15);
      timerRefs.current.push(iv);
    }, 2800));

    // done
    timerRefs.current.push(setTimeout(() => setDone(true), 3800));
    timerRefs.current.push(setTimeout(() => setShowClose(true), 4400));

    return () => timerRefs.current.forEach(t => clearTimeout(t));
  }, []);

  const recipients = evidence?.recipients?.length ?? 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace',
    }}>
      <div style={{ maxWidth: 600, width: '100%', padding: '0 20px' }}>
        {/* terminal lines */}
        {lines.map((line, i) => (
          <div key={i} style={{ color: line.color, fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>
            {line.text}
          </div>
        ))}

        {/* progress bar */}
        {progress > 0 && (
          <div style={{ marginTop: 12, marginBottom: 8 }}>
            <div style={{ background: '#222', borderRadius: 3, height: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: progress >= 100 ? '#5cb85c' : '#4a9eff',
                width: `${progress}%`, transition: 'width 0.1s linear',
              }} />
            </div>
            <div style={{ color: '#555', fontSize: 10, marginTop: 3 }}>
              {Math.round(progress)}% — AES-256-GCM decryption
            </div>
          </div>
        )}

        {/* success message */}
        {done && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#5cb85c', marginBottom: 8 }}>
              ✓ TRUTH RELEASED
            </div>
            <div style={{ color: '#888', fontSize: 12 }}>
              {recipients} recipient{recipients !== 1 ? 's' : ''} notified · integrity verified
            </div>
            {etherealUrl && (
              <a href={etherealUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 12, color: '#4a9eff', fontSize: 12 }}>
                View release email (Ethereal) →
              </a>
            )}
          </div>
        )}

        {showClose && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid #333',
              color: '#888', borderRadius: 6, padding: '8px 24px',
              cursor: 'pointer', fontSize: 12,
            }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
