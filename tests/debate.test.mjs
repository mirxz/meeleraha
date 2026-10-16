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

async function open({ query = '?lang=en', capture = false, width = 390, file = 'debate.html' } = {}) {
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
// Esimene tõmme + tõendid + kõik sõlmed lahti
async function begin(page, style, evs = ['job-ad', 'results']) {
  await page.click(`[data-style="${style}"]`);
  for (const e of evs) await page.click(`[data-ev="${e}"]`);
  await page.click('#openAll');
}
const knot = (c) => `section.knot[data-c="${c}"]`;
const offerText = (page) => page.innerText('#offerBig');
async function challenge(page, claim, evId, why) {
  if (why) await page.click(`${knot(claim)} [data-act="why"]`);
  await page.selectOption(`#sel-${claim}`, evId);
  await page.click(`${knot(claim)} [data-act="ch"]`);
}
const dq = (page, c) => page.locator(`${knot(c)} .dq`).innerText();

// ---------- mootor: sõltumatu kontroll ----------
test('debate: kuu kaupa kogumise iteratsioon võrdub suletud valemiga ja tagurpidi arvutus ringi peale', async () => {
  const { page, context } = await open();
  const r = await page.evaluate(() => {
    const D = window.DEBATE, out = [];
    for (const [target, assets, save, ret] of [[600000, 50000, 1000, 4], [600000, 50000, 1200, 4], [300000, 0, 500, 2], [800000, 120000, 2500, 5], [600000, 50000, 1000, 0]]) out.push({ target, assets, save, ret, it: D.monthsToFire(target, assets, save, ret) });
    const back = [];
    for (const years of [5, 10, 12, 20]) { const req = D.requiredSave(600000, 50000, 4, years), req0 = D.requiredSave(600000, 50000, 0, years); back.push({ years, req, m: D.monthsToFire(600000, 50000, req, 4), req0, m0: D.monthsToFire(600000, 50000, req0, 0) }); }
    return { out, back };
  });
  for (const c of r.out) {
    const rm = Math.pow(1 + c.ret / 100, 1 / 12) - 1;
    const closed = rm === 0 ? Math.ceil((c.target - c.assets) / c.save) : Math.ceil(Math.log((c.target + c.save / rm) / (c.assets + c.save / rm)) / Math.log(1 + rm) - 1e-9);
    assert.equal(c.it, closed, JSON.stringify(c));
  }
  for (const b of r.back) { assert.ok(b.m <= b.years * 12, `${b.years} a 4%: ${b.m}`); assert.ok(b.m0 <= b.years * 12, `${b.years} a 0%: ${b.m0}`); assert.ok(b.req < b.req0, 'tootlus peab nõutavat sääste vähendama'); }
  assert.equal(await page.evaluate(() => window.DEBATE.monthsToFire(100, 200, 0, 4)), 0);
  assert.equal(await page.evaluate(() => window.DEBATE.monthsToFire(1e9, 0, 0, 0)), Infinity);
  await context.close();
});

// ---------- reeglitabel ----------
test('debate: Miks? ei vähenda kunagi tulemust, tugevad tõendid ei jää nõrgemaks ja jäik eelarve ei murdu tõendiga', async () => {
  const { page, context } = await open();
  const bad = await page.evaluate(() => {
    const D = window.DEBATE, rank = { held: 0, weakened: 1, broken: 2 }, bad = [];
    for (const s of D.styles) for (const c of D.claims) for (const e of D.evid) if (rank[D.judge(s, c, e, true)] < rank[D.judge(s, c, e, false)]) bad.push(`why ${s}/${c}/${e}`);
    return bad;
  });
  assert.deepEqual(bad, []);
  assert.deepEqual(await page.evaluate(() => { const D = window.DEBATE; return [D.judge('firm', 'market', 'job-ad', false), D.judge('firm', 'market', 'job-ad', true), D.judge('firm', 'market', 'offer', true), D.judge('firm', 'budget', 'results', true), D.judge('flex', 'budget', 'results', true), D.judge('flex', 'market', 'ai', true)]; }),
    ['held', 'weakened', 'broken', 'held', 'broken', 'weakened']);
  assert.deepEqual(await page.evaluate(() => [window.DEBATE.claims, window.DEBATE.evid, window.DEBATE.styles]), [TAX.enums.claim_ids, TAX.enums.evidence_ids, TAX.enums.debate_styles]);
  await context.close();
});

// ---------- üks lõng, viis sõlme ----------
test('debate: esimene tõmme täidab näitenumbrid, avab ainult esimese sõlme ja joonistab niidi seitsme numbri ja päikesega', async () => {
  const { page, context } = await open();
  assert.equal(await page.locator('#threadWrap').isVisible(), false);
  assert.equal(await page.locator('#panel').isVisible(), false);
  await page.click('[data-style="busy"]');
  assert.equal(await page.inputValue('#pay'), '60000');
  assert.equal(await page.locator('#sampleChip').isVisible(), true);
  assert.match(await page.inputValue('#unistus'), /Slow mornings/);
  const panel = await page.innerText('#panel');
  assert.match(panel, /First thread[\s\S]*5\. Timing[\s\S]*First question[\s\S]*First toy[\s\S]*Peace with the past[\s\S]*Recurring conversation/);
  assert.equal(await page.locator('section.knot.collapsed').count(), 6);
  assert.equal(await page.locator(`${knot('timing')}.collapsed`).count(), 0);
  assert.equal(await page.locator('section.knot').count(), 8);                                   // 5 väidet + Laud + Üllatus + lõnga ots
  assert.equal(await page.locator('#threadSvg text').count(), 7);                                // numbrid 1..7
  assert.equal(await page.locator('#threadSvg circle.sunc').count(), 1);
  assert.deepEqual(await page.locator('#knots .kmeta .chip:first-child').allInnerTexts(), ['Ring: Indirect (employer)', 'Ring: Indirect (employer)', 'Ring: Indirect (employer, market)', 'Ring: Me', 'Ring: Time', 'Ring: Indirect (employer)', 'Ring: Time']);
  await page.click('#openAll');
  assert.equal(await page.locator('section.knot.collapsed').count(), 0);
  assert.match(await page.locator(`${knot('timing')} .src`).innerText(), /\[kontrollimata\]/);
  assert.match(await page.locator(`${knot('market')} .src`).innerText(), /\[secondary\]/);
  await context.close();
});

test('debate: pakkumine liigub ainult tõendi ja Miks? järgi, ei ületa soovi ja Miks? enne vaidlustamist annab rohkem', async () => {
  const { page, context, errors } = await open();
  await begin(page, 'flex');
  assert.equal(await offerText(page), '3.5%');
  await challenge(page, 'market', 'job-ad', false);                       // 2+0-1 = 1: nõrgeneb, pool väärtusest (3/2)
  assert.equal(await offerText(page), '5%');
  assert.equal(await dq(page, 'market'), 'Weakened');
  await challenge(page, 'market', 'job-ad', true);                        // Miks? lisab 1: 3 -> tagasi, täisväärtus 3
  assert.equal(await offerText(page), '6.5%');
  assert.equal(await dq(page, 'market'), 'Withdrawn');
  assert.equal(await page.locator(`${knot('market')} [data-act="ch"]`).isDisabled(), true);
  await challenge(page, 'performance', 'results', true);                  // 3+1-1 = 3: +2
  assert.equal(await offerText(page), '8.5%');
  await challenge(page, 'band', 'results', true);                         // 1+1-1 = 1: nõrgeneb +1
  assert.equal(await offerText(page), '9.5%');
  await challenge(page, 'budget', 'results', true);                       // 2+1-1 = 2: +2, kuid soov on 10
  assert.equal(await offerText(page), '10%');
  assert.equal(await page.locator('#offerBar .pot').getAttribute('role'), 'img');
  assert.match(await page.locator('#offerBar .potleg').innerText(), /Start 3\.5% · Argued \+6\.5 · Still open up to your ask 10%/);
  assert.match(await page.locator('#logList').innerText(), /Asked for the basis of “Market data”/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('debate: soovi väli piirab pakkumist ja jäik vastaspool alustab madalamalt', async () => {
  const { page, context } = await open();
  await page.click('[data-style="firm"]'); await page.fill('#ask', '5');
  for (const e of ['offer', 'results']) await page.click(`[data-ev="${e}"]`);
  await page.click('#openAll');
  assert.equal(await offerText(page), '2%');
  await challenge(page, 'market', 'offer', true);                         // jäik: 3+1-2 = 2: +3
  assert.equal(await offerText(page), '5%');
  await challenge(page, 'performance', 'results', true);                  // +2, aga soov 5
  assert.equal(await offerText(page), '5%');
  await context.close();
});

test('debate: stiili vahetus alustab vestluse otsast, väite vastuvõtmine lukustab ja kiire nõustumine näitab paljastust', async () => {
  const { page, context } = await open();
  await begin(page, 'flex');
  await challenge(page, 'market', 'job-ad', true);
  assert.equal(await offerText(page), '6.5%');
  await page.click('[data-style="busy"]');
  assert.equal(await offerText(page), '2.5%');
  assert.equal(await dq(page, 'market'), 'Open');
  await page.click('#openAll');
  await page.click(`${knot('timing')} [data-act="ac"]`);
  assert.equal(await page.locator(`${knot('timing')} [data-act="ch"]`).isDisabled(), true);
  assert.equal(await dq(page, 'timing'), 'Accepted');
  await page.click('#quickAccept');
  assert.equal(await page.locator('#result').isVisible(), true);
  assert.match(await page.innerText('#reveal'), /accepted 2\.5%\. You opened Why\? on 0 of 5 claims, and 4 claims were never examined/);
  assert.equal(await page.locator('#revealList li').count(), 5);
  assert.equal(await page.locator('#quickAccept').isDisabled(), true);
  assert.equal(await page.locator(`${knot('band')} [data-act="why"]`).isDisabled(), true);   // pärast lõppu ei saa enam liigutada
  await context.close();
});

test('debate: lõpetamiseks on vaja vähemalt 20 märgiga lauset; lause, numbrid ja unistus ei lähe mõõtmisse', async () => {
  const { page, context } = await open({ capture: true });
  await begin(page, 'flex');
  await page.click(`${knot('band')} .kopen`); await page.click(`${knot('band')} .kopen`);        // sulge ja ava: sõlme avamine mõõdetakse
  await challenge(page, 'market', 'job-ad', true);
  await page.click('#finishBtn');
  assert.equal(await page.locator('#confirmBox').isVisible(), true);
  assert.equal(await page.locator('#confirmBtn').isDisabled(), true);
  await page.fill('#sent', 'too short sentence');
  assert.equal(await page.locator('#confirmBtn').isDisabled(), true);
  const sentence = 'I agree because the job ads back it up.';
  await page.fill('#sent', sentence);
  assert.equal(await page.locator('#confirmBtn').isDisabled(), false);
  await page.click('#confirmBtn');
  assert.match(await page.innerText('#reveal'), /confirmed 6\.5%\. You opened Why\? on 1 of 5 claims/);
  const ev = await sent(page), names = ev.map((e) => e.n);
  for (const n of ['Page Viewed', 'Debate Started', 'Evidence Brought', 'Knot Opened', 'Why Opened', 'Claim Challenged', 'Offer Accepted', 'Independence Shift Viewed']) assert.ok(names.includes(n), `puudub sündmus: ${n}`);
  const blob = JSON.stringify(ev);
  for (const secret of [sentence, '60000', '24000', '50000', 'Slow mornings', 'agree']) assert.ok(!blob.includes(secret), `mõõtmisse läks: ${secret}`);
  assert.deepEqual(ev.find((e) => e.n === 'Claim Challenged').p, { claim_id: 'market', outcome: 'broken' });
  assert.equal(ev.find((e) => e.n === 'Offer Accepted').p.path, 'sentence');
  assert.ok(ev.filter((e) => e.n === 'Knot Opened').every((e) => /^[1-5]$/.test(e.p.knot_id) && e.pg === 'debate'));
  assert.equal(await page.evaluate(() => MR.rejected.length), 0);
  await context.close();
});

// ---------- FIRE-sild ----------
test('debate: aeg sõltumatuseni klapib sõltumatu arvutusega mõlemal tootlusel ja kulude kärpimine langetab ka sihti', async () => {
  const { page, context } = await open();
  await begin(page, 'flex');
  await challenge(page, 'market', 'job-ad', true);                        // 6.5%
  const c = { pay: 60000, keep: 0.6, offer: 6.5, share: 0.5, save0: 1000, assets: 50000, spend: 24000, wr: 0.04, years: 12 };
  const months = (target, save, ret) => { const rm = Math.pow(1 + ret / 100, 1 / 12) - 1; return rm === 0 ? Math.ceil((target - c.assets) / save) : Math.ceil(Math.log((target + save / rm) / (c.assets + save / rm)) / Math.log(1 + rm) - 1e-9); };
  const fmt = (m) => `${Math.floor(m / 12)} y ${m % 12} mo`;
  const add = c.pay * c.offer / 100 * c.keep / 12 * c.share, target = c.spend / c.wr, t2 = (c.spend - 12 * add) / c.wr;
  const rng = (a, b) => `${fmt(a)} to ${fmt(b)}`;
  assert.equal(await page.innerText('#fm0'), rng(months(target, c.save0, 4), months(target, c.save0, 0)));
  assert.equal(await page.innerText('#fm1'), rng(months(target, c.save0 + add, 4), months(target, c.save0 + add, 0)));
  assert.equal(await page.innerText('#fm2'), rng(months(t2, c.save0 + add, 4), months(t2, c.save0 + add, 0)));
  assert.ok(months(t2, c.save0 + add, 4) < months(target, c.save0 + add, 4) && months(target, c.save0 + add, 4) < months(target, c.save0, 4));
  assert.ok(months(target, c.save0 + add, 0) < months(target, c.save0, 0));
  const rm4 = Math.pow(1 + 4 / 100, 1 / 12) - 1, rm0 = 0, n = c.years * 12;
  const req4 = (target - c.assets * Math.pow(1 + rm4, n)) * rm4 / (Math.pow(1 + rm4, n) - 1), req0 = (target - c.assets) / n;
  const nf = (x) => new Intl.NumberFormat('en-US').format(Math.round(x)).replace(/,/g, '\u00a0') + '\u00a0€';
  const back = await page.innerText('#fireBack');
  assert.ok(back.includes(`${nf(req4)}–${nf(req0)} a month (return 4–0%)`), back);
  assert.match(await page.locator('#fireBox').innerText(), /With this raise you save 5\u00a0850\u00a0€ more in 5 years/);
  assert.match(await page.locator('#fireBox').innerText(), /With more than five years to go/);       // aeg on üle viie aasta
  await context.close();
});

test('debate: tühjad väljad annavad vihje, näidisnumbrite märk kaob tühjendades ja oma numbritega paneel ei näita näidist', async () => {
  const { page, context } = await open();
  await begin(page, 'flex');
  assert.equal(await page.locator('#sampleChip').isVisible(), true);
  await page.click('#clear');
  assert.equal(await page.locator('#sampleChip').isVisible(), false);
  assert.match(await page.locator('#fireBox').innerText(), /Add your gross pay, monthly saving and yearly spending/);
  assert.equal(await page.innerText('#offerBig'), '3.5%');                                           // pakkumine töötab ka ilma numbriteta
  await page.fill('#pay', '80000'); await page.fill('#save0', '1500'); await page.fill('#spend', '30000');
  assert.equal(await page.locator('#sampleChip').isVisible(), false);
  assert.match(await page.locator('#fireBox').innerText(), /A raise of 3\.5% on 80\u00a0000\u00a0€ is 140\u00a0€ a month after tax/);   // 80000*3.5%*60%/12
  assert.match(await page.locator('#fireBox').innerText(), /Your independence number is 750\u00a0000\u00a0€ \(30\u00a0000\u00a0€ a year at 4% withdrawal\)/);
  await context.close();
});

test('debate: vestluskaart laaditakse alla numbritega ja ilma, ootel küsimused on sees ja tagasi võetud väite küsimus ei ole', async () => {
  const { page, context } = await open();
  await begin(page, 'flex');
  await page.fill('#unistus', 'Quiet mornings by the sea');
  await challenge(page, 'market', 'job-ad', true);
  await page.click('#finishBtn'); await page.fill('#sent', 'My sentence for the card file.'); await page.click('#confirmBtn');
  assert.equal(await page.locator('#fail').isVisible(), true);
  const grab = async () => { const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#mdBtn')]); return { name: dl.suggestedFilename(), text: await readFile(await dl.path(), 'utf8') }; };
  const withA = await grab();
  await page.check('#mdHide');
  const without = await grab();
  assert.equal(withA.name, 'vaidlus.md');
  assert.match(withA.text, /^# Pay conversation card/);
  assert.match(withA.text, /## Time to independence \(return 4–0%\)/);
  assert.ok(!/## Time to independence/.test(without.text));
  for (const t of [withA.text, without.text]) {
    assert.ok(t.includes('My sentence for the card file.') && t.includes('Quiet mornings by the sea'));
    assert.ok(t.includes('Which criteria did I meet'), 'ootel küsimus puudub');
    assert.ok(!t.includes('Which source, which date'), 'tagasi võetud väite küsimus ei kuulu kaardile');
    assert.ok(/Not advice, not a prediction/.test(t));
  }
  assert.match(await page.innerText('#mdMsg'), /downloaded and stays on your device/);
  await context.close();
});

test('debate: uuesti harjutamine lähtestab väited, kuid jätab sinu numbrid ja unistuse', async () => {
  const { page, context } = await open({ capture: true });
  await page.click('[data-style="flex"]'); await page.fill('#pay', '70000'); await page.fill('#unistus', 'My own dream');
  await page.click('[data-ev="job-ad"]'); await page.click('#openAll');
  await challenge(page, 'market', 'job-ad', true);
  await page.click('#quickAccept');
  await page.click('#again');
  assert.equal(await page.locator('#threadWrap').isVisible(), false);
  assert.equal(await page.locator('#result').isVisible(), false);
  assert.equal(await page.inputValue('#pay'), '70000'); assert.equal(await page.inputValue('#unistus'), 'My own dream');
  await begin(page, 'flex', []);
  assert.equal(await offerText(page), '3.5%');
  assert.equal(await dq(page, 'market'), 'Open');
  assert.ok((await sent(page)).some((e) => e.n === 'Debate Restarted'));
  await context.close();
});

// ---------- keel, ligipääsetavus, raam ----------
test('debate: vaikimisi eesti keeles nagu kõik lehed; ?lang=en annab inglise sisu ilma mustandi ribata; muud keeled näitavad inglise sisu', async () => {
  let o = await open({ query: '' });
  assert.equal(await o.page.locator('html').getAttribute('lang'), 'et');
  assert.match(await o.page.locator('h1').innerText(), /Vaieldav masin/);
  assert.match(await o.page.locator('.back').innerText(), /Raha Meeled/);
  assert.equal(await o.page.locator('#mr-banner').innerText(), '');
  await o.page.click('[data-style="busy"]'); await o.page.click('#openAll');
  assert.match(await o.page.locator(`${knot('timing')} .nr`).innerText(), /^„Mul on viis minutit\. Vaatame seda uuesti kuue kuu pärast\.“/);
  assert.match(await o.page.locator('#knots h2').first().innerText(), /1\. Eelarve/);
  assert.match(await o.page.inputValue('#unistus'), /Aeglased hommikud maakodus/);
  assert.match(await o.page.locator('#sampleChip').innerText(), /Näidisandmed/);
  await o.page.selectOption('#mr-langsel', 'en');
  assert.equal(await o.page.locator('html').getAttribute('lang'), 'en');
  assert.match(await o.page.locator('h1').innerText(), /Debatable machine/);
  assert.equal(await o.page.locator('section.knot.collapsed').count(), 0);                           // avatud sõlmed jäävad avatuks
  assert.match(await o.page.locator(`${knot('timing')} .nr`).innerText(), /I have five minutes\. Let’s revisit this in six months\./);
  assert.equal(await o.page.locator('#mr-banner').innerText(), '');
  assert.match(await o.page.inputValue('#unistus'), /Slow mornings/);                                  // näidisunistus vahetub keelega
  await o.context.close();
  o = await open({ query: '?lang=en' });
  assert.match(await o.page.locator('h1').innerText(), /Debatable machine/);
  assert.equal(await o.page.locator('#mr-banner').innerText(), '');
  assert.deepEqual(o.errors, []);
  await o.context.close();
  o = await open({ query: '?lang=de' });
  assert.match(await o.page.locator('h1').innerText(), /Debatable machine/);
  assert.notEqual(await o.page.locator('#mr-banner').innerText(), '');
  await o.context.close();
});

test('debate: kõigil seisudel pole horisontaalset kerimist, väljadel on sildid, nuppudel nimed, register on puhas ja niit mahub sõlmede kõrvale', async () => {
  for (const width of [360, 390, 768]) {
    const { page, context, errors } = await open({ width });
    const check = async (label) => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${width} ${label}: kerimine`);
      const unnamed = await page.evaluate(() => [...document.querySelectorAll('main button, main select, main input, main textarea')].filter((e) => e.offsetParent !== null).filter((e) => {
        if (e.tagName === 'BUTTON') return !e.innerText.trim();
        if (e.type === 'checkbox' && e.closest('label')) return false;
        return !(e.id && document.querySelector(`label[for="${e.id}"]`)) && !e.getAttribute('aria-label');
      }).map((e) => e.id || e.tagName));
      assert.deepEqual(unnamed, [], `${width} ${label}: nimeta elemendid`);
      assert.deepEqual(await page.evaluate(() => MR.audit()), [], `${width} ${label}: audit`);
    };
    await check('algus');
    await page.click('[data-style="firm"]');
    for (const e of ['job-ad', 'peer', 'survey', 'ai', 'results', 'offer']) await page.click(`[data-ev="${e}"]`);
    await page.click('#openAll'); await page.click(`${knot('market')} [data-act="why"]`); await check('niit');
    const th = await page.evaluate(() => { const t = document.querySelector('#thread').getBoundingClientRect(), s = document.querySelector('#threadSvg').getBoundingClientRect(); return { svgH: s.height, boxH: t.height }; });
    assert.ok(Math.abs(th.svgH - th.boxH) < 2, `${width}: niit katab kogu kõrguse`);
    await page.click('#quickAccept'); await check('lõpp');
    assert.equal(await page.evaluate(() => MR.rejected.length), 0);
    assert.deepEqual(errors, [], String(width));
    await context.close();
  }
});

test('debate: klaviatuuriga läbitav ja fookus liigub Miks? järel valikule ning lõppedes tulemuse pealkirjale', async () => {
  const { page, context } = await open();
  await page.focus('[data-style="flex"]'); await page.keyboard.press('Enter');
  await page.focus('[data-ev="results"]'); await page.keyboard.press('Space');
  assert.equal(await page.getAttribute('[data-ev="results"]', 'aria-pressed'), 'true');
  assert.equal(await page.locator(`${knot('performance')}.collapsed`).count(), 0);                   // paindliku juhi esimene lõng on avatud
  await page.focus(`${knot('performance')} [data-act="why"]`); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'sel-performance');
  await page.focus('#quickAccept'); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'h-result');
  await context.close();
});

test('debate: leht on registris, kataloogis ja Lõnga otsa neljandas sõlmes; ei kasuta salvestust ega võrgupäringuid', async () => {
  const html = await read('debate.html');
  assert.ok(TAX.pages.debate && TAX.enums.pages.includes('debate') && TAX.enums.cards.includes('debate') && TAX.enums.tools.includes('vaidlusmasin'));
  for (const e of ['Debate Started', 'Evidence Brought', 'Why Opened', 'Claim Challenged', 'Claim Accepted', 'Offer Accepted', 'Independence Shift Viewed', 'Debate Restarted']) assert.ok(TAX.events[e], e);
  assert.ok(!/localStorage|sessionStorage|indexedDB|document\.cookie/.test(html), 'salvestus on keelatud');
  assert.ok(!/fetch\(|XMLHttpRequest/.test(html), 'lehel pole võrgupäringuid');
  const cat = JSON.parse((await read('kast.html')).match(/<script type="application\/json" id="catalog">([\s\S]*?)<\/script>/)[1]);
  assert.equal(cat.find((c) => c.id === 'vaidlusmasin').href, 'debate.html');
  const { page, context } = await open({ file: 'ots.html' });
  assert.equal(await page.locator('#palgalink a[href^="debate.html"]').count(), 1);
  await context.close();
});

test('debate: leht on ülemises menüüs kolmandana pärast Lõnga otsa, aktiivne ja sildid on kõigis üheksas keeles', async () => {
  const { page, context } = await open();
  assert.deepEqual(await page.locator('#mr-nav ul a').allInnerTexts(), ['Meeleraha', 'Untangle', 'Thread end', 'Debate', 'Timeline', 'Toolbox']);
  assert.equal(await page.locator('#mr-nav [aria-current="page"]').innerText(), 'Debate');
  assert.equal(await page.locator('#mr-nav a[href^="debate.html"]').getAttribute('href'), 'debate.html?lang=en');
  await page.selectOption('#mr-langsel', 'et');
  assert.equal(await page.locator('#mr-nav [aria-current="page"]').innerText(), 'Vaidle');
  assert.equal(await page.locator('#mr-nav a[href^="debate.html"]').getAttribute('href'), 'debate.html');
  await page.selectOption('#mr-langsel', 'de');
  assert.equal(await page.locator('#mr-nav [aria-current="page"]').innerText(), 'Debattieren');
  assert.ok((await page.locator('#mr-nav a[href^="debate.html"]').getAttribute('href')).includes('lang=de'));
  assert.ok(TAX.enums.nav_items.includes('debate'));
  await context.close();
  const o = await open({ file: 'index.html', query: '' });
  await o.page.click('#mr-nav a[href^="debate.html"]');
  await o.page.waitForLoadState();
  assert.match(await o.page.locator('h1').innerText(), /Vaieldav masin/);
  const ev = await o.page.evaluate(() => MR.log.map((r) => r.n));
  assert.ok(ev.includes('Page Viewed'));
  await o.context.close();
});

// ---------- 2. vaatus: Laud ----------
const lever = (page, l, v) => page.evaluate(([id, val]) => { const e = document.getElementById(`lev-${id}`); e.value = val; e.dispatchEvent(new Event('input')); }, [l, v]);
const pkg = async (page, levers) => { for (const l of ['salary', 'bonus', 'leave', 'remote', 'learn', 'title', 'review', 'hours']) await lever(page, l, levers[l] || 0); };
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-6, `${m}: ${a} vs ${b}`);

test('debate: hoobade hinnad ja väärtused klapivad käsitsi arvutusega ning parim pakett on sama hea või parem kui 3000 juhuslikku mahtuvat paketti', async () => {
  const { page, context } = await open();
  await page.click('[data-style="flex"]');
  const r = await page.evaluate(() => {
    const D = window.DEBATE, out = {};
    out.leave = [D.costP({ leave: 2 }, 'flex'), D.valP({ leave: 2 })];
    out.learn = [D.costP({ learn: 2 }, 'flex'), D.valP({ learn: 2 })];
    out.salary = [D.costP({ salary: 4 }, 'flex'), D.valP({ salary: 4 })];
    out.remoteFirm = D.costP({ remote: 3 }, 'firm');
    // juhuslikud paketid (sama PRNG kõigil jooksudel)
    let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const B = D.budgetNow(), best = D.bestP(B, D.levMax('salary')), worse = [];
    for (let i = 0; i < 3000; i++) { const p = {}; D.LEV.forEach((l) => { p[l] = Math.floor(rnd() * (D.levMax(l) + 1)); }); if (D.costP(p, 'flex') <= B + 1e-9 && D.valP(p) > best.v + 1e-9) worse.push(p); }
    out.bestOk = worse.length === 0; out.bestCost = best.c; out.B = B; out.bestV = best.v; out.base = D.state().offer * D.rho('salary');
    out.bigger = D.bestP(B + 1, D.levMax('salary')).v >= best.v - 1e-9;
    out.zero = D.bestP(0, D.levMax('salary')).v;
    return out;
  });
  near(r.leave[0], 2 * 0.8 * 0.9, 'päeva kulu'); near(r.leave[1], 2 * 0.8 * 2, 'päeva väärtus (2. prioriteet ×2)');
  near(r.learn[0], 2 * (500 / 60000 * 100) * 0.5, 'õppe kulu'); near(r.learn[1], 2 * (500 / 60000 * 100) * 1.5, 'õppe väärtus (3. prioriteet ×1,5)');
  near(r.salary[0], 2, 'palga kulu'); near(r.salary[1], 4 * 0.5 * 3, 'palga väärtus (1. prioriteet ×3)');
  near(r.remoteFirm, 3 * 0.5 * 1.6, 'jäiga juhi kaugtöö kulu');
  assert.ok(r.bestOk, 'leidus parem pakett kui lahendaja oma'); assert.ok(r.bestCost <= r.B + 1e-9);
  assert.ok(r.bestV >= r.base - 1e-9, 'parim pakett ei jää alla ainult-palga paketile'); assert.ok(r.bigger, 'suurem eelarve ei tohi väärtust vähendada');
  assert.equal(r.zero, 0);
  await context.close();
});

test('debate: juht valib odavaima mahtuva paketi, näitab ruumi mõõtu ja küsimine „mis on teile odav?“ paljastab odavad hoovad', async () => {
  const { page, context, errors } = await open({ capture: true });
  await begin(page, 'flex', ['job-ad']);
  await page.click('#tblCheap');
  assert.equal(await page.innerText('#tblCheapTxt'), 'Cheap for them: Remote days, Earlier review. Expensive: Shorter week.');
  await pkg(page, { salary: 4, leave: 2, learn: 2 });                     // kulu 4,27 ja väärtus 11,7
  await page.click('#tblSave');
  await pkg(page, { salary: 4, remote: 3, learn: 2 });                    // kulu 3,28 ja väärtus 10,0: odavam
  await page.click('#tblSave');
  assert.equal(await page.locator('#tblPk li').count(), 2);
  assert.match(await page.innerText('#tblEq'), /Values differ by over 10%/);        // 11,7 vs 10,0
  await page.click('#tblOffer');
  const res = await page.innerText('#tblRes');
  assert.match(res, /The manager picked package 2\. It costs them 3\.3%, it is worth 10 to you\. A salary-only offer was worth 10\.5\./);
  const exp = await page.evaluate(() => { const D = window.DEBATE, B = D.budgetNow(), b = D.bestP(B, D.levMax('salary')); return { pp: Math.round(10 / b.v * 100), g: Math.round((b.v / (D.state().offer * 3) - 1) * 100) }; });
  assert.ok(res.includes(`you reached ${exp.pp}%`) && res.includes(`+${exp.g}% more value`), res);
  assert.equal(await dq(page, 'table'), 'Picked');
  assert.equal(await page.evaluate(() => window.DEBATE.state().deal.slot), 2);
  // paketi palk (2%) läheb FIRE-sillale ja jääb alla piiri 5%
  assert.match(await page.locator('#fireBox').innerText(), /A raise of 2% on 60\u00a0000\u00a0€/);
  assert.match(await page.innerText('#walkNote'), /You went below your own limit: raise 2% < 5%/);
  assert.match(await page.innerText('#dealNote'), /Chosen package 2: \+2% base pay, 3 remote days a week, learning budget 1\u00a0000\u00a0€ a year/);
  const ev = await sent(page), names = ev.map((e) => e.n);
  for (const n of ['Cheap Levers Asked', 'Package Saved', 'Package Offered']) assert.ok(names.includes(n), n);
  assert.deepEqual(ev.filter((e) => e.n === 'Package Saved').map((e) => e.p.slot_id), ['1', '2']);
  assert.equal(ev.find((e) => e.n === 'Package Offered').p.result, 'picked');
  assert.equal(await page.evaluate(() => MR.rejected.length), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('debate: eelarvesse mittemahtuv pakett jääb ära ja samaväärsed paketid saavad sildi', async () => {
  const { page, context } = await open({ capture: true });
  await begin(page, 'flex', ['job-ad']);
  await pkg(page, { salary: 20 });                                        // 10% palka, kulu 10 > eelarve 5
  await page.click('#tblSave'); await page.click('#tblOffer');
  assert.match(await page.innerText('#tblRes'), /No package fit the budget\. The cheapest was 100% over\./);
  assert.equal(await dq(page, 'table'), 'Did not fit');
  assert.equal(await page.evaluate(() => window.DEBATE.state().deal), null);
  assert.equal(await offerText(page), '3.5%');                                    // lõplik pakkumine jääb 1. vaatuse oma
  await page.click('.pkdel');
  await pkg(page, { salary: 4, leave: 2 });                                        // väärtus 6+3,2 = 9,2
  await page.click('#tblSave');
  await pkg(page, { salary: 4, learn: 3 });                                        // 6+3,75 = 9,75: vahe alla 10%
  await page.click('#tblSave');
  assert.match(await page.innerText('#tblEq'), /Equivalent \(±10%\)/);
  assert.ok((await sent(page)).filter((e) => e.n === 'Package Offered').every((e) => ['picked', 'none'].includes(e.p.result)));
  await context.close();
});

test('debate: piirid enne lauda: prioriteedid muudavad hoobade väärtust, korduvat valikut ei loeta kaks korda ja piir märgitakse', async () => {
  const { page, context } = await open();
  await page.click('[data-style="flex"]'); await page.click('[data-ev="job-ad"]');
  assert.equal(await page.inputValue('#walk'), '5');
  assert.deepEqual(await page.evaluate(() => ['salary', 'leave', 'learn', 'remote'].map((l) => window.DEBATE.rho(l))), [3, 2, 1.5, 1]);
  await page.selectOption('#pr1', 'leave'); await page.selectOption('#pr2', 'leave');          // kordus: teine ignoreeritakse
  assert.deepEqual(await page.evaluate(() => ['salary', 'leave', 'learn', 'remote'].map((l) => window.DEBATE.rho(l))), [1, 3, 2, 1]);
  await page.selectOption('#pr1', 'salary'); await page.selectOption('#pr2', 'leave');
  await page.fill('#walk', '3');
  await page.click('#openAll'); await challenge(page, 'market', 'job-ad', false);
  assert.match(await page.innerText('#walkNote'), /Your limit holds: raise 5% ≥ 3%/);
  await page.fill('#walk', '8');
  assert.match(await page.innerText('#walkNote'), /You went below your own limit: raise 5% < 8%/);
  await page.fill('#walk', '');
  assert.equal(await page.locator('#walkNote').count(), 0);
  await context.close();
});

// ---------- 3. vaatus: Üllatus ----------
test('debate: üllatuskaardid tulevad stiili järjekorras, lagi ja kärbe piiravad lauda ja vastus võrdleb parimaga', async () => {
  const { page, context, errors } = await open({ capture: true });
  await begin(page, 'firm', ['job-ad']);
  assert.equal(await page.innerText('#surDraw'), 'Draw a surprise (0/4)');
  await page.click('#surDraw');                                           // jäik: lagi
  assert.match(await page.innerText('#surCard'), /Pay cap\s+Pay cannot rise above 1%/);
  assert.equal(await page.getAttribute('#lev-salary', 'max'), '2');
  assert.match(await page.innerText('#tblBanner'), /Pay cap/);
  await pkg(page, { salary: 2, leave: 1, learn: 1, remote: 2 });
  const exp = await page.evaluate(() => { const D = window.DEBATE, B = D.budgetNow(), b = D.bestP(B, 2), p = { salary: 2, leave: 1, learn: 1, remote: 2 }; return { v: D.valP(p), vs: b.v, c: D.costP(p, 'firm'), B }; });
  await page.click('#surAns');
  const ans = await page.innerText('#surRes'), pct = Math.round(exp.v / exp.vs * 100);
  const want = exp.c > exp.B + 1e-9 ? /does not fit the new limit/ : new RegExp(`${pct}% of the best`);
  assert.match(ans, want);
  await page.click('#surDraw');                                           // kärbe
  assert.match(await page.innerText('#surCard'), /Budget cut\s+The budget was cut by 30%: 1\.8% instead of 2\.5%\./);
  const B2 = await page.evaluate(() => window.DEBATE.budgetNow());
  near(B2, (2 + 0.5) * 0.7, 'kärbitud eelarve');
  assert.match(await page.innerText('#tblBars'), /their budget is 1\.8%/);
  const ev = await sent(page);
  assert.deepEqual(ev.filter((e) => e.n === 'Surprise Drawn').map((e) => e.p.surprise_id), ['cap', 'cut']);
  assert.deepEqual(ev.filter((e) => e.n === 'Surprise Answered').map((e) => e.p.surprise_id), ['cap']);
  assert.ok(['best', 'close', 'far'].includes(ev.find((e) => e.n === 'Surprise Answered').p.outcome));
  assert.equal(await page.evaluate(() => MR.rejected.length), 0); assert.deepEqual(errors, []);
  await context.close();
});

test('debate: tähtaja kingitus kaalutakse numbritega ja toolide vahetuses on õige vastus odavaim, mis töötajale sobib', async () => {
  let o = await open({ capture: true });
  await begin(o.page, 'busy', ['job-ad']);
  await o.page.click('#surDraw');                                         // tähtaeg: kingitus
  assert.match(await o.page.innerText('#surCard'), /Deadline gift/);
  assert.equal(await o.page.locator('#giftTake').isVisible(), true);
  await o.page.click('#giftTake');                                        // tühi pakett: puudujääk on suur, kingitus 1 → kaalumata
  assert.match(await o.page.innerText('#surRes'), /An unweighed decision: the gift was 1, the gap from the best/);
  assert.equal(await o.page.locator('#giftTake').isDisabled(), true);
  await o.page.click('#surDraw'); await o.page.click('#surDraw'); await o.page.click('#surDraw');   // kärbe, lagi, vahetus
  assert.match(await o.page.innerText('#surCard'), /Swap chairs/);
  const exp = await o.page.evaluate(() => { const D = window.DEBATE, s = D.state(), B = D.budgetNow(), v0 = s.offer * D.rho('salary'); const q = s.sur.swap.map((x, j) => ({ j, c: x.c, v: x.v })); let g = q.filter((x) => x.v >= v0 - 1e-9 && x.c <= B + 1e-9); if (!g.length) g = q.filter((x) => x.c <= B + 1e-9); if (!g.length) g = q; g.sort((a, b) => a.c - b.c); return { right: g[0].j, n: q.length }; });
  assert.equal(exp.n, 3);
  assert.equal(await o.page.locator('[data-sw]').count(), 3);
  const wrong = [0, 1, 2].find((j) => j !== exp.right);
  await o.page.click(`[data-sw="${wrong}"]`);
  assert.match(await o.page.innerText('#surRes'), new RegExp(`Package ${wrong + 1} is not the cheapest that fits: the right one was package ${exp.right + 1}`));
  const ev = await sent(o.page);
  assert.deepEqual(ev.filter((e) => e.n === 'Surprise Answered').map((e) => [e.p.surprise_id, e.p.outcome]), [['gift', 'far'], ['swap', 'far']]);
  assert.equal(await o.page.innerText('#surDraw'), 'Draw a surprise (4/4)');
  assert.equal(await o.page.locator('#surDraw').isDisabled(), true);
  await o.context.close();
  o = await open();
  await begin(o.page, 'flex', ['job-ad']);                                // paindlik: esimene kaart on toolide vahetus
  await o.page.click('#surDraw');
  const right = await o.page.evaluate(() => { const D = window.DEBATE, s = D.state(), B = D.budgetNow(), v0 = s.offer * D.rho('salary'); const q = s.sur.swap.map((x, j) => ({ j, c: x.c, v: x.v })); let g = q.filter((x) => x.v >= v0 - 1e-9 && x.c <= B + 1e-9); if (!g.length) g = q.filter((x) => x.c <= B + 1e-9); if (!g.length) g = q; g.sort((a, b) => a.c - b.c); return g[0].j; });
  await o.page.click(`[data-sw="${right}"]`);
  assert.match(await o.page.innerText('#surRes'), new RegExp(`Right: package ${right + 1} is the cheapest`));
  await o.context.close();
});

test('debate: uuesti harjutamine tühjendab paketid ja üllatused, eesti keeles on Laud ja Üllatus täielikult tõlgitud ja väljade muutmine pärast lähtestust ei lõhu lehte', async () => {
  const { page, context, errors } = await open({ query: '' });
  await page.click('[data-style="flex"]'); await page.click('[data-ev="job-ad"]'); await page.click('#openAll');
  assert.match(await page.locator(`${knot('table')} h2`).innerText(), /^6\. Laud$/);
  assert.match(await page.locator(`${knot('surprise')} h2`).innerText(), /^7\. Üllatus$/);
  assert.equal(await page.innerText('label[for="lev-leave"] span'), 'Lisapuhkus');
  await pkg(page, { salary: 4, leave: 2 }); await page.click('#tblSave'); await page.click('#tblOffer');
  assert.match(await page.innerText('#tblRes'), /Juht valis paketi 1\./);
  await page.click('#surDraw');
  assert.match(await page.innerText('#surCard'), /Vaheta toolid|Eelarve|Palgalagi|Tähtaja/);
  await page.click('#quickAccept');
  assert.match(await page.innerText('#revealList'), /Laud[\s\S]*Juht valis paketi 1[\s\S]*Üllatus[\s\S]*Tõmbasid 1 üllatust/);
  await page.click('#again');
  await page.fill('#pay', '70000'); await page.fill('#walk', '4');          // lähtestuse järel ei tohi viga tulla
  await page.click('[data-style="busy"]'); await page.click('#openAll');
  assert.equal(await page.locator('#tblPk li.small').count(), 1);
  assert.equal(await page.innerText('#surDraw'), 'Tõmba üllatus (0/4)');
  assert.equal(await dq(page, 'table'), 'Avatud');
  assert.deepEqual(errors, []);
  await context.close();
});
