import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

// phases of the encryption animation
const PHASES = ['idle', 'encrypting', 'splitting', 'routing', 'sealed'];
const NODE_LABELS = ['ALPHA', 'BETA', 'GAMMA'];
const NODE_COLORS = ['#4a9eff', '#8a5cf5', '#e8a040'];

function lerp(a, b, t) { return a + (b - a) * t; }

// particle visualizer for the encryption flow
const EncryptionVisualizer = forwardRef(function EncryptionVisualizer({ onPhaseChange }, ref) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    phase: 0, phaseProgress: 0,
    particles: [], nodeParticles: [[], [], []],
    nodeGlow: [0, 0, 0], animFrame: null,
  });

  const spawnParticles = useCallback((canvas) => {
    const cx = canvas.width / 2, cy = canvas.height * 0.38;
    return Array.from({ length: 50 }, (_, i) => ({
      x: cx + (Math.random() - 0.5) * 60,
      y: cy + (Math.random() - 0.5) * 60,
      t: 0, delay: i * 10,
    }));
  }, []);

  const advancePhase = useCallback(() => {
    const s = stateRef.current;
    if (s.phase >= 4) return;
    s.phase += 1;
    s.phaseProgress = 0;
    onPhaseChange?.(PHASES[s.phase]);
  }, [onPhaseChange]);

  useImperativeHandle(ref, () => ({
    start: () => {
      const s = stateRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      s.phase = 1; s.phaseProgress = 0;
      s.particles = spawnParticles(canvas);
      s.nodeGlow = [0, 0, 0];
      onPhaseChange?.('encrypting');
    },
    reset: () => {
      const s = stateRef.current;
      s.phase = 0; s.particles = []; s.nodeParticles = [[], [], []]; s.nodeGlow = [0, 0, 0];
      onPhaseChange?.('idle');
    },
  }), [spawnParticles, onPhaseChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    const draw = () => {
      const W = canvas.offsetWidth || 500;
      const H = canvas.offsetHeight || 400;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2, cy = H * 0.38, orbR = 40;
      const nodeX = [W * 0.22, W * 0.5, W * 0.78];
      const nodeY = [H * 0.82, H * 0.82, H * 0.82];

      // idle state - just the orb
      if (s.phase === 0) {
        drawCircle(ctx, cx, cy, orbR, '#4a9eff', 'FILE');
      }

      // encrypting - particles move to center
      if (s.phase === 1) {
        s.phaseProgress += 0.005;
        const prog = Math.min(s.phaseProgress, 1);

        for (const p of s.particles) {
          p.t++;
          if (p.t < p.delay) continue;
          p.x = lerp(p.x, cx, 0.06);
          p.y = lerp(p.y, cy, 0.06);
          const alpha = Math.max(0, 1 - p.t / 120);
          ctx.fillStyle = `rgba(74,158,255,${alpha * 0.6})`;
          ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
        }

        drawCircle(ctx, cx, cy, orbR, '#8a5cf5', 'ENC', prog);
        if (prog >= 1) { setTimeout(advancePhase, 300); s.phaseProgress = 1.1; }
      }

      // splitting key
      if (s.phase === 2) {
        s.phaseProgress += 0.006;
        drawCircle(ctx, cx, cy, orbR, '#e8a040', 'KEY');
        if (s.phaseProgress >= 1) {
          for (let i = 0; i < 3; i++) {
            s.nodeParticles[i] = Array.from({ length: 12 }, (_, j) => ({ x: cx, y: cy, t: 0, delay: j * 6 + i * 10 }));
          }
          setTimeout(advancePhase, 200);
          s.phaseProgress = 1.1;
        }
      }

      // routing shards to nodes
      if (s.phase === 3) {
        s.phaseProgress += 0.004;
        drawCircle(ctx, cx, cy, orbR, '#e8a040', 'KEY');

        for (let i = 0; i < 3; i++) {
          // draw node box
          ctx.strokeStyle = NODE_COLORS[i];
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.3 + s.nodeGlow[i] * 0.7;
          ctx.strokeRect(nodeX[i] - 36, nodeY[i] - 16, 72, 32);
          ctx.fillStyle = NODE_COLORS[i];
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(NODE_LABELS[i], nodeX[i], nodeY[i] + 3);
          ctx.globalAlpha = 1;

          // animate particles
          for (const p of s.nodeParticles[i]) {
            p.t++;
            if (p.t < p.delay) continue;
            const t = Math.min((p.t - p.delay) / 50, 1);
            p.x = lerp(cx, nodeX[i], t);
            p.y = lerp(cy, nodeY[i], t);
            if (t >= 1) s.nodeGlow[i] = Math.min(1, s.nodeGlow[i] + 0.04);
            ctx.fillStyle = NODE_COLORS[i];
            ctx.globalAlpha = 1 - t * 0.3;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
          }

          if (s.nodeGlow[i] > 0.5) {
            ctx.fillStyle = NODE_COLORS[i];
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`SHARD_${String.fromCharCode(65 + i)} ✓`, nodeX[i], nodeY[i] + 14);
          }
        }

        if (s.nodeGlow.every(g => g >= 0.9)) { setTimeout(advancePhase, 400); s.phaseProgress = 1.1; }
      }

      // sealed
      if (s.phase === 4) {
        drawCircle(ctx, cx, cy, orbR, '#5cb85c', '✓');
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = NODE_COLORS[i];
          ctx.lineWidth = 1.5;
          ctx.strokeRect(nodeX[i] - 36, nodeY[i] - 16, 72, 32);
          ctx.fillStyle = NODE_COLORS[i];
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(NODE_LABELS[i], nodeX[i], nodeY[i] - 2);
          ctx.fillText(`SHARD_${String.fromCharCode(65 + i)} ✓`, nodeX[i], nodeY[i] + 12);
        }
      }

      ctx.textAlign = 'left';
      s.animFrame = requestAnimationFrame(draw);
    };

    s.animFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(s.animFrame);
  }, [advancePhase]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
});

// simple circle with label
function drawCircle(ctx, cx, cy, r, color, label, progress) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color + '15';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (progress != null) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = color;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + 4);
}

export default EncryptionVisualizer;
