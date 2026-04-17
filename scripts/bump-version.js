#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
//  Terrapin release tool — bumps version.json from package.json
// ══════════════════════════════════════════════════════════════
// Usage:
//   npm run bump -- "One-line release note" ["Nota en español"]
//
// What it does:
//   1. Reads current version from package.json
//   2. Writes that version into version.json as "latest" + today's date
//   3. Updates "notes" and "notes_es" from the CLI args
//   4. Leaves min_supported, update_url, changelog_url, tools alone
//
// Bump package.json BEFORE running this (npm version patch|minor|major).
// Then commit+push — Vercel serves the new version.json at terrapin.tools/version.json.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));
const VERSION_PATH = path.join(ROOT, 'version.json');

const notesEn = process.argv[2];
const notesEs = process.argv[3];

if (!notesEn) {
  console.error('\n  Usage: npm run bump -- "EN release note" ["ES release note"]');
  console.error('  Example: npm run bump -- "HEIC support + update notifier" "Soporte HEIC + notificador"\n');
  process.exit(1);
}

const current = JSON.parse(fs.readFileSync(VERSION_PATH, 'utf8'));
const today = new Date().toISOString().split('T')[0];

const next = {
  ...current,
  latest: pkg.version,
  released: today,
  notes: notesEn,
  notes_es: notesEs || current.notes_es || notesEn
};

fs.writeFileSync(VERSION_PATH, JSON.stringify(next, null, 2) + '\n');

console.log('  ✓ version.json updated');
console.log('    latest:   ' + pkg.version);
console.log('    released: ' + today);
console.log('    notes:    ' + notesEn);
if (notesEs) console.log('    notes_es: ' + notesEs);
console.log('\n  Next: git add version.json package.json && git commit && git push');
