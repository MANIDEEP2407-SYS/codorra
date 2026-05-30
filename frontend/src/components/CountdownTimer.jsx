import useVaultStore from '../store/useVaultStore';

export default function CountdownTimer() {
  const { secondsRemaining, heartbeatInterval, threatLevel, gracePeriod, missedHeartbeats } = useVaultStore();

  const pct = secondsRemaining / heartbeatInterval;
  const color = threatLevel === 'safe' ? '#00f5ff' : threatLevel === 'warning' ? '#f59e0b' : '#ff2d55';
  const remaining = Math.max(0, gracePeriod - missedHeartbeats);

  const fmt = (s) => {
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${s}s`;
  };

  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width="100" height="100" style={{ flexShrink: 0 }}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s', filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x="50" y="45" textAnchor="middle" fill={color} fontSize="11" fontFamily="JetBrains Mono">
          {fmt(secondsRemaining)}
        </text>
        <text x="50" y="60" textAnchor="middle" fill="#555" fontSize="8" fontFamily="JetBrains Mono">
          remaining
        </text>
      </svg>
      <div>
        <div style={{ fontSize: 12, color: '#a3a3a3', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
          Grace period
        </div>
        {Array.from({ length: gracePeriod }, (_, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: 10, height: 10,
              borderRadius: '50%',
              background: i < remaining ? color : '#333',
              marginRight: 6,
              transition: 'background 0.4s',
              boxShadow: i < remaining ? `0 0 6px ${color}` : 'none',
            }}
          />
        ))}
        <div style={{ fontSize: 10, color: '#555', marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
          {remaining}/{gracePeriod} missed before release
        </div>
      </div>
    </div>
  );
}
