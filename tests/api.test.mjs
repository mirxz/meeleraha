import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { launch, ROOT } from './helpers.mjs';

const P = new URL('../public/api/index.html', import.meta.url).href;
const read = (f) => readFile(`${ROOT}${f}`, 'utf8');
const TAX = JSON.parse(await read('public/taxonomy.json'));
let browser;
test.before(async () => { browser = await launch(); });
test.after(async () => { await browser.close(); });

async function open(width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const errors = [], external = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) external.push(r.url()); });
  await page.goto(P); await page.waitForTimeout(150);
  return { page, context, errors, external };
}
const spec = async (page) => page.evaluate(() => JSON.parse(document.getElementById('spec').textContent));

test('api: viide laeb ilma vigade ja välispäringuteta ning joonistab iga spetsifikatsiooni sektsiooni ja lingi', async () => {
  const { page, context, errors, external } = await open();
  const s = await spec(page);
  assert.equal(await page.locator('section.sec').count(), s.sections.length + 0);
  assert.equal(await page.locator('#nav a').count(), s.sections.length);
  assert.deepEqual([...new Set(s.sections.map((x) => x.group))], ['Start', 'Guidelines', 'Usage', 'Operations', 'Guardrails', 'Reference']);
  assert.deepEqual(errors, []); assert.deepEqual(external, [], 'leht ei tohi kutsuda väliseid teenuseid');
  assert.match(await page.locator('#foot').innerText(), /Built from Open Playbook API 0\.1\.0-draft .* The page shows; it never runs\./);
  assert.equal((await page.locator('#badge').innerText()).toLowerCase(), 'draft 0.1');
  assert.equal(await page.locator('#logo').getAttribute('href'), '../index.html');
  await context.close();
});

test('api: leht ei ole repost eemal: arvud, mudeli versioon ja failiteed klapivad repoga', async () => {
  const { page, context } = await open();
  const text = await page.locator('main').innerText();
  const kast = await read('public/kast.html');
  const cat = JSON.parse(kast.match(/<script type="application\/json" id="catalog">([\s\S]*?)<\/script>/)[1]);
  const ev = Object.keys(TAX.events).length, co = Object.keys(TAX.components).length, en = Object.keys(TAX.enums).length;
  assert.ok(text.includes(`${ev} events, ${co} components, ${en} enumerations, ${cat.length} toolbox entries`), 'ülevaate arvud ei klapi repoga');
  assert.ok(text.includes(`${ev} events, ${co} components, ${en} enumerations`) && text.includes(`${cat.length} entries in 9 languages`));
  const vm = (await read('public/vaidle-mudel.js')).match(/VERSION='([^']+)',OWNER='([^']+)',REVIEWED='([^']+)'/);
  assert.ok(text.includes(`v${vm[1]}, owner ${vm[2]}, reviewed ${vm[3]}`), 'mudeli versioon ei klapi');
  // iga `public/...` tee jaotises „Where things live“ peab repos olemas olema
  const where = await page.locator('#where td code').allInnerTexts();
  const paths = where.filter((c) => c.startsWith('public/') || c.startsWith('tests/') || c === 'README.md');
  assert.ok(paths.length >= 9);
  for (const p of paths) await access(`${ROOT}${p}`);
  const tests = (await import('node:fs')).readdirSync(`${ROOT}tests`).filter((f) => f.endsWith('.test.mjs')).length;
  assert.ok(text.includes(`about 200 test cases in ${tests} files`) || text.includes(`about 200 in ${tests} files`), 'testifailide arv ei klapi');
  await context.close();
});

test('api: kõigil staatustel on kuju ja sõna, operatsioonid on kooskõlas lubatud nimekirja ja mustandiga ning sündmuste tabel katab uued sündmused', async () => {
  const { page, context } = await open();
  const bad = await page.evaluate(() => [...document.querySelectorAll('.pill')].filter((p) => !p.querySelector('i') || !p.textContent.trim()).length);
  assert.equal(bad, 0);
  const s = await spec(page);
  const sec = (id) => s.sections.find((x) => x.id === id);
  const allow = JSON.parse(await read('tools/open-playbook-api/allowlist.json'));
  const draft = JSON.parse(await read('tools/open-playbook-api/open-playbook-api.openapi.json'));
  const drafted = Object.keys(draft.paths).map((p) => p.replace(/^\//, ''));
  assert.deepEqual(drafted.sort(), Object.keys(allow).sort(), 'lubatud nimekiri ja OpenAPI mustand on lahku läinud');
  const rows = s.sections.filter((x) => x.id.startsWith('op-') && x.id !== 'op-live').flatMap((x) => x.blocks[0].rows);
  assert.equal(rows.length, drafted.length);
  assert.ok(rows.every((r) => r.status.s === 'off' && r.status.t === 'Closed'), 'mustandi lõpp-punktid peavad olema suletud');
  const live = sec('op-live').blocks[0].rows.map((r) => r.path);
  assert.ok(live.includes('/taxonomy.json') && live.includes('/vaidle-mudel.js') && live.length === 6);
  // sündmuste tabel nimetab kõiki selle API sündmusi
  const eventsText = JSON.stringify(sec('events'));
  for (const e of ['Sentence Read', 'Reading Corrected', 'Package Offered', 'Surprise Drawn', 'Surprise Answered', 'Gamebox Opened', 'Debate Started', 'Debate Restarted', 'Evidence Brought', 'Why Opened', 'Claim Challenged', 'Claim Accepted', 'Cheap Levers Asked', 'Package Saved', 'Offer Accepted', 'Independence Shift Viewed']) {
    assert.ok(TAX.events[e], `taksonoomias puudub ${e}`); assert.ok(eventsText.includes(e), `sündmuste tabelis puudub ${e}`);
  }
  await context.close();
});

test('api: ausus on lehel kirjas: kinnitatud ja kinnitamata, ainult etapp 0 on avatud, 3. etapp ei kasuta majutatud mudelit käitusajal', async () => {
  const { page, context } = await open();
  const text = await page.locator('main').innerText();
  assert.match(text, /Verified:/); assert.match(text, /Not verified:/); assert.match(text, /What it is not:/);
  assert.match(text, /No HTTP service exists yet/); assert.match(text, /`?\/api\/e`? answered 404|\/api\/e answered 404/);
  assert.match(text, /Only stage 0 exists today/);
  const s = await spec(page);
  const rollout = s.sections.find((x) => x.id === 'rollout').blocks[0].rows;
  assert.equal(rollout.length, 5); assert.match(rollout[3][0], /3 Calibrated reading/);
  assert.match(rollout[3][1] + rollout[3][2], /design time, with invented sentences only/);          // lause ei lahku brauserist
  const unbuilt = s.sections.find((x) => x.id === 'notbuilt').blocks[0].rows;
  assert.ok(unbuilt.every((r) => ['off', 'manual'].includes(r[2].s)), 'ehitamata asjad ei tohi olla lubatud');
  assert.ok(unbuilt.some((r) => /legal assessment/.test(r[0])) && unbuilt.some((r) => /network requests/.test(r[0])));
  const never = JSON.stringify(s.sections.find((x) => x.id === 'never'));
  assert.match(never, /Selling aggregates/); assert.match(never, /Acting for a person/);
  await context.close();
});

test('api: otsing peidab sobimatud sektsioonid ja linke, tühi otsing toob kõik tagasi ning sisu ei sisalda HTML-i', async () => {
  const { page, context } = await open();
  const total = await page.locator('section.sec:not([hidden])').count();
  await page.fill('#q', 'receipt');
  const shown = await page.locator('section.sec:not([hidden])').count();
  assert.ok(shown >= 1 && shown < total, `otsing ei filtreeri (${shown}/${total})`);
  assert.equal(await page.locator('#change:not([hidden])').count(), 1);
  assert.equal(await page.locator('#overview[hidden]').count(), 1);
  await page.fill('#q', 'zzzzzzzzzz'); assert.equal(await page.locator('.empty:not([hidden])').count(), 1);
  await page.fill('#q', ''); assert.equal(await page.locator('section.sec:not([hidden])').count(), total);
  const html = await read('public/api/index.html');
  assert.ok(!/<img |<iframe|<form|localStorage|fetch\(|XMLHttpRequest/.test(html), 'leht ei kasuta salvestust, vorme ega võrku');
  await context.close();
});

test('api: telefonis pole horisontaalset kerimist, sisu tabel kerib omas ümbrises ja sisukord avaneb nupuga', async () => {
  for (const width of [360, 390, 768]) {
    const { page, context } = await open(width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${width}: leht kerib küljele`);
    if (width < 861) {
      assert.equal(await page.locator('#side').isVisible(), false);
      await page.click('#toggle'); assert.equal(await page.locator('#side').isVisible(), true); assert.equal(await page.getAttribute('#toggle', 'aria-expanded'), 'true');
    }
    await context.close();
  }
});

test('api: ukse avamine inimestele: Tingi ja Mängukast viitavad viitele ning viide viib tagasi Meeleraha avalehele', async () => {
  for (const f of ['tingi.html', 'mangukast.html']) {
    const html = await read(`public/${f}`);
    assert.match(html, /<a href="api\/index\.html" data-t="apiLink"><\/a>/, `${f}: link puudub`);
    assert.match(html, /apiLink:'Partneritele: Open Playbook API'/); assert.match(html, /apiLink:'For partners: Open Playbook API'/);
  }
  const { page, context } = await open();
  assert.equal(await page.locator('#logo').getAttribute('href'), '../index.html');
  await context.close();
});
