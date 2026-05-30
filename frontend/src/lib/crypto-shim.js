// Minimal browser shim for Node's "crypto" — only what secrets.js-grempe needs.
// The library prefers crypto.getRandomValues (browser-native CSPRNG) when present.
export function getRandomValues(arr) {
  return globalThis.crypto.getRandomValues(arr);
}
export function randomBytes(size) {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}
export default { getRandomValues, randomBytes };
