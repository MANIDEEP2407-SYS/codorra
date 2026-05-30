import { useEffect, useRef } from 'react';

const LOGS = [
  'SHARD_A_VERIFIED @ relay-alpha ts=1748600000',
  'HEARTBEAT_OK vault=TS-8X9K2P sig=verified',
  'ECDSA_SIG_VALID depositor=0x8b7e2d',
  'AES-GCM_BLOCK_READY iv=3f9a1c8e2b7d',
  'RELAY_B_FORWARDING shard_b confirmed',
  'KEY_SPLIT_3OF3 threshold=2 shamir=ok',
  'HMAC_SHA256_OK digest=7d2e4f9a',
  'SHARD_C_STORED @ relay-gamma',
  'VAULT_SEALED ciphertext_len=4096',
  'CONSENSUS_OK 3/3 relays online',
  'GRACE_PERIOD remaining=2',
  'WATCHDOG_TICK checking 1 active vault',
  'PUBKEY_REGISTERED P-256 curve',
  'RELAY_ALPHA_PING 12ms online',
  'RELAY_BETA_PING 28ms online',
  'RELAY_GAMMA_PING 41ms online',
  'AES256_KEY_GENERATED length=256bit',
  'IV_RANDOM_GEN bytes=12 entropy=ok',
  'SHARD_B_FINGERPRINT a3f9...c2e1',
  'AUDIT_LOG_APPEND ts=1748609120',
  'RELAY_HEALTH_CHECK all=online',
  'ECDSA_KEYPAIR_P256 exportKey=spki',
];

export default function GhostLayer() {
  const ref = useRef(null);

  useEffect(() => {
    // Fill the div with repeated log lines
    if (!ref.current) return;
    const lineH = 14;
    const rows = Math.ceil(window.innerHeight / lineH) + 4;
    const cols = Math.ceil(window.innerWidth / 260) + 2;
    let html = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        html += LOGS[(r * cols + c) % LOGS.length] + '  ';
      }
      html += '\n';
    }
    ref.current.textContent = html;
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.045,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '9px',
        color: '#00f5ff',
        lineHeight: '14px',
        whiteSpace: 'pre',
        overflow: 'hidden',
        animation: 'ghostScroll 80s linear infinite',
      }}
    />
  );
}
