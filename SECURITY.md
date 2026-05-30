# Security Threat Model — SatyaRaksha

## Why This Exists

In 2022, a Lebanese journalist was detained hours after documenting government corruption.
Her USB drive was seized immediately. Her story died with her arrest.

SatyaRaksha exists because existing tools fail at the moment they matter most:
- Signal: seized with the phone
- ProtonMail: requires the journalist to be alive to press send
- Tor: doesn't help when you're physically arrested
- USB drives: confiscated on detention

Built using the Committee to Protect Journalists' threat model as a reference.

## System Overview

Client-side AES-256-GCM encryption + Shamir's Secret Sharing (2-of-3) across
3 independent relay nodes. ECDSA-signed heartbeats prevent forgery. No single
node knows the full key or plaintext. No central server exists to be seized.

## Assets Protected

| Asset | Location | Protection |
|-------|----------|------------|
| Plaintext evidence | Client browser only | Never leaves client unencrypted |
| AES-256 key | Never stored in full | Split via Shamir(2,3) |
| Key shards | One per relay | 1 shard = useless without 2nd |
| ECDSA private key | Client browser only | Used only to sign heartbeats |
| ECDSA public key | All relay nodes | Used to verify heartbeat authenticity |
| Heartbeat metadata | Relay nodes | Signed — cannot be forged |
| Ciphertext | All relay nodes | AES-256-GCM — cannot be decrypted without key |

## Threat Model — STRIDE

| Threat | Component | Mitigation | Residual Risk |
|--------|-----------|------------|---------------|
| Spoofing (heartbeat forgery) | Relay nodes | ECDSA P-256 signed heartbeats | Low |
| Tampering (shard modification) | Relay SQLite | HMAC on shard storage | Low |
| Repudiation | All nodes | Immutable audit log with timestamps | Low |
| Information disclosure | Relay nodes | Only ciphertext + 1 shard stored per node | Low |
| Denial of service | Watchdog | Grace period + 2-of-3 consensus | Medium |
| Elevation of privilege | Release mechanism | 2-of-3 threshold — no single node can release | Low |

## Specific Attacks & Mitigations

### 1. Single Relay Node Seizure
Attacker seizes Node Alpha. They have: SHARD_A + ciphertext.
Without SHARD_B or SHARD_C, key reconstruction is mathematically impossible (GF(2^8) field).
**Mitigation**: Shamir(2,3) threshold — 1 shard is provably useless.

### 2. Heartbeat Forgery
Attacker knows vault ID and attempts to POST fake heartbeats to keep switch from firing.
**Mitigation**: Every heartbeat signed with depositor's ECDSA P-256 private key.
Relay verifies signature against stored public key. Unsigned heartbeats rejected with 401.

### 3. Man-in-the-Middle on Relay Chain
Attacker intercepts A→B shard forwarding.
**Mitigation**: In demo, localhost. In production: mTLS between relay nodes (Fly.io / Tailscale).

### 4. Premature Release (False Positive)
Depositor loses internet connectivity, not arrested.
**Mitigation**: Configurable grace period (default: 2 missed heartbeats).
At 7-day interval + 2 grace periods = 21 days of missed heartbeats before release.

### 5. Compromised Recipient Email
Release email intercepted or recipient email compromised.
**Mitigation**: Note for production — recipient should use PGP-encrypted email (ProtonMail).
SatyaRaksha does not currently encrypt the release email in transit.

### 6. Browser Attacks (XSS)
Malicious script extracts AES key or ECDSA private key before encryption.
**Mitigation**: CSP headers on frontend. Key material exists in memory only during
the deposit flow — never persisted to localStorage or IndexedDB.

## Assumptions & Limitations (Honest)

- Demo uses localhost relay nodes. Production requires geographically distributed hosting.
- Email delivery is plaintext SMTP (Ethereal for demo). Production requires PGP.
- No rate limiting on /heartbeat in MVP (trivial to add).
- Relay nodes trust each other for consensus. Production needs mutual TLS.
- SQLite is not encrypted at rest in demo. Production uses encrypted volumes.

## Future Hardening Roadmap

- [ ] mTLS between relay nodes (Tailscale mesh / Fly.io WireGuard)
- [ ] PGP-encrypted release emails (recipient public key at deposit time)
- [ ] Zero-knowledge heartbeat proofs (prove you're alive without revealing identity)
- [ ] Intel SGX / confidential compute for relay node isolation
- [ ] Tor hidden service endpoints for relay nodes
- [ ] Decoy vaults (honeypot detection for node compromise)
