import useVaultStore from '../store/useVaultStore';

// Visual threat-level bar. Fills as the heartbeat window runs down:
// green (safe) -> amber (warning) -> red (critical). Mirrors the ambient
// threat system but gives an explicit, readable percentage on the dashboard.
export default function ThreatLevelBar() {
  const secondsRemaining = useVaultStore(s => s.secondsRemaining);
  const heartbeatInterval = useVaultStore(s => s.heartbeatInterval);
  const threatLevel = useVaultStore(s => s.threatLevel);

  // Threat rises as time remaining falls, so invert the countdown ratio.
  const remainingPct = Math.max(0, Math.min(1, secondsRemaining / heartbeatInterval));
  const threatPct = Math.round((1 - remainingPct) * 100);

  const color = threatLevel === 'safe' ? '#22c55e'
    : threatLevel === 'warning' ? '#f59e0b'
    : '#ff2d55';
  const label = threatLevel === 'safe' ? 'Nominal'
    : threatLevel === 'warning' ? 'Elevated'
    : 'Critical';

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 11, color: '#a3a3a3', fontFamily: "'DM Sans',sans-serif" }}>
          Threat Level
        </span>
        <span style={{
          fontSize: 11, color, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
        }}>
          {label} · {threatPct}%
        </span>
      </div>
      <div style={{
        height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${threatPct}%`, background: color,
          borderRadius: 999, transition: 'width 1s linear, background 0.4s ease',
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
    </div>
  );
}
