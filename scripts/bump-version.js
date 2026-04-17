#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
//  Terrapin release tool — bumps version.json from package.json
// ══════════════════════════════════════════════════════════════
// Usage:
//   npm run bump -- "One-line release note" ["Nota en español"]
//   npm run bump -- --silent "Pure aesthetic change"
//
// Flags:
//   --silent   Don't fire the update banner on user dashboards. Use for
//              pure website/landing-page changes that don't affect the
//              installed agent. Users pick it up passively next install.
//
// What it does:
//   1. Reads current version from package.json
//   2. Writes that version into version.json as "latest" + today's date
//   3. Updates "notes" and "notes_es" from the CLI args
//   4. Sets/unsets "silent" flag
//   5. Leaves min_supported, update_url, changelog_url, tools alone

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));
const VERSION_PATH = path.join(ROOT, 'version.json');

const args = process.argv.slice(2);
const silent = args.includes('--silent');
const noteArgs = args.filter(a => !a.startsWith('--'));
const notesEn = noteArgs[0];
const notesEs = noteArgs[1];

if (!notesEn) {
  console.error('\n  Usage: npm run bump -- "EN release note" ["ES release note"]');
  console.error('         npm run bump -- --silent "EN note" ["ES note"]');
  console.error('\n  --silent suppresses the dashboard banner for this release.\n');
  process.exit(1);
}

const current = JSON.parse(fs.readFileSync(VERSION_PATH, 'utf8'));
const today = new Date().toISOString().split('T')[0];

const next = {
  ...current,
  latest: pkg.version,
  released: today,
  notes: notesEn,
  notes_es: notesEs || current.notes_es || notesEn,
  silent: silent || undefined // undefined drops the key entirely if false
};
if (!silent) delete next.silent;

fs.writeFileSync(VERSION_PATH, JSON.stringify(next, null, 2) + '\n');

console.log('  ✓ version.json updated');
console.log('    latest:   ' + pkg.version);
console.log('    released: ' + today);
console.log('    silent:   ' + !!silent);
console.log('    notes:    ' + notesEn);
if (notesEs) console.log('    notes_es: ' + notesEs);
console.log('\n  Next: git add version.json package.json && git commit && git push');
