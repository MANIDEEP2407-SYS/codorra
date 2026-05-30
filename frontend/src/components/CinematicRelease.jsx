import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useVaultStore from '../store/useVaultStore';

const STEPS = [
  { t: 0,    color: '#ff2d55',  text: '// SILENCE DETECTED — heartbeat timeout exceeded' },
  { t: 600,  color: '#f59e0b',  text: '// CONSENSUS CHECK: contacting relay nodes...' },
  { t: 1100, color: '#00f5ff',  text: '// Node Alpha responded — SHARD_A acquired' },
  { t: 1500, color: '#00f5ff',  text: '// Node Beta responded — SHARD_B acquired' },
  { t: 1900, color: '#a3a3a3',  text: '// Node Gamma — SHARD_C acquired (redundant)' },
  { t: 2300, color: '#e5e5e5',  text: '// THRESHOLD MET: 2-of-3 shards — reconstructing key...' },
  { t: 2800, color: '#c026d3',  text: null }, // vault ID line — injected below
  { t: 3400, color: null,        text: null }, // progress bar
  { t: 4300, color: '#22c55e',  text: null }, // BIG REVEAL
];

function playReleaseSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function fireConfetti() {
  import('canvas-confetti').then(({ default: confetti }) => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { x: 0.5, y: 0.4 },
      colors: ['#22c55e', '#00f5ff', '#c026d3', '#f59e0b'],
    });
  }).catch(() => {});
}

export default function CinematicRelease({ onClose }) {
  const { vaultId, evidence, etherealUrl } = useVaultStore();
  const [visible, setVisible] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showEthereal, setShowEthereal] = useState(false);
  const timerRefs = useRef([]);

  useEffect(() => {
    const add = (i) => {
      timerRefs.current.push(setTimeout(() => setVisible(v => [...v, i]), STEPS[i].t));
    };

    // Lines 0-5
    for (let i = 0; i <= 5; i++) add(i);

    // Vault ID line
    timerRefs.current.push(setTimeout(() => setVisible(v => [...v, 6]), 2800));

    // Progress bar: 3400 → 4200
    timerRefs.current.push(setTimeout(() => {
      setVisible(v => [...v, 7]);
      let p = 0;
      const iv = setInterval(() => {
        p += 1.25;
        setProgress(Math.min(p, 100));
        if (p >= 100) clearInterval(iv);
      }, 10);
      timerRefs.current.push(iv);
    }, 3400));

    // Flash white
    timerRefs.current.push(setTimeout(() => {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 120);
    }, 4300));

    // Reveal + sound + confetti
    timerRefs.current.push(setTimeout(() => {
      setShowReveal(true);
      playReleaseSound();
      fireConfetti();
    }, 4420));

    // Ethereal URL
    timerRefs.current.push(setTimeout(() => setShowEthereal(true), 5000));

    // Close button
    timerRefs.current.push(setTimeout(() => setShowClose(true), 5200));

    return () => timerRefs.current.forEach(t => clearTimeout(t));
  }, []);

  const recipients = evidence?.recipients?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        overflow: 'hidden',
      }}
    >
      {/* CRT scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0px, transparent 1px, transparent 2px)',
        backgroundSize: '100% 2px',
      }} />

      {/* Flash */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 2 }}
          />
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 660, width: '100%', padding: '0 24px' }}>
        <AnimatePresence>
          {/* Text lines */}
          {STEPS.slice(0, 6).map((step, i) => visible.includes(i) && (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              style={{ color: step.color, fontSize: 13, marginBottom: 8, lineHeight: 1.6 }}
            >
              {step.text}
            </motion.div>
          ))}

          {/* Vault ID line */}
          {visible.includes(6) && (
            <motion.div
              key="vaultline"
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              style={{ color: '#c026d3', fontSize: 13, marginBottom: 8 }}
            >
              {'// DECRYPTING vault ['}{vaultId}{']...'}
            </motion.div>
          )}

          {/* Progress bar */}
          {visible.includes(7) && (
            <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 20 }}>
              <div style={{
                background: 'rgba(255,255,255,0.06)', borderRadius: 4,
                height: 6, overflow: 'hidden', marginTop: 8,
              }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: progress >= 100 ? '#22c55e' : '#00f5ff',
                  width: `${progress}%`,
                  transition: 'width 0.1s linear, background 0.4s',
                  boxShadow: `0 0 8px ${progress >= 100 ? '#22c55e' : '#00f5ff'}`,
                }} />
              </div>
              <div style={{ color: '#555', fontSize: 10, marginTop: 4 }}>
                {Math.round(progress)}% — AES-256-GCM decryption
              </div>
            </motion.div>
          )}

          {/* BIG REVEAL */}
          {showReveal && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              style={{ textAlign: 'center', marginTop: 24, marginBottom: 20 }}
            >
              <div style={{
                fontSize: 52, fontWeight: 900, color: '#22c55e',
                textShadow: '0 0 40px #22c55e, 0 0 80px #22c55e44',
                letterSpacing: 4,
              }}>
                ✓ TRUTH RELEASED
              </div>
              <div style={{ color: '#a3a3a3', fontSize: 12, marginTop: 12 }}>
                {recipients} recipient{recipients !== 1 ? 's' : ''} notified • integrity verified ✓
              </div>
            </motion.div>
          )}

          {/* Ethereal URL */}
          {showEthereal && (
            <motion.div
              key="ethereal"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', marginBottom: 16 }}
            >
              {etherealUrl ? (
                <a
                  href={etherealUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#00f5ff', fontSize: 12, textDecoration: 'underline' }}
                >
                  View release proof (Ethereal inbox) →
                </a>
              ) : (
                <span style={{ color: '#555', fontSize: 11 }}>
                  Release email sent via relay consensus
                </span>
              )}
            </motion.div>
          )}

          {/* Close */}
          {showClose && (
            <motion.div
              key="close"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center' }}
            >
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#a3a3a3', borderRadius: 8, padding: '10px 28px',
                  cursor: 'pointer', fontSize: 12,
                }}
              >
                Close simulation
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
