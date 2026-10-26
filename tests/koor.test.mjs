import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/index.js';
import { loeHaal, VARVID, allkiri, kehtivAllkiri, aurusta, koor } from '../worker/koor.js';

const O = { Origin: 'https://meeleraha.ee' };
const SQL = await readFile(new URL('../migrations/0001_koor.sql', import.meta.url), 'utf8');

// Võlts-D1 node:sqlite peal
function db() {
  const s = new DatabaseSync(':memory:'); s.exec(SQL);
  return { raw: s, prepare(q) { const st = s.prepare(q); const m = (a) => ({
    run: async () => { st.run(...a); return {}; }, first: async () => st.get(...a) || null, all: async () => ({ results: st.all(...a) }) });
    return { ...m([]), bind: (...a) => m(a) }; } };
}
const tt = (over = {}) => ({ answers: { varv: { choice: 'sinine' }, haal: { choice: 'raha' }, sona: { choice: 'kartlik' }, isiklik: { probability: 0.1 }, ...over } });
const fakeF = (body, ok = true) => async () => ({ ok, status: ok ? 200 : 500, json: async () => body });
const mails = [];
const env = (extra = {}) => ({ DB: db(), SYSTEM_ONE_VOTI: 'x', KOOR_SALADUS: 'a'.repeat(48), KIRI_SAAJA: 'm@x.ee', POST: { send: async (m) => { mails.push(m); } }, ASSETS: { fetch: async () => new Response('a') }, ...extra });
const fd = (o) => { const f = new FormData(); for (const k in o) f.set(k, o[k]); return f; };
const call = (e, path, init = {}) => worker.fetch(new Request('https://meeleraha.ee' + path, init), e, { waitUntil() {} });

test('loeHaal: pakub värvi ja sõna, sõna peab olema tekstis', async () => {
  const r = await loeHaal({ SYSTEM_ONE_VOTI: 'x' }, 'Ma olen kartlik raha pärast', 'et', fakeF(tt()));
  assert.deepEqual([r.varv, r.hex, r.sona, r.isiklik], ['sinine', VARVID.sinine, 'kartlik', false]);
  await assert.rejects(loeHaal({ SYSTEM_ONE_VOTI: 'x' }, 'Ma olen rõõmus', 'et', fakeF(tt())), /vastus ei sobi/);
  await assert.rejects(loeHaal({ SYSTEM_ONE_VOTI: 'x' }, 'kartlik', 'et', fakeF(tt({ varv: { choice: 'lilla' } }))), /vastus ei sobi/);
  await assert.rejects(loeHaal({}, 'kartlik', 'et', fakeF(tt())), { kood: 503 });
  await assert.rejects(loeHaal({ SYSTEM_ONE_VOTI: 'x' }, 'kartlik', 'et', fakeF({}, false)), { kood: 502 });
  assert.equal(( await loeHaal({ SYSTEM_ONE_VOTI: 'x' }, 'kartlik', 'et', fakeF(tt({ isiklik: { probability: 0.9 } })))).isiklik, true);
});

test('loeHaal: ei_utle annab sõna ilma värvita ning tühisõnu ja "raha" sõnaks ei pakuta', async () => {
  const r = await loeHaal({ SYSTEM_ONE_VOTI: 'x' }, 'Mul on raha ja kartlik', 'et', fakeF(tt({ varv: { choice: 'ei_utle' } })));
  assert.deepEqual([r.varv, r.hex, r.sona], [null, null, 'kartlik']);
  let seen; await loeHaal({ SYSTEM_ONE_VOTI: 'x' }, 'Mul on raha ja kartlik', 'et', async (u, i) => { seen = JSON.parse(i.body); return { ok: true, json: async () => tt() }; });
  assert.deepEqual(Object.keys(seen.questions.sona.criteria), ['kartlik']);
});

test('loeHaal: päring läheb õiges kujus ja võti päises', async () => {
  let seen;
  await loeHaal({ SYSTEM_ONE_VOTI: 'salav' }, 'kartlik tekst', 'et', async (u, i) => { seen = { u, i }; return { ok: true, json: async () => tt() }; });
  assert.equal(seen.u, 'https://api.typesafe.ai/v1/systemone');
  assert.equal(seen.i.headers.Authorization, 'Bearer salav');
  const b = JSON.parse(seen.i.body);
  assert.equal(b.model, 'jev-latest');
  assert.deepEqual(Object.keys(b.questions), ['varv', 'haal', 'sona', 'isiklik']);
  assert.ok(b.questions.sona.criteria.kartlik && b.questions.sona.criteria.tekst);
});

test('/kuula: ainult oma lehelt ja ilma võtmeta 503', async () => {
  const post = (e, h, body) => call(e, '/kuula', { method: 'POST', headers: h, body: JSON.stringify(body) });
  assert.equal((await post(env(), {}, { tekst: 'kartlik' })).status, 403);
  assert.equal((await post(env({ SYSTEM_ONE_VOTI: undefined }), O, { tekst: 'kartlik' })).status, 503);
  assert.equal((await call(env(), '/kuula')).status, 405);
});

test('/saada koori nõusolekuga: rida ootab, kiri sisaldab kahte allkirjastatud linki, vastuse teksti andmebaasi ei jõua', async () => {
  const e = env(); mails.length = 0;
  const r = await call(e, '/saada', { method: 'POST', headers: O, body: fd({ tekst: 'Olen kartlik oma raha pärast', keel: 'et', teema: 'vastus', koor: '1', koor_hex: VARVID.sinine, koor_haal: 'raha', koor_sona: 'Kartlik' }) });
  assert.equal(r.status, 200);
  const rows = e.DB.raw.prepare('select * from haaled').all();
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].sona, rows[0].olek, rows[0].hex], ['kartlik', 'ootab', VARVID.sinine]);
  assert.ok(!JSON.stringify(rows).includes('oma raha pärast'));
  assert.match(mails[0].text, /Pane koori: https:\/\/meeleraha\.ee\/koor\/kinnita\?id=[0-9a-f]{32}&t=koor&s=[0-9a-f]{64}/);
  assert.match(mails[0].text, /Kustuta: .*t=kustuta/);
});

test('/saada ilma nõusolekuta või vigase pakkumisega koori ei jõua', async () => {
  const e = env();
  const base = { tekst: 'tere', keel: 'et', teema: 'vastus' };
  await call(e, '/saada', { method: 'POST', headers: O, body: fd({ ...base, koor_hex: VARVID.sinine, koor_haal: 'raha', koor_sona: 'tere' }) });
  await call(e, '/saada', { method: 'POST', headers: O, body: fd({ ...base, koor: '1', koor_hex: '#123456', koor_haal: 'raha', koor_sona: 'tere' }) });
  await call(e, '/saada', { method: 'POST', headers: O, body: fd({ ...base, koor: '1', koor_hex: VARVID.sinine, koor_haal: 'raha', koor_sona: 'kaks sõna' }) });
  await call(e, '/saada', { method: 'POST', headers: O, body: fd({ ...base, koor: '1', koor_hex: VARVID.sinine, koor_haal: 'raha', koor_sona: 'a@b.ee' }) });
  assert.equal(e.DB.raw.prepare('select count(*) n from haaled').get().n, 0);
});

async function ootel(e, sona = 'kartlik') {
  mails.length = 0;
  await call(e, '/saada', { method: 'POST', headers: O, body: fd({ tekst: 'tere', keel: 'et', teema: 'vastus', koor: '1', koor_hex: VARVID.sinine, koor_haal: 'raha', koor_sona: sona }) });
  return [...mails[0].text.matchAll(/(https:\/\/meeleraha\.ee\/koor\/kinnita\?[^\s]+)/g)].map((m) => m[1].replace('https://meeleraha.ee', ''));
}

test('kinnituslink: GET ei muuda midagi, POST paneb koori, /koor näitab ainult kinnitatuid', async () => {
  const e = env(); const [koorL] = await ootel(e);
  assert.deepEqual((await (await call(e, '/koor')).json()).haaled, []);
  const g = await call(e, koorL);
  assert.match(await g.text(), /<form method="post"/);
  assert.equal(e.DB.raw.prepare('select olek from haaled').get().olek, 'ootab');
  const u = new URL('https://x' + koorL);
  const p = await call(e, '/koor/kinnita', { method: 'POST', body: fd({ id: u.searchParams.get('id'), t: 'koor', s: u.searchParams.get('s') }) });
  assert.match(await p.text(), /Pandud koori/);
  const h = (await (await call(e, '/koor')).json()).haaled;
  assert.equal(h.length, 1); assert.equal(h[0].sona, 'kartlik'); assert.equal(h[0].tugevus, 1);
  assert.deepEqual(Object.keys(h[0]).sort(), ['haal', 'hex', 'kordus', 'paev', 'sona', 'tugevus']);
});

test('kinnituslink: kustuta, vale allkiri ja teise toimingu allkiri', async () => {
  const e = env(); const [koorL, kustL] = await ootel(e);
  const u = new URL('https://x' + kustL);
  const id = u.searchParams.get('id');
  const post = (o) => call(e, '/koor/kinnita', { method: 'POST', body: fd(o) });
  assert.match(await (await post({ id, t: 'kustuta', s: 'f'.repeat(64) })).text(), /ei kehti/);
  assert.match(await (await post({ id, t: 'koor', s: u.searchParams.get('s') })).text(), /ei kehti/, 'kustuta-allkiri ei kehti koori jaoks');
  assert.equal(e.DB.raw.prepare('select count(*) n from haaled').get().n, 1);
  assert.match(await (await post({ id, t: 'kustuta', s: u.searchParams.get('s') })).text(), /Kustutatud/);
  assert.equal(e.DB.raw.prepare('select count(*) n from haaled').get().n, 0);
  assert.ok(koorL);
});

test('sama sõna uuesti tõstab olemasolevat rida, uut ei tule', async () => {
  const e = env();
  for (let i = 0; i < 2; i++) { const [k] = await ootel(e); const u = new URL('https://x' + k); await call(e, '/koor/kinnita', { method: 'POST', body: fd({ id: u.searchParams.get('id'), t: 'koor', s: u.searchParams.get('s') }) }); }
  const rows = e.DB.raw.prepare('select * from haaled').all();
  assert.equal(rows.length, 1); assert.equal(rows[0].kordus, 2);
});

test('aurustumine: 100 päeva pärast kustub, enne seda tuhmub; ootel read kustuvad 30 päeva pärast', async () => {
  const e = env();
  const lisa = (id, olek, paev) => e.DB.raw.prepare('insert into haaled values (?,?,?,?,?,?,?,1,?)').run(id, '#3f78d1', 'raha', 'sona' + id, 'et', paev, paev, olek);
  lisa('a', 'koor', '2026-10-26'); lisa('b', 'koor', '2026-09-06'); lisa('c', 'koor', '2026-07-01'); lisa('d', 'ootab', '2026-09-01'); lisa('e', 'ootab', '2026-10-20');
  const now = new Date('2026-10-26T12:00:00Z');
  const h = await koor(e, now);
  assert.deepEqual(h.map((r) => r.tugevus).sort(), [0.5, 1], 'aurustunud rida (117 päeva) ei näidata');
  await aurusta(e, now);
  assert.deepEqual(e.DB.raw.prepare('select id from haaled order by id').all().map((r) => r.id), ['a', 'b', 'e']);
});

test('allkiri: sama sisend sama allkiri, teine saladus ei sobi', async () => {
  const a = { KOOR_SALADUS: 'x'.repeat(40) }, b = { KOOR_SALADUS: 'y'.repeat(40) };
  const s = await allkiri(a, 'id1', 'koor');
  assert.equal(s, await allkiri(a, 'id1', 'koor'));
  assert.ok(await kehtivAllkiri(a, 'id1', 'koor', s));
  assert.ok(!(await kehtivAllkiri(b, 'id1', 'koor', s)));
  assert.ok(!(await kehtivAllkiri({}, 'id1', 'koor', s)));
});

test('cron kutsub aurustumise ja ilma andmebaasita Worker ei kuku', async () => {
  const e = env(); let p;
  e.DB.raw.prepare('insert into haaled values (?,?,?,?,?,?,?,1,?)').run('z', '#fff', 'raha', 'vana', 'et', '2020-01-01', '2020-01-01', 'koor');
  await worker.scheduled({}, e, { waitUntil(x) { p = x; } }); await p;
  assert.equal(e.DB.raw.prepare('select count(*) n from haaled').get().n, 0);
  await worker.scheduled({}, {}, { waitUntil() {} });
  assert.deepEqual(await (await call({ ASSETS: e.ASSETS }, '/koor')).json(), { haaled: [] });
});
