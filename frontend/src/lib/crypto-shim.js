// Browser shim for Node.js crypto module
// Used by secrets.js-grempe which calls require('crypto')
const getRandomBytes = (size) => {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
};

const randomBytes = (size) => {
  const bytes = getRandomBytes(size);
  return {
    toString: (enc) => {
      if (enc === 'hex') {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      return String.fromCharCode(...bytes);
    },
  };
};

export { randomBytes, getRandomBytes };
export default { randomBytes, getRandomBytes };
