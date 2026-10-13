import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launch, ROOT } from './helpers.mjs';

const OTS_URL = new URL('../public/ots.html', import.meta.url).href;
const html = await readFile(`${ROOT}public/ots.html`, 'utf8');
const haruta = await readFile(`${ROOT}public/haruta.html`, 'utf8');
const NODE_IDS = new Set(JSON.parse(haruta.match(/<script type="application\/json" id="nodes">([\s\S]*?)<\/script>/)[1]).map((n) => n.id));

// sõltumatu referent
const fv = (s, years, r) => (r === 0 ? s * 12 * years : s * ((Math.pow(1 + Math.pow(1 + r, 1 / 12) - 1, 12 * years) - 1) / (Math.pow(1 + r, 1 / 12) - 1)));
const r100 = (n) => Math.round(n / 100) * 100;
const sp = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, '\u00a0') + '\u00a0€';

let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { await browser.close(); });

async function open(width = 390, { all = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [], requests = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_NAME_NOT_RESOLVED|fonts\.g/i.test(m.text())) errors.push(m.text()); });
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(OTS_URL);
  await page.waitForTimeout(100);
  if (all) await page.click('#openAll');
  return { page, context, errors, requests };
}
const fill = async (page, o) => { for (const [k, v] of Object.entries(o)) await page.fill(`#${k}`, String(v)); };
const SITS = JSON.parse(html.match(/<script type="application\/json" id="sitdata">([\s\S]*?)<\/script>/)[1]);
const metric = (n, v) => ({ saastmaar: v.tulu > 0 && v.saast != null ? v.saast / v.tulu : null, kulumaar: v.tulu > 0 && v.kulu != null ? v.kulu / v.tulu : null, funmaar: v.tulu > 0 && v.fun != null ? v.fun / v.tulu : null, puhverKuud: v.kulu > 0 && v.puhver != null ? v.puhver / v.kulu : null }[n] ?? null);
const ruleOk = (r, v) => r.conds.every(([n, op, x]) => { const m = metric(n, v); return m !== null && (op === '<=' ? m <= x : m >= x); });
const openedKnots = (page) => page.locator('section.knot[data-k]:not(.collapsed)').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-k'))));
const nr = (page, k) => page.locator(`[data-nr="${k}"]`).innerText();

test('kaheksa sõlme, igaühel kõik osad (ka Unista) ja usaldusmärk', async () => {
  const { page, context, errors } = await open();
  assert.equal(await page.locator('section.knot[data-k]').count(), 8);
  for (let k = 1; k <= 8; k++) {
    const t = await page.locator(`.knot[data-k="${k}"]`).evaluate((el) => el.textContent);
    for (const part of ['Mis muutub', 'Sinu arv', 'Unista', 'Lõks', 'Kuidas tead, et oled valmis', 'Allikas']) assert.ok(t.includes(part), `sõlm ${k}: puudub "${part}"`);
    assert.match(t, /\[(verified|secondary|inferred|kontrollimata)\]/, `sõlm ${k}: usaldusmärk`);
  }
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await context.close();
});

test('tühjalt ei näita NaN-i ega lõpmatust, vaid ütleb, mida lisada', async () => {
  const { page, context } = await open();
  const body = await page.locator('main').innerText();
  assert.doesNotMatch(body, /NaN|Infinity|undefined/);
  assert.match(await nr(page, 1), /Lisa/);
  await context.close();
});

test('näidisandmed: arvud vastavad sõltumatule referendile', async () => {
  const { page, context } = await open();
  await page.click('#sample');
  const [tulu, kulu, saast, puhver, laen, kuud, hind] = [2500, 1900, 300, 4000, 375, 12, 1000];
  assert.match(await nr(page, 1), new RegExp(`Siin on ${sp(tulu - kulu - saast).replace(/\u00a0/g, '\\s')} kuus, mida sa ei oska nimetada`));
  assert.match(await nr(page, 2), new RegExp(String(Math.round((puhver / kulu) * 10) / 10).replace('.', ',') + ' kuud'));
  const t3 = await nr(page, 3);
  assert.match(t3, new RegExp(Math.round((laen / tulu) * 100) + '%'));
  assert.match(t3, new RegExp(Math.round((saast / tulu) * 100) + '% → ' + Math.round(((saast + laen) / tulu) * 100) + '%'));
  const t4 = await nr(page, 4);
  assert.match(t4, new RegExp(Math.round(((saast + 0.1 * tulu) / (1.1 * tulu)) * 100) + '%'));
  assert.match(t4, new RegExp(Math.round(((saast + 0.1 * kulu) / tulu) * 100) + '%'));
  const t5 = (await nr(page, 5)).replace(/\u00a0/g, ' ');
  assert.ok(t5.includes(`${sp(r100(fv(saast, 5, 0))).replace(/\u00a0/g, ' ')}–${sp(r100(fv(saast, 5, 0.04))).replace(/\u00a0/g, ' ')}`), t5);
  assert.ok(t5.includes(`${sp(r100(fv(saast, 10, 0))).replace(/\u00a0/g, ' ')}–${sp(r100(fv(saast, 10, 0.04))).replace(/\u00a0/g, ' ')}`), t5);
  const t7 = (await nr(page, 8)).replace(/\u00a0/g, ' ');
  assert.ok(t7.includes(`${Math.round((puhver + fv(saast, 5, 0)) / hind)}–${Math.round((puhver + fv(saast, 5, 0.04)) / hind)} kuud`), t7);
  assert.ok(t7.includes(`${sp(kuud * hind).replace(/\u00a0/g, ' ')}`) && t7.includes(`${sp(kuud * hind - puhver).replace(/\u00a0/g, ' ')}`), t7);
  await context.close();
});

test('aus enda vastu: jääk null, positiivne ja negatiivne annavad erineva sõnumi', async () => {
  const { page, context } = await open();
  await fill(page, { tulu: 2500, kulu: 1900, saast: 600 });
  assert.match(await nr(page, 1), /Numbrid klapivad/);
  await fill(page, { saast: 300 });
  assert.match(await nr(page, 1), /ei oska nimetada/);
  await fill(page, { kulu: 2400 });
  assert.match(await nr(page, 1), /rohkem, kui teenid/);
  await context.close();
});

test('arvude sisestus: tühikud ja koma toimivad, tühi või null ei lõhu midagi', async () => {
  const { page, context } = await open();
  await fill(page, { tulu: '2 500,50', kulu: '1 900', saast: '300,25' });
  assert.match(await nr(page, 1), /2\s500\s€|2\s501\s€/);
  await fill(page, { tulu: 0, kulu: 0, saast: 0, puhver: 0, laen: 0, kuud: 0 });
  const body = await page.locator('main').innerText();
  assert.doesNotMatch(body, /NaN|Infinity|undefined/);
  await context.close();
});

test('privaatsus: midagi ei salvestata ega saadeta kuhugi', async () => {
  const { page, context, requests } = await open();
  await page.click('#sample');
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.equal(await page.evaluate(() => document.cookie), '');
  const outside = requests.filter((u) => u.startsWith('http') && !/fonts\.(googleapis|gstatic)\.com/.test(u));
  assert.deepEqual(outside, []);
  await context.close();
});

test('lehel ei ole soovitusi: nõu andvaid sõnu ei kasutata', async () => {
  const { page, context } = await open();
  await page.click('#sample');
  const body = (await page.locator('main').evaluate((el) => el.textContent)).toLowerCase();
  for (const bad of ['peaksid', 'peaksite', 'soovitan', 'soovitame', 'osta ', 'müü ', 'investeeri ', 'tee nii', 'tasub ']) assert.ok(!body.includes(bad), `soovitav sõna: ${bad}`);
  await context.close();
});

test('lõngakera lingid osutavad olemasolevatele sõlmedele ja lehed viitavad teineteisele', async () => {
  const links = [...html.matchAll(/lk\('([a-z0-9-]+)'/g)].map((m) => m[1]);
  assert.ok(links.length >= 4);
  for (const id of links) assert.ok(NODE_IDS.has(id), `puuduv sõlm: ${id}`);
  assert.ok(html.includes('href="index.html"') && html.includes('href="haruta.html"'));
  const idx = await readFile(`${ROOT}public/index.html`, 'utf8');
  assert.ok(idx.includes('href="ots.html"'), 'manifest viitab Lõnga otsale');
  assert.ok(haruta.includes('href="ots.html"'), 'lõngakera viitab Lõnga otsale');
});

test('lõng joonistub: kaheksa numbrit ja päike otsas ning see uueneb sisestusega', async () => {
  const { page, context } = await open();
  assert.equal(await page.locator('#threadSvg circle').count(), 9);
  assert.equal(await page.locator('#threadSvg text').count(), 8);
  assert.equal(await page.locator('#threadSvg circle.sunc').count(), 1);
  const h1 = await page.evaluate(() => document.getElementById('thread').offsetHeight);
  await page.click('#sample');
  const h2 = await page.evaluate(() => document.getElementById('thread').offsetHeight);
  assert.ok(h2 >= h1, 'sõlmed kasvavad, kui arvud lisanduvad');
  assert.equal(await page.locator('#threadSvg circle').count(), 9);
  await context.close();
});

// ---------- fun money ja unistus ----------
test('fun money: sõlm näitab tasakaalu täna ja hiljem sõltumatu referendi järgi', async () => {
  const { page, context } = await open();
  await page.click('#sample');
  const t = (await nr(page, 6)).replace(/\u00a0/g, ' ');
  assert.match(t, /Fun money on 400 € kuus \(16% sinu tulust\)/);
  assert.match(t, /täna 16% ja hiljem \(sääst\) 12%/);
  assert.ok(t.includes(`${sp(r100(fv(50, 10, 0))).replace(/\u00a0/g, ' ')}–${sp(r100(fv(50, 10, 0.04))).replace(/\u00a0/g, ' ')}`), t);
  assert.match(t, /võtab täna 50 € kuus elu/);
  await context.close();
});

test('fun money: puudu, null ja suur väärtus annavad eri sõnumid ega lõhu midagi', async () => {
  const { page, context } = await open();
  await fill(page, { tulu: 2500, kulu: 1900, saast: 300 });
  assert.match(await nr(page, 6), /Lisa fun money kuus/);
  await fill(page, { fun: 0 });
  assert.match(await nr(page, 6), /kogu nauding on jäetud hilisemaks/);
  await fill(page, { fun: 5000 });
  assert.doesNotMatch(await page.locator('main').innerText(), /NaN|Infinity|undefined/);
  await context.close();
});

test('palgapott: joonis jaotab tulu baasiks, laenuks, funiks, säästuks ja nimetamata jäägiks', async () => {
  const { page, context } = await open();
  await page.click('#sample');
  const widths = await page.locator('[data-nr="1"] .pot i').evaluateAll((els) => els.map((e) => parseFloat(e.style.width)));
  assert.equal(widths.length, 5);
  [45, 15, 16, 12, 12].forEach((w, i) => assert.ok(Math.abs(widths[i] - w) < 0.2, `segment ${i}: ${widths[i]}`));
  assert.ok(Math.abs(widths.reduce((a, b) => a + b, 0) - 100) < 0.5);
  await context.close();
});

test('unistus: iga sõlm näitab sinu unistust, lõnga ots kordab seda ja HTML ei käivitu', async () => {
  const { page, context } = await open();
  await page.fill('#unistus', 'Aeglased hommikud <b>maakodus</b>');
  for (let k = 1; k <= 8; k++) {
    const t = await page.locator(`[data-dream="${k}"]`).innerText();
    assert.ok(t.includes('Sinu unistus: „Aeglased hommikud <b>maakodus</b>“'), `sõlm ${k}: ${t}`);
  }
  assert.equal(await page.locator('#end b').count(), 1, 'ots peab olema ainult üks paks tekst, mitte sisestatud HTML');
  assert.ok((await page.locator('#endNr').innerText()).includes('Aeglased hommikud <b>maakodus</b>'));
  assert.equal(await page.locator('[data-dream] b').count(), 0);
  await context.close();
});

test('unistus: ilma unistuseta on igal sõlmel ikka küsimus ja ots kutsub kirjutama', async () => {
  const { page, context } = await open();
  for (let k = 1; k <= 8; k++) assert.ok((await page.locator(`[data-dream="${k}"]`).innerText()).trim().endsWith('?'), `sõlm ${k}`);
  assert.match(await page.locator('#endNr').innerText(), /Kirjuta oma unistus/);
  await context.close();
});

test('unistus ja fun money: midagi ei salvestata, tulevane mina on viidatud manifestis', async () => {
  const { page, context } = await open();
  await page.click('#sample');
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  assert.ok(html.includes('index.html#unista'));
  const idx = await readFile(`${ROOT}public/index.html`, 'utf8');
  assert.ok(idx.includes('id="unista"'), 'manifestis peab olema Unista osa');
  assert.ok(!html.toLowerCase().includes('seitse'), 'leht peab ütlema kaheksa, mitte seitse');
  await context.close();
});

// ---------- olukorrad: tabel juhib kõike ----------
test('olukordade tabel: väljad, esimene sõlm on olemas, näited vastavad oma reeglile', () => {
  assert.ok(SITS.length >= 6);
  assert.equal(new Set(SITS.map((x) => x.id)).size, SITS.length);
  for (const x of SITS) {
    for (const f of ['id', 'nimi', 'lause', 'tunnus', 'reegel', 'naide', 'esimene', 'kusimus', 'mang', 'rahu', 'korduv', 'eiVaida']) assert.ok(x[f] !== undefined && x[f] !== '', `${x.id}: puudub ${f}`);
    assert.ok(Number.isInteger(x.esimene) && x.esimene >= 1 && x.esimene <= 8, `${x.id}: esimene sõlm`);
    assert.ok(x.lause.split(/\s+/).length <= 14, `${x.id}: lause liiga pikk`);
    assert.ok(['number', 'enda ütlus'].includes(x.tunnus));
    for (const v of Object.values(x.naide)) assert.equal(typeof v, 'number');
    if (x.tunnus === 'number') { assert.ok(x.reegel.conds.length > 0); assert.ok(ruleOk(x.reegel, x.naide), `${x.id}: näide ei vasta oma reeglile`); }
    else assert.equal(x.reegel.conds.length, 0, `${x.id}: enda ütlus ei tohi väita numbrireeglit`);
    assert.match(x.eiVaida, /^Ma ei väida/, `${x.id}: eiVaida`);
  }
});

test('algseis: avatud on ainult esimene sõlm; Tiri järgmine ja Ava kõik toimivad', async () => {
  const { page, context } = await open(390, { all: false });
  assert.deepEqual(await openedKnots(page), [1]);
  await page.locator('section.knot[data-k="1"] .knext').click();
  assert.deepEqual(await openedKnots(page), [1, 2]);
  await page.click('#openAll');
  assert.deepEqual(await openedKnots(page), [1, 2, 3, 4, 5, 6, 7, 8]);
  await context.close();
});

test('olukord: valik täidab näitenumbrid, avab ainult esimese lõnga ja näitab ringi, küsimust ja rahu rida', async () => {
  const { page, context } = await open(390, { all: false });
  const st = SITS.find((x) => x.id === 'algus');
  await page.click(`[data-sit="${st.id}"]`);
  assert.deepEqual(await openedKnots(page), [st.esimene]);
  assert.equal(await page.inputValue('#tulu'), String(st.naide.tulu));
  const panel = await page.locator('#panel').innerText();
  for (const t of [st.nimi, st.kusimus, st.mang, st.rahu, st.korduv, st.eiVaida, 'näide']) assert.ok(panel.includes(t), `paneelil puudub: ${t}`);
  assert.match(panel, /ring: Mina/);
  await context.close();
});

test('andmemärk: näide muutub sinu numbriks, kui muudad kõik selle sõlme sisendid', async () => {
  const { page, context } = await open(390, { all: false });
  await page.click('[data-sit="algus"]');
  await page.locator('section.knot[data-k="5"] .kopen').click().catch(() => {});
  assert.match(await page.locator('[data-dq="5"]').innerText(), /näide/);
  await fill(page, { tulu: 2000 });
  assert.match(await page.locator('[data-dq="5"]').innerText(), /näide/, 'sääst on veel näide');
  await fill(page, { saast: 300 });
  assert.match(await page.locator('[data-dq="5"]').innerText(), /sinu number/);
  await page.click('#clear');
  assert.match(await page.locator('[data-dq="5"]').innerText(), /puudub/);
  await context.close();
});

test('tuvastus: reegel näitab end ja numbrid jäävad sinu omaks, kui valid soovitatud olukorra', async () => {
  const { page, context } = await open(390, { all: false });
  await fill(page, { tulu: 1450, kulu: 1420, saast: 0 });
  const rec = await page.locator('#recog').innerText();
  assert.match(rec, /Sind tunneb ära reegel/);
  assert.match(rec, /Kuu lõpp jääb lühikeseks/);
  await page.click('[data-rec="0"]');
  assert.equal(await page.inputValue('#tulu'), '1450', 'tuvastus ei tohi numbreid üle kirjutada');
  assert.match(await page.locator('#panel').innerText(), /Numbrid on sinu omad/);
  await fill(page, { saast: 400 });
  assert.match(await page.locator('#recog').innerText(), /ei vasta enam reeglile/);
  await context.close();
});

test('tuvastus: "enda ütlus" olukordi numbritest ei tuvastata', async () => {
  const { page, context } = await open(390, { all: false });
  await fill(page, { tulu: 2900, kulu: 2600, saast: 150, puhver: 3000 });
  const rec = await page.locator('#recog').innerText();
  assert.doesNotMatch(rec, /Esimesed lapsed|Teekonna algus|Kaasaandmine/);
  await context.close();
});

test('definitsioonid: iga sõlm ütleb, kuidas arv tehti (arvutus, aken, piirangud) ja millisesse ringi see kuulub', async () => {
  const { page, context } = await open();
  for (let k = 1; k <= 8; k++) {
    const t = await page.locator(`section.knot[data-k="${k}"] details.how`).evaluate((e) => e.textContent);
    for (const part of ['Arvutus:', 'Aken:', 'Piirangud:']) assert.ok(t.includes(part), `sõlm ${k}: ${part}`);
    assert.match(await page.locator(`section.knot[data-k="${k}"] .kmeta`).innerText(), /Ring: /);
  }
  await context.close();
});

test('paljastus: ringid ja tuvastus on märgitud lihtsustuseks ja subjektiivseks', async () => {
  const { page, context } = await open();
  const t = await page.locator('#reveal').innerText();
  assert.match(t, /Bronfenbrenneri mudelist/);
  assert.match(t, /eksib sageli/);
  assert.match(await page.locator('#pick').innerText(), /väljamõeldud näited, mitte inimeste kategooriad/);
  await context.close();
});

test('olukorrad ei lisa salvestust ega soovitusi', async () => {
  const { page, context, requests } = await open(390, { all: false });
  for (const x of SITS) await page.click(`[data-sit="${x.id}"]`);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  const outside = requests.filter((u) => u.startsWith('http') && !/fonts\.(googleapis|gstatic)\.com/.test(u));
  assert.deepEqual(outside, []);
  const body = (await page.locator('main').evaluate((el) => el.textContent)).toLowerCase();
  for (const bad of ['peaksid', 'peaksite', 'soovitan', 'soovitame', 'osta ', 'müü ', 'investeeri ', 'tee nii', 'tasub ']) assert.ok(!body.includes(bad), `soovitav sõna: ${bad}`);
  await context.close();
});

// ---------- lõngaots.md ----------
test('lõngaots.md: kaart sisaldab olukorda, numbreid andmemärgiga, küsimusi ja piire; summad saab peita', async () => {
  const { page, context } = await open(390, { all: false });
  await page.click('[data-sit="rahatark"]');
  const get = async (hide) => { if (hide) await page.check('#mdHide'); else await page.uncheck('#mdHide'); const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#mdBtn')]); assert.equal(dl.suggestedFilename(), 'longaots.md'); return readFile(await dl.path(), 'utf8'); };
  const md = await get(false);
  for (const t of ['# Lõnga ots: minu olukorra kaart', 'Vestlusalus, mitte nõu', '## Minu olukord', 'Rahatark, kes koonerdab?', 'Esimene lõng: 6. Fun money', '## Minu numbrid', '| Netosissetulek kuus | 3', '| näide |', '## Kaheksa sõlme ja minu seis', '## Küsimused vestluseks', '## Mida see kaart ei väida', 'Olukorra reegel eksib sageli', 'Bronfenbrenneri']) assert.ok(md.includes(t), `puudub: ${t}`);
  assert.match(md, /\d\s?€/, 'summad on nähtaval');
  await fill(page, { tulu: 3600 });
  const md2 = await get(false);
  assert.match(md2, /\| Netosissetulek kuus \| 3\s?600[^|]*\| sinu number \|/);
  const hidden = await get(true);
  assert.doesNotMatch(hidden, /\d[\d\u00a0 ]*\s?€/, 'peidetud failis ei tohi olla summasid');
  assert.match(hidden, /\| Netosissetulek kuus \| – \|/);
  assert.ok(hidden.includes('Rahatark, kes koonerdab?'));
  const ev = (await page.evaluate(() => MR.log)).filter((e) => e.n === 'Card Downloaded').map((e) => e.p.amounts);
  assert.deepEqual(ev, ['shown', 'shown', 'hidden']);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  await context.close();
});

test('lõngaots.md: ilma olukorrata ja unistusega kaart ütleb seda ausalt', async () => {
  const { page, context } = await open(390, { all: false });
  await fill(page, { unistus: 'Aeglased hommikud maakodus' });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#mdBtn')]);
  const md = await readFile(await dl.path(), 'utf8');
  assert.ok(md.includes('Alustan tühjalt, ilma olukorra kaardita.'));
  assert.ok(md.includes('## Minu unistus') && md.includes('„Aeglased hommikud maakodus“'));
  await context.close();
});
