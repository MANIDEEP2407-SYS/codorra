import secrets from 'secrets.js-grempe';

// split an AES key into multiple shards using Shamir's Secret Sharing
// default: 3 total shards, need any 2 to reconstruct (2-of-3 threshold)
export function splitKey(keyHex, totalShards = 3, threshold = 2) {
  return secrets.share(keyHex, totalShards, threshold);
}

// reconstruct the original key from 2 or more shards
export function reconstructKey(shards) {
  return secrets.combine(shards);
}

// just for display purposes - shows first and last few chars of a shard
export function shardFingerprint(shard) {
  return shard.slice(0, 8) + '...' + shard.slice(-4);
}
