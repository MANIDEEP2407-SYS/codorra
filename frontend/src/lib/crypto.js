// All Web Crypto API — zero external crypto libraries

export async function encryptFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, arrayBuffer
  );
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const keyHex = Array.from(new Uint8Array(rawKey))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const ivHex = Array.from(iv)
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const ciphertextB64 = btoa(
    Array.from(new Uint8Array(ciphertext)).map(b => String.fromCharCode(b)).join('')
  );
  return { keyHex, ivHex, ciphertextB64 };
}

export async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateDepositorKeypair() {
  const keypair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const publicKeyRaw = await crypto.subtle.exportKey('spki', keypair.publicKey);
  const publicKeyB64 = btoa(
    Array.from(new Uint8Array(publicKeyRaw)).map(b => String.fromCharCode(b)).join('')
  );
  return { keypair, publicKeyB64 };
}

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
