// Minimal browser shim for Node's "crypto" module
// secrets.js-grempe tries to require("crypto") but in the browser
// we just need getRandomValues which is already available natively
// this shim tricks it into using the browser's built-in CSPRNG

export function getRandomValues(arr) {
  return globalThis.crypto.getRandomValues(arr);
}

export function randomBytes(size) {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export default { getRandomValues, randomBytes };
