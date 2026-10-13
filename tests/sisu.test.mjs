import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { launch, ROOT } from './helpers.mjs';

const P = (f) => new URL(`../public/${f}`, import.meta.url).href;
const read = (f) => readFile(`${ROOT}public/${f}`, 'utf8');
const TAX = JSON.parse(await read('taxonomy.json'));
const CAT = JSON.parse((await read('kast.html')).match(/<script type="application\/json" id="catalog">([\s\S]*?)<\/script>/)[1]);

let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { await browser.close(); });
async function open(file, query = '') {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_FILE|fonts\.g/i.test(m.text())) errors.push(m.text()); });
  await page.goto(P(file) + query);
  await page.waitForTimeout(150);
  return { page, context, errors };
}
const lastEvent = (page) => page.evaluate(() => MR.log.slice(-1)[0]);

// ---------- Mängukast ----------
test('kast: kataloog on terviklik, kahes keeles ja live-asjade lingid on olemas', async () => {
  assert.ok(CAT.length >= 12);
  assert.equal(new Set(CAT.map((c) => c.id)).size, CAT.length);
  for (const c of CAT) {
    assert.ok(TAX.enums.filter_values.includes(c.ring) && TAX.enums.filter_values.includes(c.type) && TAX.enums.filter_values.includes(c.status), `${c.id}: väärtused`);
    for (const l of ['et', 'en']) { assert.ok(c[l].n.length > 2 && c[l].d.length > 20, `${c.id}: ${l}`); }
    if (c.status === 'live') {
      assert.ok(c.href, `${c.id}: live asjal peab olema link`);
      const [file, hash] = c.href.split('#');
      const html = await read(file);
      if (hash) assert.ok(html.includes(`id="${hash}"`), `${c.id}: puudub ankur ${hash} failis ${file}`);
    }
  }
  assert.ok(CAT.some((c) => c.status === 'building') && CAT.some((c) => c.status === 'idea'), 'kastis on ka tulevikuasju');
});

test('kast: filtrid, otsing ja tulevikuasjade märku andmine töötavad', async () => {
  const { page, context, errors } = await open('kast.html');
  const total = await page.locator('#list article').count();
  assert.equal(total, CAT.length);
  await page.locator('[data-f="ring"][data-v="lahedased"]').click();
  const lah = CAT.filter((c) => c.ring === 'lahedased').length;
  assert.equal(await page.locator('#list article').count(), lah);
  assert.match(await page.locator('#count').innerText(), new RegExp(`${lah}`));
  assert.deepEqual((await lastEvent(page)).p, { filter: 'ring', value: 'lahedased' });
  await page.locator('[data-f="ring"][data-v="all"]').click();
  await page.locator('[data-f="status"][data-v="idea"]').click();
  assert.equal(await page.locator('#list article').count(), CAT.filter((c) => c.status === 'idea').length);
  await page.locator('[data-f="status"][data-v="all"]').click();
  await page.fill('#q', 'kalendri');
  assert.ok((await page.locator('#list article').count()) >= 1);
  await page.fill('#q', 'ei-leia-midagi-xyz');
  assert.match(await page.locator('#list').innerText(), /Selle filtriga ei leidnud midagi/);
  await page.fill('#q', '');
  const idea = CAT.find((c) => c.status === 'idea');
  const a = page.locator(`article[data-tool="${idea.id}"] a`);
  assert.match(await a.getAttribute('href'), new RegExp(`kontakt\\.html\\?reason=tool&tool=${idea.id}`));
  assert.equal(await a.getAttribute('data-mr-e'), 'Waitlist Clicked');
  const live = CAT.find((c) => c.status === 'live');
  assert.equal(await page.locator(`article[data-tool="${live.id}"] a`).getAttribute('data-mr-e'), 'Tool Opened');
  assert.deepEqual(errors, []);
  await context.close();
});

test('kast: klõps tööriistal tekitab sündmuse ainult tööriista tunnusega ja kõik on tasuta', async () => {
  const { page, context } = await open('kast.html');
  await page.evaluate(() => document.addEventListener('click', (e) => e.preventDefault()));
  await page.locator('article[data-tool="ajatelg"] a').click();
  assert.deepEqual((await lastEvent(page)).p, { tool_id: 'ajatelg' });
  assert.equal(await page.locator('article .chip.t-good', { hasText: 'Tasuta' }).count(), CAT.length);
  assert.match(await page.locator('#shop').innerText(), /pakiautomaati/);
  await context.close();
});

test('kast: inglise keeles on nimed ja kirjeldused inglise keeles ja filtrite nimed tõlgitud', async () => {
  const { page, context } = await open('kast.html', '?lang=en');
  assert.match(await page.locator('article[data-tool="ajatelg"] h2').innerText(), /Timeline swing/);
  assert.match(await page.locator('#fbox').innerText(), /Close people[\s\S]*Law and culture/);
  assert.match(await page.locator('#count').innerText(), /items/);
  await context.close();
});

// ---------- Kontakt ----------
test('kontakt: kiri avatakse ainult nõusolekuga, sisu jääb brauserisse ja sündmus kannab ainult põhjust', async () => {
  const { page, context } = await open('kontakt.html', '?reason=seller');
  assert.equal(await page.inputValue('#reason'), 'seller');
  await page.fill('#email', 'viga'); await page.fill('#msg', 'Tere, mul on oma mäng');
  await page.evaluate(() => { window.__nav = null; });
  await page.click('#send');
  assert.match(await page.locator('#msgOut').innerText(), /Palun lisa e-post ja märgi nõusolek/);
  assert.equal(await page.evaluate(() => window.__mrMailto || null), null);
  await page.fill('#email', 'mari@example.com'); await page.check('#consent');
  await page.click('#send').catch(() => {});
  const href = await page.evaluate(() => window.__mrMailto);
  assert.ok(href.startsWith('mailto:tere@meeleraha.ee?subject='), href);
  assert.ok(decodeURIComponent(href).includes('Tere, mul on oma mäng') && decodeURIComponent(href).includes('mari@example.com'));
  const ev = (await page.evaluate(() => MR.log)).filter((e) => e.n === 'Contact Started');
  assert.deepEqual(ev.map((e) => e.p), [{ reason: 'seller' }]);
  assert.ok(!JSON.stringify(ev).includes('mari@') && !JSON.stringify(ev).includes('oma mäng'));
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  await context.close();
});

test('kontakt: tööriista märku andmine täidab sõnumi tööriista tunnusega', async () => {
  const { page, context } = await open('kontakt.html', '?reason=tool&tool=vestluskaardid');
  assert.equal(await page.inputValue('#reason'), 'tool');
  assert.match(await page.inputValue('#msg'), /^\[vestluskaardid\]/);
  await context.close();
});

// ---------- Kellakeeramine ----------
const lastSunday = (y, m) => { const d = new Date(Date.UTC(y, m + 1, 0)); while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10).replace(/-/g, ''); };

test('kellakeeramine: kalendrifail sisaldab viit sündmust õigetel pühapäevadel koos küsimustega', async () => {
  const { page, context } = await open('kellakeeramine.html');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
  const ics = await readFile(await dl.path(), 'utf8');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  const starts = [...ics.matchAll(/DTSTART;VALUE=DATE:(\d{8})/g)].map((m) => m[1]);
  assert.deepEqual(starts, ['20261025', '20270328', '20271031', '20280326', '20281029']);
  for (const d of starts) { const y = +d.slice(0, 4), m = +d.slice(4, 6) - 1; assert.equal(d, lastSunday(y, m), `${d} peab olema kuu viimane pühapäev`); assert.ok([2, 9].includes(m)); }
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 5);
  assert.ok(/DTEND;VALUE=DATE:20261026/.test(ics));
  assert.ok(ics.includes('Mis oli viimase kuue kuu üks asi') && ics.includes('Mida tulevane mina ütleks'));
  assert.equal((ics.match(/\r\n/g) || []).length, ics.split('\n').length - 1, 'CRLF kõikjal');
  assert.match(await page.locator('#msg').innerText(), /alla laetud/);
  assert.deepEqual((await lastEvent(page)).n, 'Calendar Downloaded');
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await context.close();
});

test('kellakeeramine: inglise keeles on kalendri sisu inglise keeles', async () => {
  const { page, context } = await open('kellakeeramine.html', '?lang=en');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
  const ics = await readFile(await dl.path(), 'utf8');
  assert.ok(ics.includes('Clock-change check-in') && ics.includes('proud of'));
  assert.ok(!ics.includes('Mis oli viimase'));
  await context.close();
});

// ---------- Privaatsus ----------
test('privaatsus: kõik sündmused ja komponendid on tabelites, näidissündmust ei saadeta ja lüliti töötab', async () => {
  const { page, context, errors } = await open('privaatsus.html');
  assert.equal(await page.locator('#evt tr').count(), Object.keys(TAX.events).length + 1);
  assert.equal(await page.locator('#cot tr').count(), Object.keys(TAX.components).length + 1);
  const text = await page.locator('main').innerText();
  for (const t of ['Segment Spec', 'Sinu sisestatud numbrid', 'juristiga']) assert.ok(text.includes(t), t);
  await page.click('#demo');
  const e = await lastEvent(page);
  assert.equal(e.dry, true); assert.equal(e.sent, false);
  await page.click('#tg');
  assert.equal(await page.evaluate(() => MR.measure()), false);
  assert.match(await page.locator('#tgState').innerText(), /sinu valikul väljas/);
  await page.click('#tg');
  assert.equal(await page.evaluate(() => MR.measure()), true);
  assert.deepEqual(errors, []);
  await context.close();
});

test('privaatsus: tabelite kirjeldused vahetuvad keele järgi', async () => {
  const { page, context } = await open('privaatsus.html');
  assert.match(await page.locator('#evt').innerText(), /Leht avati/);
  await page.selectOption('#mr-langsel', 'en');
  assert.match(await page.locator('#evt').innerText(), /A page was opened/);
  assert.match(await page.locator('#cot').innerText(), /Main menu link/);
  await context.close();
});
