import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launch, openPage, setState, parseMonths } from './helpers.mjs';

// Sõltumatu referent: sama mudel (näide: sissetulek 2 500, baas 1 125, laen 375 8 aastat, fun 375,
// vara täna 20 000, reaaltootlus 4%, väljavõtmismäär 4%). Muudad arve -> uuenda ka siin.
function referee(cs, g, mode) {
  const futFun = cs > 0 ? cs : 375;
  const target = ((1125 + futFun) * 12) / 0.04;
  const rm = Math.pow(1.04, 1 / 12) - 1;
  let A = 20000, m = 0;
  const s0 = 2500 - 1125 - 375 - 375 + (mode === 'fut' ? g : 0);
  while (A < target && m < 540) {
    A = A * (1 + rm) + s0 + (m / 12 >= 8 ? 375 : 0);
    m++;
  }
  return A >= target ? m : null;
}
const COST = [300, 150, 200, 125];
const sumCost = (acts) => acts.reduce((s, on, i) => s + (on ? COST[i] : 0), 0);

let browser;
test.before(async () => { browser = await launch(['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']); });
test.after(async () => { await browser.close(); });

test('leht laeb ilma vigadeta ja ilma horisontaalse kerimiseta (390 px)', async () => {
  const { page, context, errors } = await openPage(browser);
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  assert.ok((await page.locator('#sv path').count()) >= 4, 'lained joonistatud');
  await context.close();
});

test('kõne tekst tekib valikutest', async () => {
  const { page, context } = await openPage(browser);
  await page.click('#gP button:nth-child(1)');
  await page.click('#gW button:nth-child(2)');
  await page.click('#gA button:nth-child(3)');
  const t = await page.innerText('#call');
  assert.match(t, /Tere, siin mina pensionil\./);
  assert.match(t, /Aken vaatab merele/);
  assert.match(t, /hommikukohvi/);
  assert.match(t, /tomatid/);
  await context.close();
});

test('tulevane pott on ilma valikuta udu ja ei anna kattuvust', async () => {
  const { page, context } = await openPage(browser);
  assert.match(await page.innerText('#ovRes'), /Vali enne/);
  await context.close();
});

test('kattuvus: reisida + aed ja maakodu annab 80%', async () => {
  const { page, context } = await openPage(browser);
  await page.locator('#ov').scrollIntoViewIfNeeded();
  await page.click('#gA button:nth-child(1)');
  await page.click('#gA button:nth-child(3)');
  await page.locator('#ov').scrollIntoViewIfNeeded();
  const box = await page.locator('#ovF').boundingBox();
  await page.mouse.move(box.x + 60, box.y + 20);
  await page.mouse.down();
  for (let dy = 10; dy <= 120; dy += 10) await page.mouse.move(box.x + 60, box.y + 20 + dy);
  await page.mouse.up();
  assert.match(await page.innerText('#ovRes'), /80%/);
  await context.close();
});

test('FIRE-aeg vastab sõltumatule referendile 24 kombinatsioonil', async () => {
  const { page, context } = await openPage(browser);
  const sets = [[false, false, false, false], [true, false, false, false], [true, false, true, false], [true, true, true, true]];
  for (const acts of sets) for (const g of [0, 100, 300]) for (const mode of ['fut', 'don']) {
    await setState(page, { acts, g, mode });
    const got = parseMonths(await page.innerText('#fireOut .big'));
    assert.equal(got, referee(sumCost(acts), g, mode), JSON.stringify({ acts, g, mode }));
  }
  await context.close();
});

test('kingi omadused: tulevasele minale ei lükka FIRE-t kaugemale, annetus ei muuda seda', async () => {
  const { page, context } = await openPage(browser);
  const acts = [true, false, true, false];
  await setState(page, { acts, g: 0, mode: 'fut' });
  const base = parseMonths(await page.innerText('#fireOut .big'));
  let prev = base;
  for (const g of [50, 100, 200, 300]) {
    await setState(page, { acts, g, mode: 'fut' });
    const m = parseMonths(await page.innerText('#fireOut .big'));
    assert.ok(m <= prev, `g=${g}: ${m} peab olema <= ${prev}`);
    prev = m;
  }
  await setState(page, { acts, g: 300, mode: 'don' });
  assert.equal(parseMonths(await page.innerText('#fireOut .big')), base);
  await context.close();
});

test('jagatav kaart peidab summad', async () => {
  const { page, context } = await openPage(browser);
  await setState(page, { acts: [true, false, false, false], g: 150, mode: 'fut' });
  assert.match(await page.innerText('#share'), /150\s*€ kuus/);
  await page.click('#hide');
  const hidden = await page.innerText('#share');
  assert.doesNotMatch(hidden, /150\s*€/);
  assert.match(hidden, /% fun moneyst/);
  await context.close();
});

test('mikrofon: hingamine tõstab palka ja väljalülitus töötab', async () => {
  const { page, context, errors } = await openPage(browser, { permissions: ['microphone'] });
  await page.click('#mic');
  await page.waitForTimeout(3500);
  assert.match(await page.innerText('#micMsg'), /Hinga kuuldavalt/);
  await page.waitForTimeout(2500);
  const inc = Number((await page.innerText('#inc')).replace(/[^\d]/g, ''));
  assert.ok(inc > 2500, `palk ${inc} peab olema > 2500`);
  await page.click('#mic');
  assert.match(await page.innerText('#micMsg'), /välja lülitatud/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('mikrofon: ilma loata annab selge teate ja leht töötab edasi', async () => {
  const b2 = await launch();
  const { page, context } = await openPage(b2);
  await page.click('#mic');
  await page.waitForTimeout(800);
  assert.match(await page.innerText('#micMsg'), /nuppu/i);
  await page.click('#gA button:nth-child(1)');
  assert.match(await page.innerText('#call'), /Tere, siin mina pensionil\./);
  await context.close();
  await b2.close();
});
