import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ECGHeartbeat from '../components/ECGHeartbeat';
import RelayStatus from '../components/RelayStatus';
import CountdownTimer from '../components/CountdownTimer';
import ThreatLevelBar from '../components/ThreatLevelBar';
import CinematicRelease from '../components/CinematicRelease';
import useVaultStore from '../store/useVaultStore';
import { signHeartbeat } from '../lib/crypto';
import { sendHeartbeat, getAuditLog, triggerConsensus } from '../lib/api';

export default function Dashboard() {
  const nav = useNavigate();
  const {
    vaultId, threatLevel, evidence, relayNodes,
    depositorKeypair, publicKeyB64, secondsRemaining,
    released, auditLog, gracePeriod, missedHeartbeats,
    sendHeartbeat: storeHeartbeat, triggerRelease: storeRelease,
    tickCountdown, appendAuditLog, incrementMissed, setThreatLevel,
  } = useVaultStore();

  const [copied, setCopied] = useState(false);
  const [flatline, setFlatline] = useState(false);
  const [showRelease, setShowRelease] = useState(false);
  const [heartbeatSent, setHeartbeatSent] = useState(false);
  const [silent, setSilent] = useState(false);

  useEffect(() => { if (!vaultId) nav('/'); }, [vaultId, nav]);

  // countdown tick
  useEffect(() => {
    if (silent || released) return;
    const id = setInterval(tickCountdown, 1000);
    return () => clearInterval(id);
  }, [silent, released, tickCountdown]);

  useEffect(() => {
    if (secondsRemaining === 0 && silent && !released) incrementMissed();
  }, [secondsRemaining, silent, released, incrementMissed]);

  // change accent based on threat level
  useEffect(() => {
    document.body.classList.toggle('critical-pulse', threatLevel === 'critical');
    return () => document.body.classList.remove('critical-pulse');
  }, [threatLevel]);

  // poll audit logs
  useEffect(() => {
    if (!vaultId) return;
    const fetch_ = async () => {
      const all = await Promise.allSettled([0, 1, 2].map(i => getAuditLog(i, vaultId)));
      const merged = all.filter(r => r.status === 'fulfilled').flatMap(r => r.value).sort((a, b) => b.ts - a.ts);
      appendAuditLog(merged);
    };
    fetch_();
    const id = setInterval(fetch_, 15000);
    return () => clearInterval(id);
  }, [vaultId, appendAuditLog]);

  const handleHeartbeat = useCallback(async () => {
    if (!vaultId || !depositorKeypair) return;
    try {
      const ts = Date.now();
      const sig = await signHeartbeat(depositorKeypair.privateKey, vaultId, ts);
      await sendHeartbeat(vaultId, ts, sig);
      storeHeartbeat();
      setHeartbeatSent(true);
      setTimeout(() => setHeartbeatSent(false), 1500);
    } catch (e) { console.error('Heartbeat failed:', e); }
  }, [vaultId, depositorKeypair, storeHeartbeat]);

  const handleGoSilent = () => {
    setSilent(true);
    setFlatline(true);
    setThreatLevel('critical');
  };

  const handleRelease = async () => {
    if (!vaultId) return;
    setShowRelease(true);
    try {
      const result = await triggerConsensus(0, vaultId);
      storeRelease(result?.etherealUrl || null);
    } catch (e) {
      console.error('Release failed:', e);
      storeRelease(null);
    }
  };

  const copyVaultId = () => {
    navigator.clipboard.writeText(vaultId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = { safe: '#5cb85c', warning: '#e8a040', critical: '#e85050' }[threatLevel];
  const statusLabel = { safe: 'Active', warning: 'Warning', critical: 'Critical' }[threatLevel];

  const fmt = s => new Date(s).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, paddingBottom: 40 }}>
      {/* top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, background: '#0d0d0dee',
        backdropFilter: 'blur(8px)', borderBottom: '1px solid #1e1e1e',
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#eee', letterSpacing: 0.5 }}>
          SatyaRaksha
        </span>
        <div style={{ flex: 1 }} />
        {vaultId && (
          <button onClick={copyVaultId} style={{
            display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a1a',
            border: '1px solid #2a2a2a', borderRadius: 6, padding: '5px 12px',
            cursor: 'pointer', color: '#888', fontSize: 12, fontFamily: 'monospace',
          }}>
            {vaultId} {copied ? '✓' : '📋'}
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* heartbeat section */}
        <section style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={sectionTitle}>Depositor Heartbeat</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <CountdownTimer />
              <button onClick={handleHeartbeat} disabled={silent} style={{
                background: heartbeatSent ? '#1a3a1a' : '#4a9eff',
                border: 'none', color: heartbeatSent ? '#5cb85c' : '#fff',
                borderRadius: 6, padding: '8px 18px', cursor: silent ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600, opacity: silent ? 0.4 : 1,
              }}>
                {heartbeatSent ? '✓ Sent' : 'Send Heartbeat'}
              </button>
            </div>
          </div>
          <ECGHeartbeat flatline={flatline} />
          {flatline && (
            <div style={{ textAlign: 'center', color: '#e85050', fontFamily: 'monospace', fontSize: 12, marginTop: 10 }}>
              FLATLINE — SILENCE DETECTED
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <ThreatLevelBar />
          </div>
        </section>

        {/* relay nodes */}
        <section style={cardStyle}>
          <h2 style={{ ...sectionTitle, marginBottom: 12 }}>Relay Nodes</h2>
          <RelayStatus />
        </section>

        {/* evidence info */}
        {evidence && (
          <section style={cardStyle}>
            <h2 style={{ ...sectionTitle, marginBottom: 12 }}>Evidence Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InfoRow label="File" value={`${evidence.fileName} (${(evidence.fileSize / 1024).toFixed(1)} KB)`} />
              <InfoRow label="Algorithm" value="AES-256-GCM + Shamir(2,3) + ECDSA" />
              <InfoRow label="SHA-256" value={evidence.hash} mono />
              <InfoRow label="Grace Period" value={`${gracePeriod} missed heartbeats`} />
            </div>
            {evidence.recipients?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Recipients</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {evidence.recipients.map(r => (
                    <span key={r} style={{ fontSize: 12, padding: '2px 10px', borderRadius: 4, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888' }}>{r}</span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* audit log */}
        <section style={cardStyle}>
          <h2 style={{ ...sectionTitle, marginBottom: 10 }}>Audit Log</h2>
          <div style={{
            background: '#0a0a0a', borderRadius: 6, padding: '12px 14px',
            maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11,
          }}>
            {auditLog.length === 0 ? (
              <span style={{ color: '#333' }}>// no events yet</span>
            ) : auditLog.map((entry, i) => (
              <div key={i} style={{ marginBottom: 2, lineHeight: 1.6 }}>
                <span style={{ color: '#555' }}>[{fmt(entry.ts)}]</span>{' '}
                <span style={{ color: logColor(entry.event) }}>{entry.event}</span>{' '}
                <span style={{ color: '#777' }}>{entry.detail}</span>
              </div>
            ))}
          </div>
        </section>

        {/* danger zone */}
        <section style={{ ...cardStyle, borderColor: '#3a2020' }}>
          <h2 style={{ ...sectionTitle, color: '#e85050', marginBottom: 12 }}>⚠ Danger Zone</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleGoSilent} disabled={silent} style={{
              background: '#1a1515', border: '1px solid #3a2020', borderRadius: 6,
              padding: '10px 18px', cursor: silent ? 'not-allowed' : 'pointer',
              opacity: silent ? 0.4 : 1, textAlign: 'left',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e85050', marginBottom: 2 }}>Simulate Going Silent</div>
              <div style={{ fontSize: 11, color: '#888' }}>Flatlines ECG, begins release countdown</div>
            </button>
            <button onClick={handleRelease} style={{
              background: '#2a1515', border: '1px solid #4a2020', borderRadius: 6,
              padding: '10px 18px', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e85050', marginBottom: 2 }}>Trigger Immediate Release</div>
              <div style={{ fontSize: 11, color: '#888' }}>Skip countdown, initiate consensus now</div>
            </button>
          </div>
        </section>
      </div>

      {showRelease && <CinematicRelease onClose={() => setShowRelease(false)} />}
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: mono ? 10 : 12, color: '#ccc', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

function logColor(event) {
  if (event?.includes('FAIL') || event?.includes('REJECT') || event?.includes('MISSED')) return '#e85050';
  if (event?.includes('OK') || event?.includes('STORED') || event?.includes('RELEASED')) return '#5cb85c';
  if (event?.includes('CONSENSUS') || event?.includes('TRIGGER')) return '#e8a040';
  return '#888';
}

const cardStyle = {
  background: '#141414', border: '1px solid #1e1e1e', borderRadius: 8, padding: '16px 18px',
};
const sectionTitle = {
  fontSize: 14, fontWeight: 600, color: '#ddd',
};
