// All encryption done using Web Crypto API
// we dont use any external crypto library for the actual encryption
// just the browser's built-in stuff which is way more trustworthy

// encrypts a file using AES-256-GCM and returns the key, IV, and ciphertext
export async function encryptFile(file) {
  const arrayBuffer = await file.arrayBuffer();

  // generate a fresh 256-bit key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );

  // 12 byte random IV (recommended size for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, arrayBuffer
  );

  // export key as hex string so we can split it with shamir
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const keyHex = Array.from(new Uint8Array(rawKey))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const ivHex = Array.from(iv)
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // base64 encode the ciphertext for transport
  const ciphertextB64 = btoa(
    Array.from(new Uint8Array(ciphertext)).map(b => String.fromCharCode(b)).join('')
  );

  return { keyHex, ivHex, ciphertextB64 };
}

// SHA-256 hash of a file - used for integrity verification
export async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// generate an ECDSA keypair for signing heartbeats
// we use P-256 curve because its widely supported
export async function generateDepositorKeypair() {
  const keypair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  // export public key as base64 so relay nodes can verify our heartbeats
  const publicKeyRaw = await crypto.subtle.exportKey('spki', keypair.publicKey);
  const publicKeyB64 = btoa(
    Array.from(new Uint8Array(publicKeyRaw)).map(b => String.fromCharCode(b)).join('')
  );

  return { keypair, publicKeyB64 };
}

// sign a heartbeat message with our private key
// the relay nodes will verify this to make sure its really us
export async function signHeartbeat(privateKey, vaultId, timestamp) {
  const data = new TextEncoder().encode(`${vaultId}:${timestamp}`);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    data
  );
  return btoa(
    Array.from(new Uint8Array(signature)).map(b => String.fromCharCode(b)).join('')
  );
}

// verify a heartbeat signature (used client-side for testing)
export async function verifyHeartbeat(publicKeyB64, vaultId, timestamp, signatureB64) {
  const publicKeyBytes = Uint8Array.from(atob(publicKeyB64), c => c.charCodeAt(0));
  const publicKey = await crypto.subtle.importKey(
    'spki', publicKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['verify']
  );
  const data = new TextEncoder().encode(`${vaultId}:${timestamp}`);
  const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey, signature, data
  );
}

// decrypt file back from ciphertext (used during release)
export async function decryptFile(keyHex, ivHex, ciphertextB64) {
  const keyBytes = new Uint8Array(keyHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const iv = new Uint8Array(ivHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']
  );
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return plaintext;
}
