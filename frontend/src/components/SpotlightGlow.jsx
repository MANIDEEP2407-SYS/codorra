import { useEffect, useRef } from 'react';

// Spotlight glow: a soft cyan/purple radial light follows the mouse like a
// flashlight over a dark surface, brightening whatever sits beneath it.
// Uses mix-blend-mode:screen so it ADDS light (never darkens) over cards/text.
// pointer-events:none so it never blocks interaction. Skipped on touch devices.

export default function SpotlightGlow() {
  const ref = useRef(null);
  const target = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const pos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const raf = useRef(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return; // no persistent cursor on touch — skip

    const el = ref.current;
    if (!el) return;

    const onMove = (e) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (el.style.opacity !== '1') el.style.opacity = '1';
    };
    const onLeave = () => { el.style.opacity = '0'; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);

    const loop = () => {
      // ease the glow toward the cursor for a smooth, slightly-laggy follow
      pos.current.x += (target.current.x - pos.current.x) * 0.15;
      pos.current.y += (target.current.y - pos.current.y) * 0.15;
      el.style.setProperty('--mx', `${pos.current.x}px`);
      el.style.setProperty('--my', `${pos.current.y}px`);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9998,
        opacity: 0,
        transition: 'opacity 0.4s ease',
        mixBlendMode: 'screen',
        // gradient center is driven by --mx / --my, updated each frame
        background:
          'radial-gradient(circle 360px at var(--mx, 50%) var(--my, 50%),' +
          ' rgba(0,245,255,0.13),' +
          ' rgba(92,200,255,0.08) 30%,' +
          ' rgba(192,38,211,0.06) 52%,' +
          ' transparent 72%)',
      }}
    />
  );
}
