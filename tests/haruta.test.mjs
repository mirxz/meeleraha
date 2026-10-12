import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, ROOT } from './helpers.mjs';

const KYSI_URL = new URL('../public/haruta.html', import.meta.url).href;
const html = await readFile(`${ROOT}public/haruta.html`, 'utf8');
const grab = (id) => JSON.parse(html.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`))[1]);
const NODES = grab('nodes');
const RUMORS = grab('rumors');
const IDS = new Set(NODES.map((n) => n.id));
const ACTS = ['KoPS', 'TuMS', 'RPKS', 'RM41', 'SKA'];
const TRUST = ['[verified]', '[secondary]', '[inferred]', '[kontrollimata]'];
const REL = ['sõltub', 'tuleneb seadusest', 'välistab', 'muudab tulemust', 'mudel ei arvesta', 'näide', 'allikas', 'sisaldab'];

test('sõlmede andmed: unikaalsed id-d ja kõik väljad olemas', () => {
  assert.equal(IDS.size, NODES.length, 'id-d peavad olema unikaalsed');
  for (const n of NODES) {
    for (const f of ['id', 'type', 'title', 'short', 'long', 'law', 'trust', 'verified_at', 'related', 'not_modelled', 'synonyms', 'owner']) {
      assert.ok(n[f] !== undefined && n[f] !== '', `${n.id}: puudub ${f}`);
    }
    assert.match(n.verified_at, /^\d{2}\.\d{2}\.\d{4}$/, `${n.id}: kuupäev`);
    assert.ok(n.not_modelled.length >= 1, `${n.id}: "mida see ei arvesta" on tühi`);
  }
});

test('lühidalt: kuni 2 lauset, 8–14 sõna lause kohta', () => {
  for (const n of NODES) {
    const sents = n.short.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜÕŠŽ])/).filter(Boolean);
    assert.ok(sents.length <= 2, `${n.id}: ${sents.length} lauset`);
    for (const s of sents) {
      const w = s.trim().split(/\s+/).length;
      assert.ok(w >= 8 && w <= 14, `${n.id}: lauses on ${w} sõna: ${s}`);
    }
  }
});

test('usaldusmärk ja seadus: verified sõlmel on paragrahviviide, viited on tuntud aktidele', () => {
  for (const n of NODES) {
    assert.ok(TRUST.includes(n.trust), `${n.id}: tundmatu usaldusmärk ${n.trust}`);
    assert.ok(n.law.length >= 1, `${n.id}: seadus puudub`);
    for (const [act] of n.law) assert.ok(ACTS.includes(act), `${n.id}: tundmatu akt ${act}`);
    if (n.trust === '[verified]') assert.ok(n.law.some(([, ref]) => ref.includes('§')), `${n.id}: [verified] ilma paragrahvita`);
  }
});

test('seosed: sihtsõlmed on olemas, enda peale ei viita, seosetüübid on lubatud', () => {
  for (const n of NODES) for (const [to, rel] of n.related) {
    assert.ok(IDS.has(to), `${n.id} -> ${to} puudub`);
    assert.notEqual(to, n.id);
    assert.ok(REL.includes(rel), `${n.id}: tundmatu seos ${rel}`);
  }
});

test('kuulujutud viitavad olemasolevatele sõlmedele ja neil on otsus', () => {
  const rid = new Set(RUMORS.map((r) => r.id));
  assert.equal(rid.size, RUMORS.length);
  for (const r of RUMORS) {
    assert.ok(r.verdict && r.answer && r.text, r.id);
    assert.ok(['partly', 'no', 'yes'].includes(r.kind), r.id);
    for (const id of r.nodes) assert.ok(IDS.has(id), `${r.id} -> ${id}`);
  }
});

test('pealeht viitab Haruta lõngakera lehele', async () => {
  const idx = await readFile(`${ROOT}public/index.html`, 'utf8');
  assert.ok(idx.includes('href="haruta.html"'));
});

let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { await browser.close(); });

async function open(url = KYSI_URL, width = 390, reducedMotion = 'reduce') {
  const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_NAME_NOT_RESOLVED|fonts\.g/i.test(m.text())) errors.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(150);
  return { page, context, errors };
}
async function ask(page, q) {
  await page.fill('#q', q);
  await page.press('#q', 'Enter');
  await page.waitForTimeout(100);
}

test('leht laeb ilma vigadeta ja ilma horisontaalse kerimiseta', async () => {
  const { page, context, errors } = await open();
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await context.close();
});

const EXPECT = { periood: 'fondipensioni-periood', '55': 'iii-samba-vanus', lapsed: 'soodustingimused', maksuvaba: 'maksuvaba-tulu', kindlustusosak: 'riikliku-pensioni-sisendid', 'raha põleb': 'ii-samba-varajane', 'II samba sissemaksed': 'ii-samba-sissemaksed', 'fondipensioni periood': 'fondipensioni-periood' };
for (const [q, id] of Object.entries(EXPECT)) {
  test(`otsing "${q}" annab esimesena sõlme ${id}`, async () => {
    const { page, context } = await open();
    await ask(page, q);
    assert.equal(await page.locator('#out .res').first().getAttribute('href'), `#${id}`);
    await context.close();
  });
}

test('otsing "kas ootan" annab esikohale paindliku või edasilükatud pensioni', async () => {
  const { page, context } = await open();
  await ask(page, 'kas ootan?');
  const first = await page.locator('#out .res').first().getAttribute('href');
  assert.ok(['#paindlik-pension', '#edasilykatud-pension'].includes(first), first);
  await context.close();
});

test('iga kuulujutt annab õige otsuse ja viitab õigele sõlmele', async () => {
  const { page, context } = await open();
  for (const r of RUMORS) {
    await ask(page, r.text);
    const card = page.locator('#rumorCard');
    assert.match(await card.innerText(), new RegExp(r.verdict.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), r.id);
    assert.ok((await card.locator(`a[href="#${r.nodes[0]}"]`).count()) >= 1, `${r.id}: link sõlmele`);
  }
  await context.close();
});

test('kuulujutt tuvastatakse ka ümbersõnastatult', async () => {
  const { page, context } = await open();
  await ask(page, 'Kuulsin, et III sammast saab 55-aastaselt kätte');
  assert.match(await page.locator('#rumorCard').innerText(), /Osaliselt tõsi/);
  await context.close();
});

test('tundmatu küsimus annab selge teate, mitte vale vastuse', async () => {
  const { page, context } = await open();
  await ask(page, 'xyzzy plugh');
  assert.equal(await page.locator('#none').count(), 1);
  assert.equal(await page.locator('#rumorCard').count(), 0);
  await context.close();
});

test('iga sõlme leht näitab seadust ja "mida see ei arvesta" ning püsilink töötab', async () => {
  const { page, context, errors } = await open();
  for (const n of NODES) {
    await page.goto(`${KYSI_URL}#${n.id}`);
    await page.reload();
    await page.waitForTimeout(60);
    assert.equal((await page.locator('#node h2').innerText()).trim(), n.title, n.id);
    assert.ok((await page.locator('#notmod li').count()) >= 1, `${n.id}: ei arvesta`);
    const chips = page.locator('#node a.chip[href*="riigiteataja.ee"]');
    assert.ok((await chips.count()) >= 1, `${n.id}: seaduse link`);
    assert.match(await page.innerText('#node'), /kontrollitud \d{2}\.\d{2}\.\d{4}/);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('tagasi-link viib otsingusse', async () => {
  const { page, context } = await open(`${KYSI_URL}#fondipension`);
  await page.click('#backs');
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#node').count(), 0);
  await context.close();
});

// ---------- lõngakera ----------
const EDGE_COUNT = NODES.reduce((s, n) => s + n.related.length, 0) + RUMORS.reduce((s, r) => s + r.nodes.length, 0);
const knotPos = async (page, id) => {
  const t = await page.locator(`.knot[data-id="${id}"]`).getAttribute('transform');
  const m = t.match(/translate\(([-\d.]+) ([-\d.]+)\)/);
  return [Number(m[1]), Number(m[2])];
};

test('lõngakera andmed: igal sõlmel ja kuulujutul on vähemalt üks lõng', () => {
  const used = new Set();
  for (const n of NODES) for (const [to] of n.related) { used.add(n.id); used.add(to); }
  for (const r of RUMORS) { used.add(r.id); for (const id of r.nodes) used.add(id); }
  for (const n of NODES) assert.ok(used.has(n.id), `${n.id}: üksik sõlm`);
  for (const r of RUMORS) assert.ok(used.has(r.id), `${r.id}: üksik kuulujutt`);
});

test('lõngakera: õige arv sõlmi ja lõngu ning kõik sõlmed mahuvad kaardile', async () => {
  const { page, context, errors } = await open();
  assert.equal(await page.locator('.knot').count(), NODES.length + RUMORS.length);
  assert.equal(await page.locator('path.th').count(), EDGE_COUNT * 3);
  for (const o of [...NODES, ...RUMORS]) {
    const [x, y] = await knotPos(page, o.id);
    assert.ok(x >= 8 && x <= 392 && y >= 8 && y <= 312, `${o.id} väljaspool kaarti: ${x}, ${y}`);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('lõngakera: sõlme puudutamine harutab selle lõnga ja avab sõlme lehe', async () => {
  const { page, context } = await open();
  await page.locator('.knot[data-id="pensioniiga"] .hit').click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#yarn').getAttribute('data-focus'), 'pensioniiga');
  assert.equal((await page.locator('#node h2').innerText()).trim(), 'Pensioniiga');
  assert.match(page.url(), /#pensioniiga$/);
  const [x, y] = await knotPos(page, 'pensioniiga');
  assert.ok(Math.abs(x - 200) < 2 && Math.abs(y - 160) < 2, `keskel: ${x}, ${y}`);
  await context.close();
});

test('lõngakera: fookuses on ainult sõlme enda lõngad selged', async () => {
  const { page, context } = await open(`${KYSI_URL}#pensioniiga`);
  const touching = [];
  NODES.forEach((n) => n.related.forEach(([to]) => { if (n.id === 'pensioniiga' || to === 'pensioniiga') touching.push(1); }));
  RUMORS.forEach((r) => r.nodes.forEach((id) => { if (id === 'pensioniiga') touching.push(1); }));
  const ops = await page.locator('path.th').evaluateAll((els) => els.map((e) => Number(e.getAttribute('stroke-opacity'))));
  const bright = ops.filter((o) => o > 0.6).length;
  assert.equal(bright, touching.length * 3);
  assert.ok(ops.filter((o) => o < 0.2).length >= (EDGE_COUNT - touching.length) * 3 - 3);
  await context.close();
});

test('lõngakera: otsing harutab sobiva sõlme, kuulujutt harutab kuulujutu', async () => {
  const { page, context } = await open();
  await ask(page, 'periood');
  assert.equal(await page.locator('#yarn').getAttribute('data-focus'), 'fondipensioni-periood');
  await ask(page, RUMORS[0].text);
  assert.equal(await page.locator('#yarn').getAttribute('data-focus'), RUMORS[0].id);
  await context.close();
});

test('lõngakera: kuulujutu püsilink avab kuulujutu ja harutab selle', async () => {
  const { page, context } = await open(`${KYSI_URL}#${RUMORS[2].id}`);
  assert.equal(await page.locator('#yarn').getAttribute('data-focus'), RUMORS[2].id);
  assert.match(await page.locator('#rumorCard').innerText(), new RegExp(RUMORS[2].verdict));
  await context.close();
});

test('lõngakera: "Sassi tagasi" taastab sasipuntra', async () => {
  const { page, context } = await open(`${KYSI_URL}#fondipension`);
  assert.equal(await page.locator('#reset').isVisible(), true);
  await page.click('#reset');
  assert.equal(await page.locator('#yarn').getAttribute('data-focus'), '');
  assert.equal(await page.locator('#reset').isVisible(), false);
  assert.equal(await page.locator('#node').count(), 0);
  await context.close();
});

test('lõngakera: klaviatuur (Enter) avab sõlme', async () => {
  const { page, context } = await open();
  await page.locator('.knot[data-id="paindlik-pension"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#yarn').getAttribute('data-focus'), 'paindlik-pension');
  await context.close();
});

test('lõngakera: animatsiooniga töötab ilma vigadeta ja sõlm jõuab keskele', async () => {
  const { page, context, errors } = await open(KYSI_URL, 390, 'no-preference');
  await page.locator('.knot[data-id="fondipension"] .hit').click();
  await page.waitForTimeout(1600);
  const [x, y] = await knotPos(page, 'fondipension');
  assert.ok(Math.abs(x - 200) < 3 && Math.abs(y - 160) < 3, `keskel: ${x}, ${y}`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('vana aadress kysi.html suunab uuele lehele', async () => {
  const old = await readFile(`${ROOT}public/kysi.html`, 'utf8');
  assert.ok(old.includes("location.replace('haruta.html'"));
  assert.ok(old.includes('url=haruta.html'));
});

test('lõngakera: sildid ja lõngad ei püüa klikke, iga sõlm on klikitav', async () => {
  const { page, context } = await open();
  const all = [...NODES, ...RUMORS];
  for (const o of all) {
    await page.locator(`.knot[data-id="${o.id}"] .hit`).scrollIntoViewIfNeeded();
    const box = await page.locator(`.knot[data-id="${o.id}"] .hit`).boundingBox();
    const hitId = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      const g = el && el.closest('.knot');
      return g ? g.getAttribute('data-id') : null;
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    assert.equal(hitId, o.id, `${o.id}: klikk läheb sõlmele ${hitId}`);
  }
  await context.close();
});

test('lõngakera: sõlmed on teineteisest vähemalt 22 ühiku kaugusel', async () => {
  const { page, context } = await open();
  const pts = [];
  for (const o of [...NODES, ...RUMORS]) pts.push(await knotPos(page, o.id));
  let min = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) min = Math.min(min, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
  assert.ok(min >= 22, `lähimad sõlmed ${min.toFixed(1)}`);
  await context.close();
});

// ---------- kontrollnimekiri: mida lõngakera peab katma ----------
// Muuda ainult teadlikult: iga rida on mõiste, mille kohta on seadusviidete kontrollis [verified] või [secondary] allikas.
const MUST_IDS = [
  'iii-samba-vanus', 'ii-samba-sissemaksed', 'edasilykatud-pension', 'maksuvaba-tulu', 'fondipensioni-periood',
  'soodustingimused', 'paindlik-pension', 'parimine', 'kindlustuspension', 'tootamine-pensionil', 'eripension',
  'aastahind', 'taiendav-sissemakse', 'sisend-synniaasta', 'sisend-sugu', 'sisend-lapsed', 'sisend-tootlus',
  'kolm-sammast', 'riiklik-pension-osad', 'riikliku-pensioni-sisendid', 'pensioniiga', 'ii-samba-oigus',
  'ii-samba-varajane', 'iii-samba-mahaarvamine', 'fondipension', 'kogu-raha-korraga-vs-regulaarselt',
];
const MUST_PARAGRAPHS = [
  ['KoPS', '7'], ['KoPS', '10'], ['KoPS', '28'], ['KoPS', '40'], ['KoPS', '43¹'], ['KoPS', '52³'], ['KoPS', '60¹'], ['KoPS', '63'], ['KoPS', '72⁷'],
  ['TuMS', '4'], ['TuMS', '20¹'], ['TuMS', '21'], ['TuMS', '23'], ['TuMS', '23⁵'], ['TuMS', '28'],
  ['RPKS', '7'], ['RPKS', '7¹'], ['RPKS', '9¹'], ['RPKS', '10'], ['RPKS', '11'], ['RPKS', '11¹'], ['RPKS', '12'], ['RPKS', '13¹'], ['RPKS', '25'], ['RPKS', '43'],
];
// Ootel (teadlikult veel puudu): seadusesõlmed (paragrahvid sõlmedena), eeldused, näited ja allikad.

test('kontrollnimekiri: kõik nõutud mõisted on lõngakeras', () => {
  const missing = MUST_IDS.filter((id) => !IDS.has(id));
  assert.deepEqual(missing, [], `lõngakerast puuduvad: ${missing.join(', ')}`);
});

test('kontrollnimekiri: kõik kontrollitud paragrahvid on mõnes sõlmes viidatud', () => {
  const cited = new Set();
  for (const n of NODES) for (const [act, ref] of n.law) for (const m of ref.matchAll(/§\s*(\d+[¹²³⁴⁵⁶⁷⁸⁹⁰]*)/g)) cited.add(`${act} ${m[1]}`);
  const missing = MUST_PARAGRAPHS.filter(([a, p]) => !cited.has(`${a} ${p}`)).map(([a, p]) => `${a} § ${p}`);
  assert.deepEqual(missing, [], `paragrahvid ilma sõlmeta: ${missing.join(', ')}`);
});

test('kontrollnimekiri: iga sõlm on vähemalt ühe kuulujutu või seose osa ja kuulujutte on igal sisendil ja valikul', () => {
  const withRumor = new Set(RUMORS.flatMap((r) => r.nodes));
  const choices = NODES.filter((n) => n.type === 'Valik').map((n) => n.id);
  const missing = choices.filter((id) => !withRumor.has(id));
  assert.deepEqual(missing, [], `valikud ilma kuulujututa: ${missing.join(', ')}`);
});

// ---------- hääl ja kõne ----------
function silentWav(samples = 3200) {
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(16000, 24); buf.writeUInt32LE(32000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples * 2, 40);
  return buf;
}

test('kõne nupp on sõlme lehel ja kuulujutu kaardil', async () => {
  const a = await open(`${KYSI_URL}#fondipension`);
  assert.equal(await a.page.locator('#say').innerText(), 'Kuula kõnet');
  await a.context.close();
  const b = await open(`${KYSI_URL}#${RUMORS[0].id}`);
  assert.equal(await b.page.locator('#say').innerText(), 'Kuula kõnet');
  await b.context.close();
});

test('kõne: kui klippe ei ole, tuleb selge teade ja leht töötab edasi', async () => {
  const { page, context, errors } = await open(`${KYSI_URL}#pensioniiga`);
  await page.click('#say');
  await page.waitForTimeout(1500);
  assert.match(await page.locator('#sayMsg').innerText(), /Heli ei laadinud/);
  assert.equal(await page.locator('#say').innerText(), 'Kuula kõnet');
  assert.deepEqual(errors, []);
  await context.close();
});

test('kõne: tervitus, sõlme klipp ja lõpp mängitakse järjest ning nupp lähtestub', async () => {
  const dir = join(tmpdir(), `haruta-audio-${Date.now()}`);
  await cp(new URL('../public/', import.meta.url), dir, { recursive: true });
  await mkdir(join(dir, 'audio'), { recursive: true });
  for (const id of ['g0', 'hn-pensioniiga', 'h-end']) await writeFile(join(dir, 'audio', `${id}.wav`), silentWav());
  const { page, context, errors } = await open(`${pathToFileURL(join(dir, 'haruta.html')).href}#pensioniiga`);
  await page.click('#say');
  assert.equal(await page.locator('#say').innerText(), 'Peata');
  await page.waitForTimeout(3500);
  assert.equal(await page.locator('#say').innerText(), 'Kuula kõnet');
  assert.equal(await page.locator('#sayMsg').innerText(), '');
  assert.deepEqual(errors, []);
  await context.close();
});

test('kõne: aadressi vahetamine peatab kõne', async () => {
  const dir = join(tmpdir(), `haruta-audio2-${Date.now()}`);
  await cp(new URL('../public/', import.meta.url), dir, { recursive: true });
  await mkdir(join(dir, 'audio'), { recursive: true });
  for (const id of ['g0', 'hn-pensioniiga', 'h-end']) await writeFile(join(dir, 'audio', `${id}.wav`), silentWav(160000));
  const { page, context } = await open(`${pathToFileURL(join(dir, 'haruta.html')).href}#pensioniiga`);
  await page.click('#say');
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#fondipension'; });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#say').innerText(), 'Kuula kõnet');
  await context.close();
});

// ---------- lingid manifesti ja lõngakera vahel ----------
test('manifesti leht viitab lõngakerale (nupp alguses ja eraldi osa)', async () => {
  const idx = await readFile(`${ROOT}public/index.html`, 'utf8');
  assert.ok((idx.match(/href="haruta\.html"/g) || []).length >= 2, 'peab olema vähemalt kaks linki');
  assert.ok(idx.includes('<section id="haruta">'));
  assert.ok(idx.includes('Lõngakera on metafoor'));
  assert.ok(idx.includes('Kuulujutu kontroll annab lühikese vastuse'));
});

test('lõngakera leht viitab manifestile (üleval ja all)', () => {
  assert.ok((html.match(/href="index\.html"/g) || []).length >= 2, 'peab olema vähemalt kaks linki');
});

// ---------- sildid ----------
test('sildid: igal sõlmel ja kuulujutul on unikaalne lühisilt (kuni 18 märki, sõna kuni 12)', () => {
  const labels = [...NODES, ...RUMORS].map((o) => o.label);
  for (const [i, l] of labels.entries()) {
    assert.ok(l && l.length <= 18, `silt liiga pikk: ${l}`);
    for (const w of l.split(' ')) assert.ok(w.length <= 12, `sõna liiga pikk sildis: ${l}`);
    assert.doesNotMatch(l, /…/, `kärbitud silt: ${l}`);
  }
  assert.equal(new Set(labels).size, labels.length, 'sildid peavad olema unikaalsed');
});

test('sildid: kõige rohkem seotud sõlme naabrite sildid on täielikud, ilma kärpimiseta', async () => {
  const { page, context } = await open(`${KYSI_URL}#pensioniiga`);
  const texts = await page.locator('.knot').evaluateAll((gs) => gs
    .filter((g) => Number(g.querySelector('text').getAttribute('opacity')) > 0.9)
    .map((g) => ({ id: g.getAttribute('data-id'), text: [...g.querySelectorAll('tspan')].map((t) => t.textContent).join(' ') })));
  assert.ok(texts.length >= 10, `nähtavaid silte ${texts.length}`);
  const all = new Map([...NODES, ...RUMORS].map((o) => [o.id, o.label]));
  for (const t of texts) {
    assert.equal(t.text, all.get(t.id), `${t.id}: silt peab olema täielik`);
    assert.doesNotMatch(t.text, /…/);
  }
  await context.close();
});

test('sildid: kursor või fookus sõlmel näitab täisnime', async () => {
  const { page, context } = await open();
  await page.locator('.knot[data-id="fondipensioni-periood"] .hit').hover();
  assert.match(await page.locator('#yarnCap').innerText(), /Mõiste: Fondipensioni periood/);
  await page.mouse.move(5, 5);
  assert.match(await page.locator('#yarnCap').innerText(), /Tiri sõlme välja/);
  await page.locator('.knot[data-id="paindlik-pension"]').focus();
  assert.match(await page.locator('#yarnCap').innerText(), /Valik: Paindlik pension/);
  await context.close();
});

test('sildid: fookuses sõlme täisnimi on nähtav pealdises', async () => {
  const { page, context } = await open(`${KYSI_URL}#taiendav-sissemakse`);
  assert.match(await page.locator('#yarnCap').innerText(), /Fookuses: Täiendav sissemakse alla kolmeaastase lapse vanemale/);
  await context.close();
});

// ---------- tirimine ----------
async function dragKnot(page, id, dy, { release = true, steps = 12 } = {}) {
  const box = await page.locator(`.knot[data-id="${id}"] .hit`).boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps });
  if (release) await page.mouse.up();
  return { x, y };
}
const dirFor = async (page, id) => ((await knotPos(page, id))[1] < 160 ? 1 : -1);

test('tirimine: sõlme kaugele tirimine ja lahtilaskmine harutab lõnga', async () => {
  const { page, context } = await open();
  const dir = await dirFor(page, 'fondipension');
  await dragKnot(page, 'fondipension', dir * 95);
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#yarn').getAttribute('data-focus'), 'fondipension');
  assert.equal((await page.locator('#node h2').innerText()).trim(), 'Fondipension');
  const [x, y] = await knotPos(page, 'fondipension');
  assert.ok(Math.abs(x - 200) < 2 && Math.abs(y - 160) < 2, `keskel: ${x}, ${y}`);
  await context.close();
});

test('tirimine: lühike tõmme laseb kera tagasi ega ava sõlme', async () => {
  const { page, context } = await open();
  const before = await knotPos(page, 'fondipension');
  const dir = await dirFor(page, 'fondipension');
  await dragKnot(page, 'fondipension', dir * 22);
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#yarn').getAttribute('data-focus'), '');
  const after = await knotPos(page, 'fondipension');
  assert.ok(Math.hypot(after[0] - before[0], after[1] - before[1]) < 1.5, `ei läinud tagasi: ${before} -> ${after}`);
  await context.close();
});

test('tirimine: kuni lahti laskmiseni on lõngad pingul, nähtav on vihje ja naabrid venivad kaasa', async () => {
  const { page, context } = await open();
  const id = 'fondipension';
  const dir = await dirFor(page, id);
  const nb = NODES.find((n) => n.id === id).related[0][0];
  const nbBefore = await knotPos(page, nb);
  await dragKnot(page, id, dir * 95, { release: false });
  assert.match(await page.locator('#yarnCap').innerText(), /Lase lahti/);
  const touching = [];
  NODES.forEach((n) => n.related.forEach(([to]) => { if (n.id === id || to === id) touching.push(1); }));
  RUMORS.forEach((r) => r.nodes.forEach((x) => { if (x === id) touching.push(1); }));
  const ops = await page.locator('path.th').evaluateAll((els) => els.map((e) => Number(e.getAttribute('stroke-opacity'))));
  assert.equal(ops.filter((o) => o > 0.6).length, touching.length * 3, 'pingul lõngad');
  const nbNow = await knotPos(page, nb);
  assert.ok(Math.hypot(nbNow[0] - nbBefore[0], nbNow[1] - nbBefore[1]) > 5, 'naaber ei venind kaasa');
  assert.equal(await page.locator('#yarn').getAttribute('data-focus'), '', 'ei tohi enne lahtilaskmist harutada');
  await page.mouse.up();
  await context.close();
});

test('tirimine: poolel teel olev tõmme näitab vihjet "Tiri veel"', async () => {
  const { page, context } = await open();
  const dir = await dirFor(page, 'paindlik-pension');
  await dragKnot(page, 'paindlik-pension', dir * 30, { release: false });
  assert.match(await page.locator('#yarnCap').innerText(), /Tiri veel/);
  await page.mouse.up();
  await context.close();
});

test('tirimine: animatsiooniga töötab ja sõlm jõuab pärast lahtilaskmist keskele', async () => {
  const { page, context, errors } = await open(KYSI_URL, 390, 'no-preference');
  const dir = await dirFor(page, 'maksuvaba-tulu');
  await dragKnot(page, 'maksuvaba-tulu', dir * 95);
  await page.waitForTimeout(1600);
  assert.equal(await page.locator('#yarn').getAttribute('data-focus'), 'maksuvaba-tulu');
  const [x, y] = await knotPos(page, 'maksuvaba-tulu');
  assert.ok(Math.abs(x - 200) < 3 && Math.abs(y - 160) < 3, `keskel: ${x}, ${y}`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('tirimine: harutatud sõlme naabri tirimine viib selle keskele', async () => {
  const { page, context } = await open(`${KYSI_URL}#pensioniiga`);
  const nb = 'paindlik-pension';
  const dir = await dirFor(page, nb);
  await dragKnot(page, nb, dir * 95);
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#yarn').getAttribute('data-focus'), nb);
  await context.close();
});
