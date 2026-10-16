import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launch, ROOT } from './helpers.mjs';

const P = (f) => new URL(`../public/${f}`, import.meta.url).href;
const read = (f) => readFile(`${ROOT}public/${f}`, 'utf8');
const TAX = JSON.parse(await read('taxonomy.json'));
let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { await browser.close(); });

async function open({ query = '?lang=en', capture = false, width = 390, file = 'tingi.html' } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
  if (capture) await context.addInitScript(() => { window.MR_FORCE = true; window.__sent = []; navigator.sendBeacon = (u, b) => { b.text().then((t) => window.__sent.push(JSON.parse(t))); return true; }; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_FILE|fonts\.g/i.test(m.text())) errors.push(m.text()); });
  await page.goto(P(file) + query);
  await page.waitForTimeout(150);
  return { page, context, errors };
}
const sent = async (page) => { await page.evaluate(() => MR.flush()); await page.waitForTimeout(80); return (await page.evaluate(() => window.__sent)).flatMap((b) => b.events); };
const readS = (page, text) => page.evaluate((t) => { const D = window.DEBATE_LIGHT; return D.derive(D.read(t)); }, text);
const listenWith = async (page, text) => { await page.fill('#sentence', text); await page.click('#listen'); };

const EN = {
  1: 'I want a 10% raise, my manager says the budget is 3% and that we will revisit later.',
  2: 'The raise is not the most important thing to me, I want more remote days and a learning budget. My manager is open but needs something to take upstairs.',
  3: 'I have a written offer from another company and I will not take less than 8%. My manager says it cannot be done, there is no budget.'
};
const ET = {
  1: 'Tahan 10% palgatõusu, ülemus ütleb, et eelarve on 3% ja et vaatame hiljem.',
  2: 'Palgatõus pole mulle kõige tähtsam, tahan rohkem kaugtööd ja õppebüdžetti. Ülemus on avatud, aga vajab midagi, mida ülemusele viia.',
  3: 'Mul on kirjalik pakkumine teiselt firmalt ja ma ei võta alla 8%. Ülemus ütleb, et ei saa, eelarvet pole.'
};

// ---------- lause lugemine ----------
test('tingi: masin loeb lausest stiili, väited, prioriteedid ja numbrid mõlemas keeles', async () => {
  const { page, context } = await open();
  for (const L of [EN, ET]) {
    const a = await readS(page, L[1]);
    assert.equal(a.style, 'busy'); assert.ok(a.styleP > 0.6 && a.styleP < 1);
    assert.deepEqual(Object.keys(a.claims).filter((c) => a.claims[c].on), ['budget', 'timing']);
    assert.deepEqual([a.ask, a.askKnown, a.offer, a.offerKnown, a.walk], [10, true, 3, true, null]);
    assert.deepEqual(a.pr, ['salary', 'leave', 'learn']); assert.equal(a.prHeard, 1);        // palka ma kuulsin, ülejäänu vaikimisi
    const b = await readS(page, L[2]);
    assert.equal(b.style, 'flex'); assert.deepEqual(b.pr.slice(0, 2), ['remote', 'learn']); assert.equal(b.prHeard, 2);
    assert.equal(b.askKnown, false); assert.equal(b.offerKnown, false);
    const c = await readS(page, L[3]);
    assert.equal(c.style, 'firm'); assert.deepEqual([c.walk, c.askKnown], [8, false]); assert.deepEqual(Object.keys(c.claims).filter((x) => c.claims[x].on), ['budget']);
  }
  const pay = (t) => readS(page, t).then((d) => d.pay);
  assert.equal(await pay('Teenin 3 000 € kuus.'), 36000); assert.equal(await pay('I earn 60,000 USD a year.'), 60000); assert.equal(await pay('Palk on 2500 eurot kuus'), 30000);
  assert.equal(await pay('Mul on tavaline töö.'), null);
  const nocue = await readS(page, 'Tahan palka tõsta.');
  assert.ok(Math.abs(nocue.styleP - 1 / 3) < 1e-9);                                         // vihjeid pole: võrdsed tõenäosused
  await context.close();
});

test('tingi: ebakindel lugemine küsib ühte asja korraga, kindel ei küsi, ja parandus ühe puudutusega muudab lauda', async () => {
  const { page, context } = await open({ capture: true });
  await listenWith(page, 'I have a conversation tomorrow.');
  assert.equal(await page.locator('#reading').isVisible(), true);
  assert.match(await page.innerText('#askNote'), /I ask one thing: how does the other side tend to answer\?/);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'h-read');
  const before = await page.innerText('#baseLine');
  await page.click('[data-style="busy"]');
  assert.match(await page.innerText('#askNote'), /I ask one thing: besides pay, what matters most to you\?/);      // stiil on kindel, järgmine küsimus
  assert.notEqual(await page.innerText('#baseLine'), before); assert.match(await page.innerText('#baseLine'), /Salary only: \+2\.5%/);
  assert.match(await page.innerText('#prNote'), /did not hear any priorities/);
  await page.selectOption('#pr1', 'leave'); await page.selectOption('#pr2', 'leave');       // kordus ignoreeritakse
  assert.deepEqual(await page.evaluate(() => window.DEBATE_LIGHT.state().pr.slice(0, 2)), ['leave', 'salary']);
  assert.equal(await page.locator('#askNote').isVisible(), false);                           // nüüd ei küsi enam midagi
  await page.click('[data-claim="market"]');
  assert.equal(await page.getAttribute('[data-claim="market"]', 'aria-pressed'), 'true');
  await page.fill('#f-ask', '6'); await page.fill('#f-walk', '4'); await page.fill('#f-offer', '3'); await page.fill('#f-pay', '48000');
  assert.deepEqual(await page.evaluate(() => { const S = window.DEBATE_LIGHT.state(); return [S.ask, S.askKnown, S.walk, S.offer, S.pay]; }), [6, true, 4, 3, 48000]);
  assert.match(await page.innerText('#baseLine'), /Salary only: \+3%/);
  const ev = await sent(page);
  assert.deepEqual(new Set(ev.filter((e) => e.n === 'Reading Corrected').map((e) => e.p.field)), new Set(['style', 'priority', 'claim', 'ask', 'walk', 'offer', 'pay']));
  assert.equal(ev.find((e) => e.n === 'Sentence Read').p.confidence, 'low');
  await context.close();
  const o = await open({ capture: true });
  await listenWith(o.page, EN[1]);
  assert.equal(await o.page.locator('#askNote').isVisible(), false);
  assert.equal((await sent(o.page)).find((e) => e.n === 'Sentence Read').p.confidence, 'high');
  assert.match(await o.page.locator('[data-style="busy"]').innerText(), /\[inferred\] guess 8\d%/);
  assert.match(await o.page.locator('[data-claim="budget"]').innerText(), /heard 75%/);
  await o.context.close();
});

// ---------- laud ----------
test('tingi: kolm paketti mahuvad eelarvesse, ei jää alla ainult-palka, juht valib odavaima ja ruumi mõõt klapib mudeliga', async () => {
  const { page, context, errors } = await open({ capture: true });
  await listenWith(page, EN[2]);
  const r = await page.evaluate(() => { const D = window.DEBATE_LIGHT, b = D.pkgs(); return { ids: b.pk.map((p) => p.id), B: b.B, v0: b.v0, ok: b.pk.every((p) => p.c <= b.B + 1e-9 && p.v >= b.v0 - 1e-9), pick: b.pick.id, minId: b.pk.slice().sort((a, c) => a.c - c.c || c.v - a.v)[0].id, pv: b.pick.v, pc: b.pick.c, full: b.full.v, n: b.pk.length, single: !!b.single }; });
  assert.equal(r.n, 3); assert.deepEqual(r.ids, ['A', 'B', 'C']); assert.ok(r.ok); assert.equal(r.pick, r.minId);
  assert.equal(await page.locator('#pkgs li').count(), 3);
  assert.equal(await page.locator('#fail').isVisible(), false);
  await page.click('#offer');
  const res = await page.innerText('#boardRes'), pp = Math.round(r.pv / r.full * 100), g = Math.round((r.full / r.v0 - 1) * 100);
  assert.ok(res.startsWith(`I picked package ${r.pick}.`), res);
  assert.ok(res.includes(`you reached ${pp}%`) && res.includes(`+${g}% more value inside the same budget`), res);
  assert.equal(await page.locator('#fail').isVisible(), true);
  const ev = await sent(page);
  assert.equal(ev.find((e) => e.n === 'Package Offered').p.result, 'picked');
  assert.equal(await page.evaluate(() => MR.rejected.length), 0); assert.deepEqual(errors, []);
  await context.close();
});

test('tingi: palgalagi ja eelarve kärbe lülitavad lauda uuesti, sündmus tuleb ainult sisselülitamisel ja ruumi puudumist öeldakse ausalt', async () => {
  const { page, context } = await open({ capture: true });
  await listenWith(page, EN[2]);
  const base = await page.evaluate(() => { const b = window.DEBATE_LIGHT.pkgs(); return { B: b.B, offer: b.offer }; });
  await page.click('[data-lim="cut"]');
  assert.ok(Math.abs((await page.evaluate(() => window.DEBATE_LIGHT.pkgs().B)) - base.B * 0.7) < 1e-9);
  await page.click('[data-lim="cut"]');                                                     // välja
  await page.click('[data-lim="cap"]');
  const cap = await page.evaluate(() => { const b = window.DEBATE_LIGHT.pkgs(), VM = window.DEBATE_LIGHT.VM; return { max: Math.max(...b.pk.map((p) => p.p.salary)), cap: VM.capSteps(b.offer) }; });
  assert.ok(cap.max <= cap.cap);
  const ev = await sent(page);
  assert.deepEqual(ev.filter((e) => e.n === 'Surprise Drawn').map((e) => e.p.surprise_id), ['cut', 'cap']);   // väljalülitamine ei loe
  await page.click('[data-lim="cap"]');
  // jäik juht + palgalagi: baas jääb lae taha, ruumi pole
  await listenWith(page, EN[3]);
  assert.equal(await page.locator('#pkgs li').count(), 1);
  assert.equal(await page.locator('#oneOnly').isVisible(), true);                          // ainult üks pakett on sama hea kui ainult palk
  await page.click('[data-lim="cap"]');
  assert.equal(await page.locator('#noRoom').isVisible(), true);
  assert.match(await page.innerText('#noRoom'), /No room found: with your priorities no package beats salary only/);
  assert.equal(await page.locator('#offer').isDisabled(), true);
  await context.close();
});

// ---------- mängukast ----------
test('tingi: mängukasti link kannab stiili, soovi, piiri, prioriteedid ja esimese väite, ning mängukast avab need', async () => {
  const { page, context } = await open({ capture: true });
  await listenWith(page, EN[1]); await page.fill('#f-walk', '5');
  const href = await page.getAttribute('#gameboxLink', 'href');
  assert.match(href, /^mangukast\.html\?lang=en#s=busy&a=10&w=5&p=salary,leave,learn&k=budget$/);
  await page.evaluate(() => document.getElementById('gameboxLink').addEventListener('click', (e) => e.preventDefault()));
  await page.click('#gameboxLink');
  assert.ok((await sent(page)).some((e) => e.n === 'Gamebox Opened'));
  const pb = await open({ file: 'mangukast.html', query: '?lang=en' + href.slice(href.indexOf('#')) });
  assert.equal(await pb.page.getAttribute('[data-style="busy"]', 'aria-pressed'), 'true');
  assert.equal(await pb.page.inputValue('#ask'), '10'); assert.equal(await pb.page.inputValue('#walk'), '5');
  assert.deepEqual(await pb.page.evaluate(() => [pr1.value, pr2.value, pr3.value]), ['salary', 'leave', 'learn']);
  assert.equal(await pb.page.locator('section.knot[data-c="budget"].collapsed').count(), 0);        // esimene väide on avatud
  assert.equal(await pb.page.locator('section.knot.collapsed').count(), 6);
  assert.equal(await pb.page.locator('#threadWrap').isVisible(), true);
  assert.deepEqual(pb.errors, []);
  await pb.context.close();
  const bad = await open({ file: 'mangukast.html', query: '?lang=en#s=hacker&a=999' });                   // tundmatu stiil: ei juhtu midagi
  assert.equal(await bad.page.locator('#threadWrap').isVisible(), false);
  await bad.context.close();
  await context.close();
});

// ---------- privaatsus ja vestluskaart ----------
test('tingi: lause ja numbrid ei lähe mõõtmisse ning vestluskaart laaditakse alla numbritega ja ilma', async () => {
  const { page, context, errors } = await open({ capture: true });
  const sentence = 'I earn 61,500 USD, I want a 9% raise, my manager says the budget is 4% and we will revisit later. I will not take less than 7%.';
  await listenWith(page, sentence); await page.click('#offer');
  const grab = async () => { const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#mdBtn')]); return { name: dl.suggestedFilename(), text: await readFile(await dl.path(), 'utf8') }; };
  const withA = await grab(); await page.check('#mdHide'); const without = await grab();
  assert.equal(withA.name, 'vaidle.md'); assert.match(withA.text, /^# Debatable machine card/);
  for (const t of [withA.text, without.text]) {
    assert.ok(t.includes(sentence) && t.includes('## What I do not know') && t.includes('model v0.3, owner Mirko, reviewed 2026-10-17'), 'kaardilt puudub sisu');
    assert.ok(/## The table/.test(t) && /- Package [ABC]:/.test(t) && /## The manager’s pick/.test(t));
  }
  assert.ok(/Costs them \d/.test(withA.text) || /costs them \d/i.test(withA.text)); assert.ok(!/costs them \d/i.test(without.text), 'summadeta kaart näitas kulu');
  const ev = await sent(page), blob = JSON.stringify(ev);
  for (const secret of [sentence, '61500', '61,500', 'revisit', 'budget is']) assert.ok(!blob.includes(secret), `mõõtmisse läks: ${secret}`);
  for (const n of ['Page Viewed', 'Sentence Read', 'Package Offered', 'Card Downloaded']) assert.ok(ev.some((e) => e.n === n), n);
  assert.deepEqual(ev.filter((e) => e.n === 'Card Downloaded').map((e) => e.p), [{ card: 'tingi', amounts: 'shown' }, { card: 'tingi', amounts: 'hidden' }]);
  assert.equal(await page.evaluate(() => MR.rejected.length), 0); assert.deepEqual(errors, []);
  await context.close();
});

// ---------- keel, ligipääsetavus, raam ----------
test('tingi: vaikimisi eesti keeles, näited ja laud vahetavad keelt ilma seisu kaotamata, ?lang=en ei näita mustandi riba', async () => {
  let o = await open({ query: '' });
  assert.equal(await o.page.locator('html').getAttribute('lang'), 'et');
  assert.match(await o.page.locator('h1').innerText(), /Vaieldav masin/);
  assert.equal(await o.page.locator('#mr-banner').innerText(), '');
  assert.equal(await o.page.locator('#examples button').count(), 3);
  assert.match(await o.page.locator('#examples button').first().innerText(), /^Tahan 10% palgatõusu/);
  await o.page.click('[data-ex="2"]');
  assert.match(await o.page.innerText('#h-read'), /Ma kuulsin/); assert.match(await o.page.innerText('#baseLine'), /Ainult palk: \+3,5%/);
  assert.match(await o.page.locator('#pkgs li').first().innerText(), /Pakett A/);
  assert.match(await o.page.innerText('#unk'), /Ma ei tea sinu päris palka \(kasutan 60\u00a0000\u00a0€\)/);
  assert.equal(await o.page.innerText('#modelLine'), 'Ma ei tea ettevõtte tegelikku eelarvet ega juhi tegelikke eelistusi. Ma oletan hoobade hinnad ja kulukordajad: mudel v0.3, omanik Mirko, üle vaadatud 2026-10-17.');
  await o.page.click('[data-style="firm"]');
  await o.page.selectOption('#mr-langsel', 'en');
  assert.match(await o.page.locator('h1').innerText(), /Debatable machine/);
  assert.equal(await o.page.getAttribute('[data-style="firm"]', 'aria-pressed'), 'true');            // parandus säilib
  assert.match(await o.page.innerText('#baseLine'), /Salary only: \+2%/);
  assert.match(await o.page.locator('#pkgs li').first().innerText(), /Package A/);
  assert.equal(await o.page.locator('#mr-banner').innerText(), '');
  await o.context.close();
  o = await open({ query: '?lang=de' });
  assert.match(await o.page.locator('h1').innerText(), /Debatable machine/); assert.notEqual(await o.page.locator('#mr-banner').innerText(), '');
  await o.context.close();
});

test('tingi: kõigil seisudel pole horisontaalset kerimist, väljadel on sildid, nuppudel nimed ja register on puhas', async () => {
  for (const width of [360, 390, 768]) {
    const { page, context, errors } = await open({ width });
    const check = async (label) => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${width} ${label}: kerimine`);
      const unnamed = await page.evaluate(() => [...document.querySelectorAll('main button, main select, main input, main textarea, main a.btn')].filter((e) => e.offsetParent !== null).filter((e) => {
        if (e.tagName === 'BUTTON' || e.tagName === 'A') return !e.innerText.trim();
        if (e.type === 'checkbox' && e.closest('label')) return false;
        return !(e.id && document.querySelector(`label[for="${e.id}"]`)) && !e.getAttribute('aria-label');
      }).map((e) => e.id || e.tagName));
      assert.deepEqual(unnamed, [], `${width} ${label}: nimeta elemendid`);
      assert.deepEqual(await page.evaluate(() => MR.audit()), [], `${width} ${label}: audit`);
    };
    await check('algus');
    await listenWith(page, EN[2]); await check('lugemine ja laud');
    await page.click('#offer'); await check('valik');
    assert.equal(await page.evaluate(() => MR.rejected.length), 0); assert.deepEqual(errors, [], String(width));
    await context.close();
  }
});

test('tingi: menüüst „Vaidle“ jõuab sellele lehele, see on aktiivne ja klaviatuuriga läbitav; ots.html liigub siia', async () => {
  const o = await open({ file: 'index.html', query: '' });
  await o.page.click('#mr-nav a[href^="tingi.html"]'); await o.page.waitForLoadState();
  assert.match(await o.page.locator('h1').innerText(), /Vaieldav masin/);
  assert.equal(await o.page.locator('#mr-nav [aria-current="page"]').innerText(), 'Tingi');
  await o.page.focus('[data-ex="3"]'); await o.page.keyboard.press('Enter');
  assert.equal(await o.page.evaluate(() => document.activeElement.id), 'h-read');
  assert.equal(await o.page.getAttribute('[data-style="firm"]', 'aria-pressed'), 'true');
  await o.context.close();
  const ots = await open({ file: 'ots.html', query: '' });
  assert.equal(await ots.page.locator('#palgalink a[href^="tingi.html"]').count(), 1);
  await ots.context.close();
});

test('tingi: leht on registris, ei kasuta salvestust ega võrgupäringuid ja lugemine töötab ilma serverita', async () => {
  const html = await read('tingi.html'), model = await read('vaidle-mudel.js');
  assert.ok(TAX.pages.tingi && TAX.enums.pages.includes('tingi') && TAX.enums.nav_items.includes('tingi'));
  for (const e of ['Sentence Read', 'Reading Corrected', 'Gamebox Opened']) assert.ok(TAX.events[e], e);
  for (const c of ['sentence.listen-button', 'sentence.example', 'reading.chip', 'board.limit-toggle', 'board.offer-button', 'board.gamebox-link', 'file.md-button']) assert.ok(TAX.components[`tingi.${c}`], c);
  for (const f of [html, model]) { assert.ok(!/localStorage|sessionStorage|indexedDB|document\.cookie/.test(f), 'salvestus on keelatud'); assert.ok(!/fetch\(|XMLHttpRequest/.test(f), 'võrgupäringuid pole'); }
  assert.ok(html.includes('<script src="vaidle-mudel.js"></script>') && (await read('mangukast.html')).includes('<script src="vaidle-mudel.js"></script>'), 'mõlemad lehed kasutavad sama mudelifaili');
  assert.ok(!/var KAP=\{/.test(html) && !/var KAP=\{/.test(await read('mangukast.html')), 'kulukordajad ei tohi olla lehtedel');
});
