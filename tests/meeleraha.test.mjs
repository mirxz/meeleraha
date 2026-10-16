import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launch, ROOT } from './helpers.mjs';

const P = (f) => new URL(`../public/${f}`, import.meta.url).href;
const read = (f) => readFile(`${ROOT}public/${f}`, 'utf8');
const PAGES = [['index', 'index.html'], ['haruta', 'haruta.html'], ['ots', 'ots.html'], ['ajatelg', 'ajatelg.html'], ['kast', 'kast.html'], ['kontakt', 'kontakt.html'], ['privaatsus', 'privaatsus.html'], ['kell', 'kellakeeramine.html'], ['debate', 'debate.html']];
const TAX = JSON.parse(await read('taxonomy.json'));
const dict = async () => { const txt = await read('i18n.js'); return JSON.parse(txt.match(/^window\.MR_I18N=([\s\S]*?);\nwindow\.MR_LANGS=/)[1]); };

let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { await browser.close(); });

async function open(file, { query = '', capture = false, gpc = false, width = 390 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
  if (capture || gpc) await context.addInitScript(({ capture, gpc }) => {
    if (capture) { window.MR_FORCE = true; window.__sent = []; navigator.sendBeacon = (u, b) => { b.text().then((t) => window.__sent.push(JSON.parse(t))); return true; }; }
    if (gpc) Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
  }, { capture, gpc });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_FILE|fonts\.g/i.test(m.text())) errors.push(m.text()); });
  await page.goto(P(file) + query);
  await page.waitForTimeout(150);
  return { page, context, errors };
}
const sent = async (page) => { await page.evaluate(() => MR.flush()); await page.waitForTimeout(80); return (await page.evaluate(() => window.__sent)).flatMap((b) => b.events); };

// ---------- raam ----------
test('ühine raam: kõigil üheksal lehel on nav, jalus, õige aktiivne leht ja vigadeta registri audit', async () => {
  for (const [id, file] of PAGES) {
    const { page, context, errors } = await open(file);
    assert.equal(await page.locator('#mr-nav ul a').count(), 6, `${id}: nav`);
    assert.equal(await page.locator('#mr-foot ul a').count(), 3, `${id}: jalus`);
    assert.ok((await page.locator('#mr-foot #mr-logbtn').count()) === 1, `${id}: log`);
    const current = await page.locator('#mr-nav [aria-current="page"]').count();
    assert.equal(current, ['kontakt', 'privaatsus', 'kell'].includes(id) ? 0 : 1, `${id}: aktiivne`);
    assert.deepEqual(await page.evaluate(() => MR.audit()), [], `${id}: audit`);
    assert.equal(await page.evaluate(() => MR.rejected.length), 0, `${id}: tagasi lükatud sündmused`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${id}: horisontaalne kerimine`);
    assert.deepEqual(errors, [], id);
    await context.close();
  }
});

test('infoarhitektuur: nav viitab lehtedele, mis olemas on, ja kaart on manifestis', async () => {
  const { page, context } = await open('index.html');
  const hrefs = await page.locator('#mr-nav ul a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  assert.deepEqual(hrefs, ['index.html', 'haruta.html', 'ots.html', 'debate.html', 'ajatelg.html', 'kast.html']);
  for (const h of hrefs) await readFile(`${ROOT}public/${h}`);
  assert.equal(await page.locator('#kaart a[data-mr-c="index.hub.door"]').count(), 5);
  await context.close();
});

// ---------- keel ----------
test('keel: keelevalija tõlgib liidese, hoiab keele linkides ja naaseb eesti keelele', async () => {
  const { page, context } = await open('index.html');
  assert.equal(await page.locator('html').getAttribute('lang'), 'et');
  assert.equal(await page.locator('#mr-langsel option').count(), 9);
  await page.selectOption('#mr-langsel', 'en');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.match(await page.locator('#mr-nav').innerText(), /Untangle[\s\S]*Thread end[\s\S]*Timeline[\s\S]*Toolbox/);
  assert.match(await page.locator('h1').first().innerText(), /Money you hear, see and breathe/);
  assert.ok((await page.locator('#mr-nav a[href^="haruta.html"]').getAttribute('href')).includes('lang=en'));
  assert.match(await page.locator('#mr-banner').innerText(), /Estonian/);
  assert.ok((await page.evaluate(() => location.search)).includes('lang=en'));
  await page.selectOption('#mr-langsel', 'et');
  assert.equal(await page.locator('html').getAttribute('lang'), 'et');
  assert.equal(await page.evaluate(() => location.search), '');
  assert.equal((await page.locator('#mr-banner').innerText()).trim(), '');
  await context.close();
});

test('keel: ?lang=en avab täielikult tõlgitud lehed inglise keeles; bänner on mustandi märge ilma tööriistade märketa', async () => {
  for (const f of ['kast.html', 'kontakt.html', 'privaatsus.html', 'kellakeeramine.html']) {
    const { page, context } = await open(f, { query: '?lang=en' });
    assert.equal(await page.locator('html').getAttribute('lang'), 'en', f);
    const banner = await page.locator('#mr-banner').innerText();
    assert.match(banner, /draft awaiting review/, f);
    assert.doesNotMatch(banner, /Tool content/, `${f}: osalise sisu märge ei kuulu täielikult tõlgitud lehele`);
    assert.ok((await page.locator('#mr-banner a').getAttribute('href')).startsWith('kontakt.html?reason=general'), f);
    const body = await page.locator('main').innerText();
    assert.doesNotMatch(body, /Mängukast|Privaatsus|Kellakeeramise vestlus|Tasuta/, `${f}: eesti tekst inglise lehel`);
    await context.close();
  }
});

test('keel: sõnastikud on täielikud ja iga data-i18n võti on olemas', async () => {
  const d = await dict();
  assert.deepEqual(Object.keys(d.et).sort(), Object.keys(d.en).sort(), 'ET ja EN võtmed peavad olema samad');
  for (const [, file] of PAGES) {
    const html = await read(file);
    for (const m of html.matchAll(/data-i18n(?:-attr)?="([^"]+)"/g)) {
      for (const part of m[1].split(';')) { const key = part.includes(':') ? part.split(':')[1].trim() : part.trim(); assert.ok(d.et[key] !== undefined, `${file}: puudub võti ${key}`); }
    }
  }
  for (const [k, v] of Object.entries(d.en)) assert.ok(v.trim().length > 0, `tühi EN: ${k}`);
});

// ---------- taksonoomia ----------
test('taksonoomia: JS-koopia on sama mis JSON ja nimetamise reeglid kehtivad', async () => {
  const js = await read('taxonomy.js');
  assert.deepEqual(JSON.parse(js.replace(/^window\.MR_TAX=/, '').replace(/;\s*$/, '')), TAX);
  for (const [name, e] of Object.entries(TAX.events)) {
    assert.match(name, /^[A-Z][a-z]+( [A-Z][a-z]+)+$/, `sündmus ${name}: Title Case „Objekt Tegevus“`);
    for (const [k, spec] of Object.entries(e.props)) { assert.match(k, /^[a-z]+(_[a-z]+)*$/, `omadus ${k}: snake_case`); assert.match(spec, /^enum:/, `${name}.${k}: ainult enum`); assert.ok(TAX.enums[spec.slice(5)], `${name}.${k}: puudub enum`); }
  }
  for (const [id, c] of Object.entries(TAX.components)) { assert.match(id, /^[a-z]+\.[a-z]+\.[a-z-]+$/, `komponent ${id}`); assert.equal(id, `${c.page}.${c.section}.${c.name}`); assert.ok(c.page in TAX.pages || ['nav', 'footer'].includes(c.page), `${id}: leht`); }
  assert.ok(TAX.convention.never.length >= 5);
});

test('taksonoomia: enumid vastavad lehtede tegelikule sisule', async () => {
  const nodes = JSON.parse((await read('haruta.html')).match(/<script type="application\/json" id="nodes">([\s\S]*?)<\/script>/)[1]).map((n) => n.id);
  assert.deepEqual(TAX.enums.nodes, nodes);
  const rumors = JSON.parse((await read('haruta.html')).match(/<script type="application\/json" id="rumors">([\s\S]*?)<\/script>/)[1]).map((n) => n.id);
  assert.deepEqual(TAX.enums.rumors, rumors);
  const sits = JSON.parse((await read('ots.html')).match(/<script type="application\/json" id="sitdata">([\s\S]*?)<\/script>/)[1]).map((n) => n.id);
  assert.deepEqual(TAX.enums.situations, sits);
  const presets = [...(await read('ajatelg.html')).matchAll(/\{id:'([a-z-]+)',l:/g)].map((m) => m[1]).concat('oma');
  assert.deepEqual(TAX.enums.presets, presets);
  const tools = JSON.parse((await read('kast.html')).match(/<script type="application\/json" id="catalog">([\s\S]*?)<\/script>/)[1]).map((c) => c.id);
  assert.deepEqual(TAX.enums.tools, tools);
});

// ---------- mõõtmine ----------
test('mõõtmine: lehevaatamine ja klõps lähevad teele ainult nime, komponendi ja lubatud valikutega', async () => {
  const { page, context } = await open('ots.html', { capture: true });
  await page.locator('[data-sit="algus"]').click();
  const ev = await sent(page);
  assert.ok(ev.some((e) => e.n === 'Page Viewed' && e.p.page === 'ots' && e.p.lang === 'et'));
  const s = ev.find((e) => e.n === 'Situation Selected');
  assert.deepEqual(s, { n: 'Situation Selected', c: 'ots.picker.situation-card', p: { situation_id: 'algus' }, l: 'et', pg: 'ots' });
  for (const e of ev) assert.deepEqual(Object.keys(e).sort(), ['c', 'l', 'n', 'p', 'pg']);
  await context.close();
});

test('mõõtmine: sisestatud numbrid ja tekst ei jõua kunagi sündmuste hulka', async () => {
  const { page, context } = await open('ots.html', { capture: true });
  await page.fill('#tulu', '1450'); await page.fill('#kulu', '1420'); await page.fill('#saast', '0');
  await page.fill('#unistus', 'Aeglased hommikud maakodus');
  await page.click('#sample'); await page.click('[data-sit="rahatark"]'); await page.click('#mdBtn').catch(() => {});
  const all = JSON.stringify(await sent(page)) + JSON.stringify(await page.evaluate(() => MR.log));
  for (const secret of ['1450', '1420', 'Aeglased', 'maakodus', '3500', '2100']) assert.ok(!all.includes(secret), `lekkis: ${secret}`);
  await context.close();
  const { page: pa, context: ca } = await open('ajatelg.html', { capture: true });
  await pa.fill('#age', '40'); await pa.fill('#custom', 'Minu salajane klots'); await pa.click('#addCustom');
  await pa.click('#mSample'); await pa.fill('#dTake', 'saladus-123').catch(() => {});
  const all2 = JSON.stringify(await sent(pa)) + JSON.stringify(await pa.evaluate(() => MR.log));
  for (const secret of ['salajane', 'saladus', '3500', '40000']) assert.ok(!all2.includes(secret), `lekkis: ${secret}`);
  await ca.close();
});

test('mõõtmine: vigased sündmused, tundmatud omadused ja vabatekst lükatakse tagasi', async () => {
  const { page, context } = await open('index.html');
  const r = await page.evaluate(() => [
    MR.track('Door Clicked', { door: 'x' }, 'index.hub.door'),
    MR.track('Door Clicked', { door: 'kast', extra: '1' }, 'index.hub.door'),
    MR.track('Door Clicked', {}, 'index.hub.door'),
    MR.track('Nope Happened', {}, null),
    MR.track('Door Clicked', { door: 'kast' }, 'tundmatu.komponent.x'),
    MR.track('Situation Selected', { situation_id: 'minu vaba tekst' }, 'ots.picker.situation-card'),
    MR.track('Door Clicked', { door: 'kast' }, 'index.hub.door', { dry: true }),
  ]);
  assert.deepEqual(r, [false, false, false, false, false, false, true]);
  await context.close();
});

test('mõõtmine: väljalülitamine, Do Not Track/GPC ja failist avamine peatavad saatmise', async () => {
  const { page, context } = await open('ots.html', { capture: true });
  assert.equal(await page.evaluate(() => MR.measure()), true);
  await page.click('#mr-logbtn');
  await page.locator('#mr-log [data-mr-measure-state]').click();
  assert.equal(await page.evaluate(() => MR.measure()), false);
  assert.equal(await page.evaluate(() => localStorage.getItem('mr.optout')), '1');
  const before = (await sent(page)).length;
  await page.click('[data-sit="algus"]');
  assert.equal((await sent(page)).length, before, 'väljalülitatult ei tohi midagi saata');
  assert.equal(await page.evaluate(() => MR.log.slice(-1)[0].sent), false);
  await page.locator('#mr-log [data-mr-measure-state]').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('mr.optout')), null);
  await context.close();
  const g = await open('ots.html', { capture: true, gpc: true });
  assert.equal(await g.page.evaluate(() => MR.measureReason()), 'gpc');
  assert.equal(await g.page.evaluate(() => MR.measure()), false);
  await g.context.close();
  const f = await open('ots.html');
  await f.page.click('[data-sit="algus"]');
  assert.equal(await f.page.evaluate(() => MR.log.slice(-1)[0].sent), false, 'failina avatud leht ei saada');
  await f.context.close();
});

test('läbipaistvus: jaluse paneel näitab täpselt iga sündmuse ja ei salvesta midagi vaikimisi', async () => {
  const { page, context } = await open('kast.html');
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.equal(await page.evaluate(() => document.cookie), '');
  await page.click('#mr-logbtn');
  const t = await page.locator('#mr-log').innerText();
  assert.match(t, /Page Viewed/);
  assert.match(t, /"component"/);
  assert.match(t, /Sinu sisestatud numbreid ja teksti ei saadeta kunagi/);
  await context.close();
});
