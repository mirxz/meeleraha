import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launch } from './helpers.mjs';
import { VARVID } from '../worker/koor.js';

const PUB = new URL('../public/', import.meta.url);
let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { await browser.close(); });

async function ava(kuula) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 760 } });
  await context.addInitScript((k) => {
    const orig = window.fetch.bind(window);
    window.__saadetud = null; window.__kuula = 0;
    window.fetch = (u, o) => {
      const s = String(u);
      if (s.endsWith('/saada')) { window.__saadetud = Object.fromEntries(o.body.entries()); return Promise.resolve(new Response('{"ok":true}')); }
      if (s.endsWith('/kuula')) { window.__kuula++; window.__kuulaTekst = JSON.parse(o.body).tekst; return Promise.resolve(new Response(JSON.stringify(k.body), { status: k.status })); }
      if (s.endsWith('/ilm')) return Promise.resolve(new Response('{"cloud":20,"precip":0}'));
      return orig(u, o);
    };
  }, kuula);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(new URL('index.html', PUB).href + '#paev-selge-t100');
  await page.waitForTimeout(1200);
  return { page, context, errors };
}
const kirjuta = async (page, t) => { const ta = page.locator('#v-vastus'); await ta.fill(t); await ta.press('Control+Enter'); await page.waitForTimeout(400); };

test('Koor: märkimata nõusolekuga ei küsita värvi ega saadeta koori välju', async () => {
  const { page, context, errors } = await ava({ status: 200, body: {} });
  assert.equal(await page.locator('[data-k="koorivalik"]').isChecked(), false);
  await kirjuta(page, 'Olen kartlik.');
  const b = await page.evaluate(() => ({ s: window.__saadetud, k: window.__kuula }));
  assert.equal(b.k, 0); assert.equal(b.s.tekst, 'Olen kartlik.'); assert.ok(!('koor' in b.s));
  assert.deepEqual(errors, []);
  await context.close();
});

test('Koor: nõusolek, pakkumine, "Sobib" ja alles siis läheb kiri koorivälidega', async () => {
  const { page, context, errors } = await ava({ status: 200, body: { varv: 'sinine', hex: VARVID.sinine, haal: 'raha', sona: 'kartlik', isiklik: false } });
  await page.locator('[data-k="koorivalik"]').check();
  assert.ok(await page.locator('[data-k="koorilaiend"]').isVisible());
  assert.match(await page.locator('[data-k="koorilaiend"]').innerText(), /TypeSafe/);
  await kirjuta(page, 'Olen kartlik raha pärast.');
  const kin = page.locator('[data-k="koorikinnitus"]');
  assert.match(await kin.innerText(), /Sinu hääl: sinine\. Sõna: kartlik\. Sobib\?/);
  assert.equal(await page.evaluate(() => window.__saadetud), null, 'kirja ei saadeta enne kinnitust');
  assert.equal(await page.evaluate(() => window.__kuulaTekst), 'Olen kartlik raha pärast.');
  await kin.locator('[data-k="sobib"]').click();
  await page.waitForTimeout(400);
  const s = await page.evaluate(() => window.__saadetud);
  assert.deepEqual([s.koor, s.koor_hex, s.koor_haal, s.koor_sona], ['1', VARVID.sinine, 'raha', 'kartlik']);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Koor: "Ilma koorita" kustutab pakkumise ja kiri läheb ilma koorita', async () => {
  const { page, context } = await ava({ status: 200, body: { varv: 'sinine', hex: VARVID.sinine, haal: 'raha', sona: 'kartlik', isiklik: false } });
  await page.locator('[data-k="koorivalik"]').check();
  await kirjuta(page, 'Olen kartlik.');
  await page.locator('[data-k="ilma"]').click();
  assert.equal(await page.locator('[data-k="koorivalik"]').isChecked(), false);
  await page.locator('#v-vastus').press('Control+Enter'); await page.waitForTimeout(400);
  const s = await page.evaluate(() => window.__saadetud);
  assert.ok(s && !('koor' in s));
  await context.close();
});

test('Koor: kui System One ei vasta, saab värvi, hääle ja sõna ise valida; vigane sõna lükatakse tagasi', async () => {
  const { page, context } = await ava({ status: 503, body: { viga: 'x' } });
  await page.locator('[data-k="koorivalik"]').check();
  await kirjuta(page, 'Olen kartlik.');
  const kin = page.locator('[data-k="koorikinnitus"]');
  assert.equal(await kin.locator('.ring').count(), 16);
  await kin.locator('.ring[aria-label="roheline"]').click();
  await kin.locator('[data-k="sona"]').fill('Mari Tamm');
  await kin.locator('[data-k="valmis"]').click();
  assert.match(await page.locator('div.olek').first().innerText(), /üks sõna/);
  await kin.locator('[data-k="sona"]').fill('Turvaline');
  await kin.locator('[data-k="haal"]').selectOption('tunded');
  await kin.locator('[data-k="valmis"]').click();
  assert.match(await kin.innerText(), /Sinu hääl: roheline\. Sõna: turvaline\. Sobib\?/);
  await kin.locator('[data-k="sobib"]').click(); await page.waitForTimeout(400);
  const s = await page.evaluate(() => window.__saadetud);
  assert.deepEqual([s.koor_hex, s.koor_haal, s.koor_sona], [VARVID.roheline, 'tunded', 'turvaline']);
  await context.close();
});

test('Koor: isikuandmete kahtlusel sõna jäetakse vastajale valida', async () => {
  const { page, context } = await ava({ status: 200, body: { varv: 'hall', hex: VARVID.hall, haal: 'muu', sona: 'mari', isiklik: true } });
  await page.locator('[data-k="koorivalik"]').check();
  await kirjuta(page, 'Mina olen Mari.');
  const kin = page.locator('[data-k="koorikinnitus"]');
  assert.match(await kin.innerText(), /nime ei panda/);
  assert.equal(await kin.locator('[data-k="sona"]').inputValue(), '');
  await context.close();
});

test('Koor: brauseri värvinimekiri ühtib Workeri omaga', async () => {
  const js = await readFile(new URL('vastus.js', PUB), 'utf8');
  const arr = [...js.match(/var VARVID = (\[\[.*?\]\]);/s)[1].matchAll(/\['([^']+)', '(#[0-9a-f]{6})'\]/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(Object.fromEntries(arr), VARVID);
});
