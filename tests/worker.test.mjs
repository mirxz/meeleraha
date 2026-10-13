import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateEvent, rowsFor, collect } from '../analytics/worker.js';
import worker from '../analytics/worker.js';

const TAX = JSON.parse(await readFile(new URL('../public/taxonomy.json', import.meta.url), 'utf8'));
const mockDb = () => { const calls = []; return { calls, prepare(sql) { return { bind(...a) { return { sql, a }; } }; }, async batch(stmts) { calls.push(...stmts); } }; };
const req = (body, method = 'POST') => new Request('https://meeleraha.ee/api/e', { method, body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined });
const good = { n: 'Situation Selected', c: 'ots.picker.situation-card', p: { situation_id: 'algus' }, l: 'et', pg: 'ots' };
const NOW = new Date('2026-10-13T12:00:00Z');

test('Worker: iga toetatud keel on vastuvõetav', async () => {
  for (const l of TAX.enums.langs) assert.ok(validateEvent({ ...good, l }, TAX), l);
  assert.ok(TAX.enums.langs.length >= 9);
});

test('Worker: kehtiv sündmus muutub päevaseks loenduriks (üks rida kogusumma ja üks iga omaduse kohta)', async () => {
  const env = { DB: mockDb() };
  const res = await collect(req({ v: 1, events: [good] }), env, TAX, NOW);
  assert.equal(res.status, 204);
  assert.equal(env.DB.calls.length, 2);
  assert.deepEqual(env.DB.calls[0].a, ['2026-10-13', 'Situation Selected', 'ots.picker.situation-card', 'ots', 'et', '', '']);
  assert.deepEqual(env.DB.calls[1].a, ['2026-10-13', 'Situation Selected', 'ots.picker.situation-card', 'ots', 'et', 'situation_id', 'algus']);
  assert.match(env.DB.calls[0].sql, /ON CONFLICT\(day, event, component, page, lang, prop, val\) DO UPDATE SET n = n \+ 1/);
});

test('Worker: vigased, tundmatud ja vabateksti sisaldavad sündmused kukuvad välja', async () => {
  const bad = [
    { ...good, n: 'Unknown Thing' }, { ...good, c: 'x.y.z' }, { ...good, p: { situation_id: 'minu vaba tekst' } },
    { ...good, p: { situation_id: 'algus', extra: 'x' } }, { ...good, p: {} }, { ...good, l: 'xx' }, { ...good, pg: 'salaleht' }, null, 'tekst', 42,
  ];
  for (const b of bad) assert.equal(validateEvent(b, TAX), null, JSON.stringify(b));
  const env = { DB: mockDb() };
  await collect(req({ v: 1, events: bad }), env, TAX, NOW);
  assert.equal(env.DB.calls.length, 0);
});

test('Worker: täiendavad väljad (IP, tunnus, aeg) ei jõua salvestusse', async () => {
  const sneaky = { ...good, ip: '1.2.3.4', uid: 'abc', t: 1, p: { situation_id: 'algus' } };
  const v = validateEvent(sneaky, TAX);
  assert.deepEqual(Object.keys(v).sort(), ['c', 'l', 'n', 'p', 'pg']);
  const rows = rowsFor(v, '2026-10-13');
  assert.ok(!JSON.stringify(rows).includes('1.2.3.4') && !JSON.stringify(rows).includes('abc'));
});

test('Worker: sobimatud päringud ja piirid', async () => {
  const env = { DB: mockDb() };
  assert.equal((await collect(req('{ei json'), env, TAX, NOW)).status, 204);
  assert.equal((await collect(req({ v: 2, events: [good] }), env, TAX, NOW)).status, 204);
  assert.equal((await collect(req('x'.repeat(5000)), env, TAX, NOW)).status, 413);
  const many = Array.from({ length: 30 }, () => good);
  await collect(req({ v: 1, events: many }), env, TAX, NOW);
  assert.equal(env.DB.calls.length, 20 * 2, 'kuni 20 sündmust päringus');
  assert.equal((await worker.fetch(req('', 'GET'), env)).status, 405);
  const assets = { ASSETS: { fetch: async () => new Response('fail', { status: 200 }) } };
  assert.equal(await (await worker.fetch(new Request('https://meeleraha.ee/ots.html'), assets)).text(), 'fail');
});

test('Worker: ilma andmebaasita ei juhtu midagi ja kogu taksonoomia on vastuvõetav', async () => {
  assert.equal((await collect(req({ v: 1, events: [good] }), {}, TAX, NOW)).status, 204);
  // iga registris olev sündmus tuleb vastu võtta, kui kasutada tema esimest lubatud väärtust
  for (const [name, spec] of Object.entries(TAX.events)) {
    const p = Object.fromEntries(Object.entries(spec.props).map(([k, s]) => [k, TAX.enums[s.slice(5)][0]]));
    const ev = { n: name, c: null, p, l: 'et', pg: 'index' };
    assert.ok(validateEvent(ev, TAX), `${name} peab olema vastuvõetav`);
  }
});
