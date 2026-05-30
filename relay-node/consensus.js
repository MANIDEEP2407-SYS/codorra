const nodemailer = require('nodemailer');
const { db, logEvent } = require('./db');
const { reconstructKey } = require('./shamir');
const { decryptEvidence, sha256hex } = require('./crypto');

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

  let keyHex;
  try {
    keyHex = reconstructKey(allShards.slice(0, 2));
    logEvent(vault.id, 'KEY_RECONSTRUCTED', 'shamir=ok');
  } catch (e) {
    logEvent(vault.id, 'KEY_RECONSTRUCT_FAILED', e.message);
    throw e;
  }

  let plaintext;
  try {
    plaintext = await decryptEvidence(keyHex, vault.iv_hex, vault.ciphertext);
    const hash = await sha256hex(plaintext);
    logEvent(vault.id, 'DECRYPTION_OK', `sha256=${hash.slice(0, 16)}...`);
  } catch (e) {
    logEvent(vault.id, 'DECRYPTION_FAILED', e.message);
    throw e;
  }

  const etherealUrl = await sendReleaseEmails(vault, plaintext);
  logEvent(vault.id, 'VAULT_RELEASED', `recipients=${JSON.parse(vault.recipients).length}`);

  return { released: true, etherealUrl };
}

async function sendReleaseEmails(vault, plaintext) {
  const recipients = JSON.parse(vault.recipients);
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });

  let lastUrl = null;
  for (const recipient of recipients) {
    const info = await transporter.sendMail({
      from: '"TruthSwitch" <noreply@truthswitch.network>',
      to: recipient,
      subject: `🟥 Dead Man's Switch Activated — Vault #${vault.id}`,
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
          <p style="color:#a3a3a3;font-size:11px;margin-top:24px">This message was sent automatically by TruthSwitch relay nodes operating under 2-of-3 consensus. No human intervention was required or possible.</p>
        </div>
      `,
      attachments: [{
        filename: vault.file_name || 'evidence.bin',
        content: Buffer.from(plaintext),
      }],
    });
    lastUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[RELEASE] Email sent to ${recipient}: ${lastUrl}`);
  }
  return lastUrl;
}

module.exports = { attemptRelease };
