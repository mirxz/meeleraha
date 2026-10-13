import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launch, ROOT } from './helpers.mjs';

const URL_ = new URL('../public/ajatelg.html', import.meta.url).href;
const html = await readFile(`${ROOT}public/ajatelg.html`, 'utf8');
const haruta = await readFile(`${ROOT}public/haruta.html`, 'utf8');
const NODE_IDS = new Set(JSON.parse(haruta.match(/<script type="application\/json" id="nodes">([\s\S]*?)<\/script>/)[1]).map((n) => n.id));

let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { await browser.close(); });

async function open() {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  const errors = [], requests = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_NAME_NOT_RESOLVED|fonts\.g/i.test(m.text())) errors.push(m.text()); });
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(URL_);
  await page.waitForTimeout(100);
  return { page, context, errors, requests };
}
const fill = async (page, o) => { for (const [k, v] of Object.entries(o)) await page.fill(`#${k}`, String(v)); };
const chip = (page, a) => page.locator('#ageChips button', { hasText: new RegExp(`^${a}$`) }).click();
const preset = (page, label) => page.locator('#presets button', { hasText: label }).click();
const blk = (page, label) => page.locator(`g.block[aria-label^="${label}"]`);
const attr = async (loc, a) => Number(await loc.getAttribute(a));
// 1 aasta vastab ekraanil nii mitmele pikslile (ajaline mõõtkava)
async function pxPerYear(page) {
  const box = await page.locator('#tl').boundingBox();
  const horizon = Number(await page.locator('#tl').getAttribute('data-horizon'));
  return (box.width / 380) * (348 / horizon);
}
async function drag(page, loc, dx, dy = 0, handle = false) {
  const target = handle ? loc.locator('[data-handle]') : loc.locator('rect.bar');
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  const x = handle ? box.x + box.width / 2 : box.x + 8, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}

test('algseis: ainult vanuse küsimus, ilma vigadeta ja ilma horisontaalse kerimiseta', async () => {
  const { page, context, errors } = await open();
  assert.equal(await page.locator('#stage').isVisible(), false);
  assert.equal(await page.locator('#ageChips button').count(), 5);
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await context.close();
});

test('vanus: chip avab ajatelje, horisont on vaikimisi 85 või vanus + 10', async () => {
  const { page, context } = await open();
  await chip(page, 43);
  assert.equal(await page.locator('#stage').isVisible(), true);
  assert.equal(await attr(page.locator('#tl'), 'data-age'), 43);
  assert.equal(await attr(page.locator('#tl'), 'data-horizon'), 85);
  await chip(page, 85);
  assert.equal(await attr(page.locator('#tl'), 'data-horizon'), 95);
  await context.close();
});

test('vanus: kehtetu väärtus ei muuda midagi ja horisont jääb vähemalt vanus + 5', async () => {
  const { page, context } = await open();
  await page.fill('#age', '130');
  assert.equal(await page.locator('#stage').isVisible(), false);
  await page.fill('#age', '40');
  await page.fill('#horizon', '41');
  await page.locator('#horizon').blur();
  assert.equal(await page.inputValue('#horizon'), '45');
  await context.close();
});

test('klotsid: eelseaded satuvad õigesse olekusse (elatud, käimas, ees)', async () => {
  const { page, context } = await open();
  await chip(page, 43);
  await preset(page, 'Kool ja õpingud');
  assert.equal(await blk(page, 'Kool ja õpingud').getAttribute('data-state'), 'past');
  await preset(page, 'Pension');
  assert.equal(await blk(page, 'Pension').getAttribute('data-state'), 'future');
  assert.equal(await attr(blk(page, 'Pension'), 'data-start'), 65);
  await page.fill('#custom', 'Kolisin välismaale');
  await page.click('#addCustom');
  assert.equal(await blk(page, 'Kolisin välismaale').getAttribute('data-state'), 'past');
  await page.fill('#dStart', '40'); await page.fill('#dLen', '10');
  assert.equal(await blk(page, 'Kolisin välismaale').getAttribute('data-state'), 'now');
  await context.close();
});

test('lohistamine: klots liigub ajateljel ja läheb ajapunkti ületades ees olevast käimasolevaks', async () => {
  const { page, context } = await open();
  await chip(page, 43);
  await preset(page, 'Lapselapsed');
  const b = blk(page, 'Lapselapsed');
  const s0 = await attr(b, 'data-start');
  assert.equal(await b.getAttribute('data-state'), 'future');
  const ppy = await pxPerYear(page);
  await drag(page, b, -20 * ppy);
  const s1 = await attr(b, 'data-start');
  assert.ok(Math.abs(s1 - (s0 - 20)) <= 1, `algus ${s0} -> ${s1}`);
  assert.equal(await b.getAttribute('data-state'), 'now');
  await context.close();
});

test('lohistamine: pikkus muutub paremast servast', async () => {
  const { page, context } = await open();
  await chip(page, 43);
  await preset(page, 'Kool ja õpingud');
  const b = blk(page, 'Kool ja õpingud');
  const l0 = await attr(b, 'data-len');
  const ppy = await pxPerYear(page);
  await drag(page, b, 6 * ppy, 0, true);
  assert.ok((await attr(b, 'data-len')) >= l0 + 5, 'pikkus ei kasvanud');
  assert.equal(await attr(b, 'data-start'), 7, 'algus ei tohi muutuda');
  await context.close();
});

test('detail: nimi, algus, pikkus ja suurus muudavad klotsi', async () => {
  const { page, context } = await open();
  await chip(page, 43);
  await preset(page, 'Suhe');
  assert.equal(await page.locator('#detail').isVisible(), true);
  await page.fill('#dLabel', 'Esimene suur suhe');
  await page.fill('#dStart', '20'); await page.fill('#dLen', '5');
  await page.selectOption('#dSize', '3');
  const b = blk(page, 'Esimene suur suhe');
  assert.equal(await attr(b, 'data-start'), 20);
  assert.equal(await attr(b, 'data-len'), 5);
  assert.equal(await attr(b, 'data-size'), 3);
  await context.close();
});

test('rahu: minevikuklotsil on rahu valik ja see läheb kiigelt kokkuvõttesse, tulevikuklotsil on unistus', async () => {
  const { page, context } = await open();
  await chip(page, 43);
  await preset(page, 'Kool ja õpingud');
  assert.equal(await page.locator('#dPast').isVisible(), true);
  assert.equal(await page.locator('#dFuture').isVisible(), false);
  assert.match(await page.locator('#sum').innerText(), /Rahus: 0 \/ 1/);
  await page.locator('#peaceBtns button').first().click();
  await page.fill('#dTake', 'uudishimu');
  assert.equal(await blk(page, 'Kool ja õpingud').getAttribute('data-peace'), '1');
  assert.match(await page.locator('#sum').innerText(), /Rahus: 1 \/ 1/);
  assert.match(await page.locator('#peaceOut').innerText(), /Kaasa võtan: uudishimu/);
  await page.locator('#peaceBtns button').first().click();
  assert.equal(await blk(page, 'Kool ja õpingud').getAttribute('data-peace'), '');
  await preset(page, 'Pension');
  assert.equal(await page.locator('#dFuture').isVisible(), true);
  assert.equal(await page.locator('#dPast').isVisible(), false);
  await context.close();
});

test('kiik: kaldub elatud poole, kui kõik on minevikus, ja ees oleva poole, kui kõik on ees', async () => {
  const { page, context } = await open();
  await chip(page, 43);
  assert.match(await page.locator('#sum').innerText(), /Lisa esimene klots/);
  await preset(page, 'Kool ja õpingud');
  assert.ok((await attr(page.locator('#tl'), 'data-tilt')) < 0);
  await page.click('#dDel');
  await preset(page, 'Lapselapsed');
  assert.ok((await attr(page.locator('#tl'), 'data-tilt')) > 0);
  await preset(page, 'Kool ja õpingud');
  const t = await attr(page.locator('#tl'), 'data-tilt');
  assert.ok(Math.abs(t) < 14, 'segatud klotsidega kiik ei ole äärmuses');
  await context.close();
});

test('mõõtkava: "sina keskel" paneb tänase keskele ja lohistamine töötab seal', async () => {
  const { page, context } = await open();
  await chip(page, 14);
  await preset(page, 'Lapselapsed');
  const xTime = await page.locator('g.swingg').getAttribute('transform');
  await page.click('#scaleBtn');
  assert.equal(await page.locator('#tl').getAttribute('data-scale'), 'center');
  const xCenter = await page.locator('g.swingg').getAttribute('transform');
  const num = (t) => Number(t.match(/translate\(([-\d.]+)/)[1]);
  assert.ok(Math.abs(num(xCenter) - 190) < 1, `keskel: ${xCenter}`);
  assert.ok(Math.abs(num(xTime) - 190) > 20, 'ajalises mõõtkavas ei ole 14-aastane keskel');
  const b = blk(page, 'Lapselapsed');
  const s0 = await attr(b, 'data-start');
  await drag(page, b, -40);
  const s1 = await attr(b, 'data-start');
  assert.ok(s1 < s0, `start ${s0} -> ${s1}`);
  await context.close();
});

test('klaviatuur: nooled liigutavad, pluss ja miinus muudavad pikkust, Delete eemaldab', async () => {
  const { page, context } = await open();
  await chip(page, 43);
  await preset(page, 'Kodu ost');
  const b = blk(page, 'Kodu ost');
  const s0 = await attr(b, 'data-start'), l0 = await attr(b, 'data-len');
  await b.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await attr(blk(page, 'Kodu ost'), 'data-start'), s0 + 1);
  await page.keyboard.press('Shift+ArrowLeft');
  assert.equal(await attr(blk(page, 'Kodu ost'), 'data-start'), s0 + 1 - 5);
  await page.keyboard.press('+');
  assert.equal(await attr(blk(page, 'Kodu ost'), 'data-len'), l0 + 1);
  await page.keyboard.press('Delete');
  assert.equal(await page.locator('g.block').count(), 0);
  await context.close();
});

test('fail: allalaadimine ja avamine taastab klotsid, vigane fail annab selge teate', async () => {
  const { page, context } = await open();
  await chip(page, 43);
  await preset(page, 'Kool ja õpingud');
  await page.locator('#peaceBtns button').nth(1).click();
  await preset(page, 'Pension');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exportBtn')]);
  const path = await dl.path();
  const data = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(data.versioon, 2);
  assert.equal(data.vanus, 43);
  assert.equal(data.klotsid.length, 2);
  assert.ok(data.klotsid.some((k) => k.nimi === 'Kool ja õpingud' && k.rahu));
  const other = await context.newPage();
  await other.goto(URL_);
  await other.setInputFiles('#importFile', path);
  await other.waitForTimeout(200);
  assert.equal(await other.locator('g.block').count(), 2);
  assert.equal(await other.locator('g.block[aria-label^="Kool ja õpingud"]').getAttribute('data-peace'), '1');
  assert.match(await other.locator('#fileMsg').innerText(), /Fail avatud: 2 klotsi/);
  await other.setInputFiles('#importFile', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"tere":1}') });
  await other.waitForTimeout(150);
  assert.match(await other.locator('#fileMsg').innerText(), /ei ole Ajatelgekiige fail/);
  assert.equal(await other.locator('g.block').count(), 2, 'vigane fail ei tohi olemasolevat kustutada');
  await context.close();
});

test('turvalisus: sisestatud tekst ei käivitu HTML-ina', async () => {
  const { page, context } = await open();
  await chip(page, 43);
  await page.fill('#custom', '<img src=x onerror=alert(1)>');
  await page.click('#addCustom');
  assert.equal(await page.locator('#tl img').count(), 0);
  assert.equal(await page.locator('#dTitle img').count(), 0);
  assert.ok((await page.locator('#dTitle').innerText()).includes('<img'));
  await context.close();
});

test('privaatsus: midagi ei salvestata ega saadeta kuhugi ja soovitusi ei ole', async () => {
  const { page, context, requests } = await open();
  await chip(page, 43);
  await preset(page, 'Kool ja õpingud');
  await page.locator('#peaceBtns button').first().click();
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.equal(await page.evaluate(() => document.cookie), '');
  assert.deepEqual(requests.filter((u) => u.startsWith('http') && !/fonts\.(googleapis|gstatic)\.com/.test(u)), []);
  const body = (await page.locator('main').evaluate((el) => el.textContent)).toLowerCase();
  for (const bad of ['peaksid', 'peaksite', 'soovitan', 'soovitame', 'osta ', 'müü ', 'investeeri ', 'tee nii', 'tasub ']) assert.ok(!body.includes(bad), `soovitav sõna: ${bad}`);
  await context.close();
});

test('paljastus ja lingid: peegel mitte prognoos, rahu ei ole teraapia, lingid osutavad olemasolevale', async () => {
  const t = html.toLowerCase();
  for (const w of ['peegel', 'prognoos', 'teraapia', 'sinu valik']) assert.ok(t.includes(w), `puudub: ${w}`);
  const links = [...html.matchAll(/\['[^']+','(haruta\.html#[a-z0-9-]+|ots\.html)'\]/g)].map((m) => m[1]);
  assert.ok(links.length >= 6);
  for (const l of links) if (l.startsWith('haruta.html#')) assert.ok(NODE_IDS.has(l.split('#')[1]), `puuduv sõlm: ${l}`);
  assert.ok(html.includes('href="index.html"') && html.includes('href="ots.html"') && html.includes('href="haruta.html"'));
  for (const f of ['index.html', 'ots.html', 'haruta.html']) assert.ok((await readFile(`${ROOT}public/${f}`, 'utf8')).includes('href="ajatelg.html"'), `${f} viitab Ajatelgekiigele`);
});

// ---------- Elukaar: rahavood, bilanss, edasi ja tagurpidi ----------
const MONEY = { mTulu: 3500, mBaas: 1800, mUur: 600, mRaha: 40000, mS: 1800, mPen: 800, mPA: 65 };
// sõltumatu referent (sama majandus, eraldi kirjutatud)
function ref({ age, horizon, workEnd, blocks, r, extra = 0, m = MONEY }) {
  let cash = m.mRaha, loan = 0, house = 0, pay = 0, ir = 0;
  const bl = blocks.filter((b) => b.start + b.len > age);
  const home = bl.filter((b) => b.home && b.start >= age && b.start < horizon).sort((a, b) => a.start - b.start)[0] || null;
  const rows = [];
  for (let a = age; a < horizon; a++) {
    const working = workEnd === null || a < workEnd;
    let add = 0, once = 0, mul = 1;
    for (const b of bl) { if (a >= b.start && a < b.start + b.len) { add += b.spend || 0; mul *= 1 + (b.inc || 0) / 100; } if (a === b.start) once += b.once || 0; }
    const inc = (working ? m.mTulu * mul + extra : 0) + (a >= m.mPA ? m.mPen : 0);
    if (home && a === home.start) { const L = home.home.price * (1 - home.home.down / 100), n = home.home.term * 12; cash -= home.home.price * home.home.down / 100; loan = L; house = home.home.price; ir = home.home.rate / 1200; pay = ir === 0 ? L / n : L * ir / (1 - Math.pow(1 + ir, -n)); }
    let iy = 0, py = 0;
    if (home && a >= home.start) for (let j = 0; j < 12; j++) if (loan > 0.5) { const im = loan * ir, pm = Math.min(loan, pay - im); iy += im; py += pm; loan -= pm; }
    const hous = home && a >= home.start ? home.home.price * 0.01 / 12 : m.mUur, base = working ? m.mBaas : m.mS;
    const free = inc - (base + hous + add) - iy / 12 - py / 12;
    if (cash > 0) cash *= 1 + r;
    cash += free * 12 + once;
    if (home && a >= home.start) house *= 1 + home.home.growth / 100;
    rows.push({ a, cash, iy, py });
  }
  return rows;
}
const lasts = (rows, horizon) => (rows.find((x) => x.cash < 0) || { a: horizon }).a;
function req(args, r) {
  const ok = (x) => Math.min(...ref({ ...args, r, extra: x }).map((q) => q.cash)) >= 0;
  if (ok(0)) return 0;
  let hi = 500, lo = 0; while (!ok(hi) && hi < 200000) hi *= 2;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (ok(mid)) hi = mid; else lo = mid; }
  return Math.ceil(hi);
}
const attrs = async (page) => ({ l0: await attr(page.locator('#cfRead'), 'data-last0'), l4: await attr(page.locator('#cfRead'), 'data-last4'), r0: Number(await page.locator('#cfRead').getAttribute('data-req0')), r4: Number(await page.locator('#cfRead').getAttribute('data-req4')) });

test('Elukaar: ilma numbriteta on graafikud peidus ja vihje öeldakse välja', async () => {
  const { page, context } = await open();
  await page.fill('#age', '35');
  assert.equal(await page.locator('#cfCharts').isVisible(), false);
  assert.match(await page.locator('#cfHint').innerText(), /netosissetulek ja baaskulu/);
  await fill(page, { mTulu: 3000 });
  assert.equal(await page.locator('#cfCharts').isVisible(), false, 'baaskulu puudub');
  await fill(page, { mBaas: 1500 });
  assert.equal(await page.locator('#cfCharts').isVisible(), true);
  assert.doesNotMatch(await page.locator('#elukaar').innerText(), /NaN|Infinity|undefined/);
  await context.close();
});

test('Elukaar: edasi ja tagurpidi tulemused vastavad sõltumatule referendile ilma klotsideta', async () => {
  const { page, context } = await open();
  await page.fill('#age', '35'); await page.click('#mSample');
  const args = { age: 35, horizon: 85, workEnd: 60, blocks: [] };
  const a = await attrs(page);
  assert.equal(a.l0, lasts(ref({ ...args, r: 0 }), 85));
  assert.equal(a.l4, lasts(ref({ ...args, r: 0.04 }), 85));
  assert.ok(Math.abs(a.r0 - req(args, 0)) <= 1, `r0 ${a.r0} vs ${req(args, 0)}`);
  assert.ok(Math.abs(a.r4 - req(args, 0.04)) <= 1);
  assert.ok(a.l0 <= a.l4 && a.r4 <= a.r0, 'madalam tootlus: vara lõpeb varem ja vaja on rohkem');
  await context.close();
});

test('Elukaar: kodu ost ja laps muudavad rahavoogu täpselt referendi järgi ning intress on kulu, põhiosa omakapital', async () => {
  const { page, context } = await open();
  await page.fill('#age', '35'); await page.click('#mSample');
  await preset(page, 'Kodu ost'); await page.check('#fHome');
  await page.fill('#dStart', '38'); await page.fill('#dLen', '2');
  await preset(page, 'Laps sündis'); await page.fill('#dStart', '36'); await page.fill('#dLen', '18'); await page.fill('#fSpend', '400'); await page.fill('#fOnce', '-2000');
  const blocks = [{ start: 38, len: 2, home: { price: 220000, down: 15, rate: 3, term: 25, growth: 0 } }, { start: 36, len: 18, spend: 400, once: -2000 }];
  const args = { age: 35, horizon: 85, workEnd: 60, blocks };
  const a = await attrs(page);
  assert.equal(a.l0, lasts(ref({ ...args, r: 0 }), 85));
  assert.equal(a.l4, lasts(ref({ ...args, r: 0.04 }), 85));
  assert.ok(Math.abs(a.r0 - req(args, 0)) <= 1, `r0 ${a.r0} vs ${req(args, 0)}`);
  assert.ok(Math.abs(a.r4 - req(args, 0.04)) <= 1);
  // laenu esimesel aastal on intress suurem kui põhiosa, hilisematel vastupidi (annuiteet)
  const rows = ref({ ...args, r: 0.02 });
  const first = rows.find((x) => x.iy > 0), last = rows.filter((x) => x.iy > 0).pop();
  assert.ok(first.iy > first.py && last.py > last.iy, 'annuiteedi intressi ja põhiosa kuju');
  assert.match(await page.locator('#cfRead').innerText(), /Laenu intress on kulu[\s\S]*põhiosa[\s\S]*omakapitali/i);
  assert.ok((await page.locator('#cf polygon[data-ov="surplus"]').count()) > 0 && (await page.locator('#cf polygon[data-ov="deficit"]').count()) > 0, 'rohelised ja punased alad');
  await context.close();
});

test('Elukaar: töö lõpu lipp liigub lohistades ja nooltega ning muudab tulemust', async () => {
  const { page, context } = await open();
  await page.fill('#age', '35'); await page.click('#mSample');
  assert.equal(await page.inputValue('#mWork'), '60');
  const r0 = Number(await page.locator('#cfRead').getAttribute('data-req0'));
  const flag = page.locator('g[data-f="W"]');
  await flag.scrollIntoViewIfNeeded();
  const box = await flag.locator('rect[fill="transparent"]').boundingBox();
  const ppy = await pxPerYear(page);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 8 * ppy, y, { steps: 8 }); await page.mouse.up();
  const w = Number(await page.inputValue('#mWork'));
  assert.ok(Math.abs(w - 52) <= 1, `lipp ${w}`);
  assert.equal(await attr(page.locator('g[data-f="W"]'), 'aria-valuenow'), w);
  assert.ok(Number(await page.locator('#cfRead').getAttribute('data-req0')) > r0, 'varasem töö lõpp vajab rohkem lisasäästu');
  await page.locator('g[data-f="W"]').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowRight');
  assert.equal(Number(await page.inputValue('#mWork')), w + 6);
  await page.fill('#mWork', '36');
  assert.equal(await attr(page.locator('g[data-f="W"]'), 'aria-valuenow'), 36);
  await page.fill('#mWork', '');
  assert.equal(await page.locator('g[data-f="W"]').count(), 0, 'ilma töö lõputa lippu ei ole');
  assert.match(await page.locator('#cfRead').innerText(), /lisa töö lõpp/);
  await context.close();
});

test('Elukaar: fail kannab raha, töö lõpu ja klotsi rahamõju (versioon 2) ning vana versioon 1 avaneb ikka', async () => {
  const { page, context } = await open();
  await page.fill('#age', '35'); await page.click('#mSample');
  await preset(page, 'Kodu ost'); await page.check('#fHome'); await page.fill('#dStart', '38');
  const before = await attrs(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exportBtn')]);
  const path = await dl.path();
  const data = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(data.versioon, 2); assert.equal(data.raha.tulu, 3500); assert.equal(data.toolopp, 60);
  assert.equal(data.klotsid[0].pid, 'kodu-ost'); assert.equal(data.klotsid[0].fin.home.price, 220000);
  const other = await context.newPage();
  await other.goto(URL_); await other.setInputFiles('#importFile', path); await other.waitForTimeout(200);
  assert.equal(await other.inputValue('#mTulu'), '3500'); assert.equal(await other.inputValue('#mWork'), '60');
  assert.deepEqual(await attrs(other), before);
  await other.setInputFiles('#importFile', { name: 'v1.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ versioon: 1, vanus: 40, horisont: 85, moottkava: 'time', klotsid: [{ nimi: 'Vana', algus: 10, pikkus: 3, suurus: 2 }] })) });
  await other.waitForTimeout(200);
  assert.match(await other.locator('#fileMsg').innerText(), /Fail avatud: 1 klotsi/);
  assert.equal(await other.inputValue('#mTulu'), '');
  assert.equal(await other.locator('g.block').first().getAttribute('data-peace'), '');
  await context.close();
});

test('Elukaar: sündmused kannavad ainult klotsi eelseade tunnust, mitte numbreid ega nimesid', async () => {
  const { page, context } = await open();
  await page.fill('#age', '35'); await page.click('#mSample');
  await page.fill('#custom', 'Minu salajane klots'); await page.click('#addCustom');
  const log = await page.evaluate(() => MR.log);
  assert.ok(log.some((e) => e.n === 'Money Sample Loaded'));
  assert.ok(log.some((e) => e.n === 'Block Added' && e.p.preset_id === 'oma'));
  const all = JSON.stringify(log);
  for (const s of ['salajane', '3500', '40000', '1800']) assert.ok(!all.includes(s), s);
  assert.deepEqual(await page.evaluate(() => MR.audit()), []);
  await context.close();
});

// ---------- lohistades lisamine ja suurem kiigeala ----------
async function dragChip(page, label, dxYears, { drop = true } = {}) {
  const chipLoc = page.locator('#presets button', { hasText: label });
  await chipLoc.scrollIntoViewIfNeeded();
  const cb = await chipLoc.boundingBox();
  const tb = await page.locator('#tl').boundingBox();
  const age = Number(await page.locator('#tl').getAttribute('data-age'));
  const horizon = Number(await page.locator('#tl').getAttribute('data-horizon'));
  const scale = tb.width / 380;
  const x = tb.x + (16 + (dxYears / horizon) * 348) * scale;
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await page.mouse.down();
  await page.mouse.move(cb.x + cb.width / 2 + 12, cb.y + cb.height / 2 + 12, { steps: 3 });
  await page.mouse.move(drop ? x : 5, drop ? tb.y + tb.height / 2 : 5, { steps: 10 });
  const hasGhost = await page.locator('.ghost').count();
  await page.mouse.up();
  return { hasGhost };
}

test('lohistades lisamine: palett -> ajatelg paneb klotsi lahtilaskmise kohta ja sündmus on üks', async () => {
  const { page, context } = await open();
  await page.fill('#age', '43');
  await page.locator('#tl').scrollIntoViewIfNeeded();
  const { hasGhost } = await dragChip(page, 'Lapselapsed', 62);
  assert.equal(hasGhost, 1, 'lohistamise ajal on kummitus');
  const b = blk(page, 'Lapselapsed');
  assert.equal(await b.count(), 1);
  assert.ok(Math.abs((await attr(b, 'data-start')) - 62) <= 2, `algus ${await attr(b, 'data-start')}`);
  assert.equal(await b.getAttribute('data-state'), 'future');
  assert.equal(await page.locator('.ghost').count(), 0, 'kummitus kustub');
  const ev = (await page.evaluate(() => MR.log)).filter((e) => e.n === 'Block Added');
  assert.deepEqual(ev.map((e) => e.p.preset_id), ['lapselapsed'], 'täpselt üks sündmus');
  await context.close();
});

test('lohistades lisamine: väljaspool ajatelge lahti laskmine ei lisa midagi ja koputus lisab endiselt', async () => {
  const { page, context } = await open();
  await page.fill('#age', '43');
  await dragChip(page, 'Kodu ost', 40, { drop: false });
  assert.equal(await page.locator('g.block').count(), 0);
  await preset(page, 'Kodu ost');
  assert.equal(await page.locator('g.block').count(), 1);
  assert.equal((await page.evaluate(() => MR.log)).filter((e) => e.n === 'Block Added').length, 1);
  await context.close();
});

test('suurem kiigeala: töölaual on ajateljekaart laiem kui lehe tekst ja ilma horisontaalse kerimiseta', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(URL_); await page.waitForTimeout(100);
  await page.fill('#age', '43'); await preset(page, 'Lapselapsed');
  const card = await page.locator('#tlCard').boundingBox(), main = await page.locator('main').boundingBox();
  assert.ok(card.width > main.width + 200, `kaart ${card.width} vs tekst ${main.width}`);
  assert.ok(Math.abs((card.x + card.width / 2) - (main.x + main.width / 2)) < 2, 'kaart on keskel');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  const b = blk(page, 'Lapselapsed'), s0 = await attr(b, 'data-start'), ppy = await pxPerYear(page);
  await drag(page, b, -10 * ppy);
  assert.ok(Math.abs((await attr(blk(page, 'Lapselapsed'), 'data-start')) - (s0 - 10)) <= 1, 'lohistamine töötab suurel kaardil');
  await context.close();
});
