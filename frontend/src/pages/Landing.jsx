import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldOff, Smartphone, Send, Globe, Usb, ArrowRight } from 'lucide-react';

// why the alternatives fail — each gets an icon for quick visual scanning
const FAILS = [
  { tool: 'Signal', reason: 'Gets seized with the phone', Icon: Smartphone },
  { tool: 'ProtonMail', reason: 'You have to press send yourself', Icon: Send },
  { tool: 'Tor', reason: 'Useless when physically arrested', Icon: Globe },
  { tool: 'USB drives', reason: 'First thing confiscated', Icon: Usb },
];

// shared stagger config — each child rises in 0.1s after the previous
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function Landing() {
  const nav = useNavigate();
  const [showRecipientInfo, setShowRecipientInfo] = useState(false);
  const [hoverPrimary, setHoverPrimary] = useState(false);
  const [hoverSecondary, setHoverSecondary] = useState(false);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 20px', position: 'relative', zIndex: 1,
    }}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        style={{ maxWidth: 640, textAlign: 'center', width: '100%' }}
      >
        {/* alert badge */}
        <motion.div variants={item} style={{ marginBottom: 30 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: '#ff6b8a', fontFamily: "'JetBrains Mono', monospace",
            border: '1px solid rgba(255,45,85,0.28)', borderRadius: 20,
            padding: '6px 16px', background: 'rgba(255,45,85,0.06)',
            animation: 'badgePulse 3.5s ease-in-out infinite',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--red)',
              boxShadow: '0 0 8px var(--red)', display: 'inline-block',
            }} />
            सत्यमेव जयते — Truth alone triumphs
          </span>
        </motion.div>

        {/* hero heading */}
        <motion.h1 variants={item} style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 'clamp(38px, 7vw, 68px)', fontWeight: 800,
          lineHeight: 1.08, marginBottom: 22, color: '#f5f5f5',
          letterSpacing: '-1px',
        }}>
          If they silence you,<br />
          <span className="accent-gradient">the truth still speaks.</span>
        </motion.h1>

        {/* description */}
        <motion.p variants={item} style={{
          fontSize: 16, color: 'var(--muted)', lineHeight: 1.75,
          maxWidth: 520, margin: '0 auto 38px',
        }}>
          SatyaRaksha is a cryptographic dead man's switch. Your evidence is encrypted
          and split across 3 independent nodes. If your heartbeat stops, the truth
          releases automatically — <span style={{ color: '#cfcfcf' }}>no central server, no single point of failure.</span>
        </motion.p>

        {/* cta buttons */}
        <motion.div variants={item} style={{
          display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 56, flexWrap: 'wrap',
        }}>
          <button
            onClick={() => nav('/deposit')}
            onMouseEnter={() => setHoverPrimary(true)}
            onMouseLeave={() => setHoverPrimary(false)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(0,245,255,0.08)',
              border: '1px solid var(--cyan)', color: 'var(--cyan)',
              borderRadius: 10, padding: '13px 30px', cursor: 'pointer',
              fontSize: 15, fontWeight: 600, letterSpacing: 0.2,
              transition: 'background 0.2s, transform 0.1s',
              backgroundColor: hoverPrimary ? 'rgba(0,245,255,0.16)' : 'rgba(0,245,255,0.08)',
              animation: 'ctaGlow 3.5s ease-in-out infinite',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Deposit Evidence <ArrowRight size={16} />
          </button>

          <button
            onClick={() => setShowRecipientInfo(true)}
            onMouseEnter={() => setHoverSecondary(true)}
            onMouseLeave={() => setHoverSecondary(false)}
            style={{
              background: hoverSecondary ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.18)',
              color: hoverSecondary ? '#ddd' : 'var(--muted)',
              borderRadius: 10, padding: '13px 28px', cursor: 'pointer',
              fontSize: 15, transition: 'all 0.2s',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            I'm a Recipient
          </button>
        </motion.div>

        {/* why existing tools fail */}
        <motion.div variants={item} style={{ marginBottom: 36 }}>
          <p style={{
            fontSize: 11, color: '#666', letterSpacing: 2, marginBottom: 16,
            textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace",
          }}>
            Why existing tools fail at the critical moment
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
            maxWidth: 500, margin: '0 auto',
          }}>
            {FAILS.map(({ tool, reason, Icon }) => (
              <GlassFailCard key={tool} tool={tool} reason={reason} Icon={Icon} />
            ))}
          </div>
        </motion.div>

        {/* tech trust bar */}
        <motion.div variants={item} style={{
          fontSize: 11, color: '#666', fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: 0.3,
        }}>
          <span style={{ color: 'var(--cyan)' }}>AES-256-GCM</span> ·{' '}
          <span style={{ color: 'var(--cyan)' }}>ECDSA-signed heartbeats</span> ·{' '}
          <span style={{ color: 'var(--cyan)' }}>Shamir(2,3)</span> ·{' '}
          <span style={{ color: '#888' }}>No central server</span>
        </motion.div>
      </motion.div>

      {/* recipient explainer modal — recipients take no action, they just receive */}
      {showRecipientInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowRecipientInfo(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 440, width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '28px 26px', position: 'relative',
              boxShadow: '0 0 50px rgba(0,245,255,0.08)', backdropFilter: 'blur(12px)',
            }}
          >
            <button
              onClick={() => setShowRecipientInfo(false)}
              style={{
                position: 'absolute', top: 14, right: 16, background: 'transparent',
                border: 'none', color: '#666', fontSize: 20, cursor: 'pointer', lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>

            <div style={{
              display: 'inline-block', fontSize: 11, color: 'var(--cyan)',
              border: '1px solid rgba(0,245,255,0.25)', borderRadius: 20,
              padding: '4px 12px', marginBottom: 16, background: 'rgba(0,245,255,0.06)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              For recipients
            </div>

            <h2 style={{
              fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700,
              color: '#f0f0f0', marginBottom: 12, lineHeight: 1.2,
            }}>
              You don't need to do anything.
            </h2>

            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
              If someone named you as a recipient, the evidence arrives in your
              inbox <strong style={{ color: '#ccc' }}>automatically</strong> — but only
              if their heartbeat stops. That's the whole design: the truth reaches you
              even when they no longer can.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
              {[
                ['No account, no login', 'You are never asked to sign up or remember anything.'],
                ['Delivered by email', 'The decrypted evidence is emailed to you when the switch fires.'],
                ['Nothing to install', 'No app, no key to manage. The depositor set it all up in advance.'],
              ].map(([title, body]) => (
                <div key={title} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  background: 'rgba(255,255,255,0.02)', border: '0.5px solid var(--border)',
                  borderRadius: 8, padding: '10px 12px',
                }}>
                  <span style={{ color: 'var(--green)', fontSize: 14, marginTop: 1 }}>✓</span>
                  <div>
                    <div style={{ fontSize: 13, color: '#ddd', fontWeight: 600, marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>{body}</div>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6, marginBottom: 18 }}>
              Already received a release email? It contains the evidence as an attachment
              and a vault ID you can reference. Nothing further is required from you here.
            </p>

            <button
              onClick={() => setShowRecipientInfo(false)}
              style={{
                width: '100%', background: 'rgba(0,245,255,0.1)',
                border: '1px solid var(--cyan)', color: 'var(--cyan)',
                borderRadius: 8, padding: '11px 0', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
              }}
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

// glassmorphic card with a red-tinted hover glow for the "tools that fail" grid
function GlassFailCard({ tool, reason, Icon }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `0.5px solid ${hover ? 'rgba(255,45,85,0.35)' : 'var(--border)'}`,
        borderRadius: 12, padding: '13px 15px', textAlign: 'left',
        display: 'flex', gap: 11, alignItems: 'flex-start',
        transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        boxShadow: hover ? '0 0 22px rgba(255,45,85,0.1)' : 'none',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <Icon size={16} color="#ff6b8a" style={{ flexShrink: 0, marginTop: 2, opacity: 0.85 }} />
      <div>
        <div style={{
          color: '#e2e2e2', fontSize: 13, fontWeight: 600, marginBottom: 2,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {tool}
        </div>
        <div style={{ color: '#777', fontSize: 11.5, lineHeight: 1.4 }}>{reason}</div>
      </div>
    </div>
  );
}
