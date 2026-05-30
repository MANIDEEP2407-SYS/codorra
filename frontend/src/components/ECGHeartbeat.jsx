import { useEffect, useRef, useCallback } from 'react';
import useVaultStore from '../store/useVaultStore';

const COLORS = { safe: '#00f5ff', warning: '#f59e0b', critical: '#ff2d55' };

export default function ECGHeartbeat({ flatline = false }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const dataRef = useRef([]);
  const audioCtxRef = useRef(null);
  const beatTimerRef = useRef(0);
  const threatLevel = useVaultStore(s => s.threatLevel);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch {}
    }
    return audioCtxRef.current;
  };

  const playHeartbeat = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 80;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, []);

  const playFlatline = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.5);
    } catch {}
  }, []);

  useEffect(() => {
    if (flatline) playFlatline();
  }, [flatline, playFlatline]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const BEAT_INTERVAL = 40;
    const noise = threatLevel === 'safe' ? 0 : threatLevel === 'warning' ? 3 : 10;
    const n = () => (Math.random() - 0.5) * noise;

    const getBeatPattern = () => [
      0, 0, 8 + n(), -12 + n(), 60 + n(),
      -15 + n(), 10 + n(), -5 + n(),
      0, 0, 0, 0, 0, 0, 0, 0,
    ];

    const draw = () => {
      // Use logical pixels (not DPR-scaled) so data array matches canvas width
      const W = canvas.offsetWidth || 800;
      const H = canvas.offsetHeight || 100;

      // Resize canvas without DPR so data indices match pixels 1:1
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
        dataRef.current = new Array(W).fill(0);
      }

      const data = dataRef.current;

      // Shift left
      for (let i = 0; i < W - 1; i++) {
        data[i] = data[i + 1] || 0;
      }

      // Inject beat or flatline
      if (flatline) {
        data[W - 1] = 0;
      } else {
        beatTimerRef.current = (beatTimerRef.current + 1) % BEAT_INTERVAL;
        if (beatTimerRef.current === 0) {
          const pat = getBeatPattern();
          const start = W - pat.length;
          for (let i = 0; i < pat.length; i++) {
            data[start + i] = pat[i];
          }
          playHeartbeat();
        } else {
          data[W - 1] = data[W - 1] || 0;
        }
      }

      ctx.clearRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 25) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      const color = flatline ? '#ff2d55' : COLORS[threatLevel] || '#00f5ff';
      const mid = H / 2;

      ctx.save();
      ctx.shadowBlur = flatline ? 0 : 14;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const amp = (data[x] || 0) * ((H * 0.4) / 60);
        const y = mid - amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [threatLevel, flatline, playHeartbeat]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100px', display: 'block' }}
    />
  );
}
