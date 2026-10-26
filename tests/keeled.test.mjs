import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, copyFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, ROOT } from './helpers.mjs';
import { load, save, toCsv, parseCsv, applyCsv, check } from '../tools/i18n.mjs';

const P = (f) => new URL(`../public/${f}`, import.meta.url).href;
const read = (f) => readFile(`${ROOT}public/${f}`, 'utf8');
const state = load(new URL('../public/i18n.js', import.meta.url).pathname);
const D = state.dict, CODES = state.langs.map((l) => l.code);
const GL = JSON.parse(await readFile(`${ROOT}i18n/glossary.json`, 'utf8'));
const CAT = JSON.parse((await read('kast.html')).match(/<script type="application\/json" id="catalog">([\s\S]*?)<\/script>/)[1]);
const TAX = JSON.parse(await read('taxonomy.json'));
const NON_ET = CODES.filter((c) => c !== 'et');

let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { await browser.close(); });
async function open(file, lang, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_FILE|fonts\.g/i.test(m.text())) errors.push(m.text()); });
  await page.goto(P(file) + (lang && lang !== 'et' ? `?lang=${lang}` : ''));
  await page.waitForTimeout(120);
  return { page, context, errors };
}

// ---------- sõnastikud ----------
test('keeled: üheksa keelt, kõigil samad võtmed, kohahoidjad ja mitmuse vormid', () => {
  assert.deepEqual(CODES, ['et', 'en', 'de', 'es', 'fr', 'nl', 'sv', 'da', 'nb']);
  const r = check(state);
  assert.deepEqual(r.problems, []);
  for (const c of CODES) {
    assert.equal(Object.keys(D[c]).length, Object.keys(D.et).length, c);
    assert.ok(D[c]['kast.count.one'].includes('{n}') && D[c]['kast.count.other'].includes('{n}'), `${c}: mitmus`);
    assert.ok(D[c]['kontakt.note'].includes('{addr}'), `${c}: aadress`);
  }
});

test('keeled: tõlkimata (ETga identsed) read on erand, mitte reegel', () => {
  for (const c of NON_ET) {
    const same = Object.keys(D.et).filter((k) => D[c][k] === D.et[k]);
    assert.ok(same.length <= 10, `${c}: ${same.length} identset rida: ${same.join(', ')}`);
  }
});

test('keeled: terminibaas on lukus ja lukustatud sõnu ei tõlgita', () => {
  for (const [concept, v] of Object.entries(GL.concepts)) for (const c of CODES) assert.equal(D[c][v.key], v.terms[c], `${c}: ${concept}`);
  for (const c of CODES) {
    assert.ok(D[c]['nav.home'] === 'Meeleraha', `${c}: bränd`);
    assert.ok(D[c]['ots.file.btn'].includes('lõngaots.md') && D[c]['ots.file.p'].includes('lõngaots.md'), `${c}: lõngaots.md`);
    assert.ok(D[c]['log.off.dnt'].includes('Do Not Track') && D[c]['log.off.gpc'].includes('Global Privacy Control') && D[c]['priv.p4'].includes('Do Not Track'), `${c}: DNT/GPC`);
    assert.ok(D[c]['priv.conv'].includes('Segment Spec'), `${c}: Segment Spec`);
  }
  assert.ok(GL.locked_do_not_translate.includes('Meeleraha'));
  for (const k of GL.native_review_needed.priority_keys) assert.ok(k in D.et, `ülevaatuse võti puudub: ${k}`);
});

test('keeled: kataloogis on igal asjal nimi ja kirjeldus kõigis keeltes', () => {
  for (const c of CAT) {
    for (const l of CODES) { assert.ok(c[l] && c[l].n.length > 2 && c[l].d.length > 20, `${c.id}/${l}`); }
  }
  for (const l of CODES) assert.equal(new Set(CAT.map((c) => c[l].n)).size, CAT.length, `${l}: nimed on unikaalsed`);
  assert.deepEqual(TAX.enums.langs, CODES);
});

// ---------- lehed igas keeles ----------
test('keeled: iga keel avab kõik täielikult tõlgitud lehed vigadeta, õige html-keele, nav-sildi ja mustandi märkega', async () => {
  for (const lang of CODES) {
    for (const f of ['kast.html', 'kontakt.html', 'privaatsus.html', 'kellakeeramine.html', 'tunne.html']) {
      const { page, context, errors } = await open(f, lang);
      assert.equal(await page.locator('html').getAttribute('lang'), lang === 'et' ? 'et' : lang, `${lang} ${f}`);
      assert.equal(await page.inputValue('#mr-langsel'), lang);
      const nav = await page.locator('#mr-nav ul a').allInnerTexts();
      assert.deepEqual(nav, ['nav.home', 'nav.haruta', 'nav.ots', 'nav.tingi', 'nav.ajatelg', 'nav.kast'].map((k) => D[lang][k]), `${lang} ${f}: nav`);
      assert.equal(await page.locator('#mr-foot ul a').nth(1).innerText(), D[lang]['foot.privacy']);
      const banner = (await page.locator('#mr-banner').innerText()).trim();
      if (lang === 'et') assert.equal(banner, '', `${f}`); else assert.ok(banner.includes(D[lang]['lang.draft']) && banner.includes(D[lang]['lang.fix']), `${lang} ${f}: bänner`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${lang} ${f}: horisontaalne kerimine`);
      assert.deepEqual(errors, [], `${lang} ${f}`);
      assert.deepEqual(await page.evaluate(() => MR.audit()), []);
      await context.close();
    }
  }
});

test('keeled: osaliselt tõlgitud lehtedel (manifest, ots, ajatelg, haruta) on lisaks tööriistade sisu märge', async () => {
  for (const lang of NON_ET) {
    for (const f of ['ots.html', 'ajatelg.html', 'haruta.html']) {
      const { page, context } = await open(f, lang);
      const banner = await page.locator('#mr-banner').innerText();
      assert.ok(banner.includes(D[lang]['lang.partial']), `${lang} ${f}`);
      assert.match(await page.locator('h1').first().innerText(), new RegExp(D[lang][f === 'ots.html' ? 'ots.h1' : f === 'ajatelg.html' ? 'aj.h1' : 'haruta.h1'].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await context.close();
    }
  }
});

test('keeled: Mängukasti nimed, kirjeldused ja mitmus tulevad valitud keeles', async () => {
  for (const lang of CODES) {
    const { page, context } = await open('kast.html', lang);
    for (const id of ['ajatelg', 'longa-ots', 'kellakeeramine']) {
      const c = CAT.find((x) => x.id === id);
      assert.equal((await page.locator(`article[data-tool="${id}"] h2`).innerText()).trim(), c[lang].n, `${lang}/${id}`);
      assert.equal((await page.locator(`article[data-tool="${id}"] p`).innerText()).trim(), c[lang].d);
    }
    assert.equal((await page.locator('#count').innerText()).trim(), D[lang]['kast.count.other'].replace('{n}', String(CAT.length)), `${lang}: kokku`);
    await page.locator('[data-f="status"][data-v="building"]').click();
    assert.equal((await page.locator('#count').innerText()).trim(), D[lang]['kast.count.one'].replace('{n}', '1'), `${lang}: üks`);
    await context.close();
  }
});

test('keeled: keelevahetus lehel muudab sisu, hoiab keele linkides ja saadab ainult lubatud keelesündmuse', async () => {
  const { page, context } = await open('kast.html', 'et');
  await page.selectOption('#mr-langsel', 'de');
  assert.equal((await page.locator('h1').innerText()).trim(), D.de['kast.h1']);
  assert.equal((await page.locator('article[data-tool="ajatelg"] h2').innerText()).trim(), CAT.find((c) => c.id === 'ajatelg').de.n);
  assert.ok((await page.locator('article[data-tool="ajatelg"] a').getAttribute('href')).includes('lang=de'));
  assert.ok((await page.locator('#mr-nav a[href^="ots.html"]').getAttribute('href')).includes('lang=de'));
  const ev = (await page.evaluate(() => MR.log)).filter((e) => e.n === 'Language Changed');
  assert.deepEqual(ev.map((e) => e.p), [{ from_lang: 'et', to_lang: 'de' }]);
  assert.equal(await page.evaluate(() => MR.rejected.length), 0);
  await page.selectOption('#mr-langsel', 'et');
  assert.equal(await page.evaluate(() => location.search), '');
  assert.equal((await page.locator('h1').innerText()).trim(), D.et['kast.h1']);
  await context.close();
});

test('keeled: kontakt ja kellakeeramine annavad failid valitud keeles', async () => {
  for (const lang of ['de', 'fr', 'sv']) {
    const { page, context } = await open('kellakeeramine.html', lang);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
    const ics = await readFile(await dl.path(), 'utf8');
    assert.ok(ics.includes(D[lang]['kell.a1'].slice(0, 20)) || ics.includes(D[lang]['kell.a1'].slice(0, 20).replace(/,/g, '\\,')), `${lang}: küsimus`);
    assert.ok(!ics.includes('Mis oli viimase'));
    await context.close();
  }
});

// ---------- tõlketööriist ----------
test('tõlketööriist: eksport ja import on tagurpidi vastavuses ning parandus jõuab sõnastikku', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'i18n-'));
  const copy = join(dir, 'i18n.js');
  await copyFile(new URL('../public/i18n.js', import.meta.url).pathname, copy);
  const s = load(copy);
  const csv = toCsv(s), rows = parseCsv(csv);
  assert.equal(rows.length, Object.keys(s.dict.et).length + 1);
  assert.deepEqual(rows[0], ['key', ...CODES]);
  // kordamatu import ei muuda midagi
  const same = applyCsv(load(copy), csv);
  assert.deepEqual(same, { changes: [], errors: [] });
  // parandus: de nav.kast; et ei muutu ilma lipuata
  const edited = csv.replace(`"${D.de['nav.kast']}"`, '"Werkzeugkiste"').replace(`"${D.et['nav.kast']}"`, '"MUUDETUD"');
  const s2 = load(copy), r = applyCsv(s2, edited);
  assert.deepEqual(r.changes, ['de.nav.kast']);
  assert.equal(s2.dict.et['nav.kast'], D.et['nav.kast'], 'ET jääb alles');
  save(s2, copy);
  assert.equal(load(copy).dict.de['nav.kast'], 'Werkzeugkiste');
  assert.deepEqual(check(load(copy)).problems, []);
  // kohahoidja lõhkuv parandus lükatakse tagasi; tundmatu võti antakse teada
  const bad = csv.replace(`"${D.de['kontakt.note']}"`, '"Ohne Adresse"') + '"tundmatu.voti","x","","","","","","","",""\n';
  const r3 = applyCsv(load(copy), bad);
  assert.ok(r3.errors.some((e) => e.includes('kohahoidjad kontakt.note')) && r3.errors.some((e) => e.includes('tundmatu')));
  // check leiab puuduva võtme
  const s4 = load(copy); delete s4.dict.fr['nav.kast'];
  assert.ok(check(s4).problems.some((p) => p.includes('fr: puudub nav.kast')));
  // csv jutumärgid ja reavahetused püsivad
  const tricky = parseCsv('"a","b ""q""","c\nd"\n');
  assert.deepEqual(tricky, [['a', 'b "q"', 'c\nd']]);
});

test('tõlketööriist: kõigil keeltel on valmis staatus ja mustandi märge', () => {
  assert.equal(state.langs.find((l) => l.code === 'et').status, 'official');
  for (const c of NON_ET) assert.equal(state.langs.find((l) => l.code === c).status, 'draft', c);
  for (const l of state.langs) assert.ok(l.name.length > 1);
});
