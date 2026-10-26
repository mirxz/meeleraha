import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { valiIlm, tekstiks } from '../worker/index.js';

const O = { Origin: 'https://meeleraha.ee' };
const wav = () => new Uint8Array(200).buffer;
const assets = { fetch: async (r) => new Response('asset:' + new URL(r.url).pathname) };
const form = (o, file) => { const f = new FormData(); for (const k in o) f.set(k, o[k]); if (file) f.set('heli', file, 'h.webm'); return f; };
const saada = (fd, env, h = O) => worker.fetch(new Request('https://meeleraha.ee/saada', { method: 'POST', body: fd, headers: h }), env, {});

test('Worker: muu tee läheb ASSETS-ile', async () => {
  const r = await worker.fetch(new Request('https://meeleraha.ee/tunne.html'), { ASSETS: assets }, {});
  assert.equal(await r.text(), 'asset:/tunne.html');
});

test('valiIlm: valib praeguse rea', () => {
  const d = { properties: { timeseries: [
    { time: '2026-10-26T10:00:00Z', data: { instant: { details: { cloud_area_fraction: 10 } }, next_1_hours: { details: { precipitation_amount: 0 } } } },
    { time: '2026-10-26T11:00:00Z', data: { instant: { details: { cloud_area_fraction: 90 } }, next_1_hours: { details: { precipitation_amount: 1.2 }, summary: { symbol_code: 'rain' } } } },
    { time: '2026-10-26T12:00:00Z', data: { instant: { details: { cloud_area_fraction: 50 } } } },
  ] } };
  const o = valiIlm(d, new Date('2026-10-26T11:30:00Z'));
  assert.equal(o.cloud, 90); assert.equal(o.precip, 1.2); assert.equal(o.symbol, 'rain');
  assert.equal(valiIlm({}), null);
});

test('/kirjuta: päritolu, keel, tüüp, suurus ja AI', async () => {
  const mk = (q, body, h = {}, env = { AI: { run: async () => ({ text: ' tere ' }) } }) =>
    worker.fetch(new Request('https://meeleraha.ee/kirjuta' + q, { method: 'POST', body, headers: { 'Content-Type': 'audio/wav', ...O, ...h } }), env, {});
  assert.equal((await mk('?keel=et', wav(), { Origin: 'https://paha.example' })).status, 403);
  assert.equal((await mk('?keel=xx', wav())).status, 400);
  assert.equal((await mk('?keel=et', wav(), { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await mk('?keel=et', new ArrayBuffer(3_300_000))).status, 413);
  assert.equal((await mk('?keel=et', wav(), {}, {})).status, 503);
  const ok = await mk('?keel=et', wav());
  assert.equal(ok.status, 200); assert.deepEqual(await ok.json(), { tekst: 'tere' });
  const limited = await mk('?keel=et', wav(), {}, { AI: {}, PIIR_KIRJUTA: { limit: async () => ({ success: false }) } });
  assert.equal(limited.status, 429);
  assert.equal(await tekstiks({ AI: { run: async () => ({ text: 'x' }) } }, wav(), 'en'), 'x');
});

test('/saada: kiri läheb saajale, heli manusena, lõksuväli vaikib', async () => {
  const sent = [];
  const env = { POST: { send: async (m) => sent.push(m) }, KIRI_SAAJA: 'saaja@example.test' };
  const r = await saada(form({ tekst: 'Tere', keel: 'et', teema: 'kaasa' }, new Blob(['abc'], { type: 'audio/webm' })), env);
  assert.equal(r.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'saaja@example.test');
  assert.match(sent[0].subject, /tule kaasa/);
  assert.match(sent[0].text, /Häälsõnum: manuses/);
  assert.equal(sent[0].attachments[0].filename, 'heli.webm');
  const bot = await saada(form({ tekst: 'spämm', veeb: 'x' }), env);
  assert.equal(bot.status, 200); assert.equal(sent.length, 1);
});

test('/saada: tühi, liiga pikk, vale päritolu, seadistamata, saatmise viga', async () => {
  const env = { POST: { send: async () => {} }, KIRI_SAAJA: 'a@example.test' };
  assert.equal((await saada(form({ tekst: '  ' }), env)).status, 400);
  assert.equal((await saada(form({ tekst: 'x'.repeat(5001) }), env)).status, 413);
  assert.equal((await saada(form({ tekst: 'x' }), env, { Origin: 'https://paha.example' })).status, 403);
  assert.equal((await saada(form({ tekst: 'x' }), {})).status, 503);
  assert.equal((await saada(form({ tekst: 'x' }, new Blob(['a'], { type: 'text/plain' })), env)).status, 413);
  assert.equal((await saada(form({ tekst: 'x' }), { ...env, POST: { send: async () => { throw new Error('x'); } } })).status, 502);
  const get = await worker.fetch(new Request('https://meeleraha.ee/saada'), env, {});
  assert.equal(get.status, 405);
});
