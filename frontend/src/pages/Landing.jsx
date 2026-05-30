import { useNavigate } from 'react-router-dom';

// icons for the "why other tools fail" cards
const FAILS = [
  { tool: 'Signal', reason: 'Gets seized with the phone' },
  { tool: 'ProtonMail', reason: 'You have to press send yourself' },
  { tool: 'Tor', reason: 'Useless when physically arrested' },
  { tool: 'USB drives', reason: 'First thing confiscated' },
];

export default function Landing() {
  const nav = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 20px', position: 'relative', zIndex: 1,
    }}>
      <div style={{ maxWidth: 620, textAlign: 'center' }}>

        {/* badge */}
        <div style={{
          display: 'inline-block', fontSize: 12, color: '#e87040',
          border: '1px solid #e8704033', borderRadius: 20,
          padding: '5px 14px', marginBottom: 28, background: '#e8704010',
        }}>
          सत्यमेव जयते — Truth alone triumphs
        </div>

        {/* main heading */}
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 700,
          lineHeight: 1.15, marginBottom: 20, color: '#eee',
          letterSpacing: '-0.5px',
        }}>
          If they silence you,<br />
          <span style={{ color: '#4a9eff' }}>the truth still speaks.</span>
        </h1>

        {/* description */}
        <p style={{
          fontSize: 15, color: '#888', lineHeight: 1.7,
          maxWidth: 500, margin: '0 auto 32px',
        }}>
          SatyaRaksha is a cryptographic dead man's switch. Your evidence is encrypted
          and split across 3 independent nodes. If your heartbeat stops, the truth
          releases automatically. No central server. No single point of failure.
        </p>

        {/* cta buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 48, flexWrap: 'wrap' }}>
          <button
            onClick={() => nav('/deposit')}
            style={{
              background: '#4a9eff', border: 'none', color: '#fff',
              borderRadius: 8, padding: '12px 28px', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >
            Deposit Evidence →
          </button>
          <button
            onClick={() => nav('/dashboard')}
            style={{
              background: 'transparent', border: '1px solid #333',
              color: '#999', borderRadius: 8, padding: '12px 28px',
              cursor: 'pointer', fontSize: 14,
            }}
          >
            I'm a Recipient
          </button>
        </div>

        {/* why tools fail */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: '#555', letterSpacing: 1.5, marginBottom: 14, textTransform: 'uppercase' }}>
            Why existing tools fail at the critical moment
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxWidth: 480, margin: '0 auto' }}>
            {FAILS.map(({ tool, reason }) => (
              <div key={tool} style={{
                background: '#151515', border: '1px solid #222',
                borderRadius: 8, padding: '10px 14px', textAlign: 'left',
              }}>
                <div style={{ color: '#ddd', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  ✕ {tool}
                </div>
                <div style={{ color: '#777', fontSize: 11 }}>
                  {reason}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* tech badges */}
        <div style={{ fontSize: 11, color: '#555' }}>
          AES-256-GCM · ECDSA-signed heartbeats · Shamir(2,3) · No central server
        </div>
      </div>
    </div>
  );
}
