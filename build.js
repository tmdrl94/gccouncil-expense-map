// Copies the static site into dist/, injecting KAKAO_JS_KEY at build time
// so the real key never lives in the git repo.
const fs = require('fs');
const path = require('path');

const KEY = process.env.KAKAO_JS_KEY;
if (!KEY) {
  console.error('Missing KAKAO_JS_KEY environment variable.');
  process.exit(1);
}

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });

const items = ['index.html', 'style.css', 'app.js', 'data', 'tools'];
for (const item of items) {
  copyRecursive(path.join(ROOT, item), path.join(DIST, item));
}

const htmlFiles = ['index.html', 'tools/recategorize.html'];
for (const file of htmlFiles) {
  const p = path.join(DIST, file);
  const text = fs.readFileSync(p, 'utf8').replaceAll('__KAKAO_JS_KEY__', KEY);
  fs.writeFileSync(p, text, 'utf8');
}

console.log('Build complete ->', DIST);
