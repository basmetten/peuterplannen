const fs = require('fs');
const path = require('path');
const { ROOT } = require('../config');

function update404(data) {
  const { total } = data;
  let content = fs.readFileSync(path.join(ROOT, '404.html'), 'utf8');
  content = content.replace(/\d+\+ geverifieerde uitjes/g, `${total}+ geverifieerde uitjes`);
  fs.writeFileSync(path.join(ROOT, '404.html'), content);
  console.log(`Updated 404.html (${total}+ uitjes)`);
}

module.exports = { update404 };
