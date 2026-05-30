# 🚀 SatyaRaksha — Production Deployment Guide

This guide details how to transition **SatyaRaksha (सत्यरक्षा)** from a local development sandbox into a production-ready, decentralized network of independent cryptographic relay nodes.

---

## 🏗️ 1. Multi-Container Orchestration (Docker Compose)

The easiest way to simulate or host a complete cluster of 3 synchronized nodes is using Docker. We have containerized the relay nodes with native compilation for `better-sqlite3`.

### Prerequisites
- Install **Docker** and **Docker Compose** on your system.

### Running the Cluster
From the root project directory, run:
```bash
docker-compose up --build -d
```

This will automatically:
1. Spin up 3 independent containers (`relay-node-a`, `relay-node-b`, `relay-node-c`).
2. Bind the nodes to host ports `3001`, `3002`, and `3003`.
3. Link them in an isolated P2P Docker network using container hostnames (e.g., `http://relay-node-a:3001`).
4. Mount persistent Docker volumes for the SQLite databases so that restarting containers does not erase vaults.

Verify they are running:
```bash
docker-compose ps
```

---

## ☁️ 2. Cloud Platforms Deployment (Fly.io, Railway, Render)

To achieve true censorship resistance, the 3 nodes should be operated by separate, trusted parties and hosted across different cloud providers.

### Option A: Railway (Fastest & Simplest)
1. Go to [Railway.app](https://railway.app) and log in.
2. Click **New Project** → **Deploy from GitHub repository**.
3. Select the `codorra` repo.
4. Set the Root Directory to `relay-node`.
5. Under **Variables**, add the following environments:
   - `PORT` = `8080` (Railway exposes this automatically)
   - `NODE_ID` = `A` (Change to `B` or `C` for other nodes)
   - `PEER_URLS` = `["https://satyaraksha-node-b.up.railway.app", "https://satyaraksha-node-c.up.railway.app"]`
6. Click **Deploy**.
7. Railway will build the container using the included `Dockerfile` and give you a public HTTPS domain. Use this URL in your peers' configurations!

### Option B: Fly.io (Geographically Distributed)
Fly.io runs applications close to users on physical servers worldwide. Perfect for decentralization.

1. Install the flyctl CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
2. Navigate to the `relay-node` directory:
   ```bash
   cd relay-node
   ```
3. Initialize the fly app:
   ```bash
   fly launch
   ```
   - Choose a unique name (e.g., `satyaraksha-node-a`).
   - Choose a physical location close to you or geographically distributed from peer nodes.
4. Scale persistent storage (SQLite requires volume persistence so database writes persist):
   ```bash
   fly volumes create satyaraksha_data --size 1
   ```
5. Configure `fly.toml` to mount the volume at `/app/data` (Update `db.js` file path in code to use environment volume if mounting elsewhere).
6. Set secrets and environment variables:
   ```bash
   fly secrets set NODE_ID=A PEER_URLS='["https://satyaraksha-node-b.fly.dev","https://satyaraksha-node-c.fly.dev"]'
   ```
7. Deploy:
   ```bash
   fly deploy
   ```

---

## 🛠️ 3. Configuring the Frontend Client

Once your 3 relay nodes are deployed in the cloud and you have their public HTTPS URLs, configure the frontend React app to point to them.

1. Open `frontend/src/store/useVaultStore.js`.
2. Locate the `relayNodes` state configuration:
   ```javascript
   relayNodes: [
     { id: 'A', name: 'Relay Node A', url: 'https://satyaraksha-node-a.fly.dev', online: true },
     { id: 'B', name: 'Relay Node B', url: 'https://satyaraksha-node-b.railway.app', online: true },
     { id: 'C', name: 'Relay Node C', url: 'https://satyaraksha-node-c.render.com', online: true }
   ]
   ```
3. Rebuild and publish the frontend to any static host (such as GitHub Pages, Vercel, Netlify, or Cloudflare Pages):
   ```bash
   cd frontend
   # compile production build
   npm run build
   ```
4. Deploy the contents of the `dist/` directory to your static host.

---

## 🔒 4. Production Security Hardening Checklist

When deploying to a public environment, ensure the following settings are adjusted:

- [ ] **Rate Limiting Tuning**: The global rate limiter is set to `100 requests per 15 minutes` in `relay-node/server.js`. If you have heavy traffic, increase this threshold or use a Redis store in production to share rate limit counts across multiple node processes.
- [ ] **HTTPS Only**: Ensure all traffic to nodes goes over `HTTPS` to protect network headers, even though the core payloads (evidence files) are already encrypted with browser-side AES-256-GCM.
- [ ] **SMTP Email Provider**: Replace the test Ethereal transporter in `relay-node/consensus.js` with a reliable, TLS-secured email provider (like SendGrid, Mailgun, AWS SES, or a local ProtonMail Bridge) to ensure emails bypass spam filters and are successfully delivered to recipients.
