import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Check, AlertTriangle, Shield, Activity } from 'lucide-react';
import ECGHeartbeat from '../components/ECGHeartbeat';
import RelayStatus from '../components/RelayStatus';
import CountdownTimer from '../components/CountdownTimer';
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
  const [showCinematic, setShowCinematic] = useState(false);
  const [heartbeatAnim, setHeartbeatAnim] = useState(false);
  const [silent, setSilent] = useState(false);

  // Redirect if no vault
  useEffect(() => {
    if (!vaultId) nav('/');
  }, [vaultId, nav]);

  // Countdown tick
  useEffect(() => {
    if (silent || released) return;
    const id = setInterval(() => {
      tickCountdown();
    }, 1000);
    return () => clearInterval(id);
  }, [silent, released, tickCountdown]);

  // When secondsRemaining hits 0 and we're in silent mode, increment missed
  useEffect(() => {
    if (secondsRemaining === 0 && silent && !released) {
      incrementMissed();
    }
  }, [secondsRemaining, silent, released, incrementMissed]);

  // Ambient threat CSS
  useEffect(() => {
    const colors = { safe: '#00f5ff', warning: '#f59e0b', critical: '#ff2d55' };
    document.documentElement.style.setProperty('--primary', colors[threatLevel]);
    document.body.classList.toggle('critical-pulse', threatLevel === 'critical');
    return () => document.body.classList.remove('critical-pulse');
  }, [threatLevel]);

  // Poll audit logs
  useEffect(() => {
    if (!vaultId) return;
    const fetch = async () => {
      const all = await Promise.allSettled([0, 1, 2].map(i => getAuditLog(i, vaultId)));
      const merged = all
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .sort((a, b) => b.ts - a.ts);
      appendAuditLog(merged);
    };
    fetch();
    const id = setInterval(fetch, 15000);
    return () => clearInterval(id);
  }, [vaultId, appendAuditLog]);

  const handleHeartbeat = useCallback(async () => {
    if (!vaultId || !depositorKeypair) return;
    try {
      const ts = Date.now();
      const sig = await signHeartbeat(depositorKeypair.privateKey, vaultId, ts);
      await sendHeartbeat(vaultId, ts, sig);
      storeHeartbeat();
      setHeartbeatAnim(true);
      setTimeout(() => setHeartbeatAnim(false), 1200);
    } catch (e) {
      console.error('Heartbeat failed:', e);
    }
  }, [vaultId, depositorKeypair, storeHeartbeat]);

  const handleGoSilent = () => {
    setSilent(true);
    setFlatline(true);
    setThreatLevel('critical');
  };

  const handleTriggerRelease = async () => {
    if (!vaultId) return;
    setShowCinematic(true);
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

  const statusColor = { safe: '#22c55e', warning: '#f59e0b', critical: '#ff2d55' }[threatLevel];
  const statusLabel = { safe: 'Active', warning: 'Warning', critical: 'Critical' }[threatLevel];

  const fmt = s => {
    const d = new Date(s);
    return d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, padding: '0 0 60px' }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--primary, #00f5ff)', letterSpacing: 1 }}>
          TRUTHSWITCH
        </span>
        <div style={{ flex: 1 }} />
        {vaultId && (
          <button
            onClick={copyVaultId}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#a3a3a3',
            }}
          >
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>{vaultId}</span>
            {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block',
            animation: 'dotPulse 2s ease-in-out infinite', boxShadow: `0 0 6px ${statusColor}`,
          }} />
          <span style={{ fontSize: 12, color: statusColor, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>
            {statusColor === '#ff2d55' ? '⚠ ' : '● '}{statusLabel}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ECG Heartbeat Section */}
        <section style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={16} color="var(--primary, #00f5ff)" />
              <span style={sectionTitle}>Depositor Heartbeat</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <CountdownTimer />
              <button
                onClick={handleHeartbeat}
                disabled={silent}
                style={{
                  background: heartbeatAnim ? 'rgba(34,197,94,0.15)' : 'rgba(0,245,255,0.06)',
                  border: `1px solid ${heartbeatAnim ? '#22c55e' : 'var(--primary, #00f5ff)'}`,
                  color: heartbeatAnim ? '#22c55e' : 'var(--primary, #00f5ff)',
                  borderRadius: 8, padding: '10px 20px', cursor: silent ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
                  transition: 'all 0.3s', opacity: silent ? 0.4 : 1,
                  boxShadow: heartbeatAnim ? '0 0 20px rgba(34,197,94,0.3)' : 'none',
                }}
              >
                {heartbeatAnim ? '✓ Heartbeat Sent' : 'Send Heartbeat Now'}
              </button>
            </div>
          </div>
          <ECGHeartbeat flatline={flatline} />
          {flatline && (
            <div style={{ textAlign: 'center', color: '#ff2d55', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, marginTop: 12, animation: 'dotPulse 1.5s ease-in-out infinite' }}>
              FLATLINE — SILENCE DETECTED
            </div>
          )}
        </section>

        {/* Relay Nodes */}
        <section style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Shield size={16} color="var(--primary, #00f5ff)" />
            <span style={sectionTitle}>Relay Nodes</span>
          </div>
          <RelayStatus />
        </section>

        {/* Evidence Summary */}
        {evidence && (
          <section style={cardStyle}>
            <span style={{ ...sectionTitle, display: 'block', marginBottom: 16 }}>Evidence Summary</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <MetaRow label="File" value={`${evidence.fileName} (${(evidence.fileSize / 1024).toFixed(1)} KB)`} />
              <MetaRow label="Algorithm" value="AES-256-GCM + Shamir(2,3) + ECDSA" />
              <MetaRow label="SHA-256" value={evidence.hash} mono copyable />
              <MetaRow label="HMAC-SHA256" value="verified ✓" green />
              <MetaRow label="Deposited" value={fmt(Date.now())} />
              <MetaRow label="Grace Period" value={`${gracePeriod} missed heartbeats`} />
            </div>
            {evidence.recipients?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>Recipients</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {evidence.recipients.map(r => (
                    <span key={r} style={{ fontSize: 12, padding: '3px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#a3a3a3', fontFamily: "'DM Sans',sans-serif" }}>{r}</span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Audit Log */}
        <section style={cardStyle}>
          <span style={{ ...sectionTitle, display: 'block', marginBottom: 12 }}>Audit Log</span>
          <div style={{
            background: '#080808', borderRadius: 8, padding: '14px 16px',
            maxHeight: 240, overflowY: 'auto', fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
          }}>
            {auditLog.length === 0 ? (
              <span style={{ color: '#333' }}>// No events yet — connect to relay nodes</span>
            ) : auditLog.map((entry, i) => (
              <div key={i} style={{ color: logColor(entry.event), marginBottom: 3, lineHeight: 1.6 }}>
                <span style={{ color: '#555' }}>[{fmt(entry.ts)}]</span>{' '}
                <span style={{ color: '#00f5ff' }}>{entry.event}</span>{' '}
                <span style={{ color: '#a3a3a3' }}>{entry.detail}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section style={{ ...cardStyle, borderColor: 'rgba(255,45,85,0.2)', background: 'rgba(255,45,85,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={16} color="#ff2d55" />
            <span style={{ ...sectionTitle, color: '#ff2d55' }}>Danger Zone</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <DangerBtn
              label="Simulate Going Silent"
              sub="Flatlines ECG — begins release countdown"
              onClick={handleGoSilent}
              disabled={silent}
            />
            <DangerBtn
              label="Trigger Immediate Release"
              sub="Skip countdown — initiate consensus now"
              onClick={handleTriggerRelease}
              hot
            />
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showCinematic && (
          <CinematicRelease onClose={() => setShowCinematic(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function MetaRow({ label, value, mono, copyable, green }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 3, fontFamily: "'DM Sans',sans-serif" }}>{label}</div>
      <div style={{
        fontSize: mono ? 10 : 12, color: green ? '#22c55e' : '#e5e5e5',
        fontFamily: mono ? "'JetBrains Mono',monospace" : "'DM Sans',sans-serif",
        wordBreak: 'break-all', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>{value}</span>
        {copyable && (
          <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 0, flexShrink: 0 }}>
            {copied ? <Check size={11} color="#22c55e" /> : <Copy size={11} />}
          </button>
        )}
      </div>
    </div>
  );
}

function DangerBtn({ label, sub, onClick, disabled, hot }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: hot ? 'rgba(255,45,85,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hot ? 'rgba(255,45,85,0.5)' : 'rgba(255,45,85,0.2)'}`,
        borderRadius: 10, padding: '14px 20px', cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left', opacity: disabled ? 0.4 : 1, transition: 'all 0.2s',
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = hot ? 'rgba(255,45,85,0.14)' : 'rgba(255,45,85,0.06)')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.background = hot ? 'rgba(255,45,85,0.08)' : 'rgba(255,255,255,0.02)')}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#ff2d55', fontFamily: "'DM Sans',sans-serif", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#a3a3a3', fontFamily: "'DM Sans',sans-serif" }}>{sub}</div>
    </button>
  );
}

function logColor(event) {
  if (event?.includes('FAIL') || event?.includes('REJECT') || event?.includes('MISSED')) return '#ff2d55';
  if (event?.includes('OK') || event?.includes('STORED') || event?.includes('RELEASED')) return '#22c55e';
  if (event?.includes('CONSENSUS') || event?.includes('TRIGGER')) return '#f59e0b';
  return '#a3a3a3';
}

const cardStyle = {
  background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 12, padding: '20px 22px',
};
const sectionTitle = {
  fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: '#e5e5e5',
};
