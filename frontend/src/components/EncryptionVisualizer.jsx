import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

const PHASES = ['idle', 'encrypting', 'splitting', 'routing', 'sealed'];
const NODE_COLORS = ['#00f5ff', '#c026d3', '#f59e0b'];
const NODE_LABELS = ['ALPHA', 'BETA', 'GAMMA'];
const HEX_CHARS = '0123456789abcdef';
const rh = () => Array.from({ length: 8 }, () => HEX_CHARS[Math.floor(Math.random() * 16)]).join('');

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

const EncryptionVisualizer = forwardRef(function EncryptionVisualizer({ onPhaseChange }, ref) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    phase: 0,
    phaseProgress: 0,
    particles: [],
    nodeParticles: [[], [], []],
    orbColor: [55, 138, 221],   // blue
    orbScale: 1,
    orbGlow: 0,
    nodeGlow: [0, 0, 0],
    sealPulse: 0,
    animFrame: null,
  });

  const spawnParticles = useCallback((canvas) => {
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H * 0.38;
    return Array.from({ length: 90 }, (_, i) => ({
      x: cx + (Math.random() - 0.5) * 70,
      y: cy + (Math.random() - 0.5) * 70,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      label: rh(),
      color: [55, 138, 221],
      alpha: 0.7 + Math.random() * 0.3,
      size: 2 + Math.random() * 2,
      targetX: cx, targetY: cy,
      arrived: false,
      delay: i * 12,
      t: 0,
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
      s.phase = 1;
      s.phaseProgress = 0;
      s.particles = spawnParticles(canvas);
      s.nodeGlow = [0, 0, 0];
      s.sealPulse = 0;
      s.orbColor = [55, 138, 221];
      onPhaseChange?.('encrypting');
    },
    reset: () => {
      const s = stateRef.current;
      s.phase = 0;
      s.particles = [];
      s.nodeParticles = [[], [], []];
      s.orbColor = [55, 138, 221];
      s.nodeGlow = [0, 0, 0];
      s.sealPulse = 0;
      onPhaseChange?.('idle');
    },
  }), [spawnParticles, onPhaseChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    const draw = () => {
      const W = canvas.offsetWidth || 600;
      const H = canvas.offsetHeight || 500;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }

      ctx.clearRect(0, 0, W, H);

      const cx = W / 2, cy = H * 0.38;
      const orbR = 52;

      // Node positions
      const nodeX = [W * 0.22, W * 0.5, W * 0.78];
      const nodeY = [H * 0.82, H * 0.82, H * 0.82];

      // --- PHASE 0: IDLE ---
      if (s.phase === 0) {
        drawOrb(ctx, cx, cy, orbR, [55, 138, 221], 0.3, 'FILE');
        drawIdleParticles(ctx, cx, cy);
      }

      // --- PHASE 1: ENCRYPTING ---
      if (s.phase === 1) {
        s.phaseProgress += 0.004;
        const prog = Math.min(s.phaseProgress, 1);

        // Lerp orb color blue → purple
        const r = Math.round(lerp(55, 192, prog));
        const g = Math.round(lerp(138, 38, prog));
        const b = Math.round(lerp(221, 211, prog));
        s.orbColor = [r, g, b];

        // Move particles toward orb
        let allArrived = true;
        for (const p of s.particles) {
          p.t++;
          if (p.t < p.delay) { allArrived = false; continue; }
          const t = Math.min((p.t - p.delay) / 80, 1);
          p.x = lerp(p.x, cx + (Math.random() - 0.5) * 8, 0.07);
          p.y = lerp(p.y, cy + (Math.random() - 0.5) * 8, 0.07);
          p.alpha = lerp(p.alpha, t > 0.8 ? 0 : 0.8, 0.04);
          if (t < 1) allArrived = false;
          const hex = `rgb(${r},${g},${b})`;
          ctx.fillStyle = hex;
          ctx.globalAlpha = p.alpha;
          ctx.font = `9px JetBrains Mono`;
          ctx.fillText(p.label.slice(0, 4), p.x - 16, p.y);
          ctx.globalAlpha = 1;
        }

        drawOrb(ctx, cx, cy, orbR, s.orbColor, prog, 'ENC', prog);

        if (prog >= 1) {
          setTimeout(advancePhase, 400);
          s.phaseProgress = 1.1; // prevent re-trigger
        }
      }

      // --- PHASE 2: SPLITTING ---
      if (s.phase === 2) {
        s.phaseProgress += 0.005;
        const prog = Math.min(s.phaseProgress, 1);

        // Purple → amber
        const r = Math.round(lerp(192, 245, prog));
        const g = Math.round(lerp(38, 158, prog));
        const b = Math.round(lerp(211, 11, prog));
        s.orbColor = [r, g, b];

        drawOrb(ctx, cx, cy, orbR, s.orbColor, 0.7, 'KEY', null, 'Shamir(2,3)');

        if (prog >= 1) {
          // Spawn routing particles
          for (let i = 0; i < 3; i++) {
            s.nodeParticles[i] = Array.from({ length: 20 }, (_, j) => ({
              x: cx, y: cy,
              t: 0, delay: j * 8 + i * 15,
              nodeIdx: i,
            }));
          }
          setTimeout(advancePhase, 300);
          s.phaseProgress = 1.1;
        }
      }

      // --- PHASE 3: ROUTING ---
      if (s.phase === 3) {
        s.phaseProgress += 0.003;
        const prog = Math.min(s.phaseProgress, 1);

        drawOrb(ctx, cx, cy, orbR, [245, 158, 11], 0.8, 'KEY');

        // Draw node outlines
        for (let i = 0; i < 3; i++) {
          const glow = s.nodeGlow[i];
          ctx.save();
          ctx.shadowBlur = glow * 20;
          ctx.shadowColor = NODE_COLORS[i];
          ctx.strokeStyle = NODE_COLORS[i];
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.3 + glow * 0.7;
          ctx.strokeRect(nodeX[i] - 42, nodeY[i] - 20, 84, 40);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.restore();

          ctx.fillStyle = NODE_COLORS[i];
          ctx.globalAlpha = 0.5 + glow * 0.5;
          ctx.font = '9px JetBrains Mono';
          ctx.textAlign = 'center';
          ctx.fillText(NODE_LABELS[i], nodeX[i], nodeY[i] - 5);
          ctx.globalAlpha = 1;
        }

        // Animate routing particles
        for (let i = 0; i < 3; i++) {
          let allDone = true;
          for (const p of s.nodeParticles[i]) {
            p.t++;
            if (p.t < p.delay) { allDone = false; continue; }
            const t = Math.min((p.t - p.delay) / 60, 1);
            const et = easeOut(t);
            p.x = lerp(cx, nodeX[i], et);
            p.y = lerp(cy, nodeY[i], et);
            if (t < 1) allDone = false;
            if (t >= 1) s.nodeGlow[i] = Math.min(1, s.nodeGlow[i] + 0.05);

            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = NODE_COLORS[i];
            ctx.globalAlpha = 1 - t * 0.3;
            ctx.fill();
            ctx.globalAlpha = 1;

            // Trail
            ctx.strokeStyle = NODE_COLORS[i];
            ctx.globalAlpha = 0.15;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }

        // Show shard labels when arrived
        for (let i = 0; i < 3; i++) {
          if (s.nodeGlow[i] > 0.5) {
            ctx.fillStyle = NODE_COLORS[i];
            ctx.globalAlpha = s.nodeGlow[i];
            ctx.font = '8px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText(`SHARD_${String.fromCharCode(65 + i)} ✓`, nodeX[i], nodeY[i] + 12);
            ctx.globalAlpha = 1;
          }
        }

        if (s.nodeGlow.every(g => g >= 0.9)) {
          setTimeout(advancePhase, 500);
          s.phaseProgress = 1.1;
        }
      }

      // --- PHASE 4: SEALED ---
      if (s.phase === 4) {
        s.sealPulse = (s.sealPulse + 0.02) % (Math.PI * 2);
        const pulse = 0.5 + 0.5 * Math.sin(s.sealPulse);

        drawOrb(ctx, cx, cy, orbR, [34, 197, 94], 0.8 + pulse * 0.2, '✓', null, 'SEALED');

        // Ripple
        ctx.strokeStyle = '#22c55e';
        ctx.globalAlpha = 0.15 * pulse;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, orbR + 20 + pulse * 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        for (let i = 0; i < 3; i++) {
          const glow = 0.7 + pulse * 0.3;
          ctx.save();
          ctx.shadowBlur = 25 * glow;
          ctx.shadowColor = NODE_COLORS[i];
          ctx.strokeStyle = NODE_COLORS[i];
          ctx.lineWidth = 2;
          ctx.globalAlpha = glow;
          ctx.strokeRect(nodeX[i] - 42, nodeY[i] - 20, 84, 40);
          ctx.fillStyle = NODE_COLORS[i];
          ctx.font = '9px JetBrains Mono';
          ctx.textAlign = 'center';
          ctx.fillText(NODE_LABELS[i], nodeX[i], nodeY[i] - 5);
          ctx.fillText(`SHARD_${String.fromCharCode(65 + i)} ✓`, nodeX[i], nodeY[i] + 12);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.restore();
        }
      }

      ctx.textAlign = 'left';
      s.animFrame = requestAnimationFrame(draw);
    };

    s.animFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(s.animFrame);
  }, [advancePhase]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
});

function drawOrb(ctx, cx, cy, r, colorArr, glowIntensity, label, progress, sub) {
  const [rv, gv, bv] = colorArr;
  const col = `rgb(${rv},${gv},${bv})`;

  ctx.save();
  ctx.shadowBlur = 40 * glowIntensity;
  ctx.shadowColor = col;

  // Fill
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${rv},${gv},${bv},0.08)`;
  ctx.fill();

  // Border
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Progress arc
  if (progress !== null && progress !== undefined) {
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = col;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.restore();
  }

  // Label
  ctx.fillStyle = col;
  ctx.font = `bold 14px JetBrains Mono`;
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + 5);

  if (sub) {
    ctx.fillStyle = `rgba(${rv},${gv},${bv},0.6)`;
    ctx.font = `9px JetBrains Mono`;
    ctx.fillText(sub, cx, cy + 20);
  }
}

function drawIdleParticles(ctx, cx, cy) {
  const t = Date.now() / 1000;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + t * 0.3;
    const r = 35 + Math.sin(t * 2 + i) * 5;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#378ADD';
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export default EncryptionVisualizer;
