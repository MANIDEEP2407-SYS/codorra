import secrets from 'secrets.js-grempe';

export function splitKey(keyHex, totalShards = 3, threshold = 2) {
  return secrets.share(keyHex, totalShards, threshold);
}

export function reconstructKey(shards) {
  return secrets.combine(shards);
}

export function shardFingerprint(shard) {
  return shard.slice(0, 8) + '...' + shard.slice(-4);
}
