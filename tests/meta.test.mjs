import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ROOT } from './helpers.mjs';

const html = await readFile(`${ROOT}public/index.html`, 'utf8');
const meta = (key) => {
  const m = html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`));
  return m ? m[1] : null;
};

test('jagamise märgendid on olemas', () => {
  for (const k of ['description', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:image']) {
    assert.ok(meta(k), `puudub: ${k}`);
  }
  assert.equal(meta('twitter:card'), 'summary_large_image');
});

test('og:image on absoluutne HTTPS aadress ja fail on olemas ning 1200x630', async () => {
  const url = meta('og:image');
  assert.match(url, /^https:\/\/meeleraha\.ee\/og\.png$/);
  const png = await readFile(`${ROOT}public/og.png`);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 5 * 1024 * 1024, 'pilt on liiga suur');
});
