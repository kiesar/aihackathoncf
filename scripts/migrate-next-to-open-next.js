#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const src = path.join(root, '.next');
const dest = path.join(root, '.open-next');
const required = ['static', 'cache', 'dev', 'build', 'server', 'standalone', 'types'];

function copyDir(s, d) {
  if (!fs.existsSync(s)) return;
  fs.cpSync(s, d, { recursive: true, force: true });
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

try {
  ensureDir(dest);

  if (fs.existsSync(src)) {
    copyDir(src, dest);
    console.log('Copied .next -> .open-next');
    console.log('Original .next left in place. Remove it manually if desired.');
  } else {
    console.log('.next not found — created .open-next');
  }

  for (const f of required) ensureDir(path.join(dest, f));
  console.log('Ensured required folders in .open-next:', required.join(', '));
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
