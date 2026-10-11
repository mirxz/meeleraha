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

test('iga lehel mängitav klipp on clips.json-is', () => {
  for (const id of ids()) assert.ok(clips[id], `puudub: ${id}`);
  assert.equal(Object.keys(clips).length, ids().length, 'clips.json sisaldab üleliigseid klippe');
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
  for (const id of ids()) {
    try { await access(`${ROOT}public/audio/${id}.wav`); } catch { missing.push(id); }
  }
  if (missing.length && process.env.REQUIRE_AUDIO !== '1') {
    t.skip(`${missing.length} klippi puudub (käivita node scripts/make-audio.mjs)`);
    return;
  }
  assert.deepEqual(missing, []);
});
