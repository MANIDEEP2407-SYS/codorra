const secrets = require('secrets.js-grempe');

function reconstructKey(shards) {
  return secrets.combine(shards.filter(Boolean));
}

module.exports = { reconstructKey };
