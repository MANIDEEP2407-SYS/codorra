# TruthSwitch — Cryptographic Dead Man's Switch

> "If they silence you, the truth still speaks."

## The Problem

In 2022, a Lebanese journalist was detained hours after documenting government corruption.
Her USB drive was seized immediately. The story died.

**Why existing tools fail at the critical moment:**

| Tool | Failure Mode |
|------|-------------|
| Signal | Seized with the phone |
| ProtonMail | Requires you to press send |
| Tor | Doesn't help when physically arrested |
| USB drives | Confiscated on detention |

TruthSwitch is the only tool that works when the depositor is silenced.

---

## How It Works

```
Depositor                    Relay Nodes                   Recipients
   │                        ┌──────────┐
   │──encrypt(AES-256-GCM)─▶│ Alpha    │──shard_A ─┐
   │                        └──────────┘            │
   │──splitKey(Shamir 2/3)─▶┌──────────┐            ├─▶ consensus ─▶ email
   │                        │ Beta     │──shard_B ─┤
   │                        └──────────┘            │
   │──signed heartbeat ────▶┌──────────┐            │
   │    (ECDSA P-256)       │ Gamma    │──shard_C ─┘
   │                        └──────────┘
   │                              │
   │         heartbeat stops      │
   └──────────────────────────────▶ watchdog triggers → 2-of-3 → release
```

1. **Deposit**: Encrypt evidence in-browser with AES-256-GCM (Web Crypto API)
2. **Split**: Shamir's Secret Sharing (2-of-3) distributes key shards to 3 relay nodes
3. **Heartbeat**: ECDSA-signed check-ins every N days prove you're still free
4. **Release**: If heartbeats stop, relay nodes reach 2-of-3 consensus and automatically release evidence

No single relay node can decrypt the evidence alone.
No central server exists to be seized.

---

## Security

→ [Full threat model in SECURITY.md](./SECURITY.md)

Key properties:
- **AES-256-GCM** encryption (browser-native Web Crypto API — zero external crypto libs)
- **Shamir's Secret Sharing** with 2-of-3 threshold (secrets.js-grempe, GF(2^8))
- **ECDSA P-256** signed heartbeats (prevents heartbeat forgery attacks)
- **Configurable grace period** (prevents false positives on connectivity loss)
- **Immutable audit log** on every relay node

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18, Vite, Tailwind (inline), Framer Motion |
| Crypto | Web Crypto API (AES-GCM, ECDSA, SHA-256) |
| Key Splitting | secrets.js-grempe (Shamir's Secret Sharing) |
| Backend | Node.js, Express, better-sqlite3, node-cron |
| Email | nodemailer + Ethereal SMTP |
| State | Zustand |

---

## Setup

### Prerequisites
- Node.js 18+
- npm

### Install

```bash
# Install relay node dependencies
cd relay-node
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Run (Windows)

```bash
# From project root — opens 4 terminal windows
start-all.bat
```

### Run (manual)

```bash
# Terminal 1 — Relay Alpha
cd relay-node
set NODE_ID=A && set PORT=3001 && set PEER_URLS=["http://localhost:3002","http://localhost:3003"] && node server.js

# Terminal 2 — Relay Beta
set NODE_ID=B && set PORT=3002 && set PEER_URLS=["http://localhost:3001","http://localhost:3003"] && node server.js

# Terminal 3 — Relay Gamma
set NODE_ID=C && set PORT=3003 && set PEER_URLS=["http://localhost:3001","http://localhost:3002"] && node server.js

# Terminal 4 — Frontend
cd frontend
npm run dev
```

### Demo flow

1. Open http://localhost:5173
2. Click "Deposit Evidence" → drag a PDF → add a recipient email → click Encrypt & Deposit
3. Watch particle visualizer: encrypt → split → route to 3 nodes
4. Dashboard: observe ECG heartbeat, relay status, countdown
5. Click **Simulate Going Silent** → ECG flatlines
6. Click **Trigger Immediate Release** → cinematic sequence fires → email sent

---

## Devpost Submission

**Inspiration**
In 2022, a Lebanese journalist was detained hours after documenting government corruption. Her USB drive was seized immediately. Her story died with her arrest. I built TruthSwitch because the world needs a tool that works even when the person holding the truth cannot.

**What it does**
TruthSwitch is a cryptographic dead man's switch for journalists, whistleblowers, and activists. You encrypt evidence in your browser, distribute encrypted key shards across 3 independent relay nodes using Shamir's Secret Sharing, and send a signed heartbeat check-in every few days. If your heartbeat stops — because you've been silenced, arrested, or worse — the relay nodes reach 2-of-3 consensus and automatically release your evidence to designated recipients. No central server. No single point of failure. No action required after setup.

**How we built it**
- Browser-native AES-256-GCM encryption (Web Crypto API — zero external crypto libraries)
- Shamir's Secret Sharing (2-of-3 threshold) via secrets.js for key distribution
- ECDSA P-256 signed heartbeats to prevent heartbeat forgery attacks
- 3 independent Express relay nodes with real HTTP consensus protocol
- Configurable grace period to prevent false positives
- Immutable audit logging on every relay node
- Full cinematic release sequence with real Ethereal email delivery on switch trigger

**Track**: Network Security / AppSec / Cryptographic Privacy Products

---

## Built for CODORRA 2026

Every line of code — frontend, backend, crypto, visualizer — written solo during the hackathon.
