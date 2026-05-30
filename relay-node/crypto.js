// same crypto logic as frontend but using node webcrypto
// keeps things consistent across client and relay nodes
const { webcrypto } = require('crypto');
const { subtle } = webcrypto;

// verify the ECDSA signature on a heartbeat ping
// if this fails the heartbeat gets rejected (prevents spoofing)
async function verifyHeartbeat(publicKeyB64, vaultId, timestamp, signatureB64) {
  try {
    const publicKeyBytes = Buffer.from(publicKeyB64, 'base64');
    const publicKey = await subtle.importKey(
      'spki', publicKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['verify']
    );
    // payload is just "vaultId:timestamp" - simple but effective
    const data = new TextEncoder().encode(`${vaultId}:${timestamp}`);
    const signature = Buffer.from(signatureB64, 'base64');
    return await subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey, signature, data
    );
  } catch (e) {
    console.error('verifyHeartbeat error:', e.message);
    return false;
  }
}

// AES-GCM decrypt - used during vault release to recover the evidence file
async function decryptEvidence(keyHex, ivHex, ciphertextB64) {
  const keyBytes = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const key = await subtle.importKey(
    'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
  );
  const plaintext = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return Buffer.from(plaintext);
}

// quick sha256 helper for integrity checks
async function sha256hex(buffer) {
  const hashBuffer = await subtle.digest('SHA-256', buffer);
  return Buffer.from(hashBuffer).toString('hex');
}

module.exports = { verifyHeartbeat, decryptEvidence, sha256hex };
