# SatyaRaksha — सत्यरक्षा

> *"Satyameva Jayate"* — सत्यमेव जयते — Truth Alone Triumphs  
> — Mundaka Upanishad, 3.1.6

**SatyaRaksha** (Sanskrit: सत्यरक्षा — "Protection of Truth") is a cryptographic dead man's switch built to protect whistleblowers, journalists, and activists in a world of mass surveillance.

If you are silenced — arrested, detained, or worse — your encrypted evidence releases automatically to designated recipients. No human action required. No central server to seize.

---

## The Problem We're Solving

**Theme: Mass Surveillance vs Public Safety**

In a hyperconnected digital world, governments and corporations deploy mass surveillance systems — facial recognition, predictive analytics, data collection — in the name of public safety. But what happens to the people who expose abuse of these very systems?

Real-world cases show the gap:

| Tool | Why It Fails |
|------|-------------|
| Signal | Seized with the phone |
| ProtonMail | Requires you to press send |
| Tor | Doesn't help when physically arrested |
| USB drives | Confiscated on detention |

**Every existing tool requires the person to be free to act.** SatyaRaksha is the only tool that works *after* the person is silenced.

We believe public safety and personal privacy are not opposites — they can coexist. This project empowers individuals to hold truth as a shield (raksha), even when surveillance systems are turned against them.

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

### Step-by-step:

1. **Deposit** — Encrypt your evidence file in the browser using AES-256-GCM (Web Crypto API). The plaintext never leaves your browser.
2. **Key Split** — The encryption key is split into 3 shards using Shamir's Secret Sharing (2-of-3 threshold). Each relay node gets exactly one shard.
3. **Heartbeat** — You send ECDSA-signed check-ins every N days to prove you are still free and safe.
4. **Release** — If your heartbeats stop (you've been silenced), relay nodes reach 2-of-3 consensus and automatically reconstruct the key, decrypt the evidence, and email it to your designated recipients.

**Key properties:**
- No single relay node can decrypt alone (needs 2-of-3 shards)
- No central server exists to be seized or shut down
- Heartbeats are cryptographically signed — cannot be forged
- Configurable grace period prevents false positives (e.g. just lost internet)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  BROWSER (Client)                │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Web      │  │ Shamir   │  │ ECDSA P-256   │  │
│  │ Crypto   │  │ Secret   │  │ Keypair Gen   │  │
│  │ AES-GCM  │  │ Sharing  │  │ + Heartbeat   │  │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │                │           │
│       └──────────────┼────────────────┘           │
│                      │                            │
└──────────────────────┼────────────────────────────┘
                       │ HTTPS
         ┌─────────────┼──────────────┐
         ▼             ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Relay A  │  │ Relay B  │  │ Relay C  │
   │ (Alpha)  │◄─┤ (Beta)   │◄─┤ (Gamma)  │
   │ Port 3001│  │ Port 3002│  │ Port 3003│
   │          │─►│          │─►│          │
   │ SQLite   │  │ SQLite   │  │ SQLite   │
   │ Shard A  │  │ Shard B  │  │ Shard C  │
   └──────────┘  └──────────┘  └──────────┘
         │             │              │
         └──────┬──────┘──────┬───────┘
                │ Consensus    │
                ▼ (2-of-3)    ▼
         ┌──────────────────────┐
         │  Key Reconstruction  │
         │  AES-GCM Decryption  │
         │  Email via SMTP      │
         └──────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why We Chose It |
|-------|-----------|-----------------|
| Frontend | React 18, Vite | Fast dev server, quick builds |
| Styling | Inline CSS (no framework) | Full control, no bloat |
| Animations | Framer Motion | Smooth transitions for UI states |
| Encryption | Web Crypto API (AES-256-GCM) | Browser-native, zero external crypto libs |
| Key Splitting | secrets.js-grempe (Shamir's Secret Sharing) | Proven GF(2^8) implementation |
| Digital Signatures | ECDSA P-256 (Web Crypto) | Standard curve, hardware-accelerated |
| Backend | Node.js, Express | Simple, everyone knows it |
| Database | better-sqlite3 | Embedded, no setup needed, WAL mode |
| Scheduler | node-cron | Watchdog timer for missed heartbeats |
| Email | nodemailer + Ethereal SMTP | Testing-friendly email delivery |
| State Management | Zustand | Lightweight, no boilerplate |
| Icons | Lucide React | Clean open-source icon set |

---

## Project Structure

```
satyaraksha/
├── frontend/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ECGHeartbeat.jsx        # Canvas-based heartbeat monitor
│   │   │   ├── EncryptionVisualizer.jsx # Particle animation for encryption flow
│   │   │   ├── RelayStatus.jsx         # Live relay node status cards
│   │   │   ├── CountdownTimer.jsx      # SVG countdown ring
│   │   │   ├── CinematicRelease.jsx    # Release sequence animation
│   │   │   ├── CryptoReceipt.jsx       # Post-deposit vault receipt
│   │   │   └── GhostLayer.jsx          # Background scrolling text
│   │   ├── pages/
│   │   │   ├── Landing.jsx    # Home page
│   │   │   ├── Deposit.jsx    # Evidence upload + encryption
│   │   │   └── Dashboard.jsx  # Heartbeat monitoring + release controls
│   │   ├── lib/
│   │   │   ├── crypto.js      # AES-GCM encryption, ECDSA signing
│   │   │   ├── shamir.js      # Shamir split/reconstruct wrappers
│   │   │   ├── api.js         # Axios HTTP client for relay nodes
│   │   │   └── crypto-shim.js # Browser shim for secrets.js
│   │   ├── store/
│   │   │   └── useVaultStore.js # Zustand global state
│   │   ├── App.jsx            # Router setup
│   │   ├── main.jsx           # Entry point
│   │   └── index.css          # Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── relay-node/                # Express backend (runs 3 instances)
│   ├── server.js              # API routes: deposit, heartbeat, consensus
│   ├── consensus.js           # Key reconstruction + email release
│   ├── watchdog.js            # Cron-based heartbeat monitor
│   ├── crypto.js              # Node.js Web Crypto wrappers
│   ├── shamir.js              # Shamir reconstruct wrapper
│   ├── db.js                  # SQLite schema + audit logger
│   └── package.json
│
├── SECURITY.md                # Full threat model (STRIDE analysis)
├── .env.example               # Environment variable template
├── start-all.bat              # Windows: start all services
├── start-relay-nodes.bat      # Windows: start relay nodes only
├── LICENSE                    # MIT License
└── README.md                  # This file
```

---

## Setup Instructions

### What you need
- **Node.js** 18 or higher
- **npm** (comes with Node.js)
- Windows / macOS / Linux

### Install dependencies

```bash
# 1. Clone the repo
git clone https://github.com/MANIDEEP2407-SYS/codorra.git
cd codorra

# 2. Install relay node dependencies
cd relay-node
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install
```

### Run everything (Windows — easiest)

```bash
# From project root — opens 4 terminal windows automatically
start-all.bat
```

### Run manually (any OS)

You need 4 terminal windows:

```bash
# Terminal 1 — Relay Alpha (port 3001)
cd relay-node
set NODE_ID=A && set PORT=3001 && set PEER_URLS=["http://localhost:3002","http://localhost:3003"] && node server.js

# Terminal 2 — Relay Beta (port 3002)
cd relay-node
set NODE_ID=B && set PORT=3002 && set PEER_URLS=["http://localhost:3001","http://localhost:3003"] && node server.js

# Terminal 3 — Relay Gamma (port 3003)
cd relay-node
set NODE_ID=C && set PORT=3003 && set PEER_URLS=["http://localhost:3001","http://localhost:3002"] && node server.js

# Terminal 4 — Frontend dev server
cd frontend
npm run dev
```

### Try the demo

1. Open **http://localhost:5173**
2. Click **"Deposit Evidence"** → drag a file → add recipient email → click **Encrypt & Deposit**
3. Watch the encryption visualizer animate the flow
4. Go to **Dashboard** — observe the ECG heartbeat, relay status, countdown timer
5. Click **"Simulate Going Silent"** → ECG flatlines
6. Click **"Trigger Immediate Release"** → cinematic sequence fires → email sent via Ethereal

---

## Security & Threat Model

Full threat model documented in **[SECURITY.md](./SECURITY.md)** using the STRIDE framework.

Key highlights:

| Attack | Mitigation |
|--------|-----------|
| Single relay node seizure | Shamir(2,3) — 1 shard is mathematically useless |
| Heartbeat forgery | ECDSA P-256 signed — relay verifies signature |
| False positive release | Configurable grace period (default: 2 missed) |
| Man-in-the-middle | mTLS in production (localhost in demo) |
| Browser XSS | Key material only in memory, never persisted |

---

## Inspiration — Why This Matters

The concept of **Satya** (truth) and **Raksha** (protection) comes from the ancient Indian philosophical tradition where truth is considered the highest virtue. The Mundaka Upanishad declares *"Satyameva Jayate"* — truth alone triumphs — a principle so fundamental that it became India's national motto.

In the context of modern mass surveillance, this ancient wisdom takes on new urgency. When surveillance systems meant to protect the public are turned against individuals who speak truth to power, we need technology that upholds the principle of Satya — ensuring that truth, once deposited, cannot be suppressed.

SatyaRaksha bridges ancient Indian values with modern cryptography to create a tool that protects truth-tellers even after they are silenced.

---

## Our Team

| Name | Role | Contribution |
|------|------|-------------|
| **Kankatala Ganesh Giridhar** | Ideation & Strategy | Idea, planning, brainstorming, architecture design, project direction |
| **Akula Manideep** | Development | Coding, implementation, full-stack development |
| **Metuku Rishit** | Quality Assurance | Debugging, testing, code review, validation |

---

## Built for CODORRA Hackathon 2026

**Track:** Mass Surveillance vs Public Safety

**What makes this different:**
- Not just another encrypted messaging app — this works when you *can't* act
- Real cryptographic implementation (Web Crypto API, Shamir's Secret Sharing, ECDSA)
- Distributed architecture — no single point of failure
- Inspired by real journalist safety needs (CPJ threat models)
- Rooted in Indian cultural values of truth and justice

---

## License

MIT License — see [LICENSE](./LICENSE) for details.
