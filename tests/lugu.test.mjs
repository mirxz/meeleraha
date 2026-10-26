import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { launch } from './helpers.mjs';

const PUB = new URL('../public/', import.meta.url);
const url = (f, h = '') => new URL(f, PUB).href + h;
const ILM = { cloud: 20, precip: 0 };

let browser;
test.before(async () => { browser = await launch(['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']); });
test.after(async () => { await browser.close(); });

async function ava(file, hash = '', { width = 1200, height = 760, permissions = [] } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, permissions });
  await context.route('**/ilm', (r) => r.fulfill({ json: ILM }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|file:\/\/\/ilm/.test(m.text())) errors.push(m.text()); });
  await page.goto(url(file, hash));
  await page.waitForTimeout(400);
  return { page, context, errors };
}

test('Lugu: pealkiri on sõna-sõnalt ja täistekst on ligipääsetav', async () => {
  const { page, context, errors } = await ava('index.html', '#paev-selge-t30');
  const txt = await page.locator('article.vh').innerText();
  assert.ok(txt.replace(/\s+/g, ' ').includes('Raha ei ole ainult number. Ta laulab koos tunnete, kunsti ja tarkusega. Nagu iga lapse hääl vikerkaare all kooris laulmas.'));
  assert.ok(txt.includes('Mis värvi on sinu hääl, kui räägid rahast?'));
  assert.deepEqual(errors, []);
  await context.close();
});

test('Lugu: uksed viivad olemasolevatele lehtedele ja vana sisu on kättesaadav', async () => {
  const { page, context } = await ava('index.html', '#paev-selge-t100');
  await page.waitForTimeout(600);
  const hrefs = await page.$$eval('.vastus a[href], .uks[href]', (a) => a.map((x) => x.getAttribute('href')));
  for (const h of ['laps.html', 'kast.html', 'tingi.html', 'keskus.html', 'avatud.html', 'ots.html', 'ajatelg.html', 'tunne.html', 'haruta.html']) assert.ok(hrefs.includes(h), h);
  for (const h of hrefs) if (/\.html$/.test(h)) await access(new URL(h, PUB));
  await access(new URL('tunne.html', PUB));
  const nav = await readFile(new URL('meeleraha.js', PUB), 'utf8');
  assert.match(nav, /\['home','tunne\.html','index'\]/);
  await context.close();
});

for (const [nimi, w, h] of [['töölaud', 1200, 760], ['telefon', 390, 800]]) {
  test('Lugu: ' + nimi + ' ei kerigi külgsuunas ja lõppekraanil mahub vastusekast', async () => {
    const { page, context } = await ava('index.html', '#oo-selge-t100', { width: w, height: h });
    await page.waitForTimeout(1500);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(sw <= 0, 'külgkeritav ' + sw);
    const box = await page.locator('[data-vastus] textarea, [data-vastus] [contenteditable], [data-vastus]').first().boundingBox();
    assert.ok(box && box.y + box.height <= h + 1, 'vastusekast ei mahu: ' + JSON.stringify(box));
    await context.close();
  });
}

test('Lugu: vikerkaar täitub ilma nupuvajutuseta', async () => {
  const { page, context } = await ava('index.html', '#paev-vihm');
  const f = () => page.evaluate(() => parseFloat(document.querySelector('#over path').getAttribute('stroke-dashoffset')));
  const a = await f(); await page.waitForTimeout(2500); const b = await f();
  assert.ok(b < a, 'edenemine puudub: ' + a + ' -> ' + b);
  await context.close();
});

test('Lugu: vastus saadetakse /saada otsa ja lõksuväli on tühi', async () => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 760 } });
  await context.addInitScript(() => {
    const orig = window.fetch.bind(window);
    window.__saadetud = null;
    window.fetch = (u, o) => {
      if (String(u).endsWith('/saada')) { window.__saadetud = Object.fromEntries(o.body.entries()); return Promise.resolve(new Response('{"ok":true}', { status: 200 })); }
      if (String(u).endsWith('/ilm')) return Promise.resolve(new Response(JSON.stringify({ cloud: 20, precip: 0 })));
      return orig(u, o);
    };
  });
  const page = await context.newPage();
  await page.goto(url('index.html', '#paev-selge-t100'));
  await page.waitForTimeout(1500);
  const ta = page.locator('#v-vastus');
  await ta.click();
  await page.keyboard.type('Minu hääl on sinine.');
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(600);
  const b = await page.evaluate(() => window.__saadetud);
  assert.equal(b.tekst, 'Minu hääl on sinine.');
  assert.equal(b.teema, 'vastus');
  assert.equal(b.veeb, '');
  await context.close();
});

test('Lugu: alamlehed laevad ja ei maini keelatud nimesid', async () => {
  for (const f of ['laps.html', 'keskus.html', 'avatud.html', 'index.html']) {
    const { page, context, errors } = await ava(f);
    assert.deepEqual(errors, [], f);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(sw <= 0, f + ' keritav külgsuunas');
    await context.close();
    assert.ok(!/Ernesaks/i.test(await readFile(new URL(f, PUB), 'utf8')), f);
  }
});

test('Lugu: ühtegi saladust ega aadressi ei ole lehtedel', async () => {
  for (const f of ['index.html', 'laps.html', 'keskus.html', 'avatud.html', 'vastus.js', 'taevas.js']) {
    const t = await readFile(new URL(f, PUB), 'utf8');
    assert.ok(!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(t.replace(/veeb@/g, '')), f + ' sisaldab e-posti');
  }
});

test('Lugu: tekstis on kinnitatud laused ja lõpus on kutse neljale lugejale', async () => {
  const { page, context } = await ava('index.html', '#paev-selge-t30');
  const txt = (await page.locator('article.vh').innerText()).replace(/\s+/g, ' ');
  assert.ok(txt.includes('Nad õppisid üksteise häält kuulama ja igaüks leidis oma koha.'));
  assert.ok(txt.includes('Esimesed mängud on juba olemas. Need on tasuta ja jäävad sinu seadmesse.'));
  const k = (await page.locator('#koos').innerText()).replace(/\s+/g, ' ');
  for (const t of ['Kui sul on lapsi, kes õpivad', 'Kui sa tahad aidata enne, kui kõik on paigas', 'Kui sa oled lihtsalt inimene, kes seda loeb', 'Kui sa oled laps', 'Mis värvi on sinu hääl, kui räägid rahast?', 'Seda unistame koos.']) assert.ok(k.includes(t), t);
  assert.ok(!/Ernesaks/i.test(k) && !/õpilane/i.test(k), 'keelatud sõnad');
  const hääled = await page.$$eval('.hääl h3', (h) => h.map((x) => x.textContent));
  assert.deepEqual(hääled, ['raha', 'kunst', 'tunded', 'tarkus']);
  await context.close();
});

test('Lugu: kerimine on lukus kuni loo lõpuni ja avaneb siis; /#koos hüppab kutse juurde', async () => {
  const a = await ava('index.html', '#paev-selge-t3');
  assert.equal(await a.page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
  await a.context.close();
  const b = await ava('index.html', '#paev-selge-koos');
  await b.page.waitForTimeout(1200);
  assert.notEqual(await b.page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
  const top = await b.page.evaluate(() => document.getElementById('koos').getBoundingClientRect().top);
  assert.ok(Math.abs(top) < 4, 'kutse ei ole ekraani ülaservas: ' + top);
  const sw = await b.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(sw <= 0);
  await b.context.close();
});

test('Lubaduse liugur: sammud 0, 1, 12, 123 ... 123 456 789 ja saatmine teemaga lubadus', async () => {
  const context = await browser.newContext({ viewport: { width: 1200, height: 760 } });
  await context.addInitScript(() => {
    const orig = window.fetch.bind(window);
    window.__saadetud = null;
    window.fetch = (u, o) => {
      if (String(u).endsWith('/saada')) { window.__saadetud = Object.fromEntries(o.body.entries()); return Promise.resolve(new Response('{"ok":true}', { status: 200 })); }
      if (String(u).endsWith('/ilm')) return Promise.resolve(new Response(JSON.stringify({ cloud: 20, precip: 0 })));
      return orig(u, o);
    };
  });
  const page = await context.newPage();
  await page.goto(url('index.html', '#paev-selge-koos'));
  await page.waitForTimeout(1200);
  const r = page.locator('#lub-liugur');
  assert.equal(await page.locator('[data-k="arv"]').textContent(), '0');
  const nähtud = [];
  for (let i = 0; i < 10; i++) { await r.fill(String(i)); nähtud.push((await page.locator('[data-k="arv"]').textContent()).replace(/\u00a0/g, '')); }
  assert.deepEqual(nähtud, ['0', '1', '12', '123', '1234', '12345', '123456', '1234567', '12345678', '123456789']);
  assert.equal(await r.getAttribute('aria-valuetext'), '123\u00a0456\u00a0789 eurot');
  await r.fill('3');
  await page.click('.luban');
  await page.waitForTimeout(400);
  const b = await page.evaluate(() => window.__saadetud);
  assert.equal(b.teema, 'lubadus'); assert.equal(b.tekst, 'Lubadus: 123 eurot'); assert.equal(b.veeb, '');
  assert.match(await page.locator('.liugur [data-k="olek"]').textContent(), /Raha ei liigu kuskile/);
  await context.close();
});

test('/koos: suunamisleht viitab avalehe kutsele', async () => {
  const t = await readFile(new URL('koos.html', PUB), 'utf8');
  assert.match(t, /url=\/#koos/);
  assert.match(t, /location\.replace\('\/#koos'\)/);
});

test('Lugu: prindis mahub avaleht ühele A4-le', async () => {
  const { page, context } = await ava('index.html', '#paev-selge-koos');
  await page.waitForTimeout(800);
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'A4', printBackground: false });
  const n = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  assert.equal(n, 1, 'lehti: ' + n);
  await context.close();
});
