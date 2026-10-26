// Koor: vastaja värv, hääl ja üks sõna. System One (TypeSafe Jev) pakub, vastaja kinnitab, Mirko kinnitab linkidega.
// Salvestatakse ainult: hex, hääl, sõna, keel, päev. Vastuse teksti, nime, IP-d ega kellaaega ei salvestata.

export const AURUSTUB_PAEVA = 100;
export const HAALED = ['raha', 'kunst', 'tunded', 'tarkus', 'muu'];
// Nimega värvid. TBC: Mirko vaatab nimekirja ja toonid üle.
export const VARVID = {
  punane: '#d64545', oranž: '#e8833a', kollane: '#f0c43c', roheline: '#4fa66a', türkiis: '#3fb0ac', sinine: '#3f78d1',
  indigo: '#5a4fcf', violetne: '#8c5bc9', roosa: '#e07aa6', pruun: '#8a5a3c', hall: '#8c929b', valge: '#f1efe8',
  must: '#26262b', kuldne: '#d4a93a', hõbedane: '#b9c0c9', helesinine: '#8ec5ee'
};
const SYSTEM_ONE = 'https://api.typesafe.ai/v1/systemone';
const MAX_TEKST = 2000;
const SONA_RE = /^[\p{L}-]{3,24}$/u;

// Sõna ei tohi olla tühisõna ega "raha" vorm: koori sõna peab kandma tunnet või pilti.
const TUHISONAD = new Set(('ning aga kui siis kuid või sest ega vaid kuna mis kes kus kuidas miks mina sina tema meie teie nemad minu sinu tema mulle sulle talle meile teile neile mind sind teda ' +
  'oma ole oli olen oled olid olnud tahan tahaksin tahtsin võin saan pean peaks ning veel juba väga ikka ainult kõik iga mõni mõnel teisel rohkem vähem palju üks kaks kolm ' +
  'mul sul tal meil teil neil mulle neid need see too selle seda sellega samuti ka ei ju siin seal nagu mida millest millel mille kust sinna tuli tuleb tulen läheb lähen teen teeb tee ' +
  'raha rahast rahale rahaga rahas rahad rahade rahaks rahata rahaga kontol kuu kuus').split(' '));
export const sonad = (tekst) => [...new Set(String(tekst).toLowerCase().match(/[\p{L}-]{3,24}/gu) || [])].filter((w) => !TUHISONAD.has(w)).slice(0, 120);

// Üks päring, neli küsimust. Tagastab pakkumise või viskab vea.
export async function loeHaal(env, tekst, keel, f = fetch) {
  tekst = String(tekst || '').trim().slice(0, MAX_TEKST);
  const kandidaadid = sonad(tekst);
  if (!tekst || !kandidaadid.length) throw Object.assign(new Error('tühi'), { kood: 400 });
  if (!env.SYSTEM_ONE_VOTI) throw Object.assign(new Error('võti puudub'), { kood: 503 });
  const varvikirjeldus = Object.fromEntries([...Object.keys(VARVID).map((n) => [n, 'Värv ' + n + '.']), ['ei_utle', 'Tekstist ei saa värvi järeldada.']]);
  const body = {
    model: 'jev-latest',
    state: tekst,
    questions: {
      varv: { type: 'choice', instructions: 'Millise värvi tunde või pildi kirjutaja oma tekstis esile toob? Vali kõige sobivam värv.', criteria: varvikirjeldus },
      haal: { type: 'choice', instructions: 'Millest tekst kõige rohkem räägib?', criteria: { raha: 'Raha, hinnad, töö, sissetulek, kulutamine, kokkuhoid.', kunst: 'Kunst, loovus, mäng, muusika, joonistamine, ilu.', tunded: 'Tunded, hirmud, rõõm, suhted, enesetunne.', tarkus: 'Õppimine, oskused, teadmised, mõistmine, nõuanded.', muu: 'Midagi muud.' } },
      sona: { type: 'choice', instructions: 'Vali kirjutaja enda sõna, mis kõige paremini kannab tunnet või pilti. Eelista nimisõna või omadussõna, mitte tegusõna. Ainult üks sõna tekstist.', criteria: Object.fromEntries(kandidaadid.map((s) => [s, 'Sõna "' + s + '" tekstist.'])) },
      isiklik: { type: 'noul', instructions: 'Kas tekstis on nimi, e-posti aadress, telefon, aadress või muu isikut tuvastav info?' }
    }
  };
  let r;
  try { r = await f(SYSTEM_ONE, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.SYSTEM_ONE_VOTI }, body: JSON.stringify(body) }); }
  catch { throw Object.assign(new Error('võrk'), { kood: 502 }); }
  if (!r.ok) { let t = ''; try { t = (await r.text()).slice(0, 300); } catch {} throw Object.assign(new Error('TypeSafe ' + r.status + ' ' + t), { kood: 502 }); }
  let a;
  try { a = (await r.json()).answers; } catch { throw Object.assign(new Error('vastus'), { kood: 502 }); }
  const varv = a && a.varv && a.varv.choice, sona = a && a.sona && a.sona.choice, haal = a && a.haal && a.haal.choice;
  const isiklik = !!(a && a.isiklik && Number(a.isiklik.probability ?? a.isiklik.value ?? 0) >= 0.5);
  if (!kandidaadid.includes(sona) || (varv !== 'ei_utle' && !VARVID[varv])) throw Object.assign(new Error('vastus ei sobi: ' + JSON.stringify(a).slice(0, 300)), { kood: 502 });
  return { varv: VARVID[varv] ? varv : null, hex: VARVID[varv] || null, haal: HAALED.includes(haal) ? haal : 'muu', sona, isiklik, keel };
}

// Kontrollib pakkumise, mille brauser /saada kaasa saatis (värvi hex peab olema nimekirjas, sõna üks sõna).
export function kontrolliHaal(fd) {
  const hex = String(fd.get('koor_hex') || ''), haal = String(fd.get('koor_haal') || ''), sona = String(fd.get('koor_sona') || '').trim().toLowerCase();
  if (!Object.values(VARVID).includes(hex) || !HAALED.includes(haal) || !SONA_RE.test(sona)) return null;
  return { hex, haal, sona };
}

// ---------- allkiri ja lingid ----------
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export async function allkiri(env, id, toiming) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.KOOR_SALADUS), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(id + '.' + toiming)));
}
export async function kehtivAllkiri(env, id, toiming, s) {
  if (!env.KOOR_SALADUS || !/^[0-9a-f]{64}$/.test(s || '')) return false;
  const oige = await allkiri(env, id, toiming);
  let d = 0; for (let i = 0; i < 64; i++) d |= oige.charCodeAt(i) ^ s.charCodeAt(i);
  return d === 0;
}
export async function lingid(env, origin, id) {
  const l = async (t) => origin + '/koor/kinnita?id=' + id + '&t=' + t + '&s=' + await allkiri(env, id, t);
  return { koor: await l('koor'), kustuta: await l('kustuta') };
}

// ---------- andmebaas ----------
const paev = (d = new Date()) => d.toISOString().slice(0, 10);
export const uusId = () => hex(crypto.getRandomValues(new Uint8Array(16)));

export async function lisaOotele(env, h, keel, now = new Date()) {
  const id = uusId();
  await env.DB.prepare('INSERT INTO haaled (id, hex, haal, sona, keel, paev, viimati, olek) VALUES (?, ?, ?, ?, ?, ?, ?, \'ootab\')').bind(id, h.hex, h.haal, h.sona, keel, paev(now), paev(now)).run();
  return id;
}

// Sama sõna uuesti: olemasolev rida tõuseb (kordus+1, viimati täna), uut rida ei tehta.
export async function paneKoori(env, id, now = new Date()) {
  const rida = await env.DB.prepare('SELECT * FROM haaled WHERE id = ?').bind(id).first();
  if (!rida || rida.olek === 'kustutatud') return 'puudub';
  if (rida.olek === 'koor') return 'juba';
  const sama = await env.DB.prepare('SELECT id FROM haaled WHERE olek = \'koor\' AND sona = ? AND hex = ?').bind(rida.sona, rida.hex).first();
  if (sama) {
    await env.DB.prepare('UPDATE haaled SET kordus = kordus + 1, viimati = ? WHERE id = ?').bind(paev(now), sama.id).run();
    await env.DB.prepare('DELETE FROM haaled WHERE id = ?').bind(id).run();
  } else {
    await env.DB.prepare('UPDATE haaled SET olek = \'koor\', viimati = ? WHERE id = ?').bind(paev(now), id).run();
  }
  return 'koori';
}
export async function kustuta(env, id) {
  await env.DB.prepare('DELETE FROM haaled WHERE id = ?').bind(id).run();
  return 'kustutatud';
}

// Aurustumine: 100 päeva pärast viimast kordust rida kustub; ootel read kustuvad 30 päeva pärast.
export async function aurusta(env, now = new Date()) {
  const piir = (n) => paev(new Date(now.getTime() - n * 86400000));
  await env.DB.prepare('DELETE FROM haaled WHERE olek = \'koor\' AND viimati < ?').bind(piir(AURUSTUB_PAEVA)).run();
  await env.DB.prepare('DELETE FROM haaled WHERE olek != \'koor\' AND paev < ?').bind(piir(30)).run();
}

// Koori avalik nimekiri. Tugevus 1 (täna) → 0 (100 päeva), kordus tõstab.
export async function koor(env, now = new Date()) {
  const { results } = await env.DB.prepare('SELECT hex, haal, sona, paev, viimati, kordus FROM haaled WHERE olek = \'koor\' ORDER BY viimati DESC LIMIT 500').all();
  const t = Date.parse(paev(now));
  return (results || []).flatMap((r) => {
    const vanus = Math.max(0, Math.round((t - Date.parse(r.viimati)) / 86400000));
    const tugevus = +(1 - vanus / AURUSTUB_PAEVA).toFixed(2);
    return tugevus > 0 ? [{ hex: r.hex, haal: r.haal, sona: r.sona, paev: r.paev, kordus: r.kordus, tugevus }] : []; // aurustunud ei näidata, ka kui cron pole veel kustutanud
  });
}
