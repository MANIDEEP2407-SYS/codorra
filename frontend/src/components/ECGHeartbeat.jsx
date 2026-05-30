import { useEffect, useRef } from 'react';
import useVaultStore from '../store/useVaultStore';

// draws a simple ECG line on canvas
export default function ECGHeartbeat({ flatline = false }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const dataRef = useRef([]);
  const beatTimerRef = useRef(0);
  const threatLevel = useVaultStore(s => s.threatLevel);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const BEAT_INTERVAL = 40;
    const color = flatline ? '#e85050' : (threatLevel === 'safe' ? '#5cb85c' : threatLevel === 'warning' ? '#e8a040' : '#e85050');

    // rough heartbeat shape
    const getBeat = () => [0, 0, 8, -12, 55, -15, 10, -5, 0, 0, 0, 0, 0, 0, 0, 0];

    const draw = () => {
      const W = canvas.offsetWidth || 700;
      const H = canvas.offsetHeight || 80;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
        dataRef.current = new Array(W).fill(0);
      }

      const data = dataRef.current;

      // shift left
      for (let i = 0; i < W - 1; i++) data[i] = data[i + 1] || 0;

      if (flatline) {
        data[W - 1] = 0;
      } else {
        beatTimerRef.current = (beatTimerRef.current + 1) % BEAT_INTERVAL;
        if (beatTimerRef.current === 0) {
          const pat = getBeat();
          const start = W - pat.length;
          for (let i = 0; i < pat.length; i++) data[start + i] = pat[i];
        } else {
          data[W - 1] = data[W - 1] || 0;
        }
      }

      ctx.clearRect(0, 0, W, H);

      // faint grid
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // ecg line
      const mid = H / 2;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const y = mid - (data[x] || 0) * (H * 0.35 / 60);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [threatLevel, flatline]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '80px', display: 'block' }} />;
}
