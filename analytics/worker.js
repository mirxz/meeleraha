// Meeleraha anonüümne sündmuste vastuvõtja (Cloudflare Worker + D1).
// Salvestab ainult päevaseid loendureid: (päev, sündmus, komponent, leht, keel, omadus, väärtus) -> n.
// Ei loe IP-aadressi, ei sea küpsiseid, ei salvesta püsivat tunnust ega vabateksti.
import TAX from '../public/taxonomy.json' with { type: 'json' };

const MAX_BODY = 4096, MAX_EVENTS = 20;

export function validateEvent(ev, tax = TAX) {
  if (!ev || typeof ev !== 'object') return null;
  const spec = tax.events[ev.n];
  if (!spec) return null;
  if (ev.c !== null && ev.c !== undefined && !tax.components[ev.c]) return null;
  if (!tax.enums.langs.includes(ev.l) || !tax.enums.pages.includes(ev.pg)) return null;
  const props = ev.p && typeof ev.p === 'object' ? ev.p : {};
  const want = Object.keys(spec.props), have = Object.keys(props);
  if (have.length !== want.length) return null;
  for (const k of want) {
    if (!(k in props)) return null;
    const m = /^enum:(.+)$/.exec(spec.props[k]);
    if (!m || !tax.enums[m[1]] || !tax.enums[m[1]].includes(String(props[k]))) return null;
  }
  return { n: ev.n, c: ev.c || '', l: ev.l, pg: ev.pg, p: Object.fromEntries(want.map((k) => [k, String(props[k])])) };
}

export function rowsFor(ev, day) {
  const rows = [[day, ev.n, ev.c, ev.pg, ev.l, '', '']];
  for (const [k, v] of Object.entries(ev.p)) rows.push([day, ev.n, ev.c, ev.pg, ev.l, k, v]);
  return rows;
}

const UPSERT = 'INSERT INTO events_daily (day, event, component, page, lang, prop, val, n) VALUES (?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT(day, event, component, page, lang, prop, val) DO UPDATE SET n = n + 1';

export async function collect(request, env, tax = TAX, now = new Date()) {
  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });
  let body;
  try { body = JSON.parse(text); } catch { return new Response(null, { status: 204 }); }
  if (!body || body.v !== 1 || !Array.isArray(body.events)) return new Response(null, { status: 204 });
  const day = now.toISOString().slice(0, 10);
  const valid = body.events.slice(0, MAX_EVENTS).map((e) => validateEvent(e, tax)).filter(Boolean);
  if (valid.length && env && env.DB) {
    const stmts = valid.flatMap((ev) => rowsFor(ev, day)).map((r) => env.DB.prepare(UPSERT).bind(...r));
    await env.DB.batch(stmts);
  }
  return new Response(null, { status: 204 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/e') {
      if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
      return collect(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
