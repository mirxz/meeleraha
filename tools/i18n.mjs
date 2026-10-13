#!/usr/bin/env node
// Meeleraha tõlketööriist: ekspordib sõnastiku CSV-ks (tõlkijale), impordib parandused tagasi ja kontrollib kvaliteeti.
// Kasutus (repo juurest):
//   node tools/i18n.mjs export [välja.csv] [--file public/i18n.js]
//   node tools/i18n.mjs import sisse.csv [--langs de,fr] [--et] [--file public/i18n.js]
//   node tools/i18n.mjs check [--file public/i18n.js]
import { readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const FILE = flag('--file') || new URL('../public/i18n.js', import.meta.url).pathname;
const pos = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--file' && argv[i - 1] !== '--langs');

export function load(file = FILE) {
  const t = readFileSync(file, 'utf8');
  const m = t.match(/^window\.MR_I18N=([\s\S]*?);\nwindow\.MR_LANGS=([\s\S]*?);\s*$/);
  if (!m) throw new Error('i18n.js vorming ei sobi');
  return { dict: JSON.parse(m[1]), langs: JSON.parse(m[2]) };
}
export function save(state, file = FILE) {
  writeFileSync(file, 'window.MR_I18N=' + JSON.stringify(state.dict, null, 1) + ';\nwindow.MR_LANGS=' + JSON.stringify(state.langs) + ';\n');
}
const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
export function toCsv(state) {
  const codes = state.langs.map((l) => l.code);
  const rows = [['key', ...codes].map(q).join(',')];
  for (const k of Object.keys(state.dict.et)) rows.push([k, ...codes.map((c) => state.dict[c][k] ?? '')].map(q).join(','));
  return rows.join('\n') + '\n';
}
export function parseCsv(text) {
  const rows = []; let row = [], f = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else inQ = false; } else f += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}
export function check(state) {
  const problems = [], keys = Object.keys(state.dict.et), report = [];
  for (const { code } of state.langs) {
    const d = state.dict[code]; let same = 0;
    for (const k of keys) {
      if (d[k] === undefined || d[k].trim() === '') problems.push(`${code}: puudub ${k}`);
      else { if (ph(d[k]) !== ph(state.dict.et[k])) problems.push(`${code}: kohahoidjad ${k}`); if (code !== 'et' && d[k] === state.dict.et[k]) same++; }
    }
    for (const k of Object.keys(d)) if (!(k in state.dict.et)) problems.push(`${code}: üleliigne ${k}`);
    report.push({ code, keys: Object.keys(d).length, identicalToEt: same });
  }
  return { problems, report };
}
export function applyCsv(state, text, { langs = null, et = false } = {}) {
  const rows = parseCsv(text), head = rows[0], changes = [], errors = [];
  const cols = head.map((h, i) => [h, i]).filter(([h]) => h !== 'key' && state.dict[h] && (h !== 'et' || et) && (!langs || langs.includes(h)));
  for (const r of rows.slice(1)) {
    const k = r[0]; if (!(k in state.dict.et)) { if (k) errors.push(`tundmatu võti ${k}`); continue; }
    for (const [h, i] of cols) {
      const v = (r[i] ?? '').trim(); if (!v || v === state.dict[h][k]) continue;
      if (ph(v) !== ph(state.dict.et[k])) { errors.push(`${h}: kohahoidjad ${k}`); continue; }
      state.dict[h][k] = v; changes.push(`${h}.${k}`);
    }
  }
  return { changes, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = pos[0], state = load();
  if (cmd === 'export') { const out = pos[1] || 'tolked.csv'; writeFileSync(out, toCsv(state)); console.log(`Ekspordi: ${Object.keys(state.dict.et).length} võtit, ${state.langs.length} keelt -> ${out}`); }
  else if (cmd === 'import') {
    const r = applyCsv(state, readFileSync(pos[1], 'utf8'), { langs: flag('--langs') ? flag('--langs').split(',') : null, et: argv.includes('--et') });
    if (r.errors.length) { console.error('Vead:\n' + r.errors.join('\n')); process.exit(1); }
    save(state); console.log(`Muudetud: ${r.changes.length} rida`);
  } else if (cmd === 'check') {
    const r = check(state); console.table(r.report);
    if (r.problems.length) { console.error(r.problems.join('\n')); process.exit(1); } console.log('OK');
  } else { console.log('Käsud: export | import | check'); process.exit(1); }
}
