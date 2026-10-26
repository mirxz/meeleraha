// Meeleraha Worker: /ilm (MET Norway proksi), /kirjuta (hääl tekstiks, Workers AI), /saada (kiri Mirkole),
// /kuula (System One pakub koorile värvi ja sõna), /koor (kinnitatud hääled), /koor/kinnita (Mirko kinnitab linkidega).
// Kõik muu läheb staatilistele failidele (ASSETS). IP-d ei salvestata: ainult piirangu võtmena, korraks.

import { loeHaal, kontrolliHaal, lingid, kehtivAllkiri, lisaOotele, paneKoori, kustuta, aurusta, koor } from './koor.js';

const SAIT = 'meeleraha.ee';
const LAT = 59.4586, LON = 24.6773; // Kopli Kase park: koht on serveris fikseeritud, lugeja asukohta ei küsita
const MET = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const UA = SAIT + '/1.0 https://' + SAIT;
const MAX_WAV = 3_200_000, MAX_HELI = 3 * 1024 * 1024, MAX_TEKST = 5000;
const TEEMAD = ['vastus', 'kaasa', 'lubadus'];
const KEELED = ['et', 'en'];

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });

function omaOrigin(request) {
  const o = request.headers.get('Origin');
  if (!o) return false;
  try {
    const h = new URL(o).hostname, own = new URL(request.url).hostname;
    return h === own || h === SAIT || h === 'www.' + SAIT;
  } catch { return false; }
}

async function piiratud(binding, request) {
  if (!binding || typeof binding.limit !== 'function') return false; // piirangut pole seadistatud (nt kohalik arendus)
  const key = request.headers.get('CF-Connecting-IP') || 'tundmatu';
  const { success } = await binding.limit({ key });
  return !success;
}

// ---------- /ilm ----------
export function valiIlm(data, now = new Date()) {
  const rows = data && data.properties && data.properties.timeseries;
  if (!Array.isArray(rows) || !rows.length) return null;
  let row = rows[0];
  for (const r of rows) { if (new Date(r.time) <= now) row = r; else break; }
  const d = (row.data && row.data.instant && row.data.instant.details) || {};
  const n1 = (row.data && row.data.next_1_hours) || {};
  return {
    temp: d.air_temperature ?? null,
    wind: d.wind_speed ?? null,
    windDir: d.wind_from_direction ?? null,
    cloud: d.cloud_area_fraction ?? 0,
    humidity: d.relative_humidity ?? null,
    precip: (n1.details && n1.details.precipitation_amount) ?? 0,
    symbol: (n1.summary && n1.summary.symbol_code) || null,
    time: row.time,
    source: 'MET Norway, CC BY 4.0'
  };
}

async function ilm(request, ctx) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request('https://' + SAIT + '/__ilm-vahemalu');
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const url = MET + '?lat=' + LAT.toFixed(4) + '&lon=' + LON.toFixed(4);
  let r;
  try { r = await fetch(url, { headers: { 'User-Agent': UA } }); } catch { return json({ viga: 'Ilma ei saanud kätte.' }, 502); }
  if (!r.ok) return json({ viga: 'Ilma ei saanud kätte.' }, 502);
  const out = valiIlm(await r.json());
  if (!out) return json({ viga: 'Ilma ei saanud kätte.' }, 502);
  const exp = Date.parse(r.headers.get('Expires') || '');
  const ttl = Math.max(600, Math.min(3600, Number.isFinite(exp) ? Math.round((exp - Date.now()) / 1000) : 900));
  const res = json(out, 200, { 'Cache-Control': 'public, max-age=' + ttl });
  if (cache) { const c = res.clone(); if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, c)); else await cache.put(key, c); }
  return res;
}

// ---------- /kirjuta ----------
// Ainus koht, kus heli tekstiks tehakse. Hiljem vahetatav (nt TalTechi eesti kõnetuvastus).
export async function tekstiks(env, wav, keel) {
  let bin = '';
  const bytes = new Uint8Array(wav);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  const res = await env.AI.run('@cf/openai/whisper-large-v3-turbo', { audio: btoa(bin), language: keel, task: 'transcribe', vad_filter: true });
  return String((res && res.text) || '').trim();
}

async function kirjuta(request, env) {
  if (request.method !== 'POST') return json({ viga: 'Meetod ei sobi.' }, 405);
  if (!omaOrigin(request)) return json({ viga: 'Päring ei tule sellelt lehelt.' }, 403);
  if (!env.AI) return json({ viga: 'Kõne tekstiks tegemine ei ole veel seadistatud.' }, 503);
  if (await piiratud(env.PIIR_KIRJUTA, request)) return json({ viga: 'Liiga palju päringuid. Proovi hetke pärast.' }, 429);
  const keel = new URL(request.url).searchParams.get('keel');
  if (!KEELED.includes(keel)) return json({ viga: 'Keel ei sobi.' }, 400);
  if (!/^audio\/(wav|x-wav|wave)/.test(request.headers.get('Content-Type') || '')) return json({ viga: 'Heli peab olema WAV.' }, 415);
  const wav = await request.arrayBuffer();
  if (!wav.byteLength || wav.byteLength > MAX_WAV) return json({ viga: 'Heli on tühi või liiga pikk.' }, 413);
  try { return json({ tekst: await tekstiks(env, wav, keel) }); }
  catch { return json({ viga: 'Tekstiks tegemine ei õnnestunud.' }, 502); }
}

// ---------- /saada ----------
function tallinnaAeg(d = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Tallinn', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(d).replace(',', '');
}

async function saada(request, env) {
  if (request.method !== 'POST') return json({ viga: 'Meetod ei sobi.' }, 405);
  if (!omaOrigin(request)) return json({ viga: 'Päring ei tule sellelt lehelt.' }, 403);
  if (await piiratud(env.PIIR, request)) return json({ viga: 'Liiga palju päringuid. Proovi hetke pärast.' }, 429);
  let fd;
  try { fd = await request.formData(); } catch { return json({ viga: 'Päring ei sobi.' }, 400); }
  if (String(fd.get('veeb') || '')) return json({ ok: true }); // lõksuväli: robot saab vaikse "ok"
  const tekst = String(fd.get('tekst') || '').trim();
  const keel = KEELED.includes(String(fd.get('keel'))) ? String(fd.get('keel')) : 'et';
  const teema = TEEMAD.includes(String(fd.get('teema'))) ? String(fd.get('teema')) : 'vastus';
  const heli = fd.get('heli');
  const onHeli = heli && typeof heli === 'object' && typeof heli.arrayBuffer === 'function' && heli.size > 0;
  if (!tekst && !onHeli) return json({ viga: 'Kirjuta midagi või salvesta häälsõnum.' }, 400);
  if (tekst.length > MAX_TEKST) return json({ viga: 'Tekst on liiga pikk (kuni ' + MAX_TEKST + ' märki).' }, 413);
  if (onHeli && (heli.size > MAX_HELI || !/^audio\//.test(heli.type || ''))) return json({ viga: 'Häälsõnum ei sobi (kuni 3 MB, heli).' }, 413);
  if (!env.POST || !env.KIRI_SAAJA) return json({ viga: 'Saatmine ei ole veel seadistatud. Kasuta kontaktilehte.' }, 503);

  // Koor: ainult kui vastaja märkis nõusoleku ja andmebaas on olemas
  const pakkumine = String(fd.get('koor') || '') === '1' && env.DB && env.KOOR_SALADUS ? kontrolliHaal(fd) : null;
  let koorRida = [];
  if (pakkumine) {
    try {
      const id = await lisaOotele(env, pakkumine, keel);
      const l = await lingid(env, new URL(request.url).origin, id);
      koorRida = ['', 'Koori pakkumine: ' + pakkumine.hex + ', hääl ' + pakkumine.haal + ', sõna "' + pakkumine.sona + '"', 'Pane koori: ' + l.koor, 'Kustuta: ' + l.kustuta];
    } catch { koorRida = []; }
  }
  const rida = [
    tekst || '(ainult häälsõnum)',
    ...koorRida,
    '',
    '---',
    'Aeg (Tallinn): ' + tallinnaAeg(),
    'Keel: ' + keel,
    'Teema: ' + teema,
    'Häälsõnum: ' + (onHeli ? 'manuses' : 'ei')
  ].join('\n');
  const msg = {
    from: { email: 'veeb@' + SAIT, name: SAIT },
    to: env.KIRI_SAAJA,
    subject: 'Meeleraha: ' + (teema === 'kaasa' ? 'tule kaasa' : teema === 'lubadus' ? 'lubadus' : 'vastus küsimusele'),
    text: rida
  };
  if (onHeli) {
    const ext = /mp4/.test(heli.type) ? 'm4a' : /ogg/.test(heli.type) ? 'ogg' : 'webm';
    msg.attachments = [{ content: await heli.arrayBuffer(), filename: 'heli.' + ext, type: heli.type, disposition: 'attachment' }];
  }
  try { await env.POST.send(msg); } catch { return json({ viga: 'Saatmine ei õnnestunud. Proovi uuesti või kasuta kontaktilehte.' }, 502); }
  return json({ ok: true });
}

// ---------- koor ----------
async function kuula(request, env) {
  if (request.method !== 'POST') return json({ viga: 'Meetod ei sobi.' }, 405);
  if (!omaOrigin(request)) return json({ viga: 'Päring ei tule sellelt lehelt.' }, 403);
  if (await piiratud(env.PIIR_KIRJUTA, request)) return json({ viga: 'Liiga palju päringuid. Proovi hetke pärast.' }, 429);
  let b;
  try { b = await request.json(); } catch { return json({ viga: 'Päring ei sobi.' }, 400); }
  const keel = KEELED.includes(b && b.keel) ? b.keel : 'et';
  try { return json(await loeHaal(env, b && b.tekst, keel)); }
  catch (e) { return json({ viga: 'Värvi ei saanud pakkuda. Vali ise.', pohjus: String(e.message).slice(0, 400) }, e.kood || 502); } // põhjus: TypeSafe'i veateade, ei sisalda saladusi ega vastaja teksti
}

async function koori(request, env) {
  if (request.method !== 'GET') return json({ viga: 'Meetod ei sobi.' }, 405);
  if (!env.DB) return json({ haaled: [] }, 200, { 'Cache-Control': 'public, max-age=300' });
  return json({ haaled: await koor(env) }, 200, { 'Cache-Control': 'public, max-age=300' });
}

const leht = (tekst, nupp) => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Koor</title><body style="font:18px/1.5 system-ui;max-width:30rem;margin:4rem auto;padding:0 1rem"><p>' + tekst + '</p>' + (nupp || ''), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
const TOIMINGUD = { koor: 'Pane see hääl koori', kustuta: 'Kustuta see hääl' };

// GET näitab nuppu (e-posti linkide eelvaade ei muuda midagi), POST teeb töö.
async function kinnita(request, env) {
  const u = new URL(request.url);
  let id = u.searchParams.get('id'), t = u.searchParams.get('t'), s = u.searchParams.get('s');
  if (request.method === 'POST') { try { const fd = await request.formData(); id = fd.get('id'); t = fd.get('t'); s = fd.get('s'); } catch { return leht('Päring ei sobi.'); } }
  if (!env.DB || !TOIMINGUD[t] || !/^[0-9a-f]{32}$/.test(id || '') || !(await kehtivAllkiri(env, id, t, s))) return leht('Link ei kehti.');
  if (request.method === 'GET') {
    return leht(TOIMINGUD[t] + '?', '<form method="post"><input type="hidden" name="id" value="' + id + '"><input type="hidden" name="t" value="' + t + '"><input type="hidden" name="s" value="' + s + '"><button style="font:inherit;padding:.5rem 1rem">' + TOIMINGUD[t] + '</button></form>');
  }
  if (request.method !== 'POST') return leht('Meetod ei sobi.');
  if (t === 'kustuta') { await kustuta(env, id); return leht('Kustutatud.'); }
  const v = await paneKoori(env, id);
  return leht(v === 'koori' ? 'Pandud koori.' : v === 'juba' ? 'See hääl on juba koori kinnitatud.' : 'Seda häält enam pole.');
}

export default {
  async scheduled(event, env, ctx) { if (env.DB) ctx.waitUntil(aurusta(env)); },
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === '/kuula') return kuula(request, env);
    if (pathname === '/koor') return koori(request, env);
    if (pathname === '/koor/kinnita') return kinnita(request, env);
    if (pathname === '/ilm') return ilm(request, ctx);
    if (pathname === '/kirjuta') return kirjuta(request, env);
    if (pathname === '/saada') return saada(request, env);
    return env.ASSETS.fetch(request);
  }
};
