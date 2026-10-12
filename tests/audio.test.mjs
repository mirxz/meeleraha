import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { ROOT } from './helpers.mjs';

const html = await readFile(`${ROOT}public/index.html`, 'utf8');
const clips = JSON.parse(await readFile(`${ROOT}scripts/clips.json`, 'utf8'));

function ids() {
  const out = ['x0', 'g0'];
  for (let i = 0; i < 4; i++) out.push(`p${i}`, `w${i}`, `a${i}`);
  for (let g = 25; g <= 300; g += 25) out.push(`kf${g}`, `kd${g}`);
  return out;
}

const harutaHtml = await readFile(`${ROOT}public/haruta.html`, 'utf8');
const harutaJson = (id) => JSON.parse(harutaHtml.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`))[1]);
const H_NODES = harutaJson('nodes');
const H_RUMORS = harutaJson('rumors');
function harutaIds() {
  return ['h-end', ...H_NODES.map((n) => `hn-${n.id}`), ...H_RUMORS.map((r) => `hr-${r.id}`)];
}
const allIds = () => [...ids(), ...harutaIds()];

test('iga lehel mängitav klipp on clips.json-is', () => {
  for (const id of allIds()) assert.ok(clips[id], `puudub: ${id}`);
  assert.equal(Object.keys(clips).length, allIds().length, 'clips.json sisaldab üleliigseid klippe');
});

test('lõngakera kõne tekst clips.json-is on sama, mis lehel (say väli)', () => {
  for (const n of H_NODES) assert.equal(clips[`hn-${n.id}`], n.say, `hn-${n.id}`);
  for (const r of H_RUMORS) assert.equal(clips[`hr-${r.id}`], r.say, `hr-${r.id}`);
});

test('kõnes ei ole numbreid ega sümboleid, mida TTS valesti loeb', () => {
  for (const id of harutaIds()) assert.doesNotMatch(clips[id], /[0-9€§%]|\b[IV]{1,3}\b/, id);
});

test('clips.json tekstid on samad, mis lehel (hoia sünkroonis)', () => {
  const grab = (name) => {
    const m = html.match(new RegExp(`var ${name}=\\[(.*?)\\];`, 's'));
    assert.ok(m, `${name} ei leitud`);
    return [...m[1].matchAll(/\['[^']+',(?:\d+,)?'([^']+)'\]/g)].map((x) => x[1]);
  };
  grab('ACTS').forEach((t, i) => assert.equal(clips[`a${i}`], t, `a${i}`));
  grab('WHO').forEach((t, i) => assert.equal(clips[`w${i}`], t, `w${i}`));
  grab('WHERE').forEach((t, i) => assert.equal(clips[`p${i}`], t, `p${i}`));
  assert.ok(html.includes(clips['g0']), 'g0 ei ole lehel');
  assert.ok(html.includes(clips['x0']), 'x0 ei ole lehel');
});

test('heliklipid on kaustas public/audio (nõutud, kui REQUIRE_AUDIO=1)', async (t) => {
  const missing = [];
  for (const id of allIds()) {
    let ok = false;
    for (const ext of ['mp3', 'wav']) { try { await access(`${ROOT}public/audio/${id}.${ext}`); ok = true; break; } catch { /* proovi järgmist */ } }
    if (!ok) missing.push(id);
  }
  if (missing.length && process.env.REQUIRE_AUDIO !== '1') {
    t.skip(`${missing.length} klippi puudub (käivita node scripts/make-audio.mjs)`);
    return;
  }
  assert.deepEqual(missing, []);
});
