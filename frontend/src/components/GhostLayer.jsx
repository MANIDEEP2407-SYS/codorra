import { useEffect, useRef } from 'react';

// fake log lines for the scrolling background effect
const LOGS = [
  'SHARD_A_VERIFIED relay-alpha',
  'HEARTBEAT_OK vault=SR-8X9K2P',
  'ECDSA_SIG_VALID depositor=0x8b7e',
  'AES_BLOCK_READY iv=3f9a1c8e',
  'RELAY_B_FORWARD shard_b ok',
  'KEY_SPLIT_3OF3 threshold=2',
  'HMAC_OK digest=7d2e4f',
  'SHARD_C_STORED relay-gamma',
  'VAULT_SEALED len=4096',
  'CONSENSUS_OK 3/3 online',
  'WATCHDOG_TICK checking vault',
  'PUBKEY_P256 registered',
];

export default function GhostLayer() {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const lines = [];
    for (let r = 0; r < 60; r++) {
      let line = '';
      for (let c = 0; c < 5; c++) {
        line += LOGS[(r * 5 + c) % LOGS.length] + '   ';
      }
      lines.push(line);
    }
    ref.current.textContent = lines.join('\n');
  }, []);

  return (
    <div ref={ref} style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      opacity: 0.045, fontFamily: "'JetBrains Mono', monospace", fontSize: '9px',
      color: 'var(--cyan)', lineHeight: '14px', whiteSpace: 'pre',
      overflow: 'hidden', animation: 'ghostScroll 90s linear infinite',
    }} />
  );
}
