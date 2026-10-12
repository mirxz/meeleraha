import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launch, PAGE_URL } from './helpers.mjs';

// Asendab mikrofoni sünteetilise siinusega, mida test lülitab sisse pärast kalibreerimist.
const FAKE_MIC = `
  navigator.mediaDevices.getUserMedia = async () => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.frequency.value = window.__hz || 220;
    const dest = ctx.createMediaStreamDestination();
    osc.connect(gain); gain.connect(dest); osc.start();
    window.__tone = (on) => { gain.gain.value = on ? 0.4 : 0; };
    return dest.stream;
  };
`;

async function run(browser, hz) {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(`window.__hz = ${hz};` + FAKE_MIC);
  await page.goto(PAGE_URL);
  await page.click('#micModeV');
  await page.click('#mic');
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.__tone(true));
  await page.waitForTimeout(3500);
  const hzText = await page.innerText('#micHz');
  const inc = Number((await page.innerText('#inc')).replace(/[^\d]/g, ''));
  await context.close();
  assert.deepEqual(errors, []);
  return { hzText, inc };
}

let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { await browser.close(); });

test('hääle kõrgus: tuvastab 220 Hz ±8%', async () => {
  const { hzText } = await run(browser, 220);
  const hz = Number(hzText.replace(/[^\d]/g, ''));
  assert.ok(hz > 202 && hz < 238, `tuvastas ${hzText}`);
});

test('hääle kõrgus: kõrgem toon annab suurema palga kui madalam', async () => {
  const low = await run(browser, 110);
  const high = await run(browser, 330);
  assert.ok(high.inc > low.inc + 500, `madal ${low.inc}, kõrge ${high.inc}`);
});
