# SatyaRaksha — सत्यरक्षा

<p align="center">
  <img src="https://img.shields.io/badge/Security-Cryptographic%20Dead%20Man's%20Switch-00f5ff?style=for-the-badge&logo=shield" alt="Security"/>
  <img src="https://img.shields.io/badge/Status-Hackathon%20Ready-22c55e?style=for-the-badge" alt="Status"/>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License"/>
</p>

<p align="center">
  <b><i>"Satyameva Jayate"</i> — सत्यमेव जयते — Truth Alone Triumphs</b><br>
  — Mundaka Upanishad, 3.1.6
</p>

---

## 🔒 Overview

**SatyaRaksha** (Sanskrit: **सत्यरक्षा** — *"Protection of Truth"*) is a decentralized, zero-knowledge cryptographic dead man's switch designed to safeguard whistleblowers, journalists, and human rights defenders in environments of mass surveillance and physical threats.

If you are silenced — whether by detention, arrest, or physical harm — SatyaRaksha automatically reconstructs and releases your encrypted evidence to designated recipients. 

* **No central server to seize.**
* **No single point of failure.**
* **Zero-knowledge architecture:** Relay nodes hold mathematically useless shards until consensus is reached.

---

## 🎯 The Problem: Mass Surveillance vs. Public Safety

In a hyperconnected world, public safety tools are frequently weaponized by state and corporate entities for mass surveillance. Those who attempt to expose these abuses face severe risks. 

Traditional communication tools fail at critical, physical moments:

| Tool | The Failure Point | SatyaRaksha Mitigation |
| :--- | :--- | :--- |
| **Signal / WhatsApp** | Relies on active device custody; compromised under physical duress or device seizure. | **Automated triggering** after a threshold of silence; requires no active device custody. |
| **ProtonMail** | Requires you to manually press "Send" or trust central scheduling servers. | **Decentralized watchdog** consensus; no single server controls or schedules the release. |
| **Physical USBs** | Easily confiscated, lost, or destroyed during arrest. | **Encrypted browser storage** split across global node clusters. |

> [!IMPORTANT]
> **Every existing tool requires the user to be free to act.** SatyaRaksha is built for the moment you *cannot* act. We believe public safety and personal privacy are not opposites — they are codependent. SatyaRaksha serves as a cryptographic shield (raksha) for those carrying the truth (satya).

---

## ⚙️ How It Works (Protocol Flow)

```
 Depositor                     Relay Nodes                    Recipients
    │                         ┌──────────┐
    │──encrypt(AES-256-GCM)──▶│ Alpha    │──shard_A ──┐
    │                         └──────────┘            │
    │──splitKey(Shamir 2/3)──▶┌──────────┐            ├─▶ Consensus ──▶ Decrypt &
    │                         │ Beta     │──shard_B ──┤   Reconstruct   Email Release
    │                         └──────────┘            │
    │──signed heartbeat ─────▶┌──────────┐            │
    │    (ECDSA P-256)        │ Gamma    │──shard_C ──┘
    │                         └──────────┘
    │                               │
    │        heartbeat stops        │
    └───────────────────────────────▶ Watchdog triggers → 2-of-3 Consensus → Release
```

### 1. Zero-Knowledge Deposit
You encrypt your evidence file directly in the browser using browser-native **AES-256-GCM** (Web Crypto API). The plaintext file never leaves your browser. 

### 2. Shamir's Secret Sharing (2-of-3 Threshold)
The random AES key is split into 3 unique shards using Shamir's Secret Sharing. Exactly one shard is sent to each of the three independent relay nodes (*Alpha*, *Beta*, and *Gamma*). A single node's shard is mathematically useless on its own.

### 3. Cryptographically Signed Heartbeats
You generate an **ECDSA P-256** keypair. You send periodic, signed "heartbeats" (check-ins) to the nodes using your private key. The relay nodes verify your signature using your public key to prove you are safe and in control.

### 4. Decentralized Watchdog Release
If your heartbeats stop for a preconfigured period (silence detected), the node watchdogs communicate. Once any **2 of the 3 nodes** agree to cooperate, they combine their shards to reconstruct the AES decryption key, decrypt the evidence, and dispatch it to your recipients.

---

## 🖥️ System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                     │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │  Web Crypto  │   │    Shamir    │   │  ECDSA P-256 │  │
│  │ AES-256-GCM  │   │Secret Sharing│   │ Key Generation│  │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
└────────────────────────────┼─────────────────────────────┘
                             │ HTTPS
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ Relay A  │  │ Relay B  │  │ Relay C  │
         │ (Alpha)  │◄─┤ (Beta)   │◄─┤ (Gamma)  │
         │ Port 3001│  │ Port 3002│  │ Port 3003│
         │          │─►│          │─►│          │
         │ SQLite   │  │ SQLite   │  │ SQLite   │
         │ Shard A  │  │ Shard B  │  │ Shard C  │
         └──────────┘  └──────────┘  └──────────┘
               │             │             │
               └──────┬──────┘──────┬──────┘
                      │ Consensus   │
                      ▼ (2-of-3)    ▼
               ┌──────────────────────────┐
               │    Key Reconstruction    │
               │    AES-GCM Decryption    │
               │    Email via SMTP        │
               └──────────────────────────┘
```

---

## 🛠️ Tech Stack & Badges

### Client (Frontend)
* ![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB) **React 18 & Vite**: Hyper-fast developer feedback and lean bundles.
* ![Framer](https://img.shields.io/badge/Framer-Motion-black?style=flat&logo=framer) **Framer Motion**: Smooth, cinematic state transitions.
* ![CSS3](https://img.shields.io/badge/Styling-Vanilla%20CSS-1572B6?style=flat&logo=css3) **Premium CSS System**: Curated dark-mode theme, customizable glassmorphism, dynamic pointer spotlight glow.
* **Web Crypto API**: Native, zero-dependency browser implementation of AES-256-GCM and ECDSA P-256.
* **Secrets.js-Grempe**: Robust Galois field $GF(2^8)$ cryptographic key sharing.
* **Zustand**: Lightweight global state management.

### Nodes (Backend)
* ![Node.JS](https://img.shields.io/badge/node.js-6DA55F?style=flat&logo=node.js&logoColor=white) **Node.js & Express**: High-concurrency event loops.
* ![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=flat&logo=sqlite&logoColor=white) **better-sqlite3**: Embedded, file-backed storage with WAL mode enabled.
* **Nodemailer**: Secure SMTP engine with support for TLS/mTLS.
* **Node-cron**: Decentralized scheduler acting as the independent heart monitor on each node.

---

## ✨ Premium UI/UX & Interactive Features

SatyaRaksha features a beautiful, cohesive **cyberpunk aesthetic** built entirely in vanilla CSS to give judges an immersive experience:

1. **Spotlight Mouse Glow**: A radial gradient light follows desktop cursors, casting a clean cyan-purple glow onto panels.
2. **Interactive ECG Heartbeat**: An HTML5 Canvas component that charts your heartbeat in real-time. If you simulate going silent, the line flatlines with a retro sound effect profile.
3. **Dynamic Threat Level System**: Real-time status tracker (Safe green → Elevated amber → Critical red) based on the countdown time left before release.
4. **Cinematic Release Animation**: A fullscreen, stylized decryption sequence triggers when consensus is met, building dramatic tension for demonstrations.
5. **Vault Receipt**: Post-deposit receipt displaying digital hashes, node connection cards, and backup details.

---

## 📂 Project Structure

```
codorra/
├── frontend/                  # React + Vite client
│   ├── src/
│   │   ├── components/        # Interactive UI assets
│   │   │   ├── ECGHeartbeat.jsx        # HTML5 Canvas heartbeat graph
│   │   │   ├── EncryptionVisualizer.jsx # Custom particle flow animation
│   │   │   ├── RelayStatus.jsx         # Live cluster node status monitors
│   │   │   ├── CountdownTimer.jsx      # SVG countdown ring
│   │   │   ├── CinematicRelease.jsx    # Cinematic consensus release screen
│   │   │   ├── CryptoReceipt.jsx       # Exportable vault receipt credentials
│   │   │   ├── ThreatLevelBar.jsx      # Dynamic threat meter (Green -> Amber -> Red)
│   │   │   ├── SpotlightGlow.jsx       # Cursor radial glow tracker
│   │   │   └── GhostLayer.jsx          # Matrix-like flowing CSS background
│   │   ├── pages/
│   │   │   ├── Landing.jsx    # Project introduction page
│   │   │   ├── Deposit.jsx    # Secure file encryption & shard upload
│   │   │   └── Dashboard.jsx  # Live heartbeat tracking & simulation deck
│   │   ├── lib/
│   │   │   ├── crypto.js      # AES & ECDSA Crypto Wrapper
│   │   │   ├── shamir.js      # Shamir Secret Sharing module
│   │   │   ├── api.js         # Unified HTTP caller to nodes
│   │   │   └── crypto-shim.js # Secrets.js compatibility shim
│   │   ├── store/
│   │   │   └── useVaultStore.js # Global Zustand store
│   │   ├── App.jsx            # Router and layout setup
│   │   └── index.css          # Cyberpunk design system variables and classes
│   └── package.json
│
├── relay-node/                # Node.js backend
│   ├── server.js              # Express REST interface and routes
│   ├── consensus.js           # Multi-node consensus, reconstruction & email release
│   ├── watchdog.js            # Independent node-cron check-in scheduler
│   ├── crypto.js              # Server cryptographical utility functions
│   ├── db.js                  # SQLite database wrapper and logger
│   └── package.json
│
├── SECURITY.md                # Comprehensive threat model (STRIDE framework)
├── DEPLOYMENT.md              # Production orchestrations (Docker / Cloud)
├── docker-compose.yml         # Dev cluster orchestrator
├── start-all.bat              # Setup environment automation script
└── start-relay-nodes.bat      # Run nodes automation script
```

---

## 🚀 Setup Instructions

### Prerequisites
* **Node.js** 18 or higher
* **npm** (bundled with Node.js)
* **OS**: Windows, macOS, or Linux

### Install Dependencies
Clone the repository and install packages:
```bash
# Clone the repository
git clone https://github.com/MANIDEEP2407-SYS/codorra.git
cd codorra

# Install server packages
cd relay-node
npm install

# Install client packages
cd ../frontend
npm install
```

---

## 🏃 Run the Application

### Option A: Windows (Automatic — Easiest)
From the project root directory, run:
```cmd
start-all.bat
```
*This launches 4 terminal windows: 3 for the local relay nodes (ports 3001, 3002, 3003) and 1 for the Vite client.*

### Option B: Linux / macOS (Manual)
Open 4 terminal windows and run the following commands:

* **Terminal 1 (Relay Alpha):**
  ```bash
  cd relay-node
  NODE_ID=A PORT=3001 PEER_URLS='["http://localhost:3002","http://localhost:3003"]' node server.js
  ```
* **Terminal 2 (Relay Beta):**
  ```bash
  cd relay-node
  NODE_ID=B PORT=3002 PEER_URLS='["http://localhost:3001","http://localhost:3003"]' node server.js
  ```
* **Terminal 3 (Relay Gamma):**
  ```bash
  cd relay-node
  NODE_ID=C PORT=3003 PEER_URLS='["http://localhost:3001","http://localhost:3002"]' node server.js
  ```
* **Terminal 4 (React Client):**
  ```bash
  cd frontend
  npm run dev
  ```

---

## 🧪 Interactive Walkthrough (Try the Demo)

1. Open **[http://localhost:5173](http://localhost:5173)** in your browser.
2. Click **"Deposit Evidence"**. Drag and drop any test file, specify your recipient email address, and click **Encrypt & Deposit**.
3. Watch the **Encryption Visualizer** animate the AES-GCM key split and sending of shards to nodes A, B, and C.
4. Review your **Vault Receipt** containing your ECDSA credentials.
5. Go to the **Dashboard** and observe:
   * The **ECG Heartbeat Canvas** active and moving.
   * The **Threat Level Bar** at nominal status.
   * **Relay Status** showing all three nodes online.
6. **Simulate Silence**: Click **"Simulate Going Silent"**. The ECG flatlines, and the Countdown timer begins ticking down.
7. **Consensus Release**: Either wait for the watchdog timer to expire or click **"Trigger Immediate Release"**.
8. Experience the **Cinematic Release Screen** as the nodes exchange shards, reconstruct the master key, decrypt the file, and send the delivery email using Ethereal SMTP. A link to the test email will appear directly on screen!

---

## 🛡️ Security & Threat Model

For a rigorous analysis, refer to **[SECURITY.md](./SECURITY.md)**, which documents risks using the Microsoft **STRIDE** methodology.

Highlights:
* **Node Seizure Resistance**: Since shards are generated locally via Shamir's Secret Sharing (2-of-3), an attacker seizing a single node obtains cryptographically useless noise.
* **Heartbeat Authentication**: Heartbeats require active cryptographic signatures using the browser-generated ECDSA private key. Attackers cannot forge or spoof heartbeats to extend a locked timer.
* **Zero-Knowledge Decryption**: Evidence files are stored encrypted on the nodes. The nodes never touch the decryption key until the user goes silent and consensus is achieved.

---

## 👥 Our Team

| Name | Role | Contribution |
| :--- | :--- | :--- |
| **Kankatala Ganesh Giridhar** | Ideation & Strategy | Architectural layout, risk assessment, project scoping |
| **Akula Manideep** | Full-Stack Developer | Cryptographic implementation, React components, Node.js clusters, UI Design |
| **Metuku Rishit** | Quality Assurance | Integration testing, security analysis, test case suite |

---

## 🏆 Built for CODORRA Hackathon 2026

* **Track**: Mass Surveillance vs. Public Safety
* **Objective**: Building decentralized cryptographic tools to preserve human agency and truth in surveillance-heavy environments.
* **License**: This project is licensed under the [MIT License](./LICENSE).
