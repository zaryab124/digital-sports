const fs = require('fs');
const path = require('path');

const action = process.argv[2];
const target = process.argv[3];
const b64Data = process.argv[4];

if (!target) {
  console.error('Target required');
  process.exit(1);
}

const fullPath = path.join(process.cwd(), target);
fs.mkdirSync(path.dirname(fullPath), { recursive: true });

if (action === 'start') {
  fs.writeFileSync(fullPath, '', 'utf8');
  console.log('[INIT]', target);
} else if (action === 'append') {
  const buf = Buffer.from(b64Data, 'base64');
  fs.appendFileSync(fullPath, buf);
  console.log('[APPEND]', target, buf.length, 'bytes');
} else if (action === 'finish') {
  console.log('[FINISHED]', target, fs.statSync(fullPath).size, 'bytes');
}
