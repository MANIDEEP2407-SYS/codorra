import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldX, Smartphone, Mail, Globe, HardDrive } from 'lucide-react';

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.15 } } },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  },
};

const FAILS = [
  { icon: Smartphone, tool: 'Signal', reason: 'Seized with your phone' },
  { icon: Mail,       tool: 'ProtonMail', reason: 'Requires you to press send' },
  { icon: Globe,      tool: 'Tor',      reason: 'Doesn\'t help when you\'re arrested' },
  { icon: HardDrive,  tool: 'USB drives', reason: 'Confiscated on detention' },
];

export default function Landing() {
  const nav = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', position: 'relative', zIndex: 1,
    }}>
      <motion.div
        variants={stagger.container}
        initial="initial"
        animate="animate"
        style={{ maxWidth: 680, textAlign: 'center' }}
      >
        {/* Story badge */}
        <motion.div variants={stagger.item}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,45,85,0.08)', border: '0.5px solid rgba(255,45,85,0.3)',
            borderRadius: 999, padding: '8px 18px', marginBottom: 36,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff2d55', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#ff2d55', fontFamily: "'DM Sans', sans-serif" }}>
              In 2022, a journalist was detained. Her USB drive was seized. Her story died.
            </span>
          </div>
        </motion.div>

        {/* H1 */}
        <motion.div variants={stagger.item}>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 'clamp(40px, 7vw, 68px)',
            fontWeight: 800, lineHeight: 1.08, margin: '0 0 24px',
            color: '#e5e5e5', letterSpacing: '-1px',
          }}>
            If they silence you,<br />
            <span style={{ color: '#00f5ff' }}>the truth still speaks.</span>
          </h1>
        </motion.div>

        {/* Body */}
        <motion.div variants={stagger.item}>
          <p style={{
            fontSize: 16, color: '#a3a3a3', lineHeight: 1.75,
            maxWidth: 560, margin: '0 auto 36px', fontFamily: "'DM Sans', sans-serif",
          }}>
            A cryptographic dead man's switch. Encrypt evidence across 3 independent relay nodes.
            If your heartbeat stops — the truth releases automatically.{' '}
            <strong style={{ color: '#e5e5e5' }}>No central server. No single point of failure. No action required after setup.</strong>
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div variants={stagger.item} style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 56, flexWrap: 'wrap' }}>
          <button
            onClick={() => nav('/deposit')}
            style={{
              background: 'rgba(0,245,255,0.06)', border: '1px solid #00f5ff',
              color: '#00f5ff', borderRadius: 10, padding: '14px 32px',
              cursor: 'pointer', fontSize: 15, fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600, letterSpacing: 0.3,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(0,245,255,0.14)'}
            onMouseLeave={e => e.target.style.background = 'rgba(0,245,255,0.06)'}
          >
            Deposit Evidence →
          </button>
          <button
            onClick={() => nav('/dashboard')}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.12)',
              color: '#a3a3a3', borderRadius: 10, padding: '14px 32px',
              cursor: 'pointer', fontSize: 15, fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.color = '#e5e5e5'; e.target.style.borderColor = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={e => { e.target.style.color = '#a3a3a3'; e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            I'm a Recipient
          </button>
        </motion.div>

        {/* Why existing tools fail */}
        <motion.div variants={stagger.item} style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>
            WHY EXISTING TOOLS FAIL AT THE CRITICAL MOMENT
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxWidth: 540, margin: '0 auto' }}>
            {FAILS.map(({ icon: Icon, tool, reason }) => (
              <div key={tool} style={{
                background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
              }}>
                <ShieldX size={14} color="#ff2d55" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <span style={{ color: '#e5e5e5', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                    {tool}
                  </span>
                  <div style={{ color: '#a3a3a3', fontSize: 11, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
                    {reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trust bar */}
        <motion.div variants={stagger.item}>
          <div style={{
            display: 'inline-flex', gap: 0, flexWrap: 'wrap', justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: '#a3a3a3', letterSpacing: 0.5,
          }}>
            {['AES-256-GCM', 'ECDSA-signed heartbeats', 'Shamir(2,3)', 'No central server'].map((item, i, arr) => (
              <span key={item}>
                <span style={{ color: '#555' }}>{i > 0 ? ' • ' : ''}</span>
                <span style={{ color: '#00f5ff' }}>{item}</span>
              </span>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
