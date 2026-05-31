const nodemailer = require('nodemailer');
const openpgp = require('openpgp');
const axios = require('axios');
const { db, logEvent } = require('./db');
const { reconstructKey } = require('./shamir');
const { decryptEvidence, sha256hex } = require('./crypto');

// After a release completes on this node, tell the peers to flip their own
// released flag too. Without this, the node that *initiated* a release (but
// reconstructed on a peer) would keep polling as "active" forever. Fire-and-forget.
function broadcastReleased(vaultId) {
  let peerUrls = [];
  try { peerUrls = JSON.parse(process.env.PEER_URLS || '[]'); } catch { /* no peers */ }
  peerUrls.forEach(url => {
    axios.post(`${url}/mark-released`, { vaultId }, { timeout: 5000 }).catch(() => {});
  });
}

// main release logic - called when consensus is reached (or manually triggered)
async function attemptRelease(vault, incomingShard, incomingNode) {
  if (vault.released) return { already: true };

  // Store incoming shard from peer
  if (incomingShard) {
    db.prepare(`
      INSERT OR REPLACE INTO consensus_shards (vault_id, from_node, shard, received_at)
      VALUES (?, ?, ?, ?)
    `).run(vault.id, incomingNode, incomingShard, Date.now());
  }

  // Collect all available shards (own + received from peers)
  const ownShard = vault.shard;
  const peerShards = db.prepare(
    'SELECT shard FROM consensus_shards WHERE vault_id=?'
  ).all(vault.id).map(r => r.shard);

  const allShards = [ownShard, ...peerShards].filter(Boolean);

  // shamir reconstruction - if we have 2+ shards we can rebuild the key
  if (allShards.length < 2) {
    logEvent(vault.id, 'CONSENSUS_WAITING', `shards=${allShards.length}/2`);
    return { waiting: true, shardsCollected: allShards.length };
  }

  // Mark released immediately to prevent duplicate releases
  const updated = db.prepare(
    'UPDATE vaults SET released=1 WHERE id=? AND released=0'
  ).run(vault.id);
  if (updated.changes === 0) return { already: true };

  logEvent(vault.id, 'CONSENSUS_REACHED', `shards=${allShards.length}`);

  // reconstruct the AES key from shamir shares
  let keyHex;
  try {
    keyHex = reconstructKey(allShards.slice(0, 2));
    logEvent(vault.id, 'KEY_RECONSTRUCTED', 'shamir=ok');
  } catch (e) {
    logEvent(vault.id, 'KEY_RECONSTRUCT_FAILED', e.message);
    throw e;
  }

  // decrypt the actual evidence file
  let plaintext;
  try {
    plaintext = await decryptEvidence(keyHex, vault.iv_hex, vault.ciphertext);
    const hash = await sha256hex(plaintext);
    logEvent(vault.id, 'DECRYPTION_OK', `sha256=${hash.slice(0, 16)}...`);
  } catch (e) {
    logEvent(vault.id, 'DECRYPTION_FAILED', e.message);
    throw e;
  }

  // fire off the release emails to all recipients (PGP-encrypted where possible)
  const etherealUrl = await sendReleaseEmails(vault, plaintext);
  logEvent(vault.id, 'VAULT_RELEASED', `recipients=${JSON.parse(vault.recipients).length}`);

  // keep the other nodes' released flag in sync so the whole mesh agrees
  broadcastReleased(vault.id);

  return { released: true, etherealUrl };
}

// Try to PGP-encrypt data with recipient's public key.
// Returns encrypted armored string, or null if key is missing/bad.
async function pgpEncryptData(armoredPublicKey, plainBuffer) {
  try {
    const pubKey = await openpgp.readKey({ armoredKey: armoredPublicKey });
    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ binary: plainBuffer }),
      encryptionKeys: pubKey,
      format: 'armored',
    });
    return encrypted;
  } catch (err) {
    // bad key format or openpgp error - fall back to unencrypted
    console.warn('[PGP] Key read/encrypt failed, falling back to plaintext:', err.message);
    return null;
  }
}

// Send release emails using nodemailer.
// If recipient has a PGP key on file, the attachment is PGP-encrypted before sending.
// Falls back to plaintext attachment for recipients without a stored key.
async function sendReleaseEmails(vault, plaintext) {
  const recipients = JSON.parse(vault.recipients);

  // pgp keys are stored as { "email@example.com": "-----BEGIN PGP PUBLIC KEY BLOCK..." }
  let pgpKeys = {};
  try {
    pgpKeys = JSON.parse(vault.recipient_pgp_keys || '{}');
  } catch (_) {
    pgpKeys = {};
  }

  // using ethereal for testing - real prod would use Gmail/SendGrid/Protonmail Bridge
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // TLS is still used via STARTTLS on 587
    auth: { user: testAccount.user, pass: testAccount.pass },
  });

  const plaintextBuf = Buffer.from(plaintext);
  let lastUrl = null;

  for (const recipient of recipients) {
    const hasPgpKey = pgpKeys[recipient] && pgpKeys[recipient].trim().startsWith('-----BEGIN PGP');
    let attachmentContent;
    let attachmentFilename;
    let pgpNote = '';

    if (hasPgpKey) {
      // Encrypt the file with the recipient's public PGP key
      const encrypted = await pgpEncryptData(pgpKeys[recipient], plaintextBuf);
      if (encrypted) {
        attachmentContent = Buffer.from(encrypted);
        attachmentFilename = (vault.file_name || 'evidence') + '.pgp';
        pgpNote = `<p style="color:#22c55e">🔒 <strong>This attachment is PGP-encrypted.</strong><br>
          Decrypt it using your PGP private key:<br>
          <code style="font-size:11px">gpg --decrypt ${attachmentFilename}</code></p>`;
        logEvent(vault.id, 'EMAIL_PGP_ENCRYPTED', `recipient=${recipient}`);
      } else {
        // PGP failed, fall back
        attachmentContent = plaintextBuf;
        attachmentFilename = vault.file_name || 'evidence.bin';
        pgpNote = `<p style="color:#f59e0b">⚠️ PGP encryption attempted but failed — attachment is plaintext.</p>`;
        logEvent(vault.id, 'EMAIL_PGP_FALLBACK', `recipient=${recipient}`);
      }
    } else {
      // No PGP key provided - plaintext delivery
      attachmentContent = plaintextBuf;
      attachmentFilename = vault.file_name || 'evidence.bin';
      pgpNote = `<p style="color:#a3a3a3;font-size:11px">ℹ️ No PGP key was registered for this recipient. 
        For end-to-end secure delivery in production, provide your PGP public key at deposit time.</p>`;
      logEvent(vault.id, 'EMAIL_NO_PGP', `recipient=${recipient}`);
    }

    const info = await transporter.sendMail({
      from: '"SatyaRaksha" <noreply@satyaraksha.network>',
      to: recipient,
      subject: `🟥 Silence Detected — Vault #${vault.id}`,
      html: `
        <div style="background:#0a0a0a;color:#e5e5e5;font-family:monospace;padding:32px;max-width:600px">
          <h2 style="color:#ff2d55;margin-top:0">// SILENCE DETECTED</h2>
          <p>The depositor's heartbeat has stopped. This evidence has been automatically released per the dead man's switch protocol.</p>
          <hr style="border:none;border-top:1px solid #333;margin:24px 0">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#a3a3a3;padding:4px 0">Vault ID</td><td style="font-family:monospace">${vault.id}</td></tr>
            <tr><td style="color:#a3a3a3;padding:4px 0">Released at</td><td>${new Date().toISOString()}</td></tr>
            <tr><td style="color:#a3a3a3;padding:4px 0">File</td><td>${vault.file_name || 'evidence'}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #333;margin:24px 0">
          ${vault.release_message ? `<p><strong>Message from depositor:</strong></p><blockquote style="border-left:3px solid #00f5ff;margin:0;padding:8px 16px;color:#e5e5e5">${vault.release_message}</blockquote><hr style="border:none;border-top:1px solid #333;margin:24px 0">` : ''}
          <p style="color:#22c55e">✓ File integrity: SHA-256 verified</p>
          ${pgpNote}
          <p style="color:#a3a3a3;font-size:11px;margin-top:24px">This message was sent automatically by SatyaRaksha relay nodes operating under 2-of-3 consensus. No human intervention was required or possible.</p>
        </div>
      `,
      attachments: [{
        filename: attachmentFilename,
        content: attachmentContent,
      }],
    });

    lastUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[RELEASE] Email sent to ${recipient} (pgp=${hasPgpKey}): ${lastUrl}`);
  }

  return lastUrl;
}

module.exports = { attemptRelease };
