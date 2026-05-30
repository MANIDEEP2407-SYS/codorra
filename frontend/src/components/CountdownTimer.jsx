import useVaultStore from '../store/useVaultStore';

// simple countdown timer with SVG ring
export default function CountdownTimer() {
  const { secondsRemaining, heartbeatInterval, threatLevel, gracePeriod, missedHeartbeats } = useVaultStore();

  const pct = secondsRemaining / heartbeatInterval;
  const color = threatLevel === 'safe' ? '#5cb85c' : threatLevel === 'warning' ? '#e8a040' : '#e85050';
  const remaining = Math.max(0, gracePeriod - missedHeartbeats);

  const fmt = (s) => {
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${s}s`;
  };

  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width="80" height="80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#222" strokeWidth="3" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dasharray 1s linear' }}
        />
        <text x="40" y="37" textAnchor="middle" fill={color} fontSize="10" fontFamily="monospace">{fmt(secondsRemaining)}</text>
        <text x="40" y="50" textAnchor="middle" fill="#555" fontSize="7" fontFamily="monospace">left</text>
      </svg>
      <div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontFamily: 'monospace' }}>Grace</div>
        {Array.from({ length: gracePeriod }, (_, i) => (
          <span key={i} style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: i < remaining ? color : '#333', marginRight: 5,
          }} />
        ))}
        <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
          {remaining}/{gracePeriod} before release
        </div>
      </div>
    </div>
  );
}
