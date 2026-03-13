const fs = require('fs');
const path = require('path');
const { ROOT } = require('../config');

function updateManifest(data) {
  const { total } = data;
  let content = fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8');
  content = content.replace(/\d+ geverifieerde locaties/g, `${total} geverifieerde locaties`);
  fs.writeFileSync(path.join(ROOT, 'manifest.json'), content);
  console.log(`Updated manifest.json (${total} locaties)`);
}

module.exports = { updateManifest };
