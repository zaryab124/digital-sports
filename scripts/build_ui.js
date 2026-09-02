const fs = require('fs');
const path = require('path');

function write(p, content) {
  const full = path.join(process.cwd(), p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trim() + '\n', 'utf8');
  console.log('[OK] Built:', p);
}

module.exports = { write };
