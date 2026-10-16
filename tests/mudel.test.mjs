import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Jagatud mudel (public/vaidle-mudel.js): puhtad funktsioonid, laaditakse brauserita
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../public/vaidle-mudel.js', import.meta.url), 'utf8'), ctx);
const VM = ctx.window.VM;
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} vs ${b}`);
let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

test('mudel: omanik, versioon ja ülevaatuse kuupäev on olemas ning tabelid katavad kõik stiilid, väited, tõendid ja hoovad', () => {
  assert.match(VM.VERSION, /^\d+\.\d+$/); assert.ok(VM.OWNER); assert.match(VM.REVIEWED, /^\d{4}-\d{2}-\d{2}$/);
  const styles = ['firm', 'flex', 'busy'], claims = ['budget', 'band', 'market', 'performance', 'timing'], evid = ['job-ad', 'peer', 'survey', 'ai', 'results', 'offer'];
  assert.deepEqual(Object.keys(VM.BASE).sort(), [...styles].sort()); assert.deepEqual(Object.keys(VM.POOL).sort(), [...styles].sort());
  for (const s of styles) { assert.deepEqual(Object.keys(VM.RES[s]).sort(), [...claims].sort()); assert.deepEqual(Object.keys(VM.KAP[s]).sort(), [...VM.LEV].sort()); assert.ok(VM.DECK[s].length === 4 && new Set(VM.DECK[s]).size === 4); }
  for (const c of claims) { assert.ok(VM.VAL[c] > 0); assert.deepEqual(Object.keys(VM.STR[c]).sort(), [...evid].sort()); }
  for (const l of VM.LEV) for (const s of styles) assert.ok(VM.KAP[s][l] > 0, `${s}/${l}`);
  assert.equal(VM.KAP.firm.salary + VM.KAP.flex.salary + VM.KAP.busy.salary, 3);        // palk maksab alati täishinna
});

test('mudel: tekstid on eesti ja inglise keeles sama võtmete ja kohahoidjatega', () => {
  const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  assert.deepEqual(Object.keys(VM.TEXT.et).sort(), Object.keys(VM.TEXT.en).sort());
  for (const k of Object.keys(VM.TEXT.et)) assert.equal(ph(VM.TEXT.et[k]), ph(VM.TEXT.en[k]), k);
  for (const l of VM.LEV) for (const p of ['lvl_', 'lvt_']) assert.ok(VM.TEXT.et[p + l], p + l);
});

test('mudel: hinnad ja väärtused klapivad käsitsi arvutusega (päev = 1/250 aastast, õppebüdžet = summa ÷ palk)', () => {
  const pr = ['salary', 'leave', 'learn'];
  near(VM.mkt('leave', 60000), 0.8, 'päev×2'); near(VM.mkt('learn', 60000), 500 / 60000 * 100, 'õpe'); near(VM.mkt('learn', 120000), 500 / 120000 * 100, 'õpe suurema palgaga');
  near(VM.mkt('learn', 0), 500 / 60000 * 100, 'puuduv palk = 60 000');
  near(VM.costP({ leave: 2 }, 'flex', 60000), 2 * 0.8 * 0.9, 'kulu'); near(VM.valP({ leave: 2 }, pr, 60000), 2 * 0.8 * 2, 'väärtus (2. koht ×2)');
  near(VM.valP({ salary: 4 }, pr, 60000), 4 * 0.5 * 3, 'palk (1. koht ×3)'); near(VM.costP({ remote: 3 }, 'firm', 60000), 3 * 0.5 * 1.6, 'jäik kaugtöö');
  assert.deepEqual(['salary', 'leave', 'learn', 'remote'].map((l) => VM.rho(l, pr)), [3, 2, 1.5, 1]);
  assert.equal(VM.levMax('salary', 10), 20); assert.equal(VM.levMax('salary', 30), 50); assert.equal(VM.levMax('leave', 10), 3);
  assert.equal(VM.capSteps(6.5), 7); assert.equal(VM.capSteps(2), 2); assert.equal(VM.capSteps(3.5), 4);
});

test('mudel: bestP on sama hea või parem kui 4000 juhuslikku mahtuvat paketti, vastab eelarvele ja on monotoonne', () => {
  for (const style of ['firm', 'flex', 'busy']) for (const pr of [['salary', 'leave', 'learn'], ['remote', 'learn', 'salary'], ['hours', 'bonus', 'title']]) {
    const o = { style, pr, pay: 60000, askU: 10, B: VM.BASE[style] + VM.POOL[style] }, best = VM.bestP(o);
    assert.ok(best.c <= o.B + 1e-9, `${style}: eelarve`);
    for (let i = 0; i < 4000; i++) { const p = {}; VM.LEV.forEach((l) => { p[l] = Math.floor(rnd() * (VM.levMax(l, 10) + 1)); }); if (VM.costP(p, style, 60000) <= o.B + 1e-9) assert.ok(VM.valP(p, pr, 60000) <= best.v + 1e-9, `${style}: leidus parem pakett`); }
    assert.ok(VM.bestP({ ...o, B: o.B + 1 }).v >= best.v - 1e-9, 'suurem eelarve ei vähenda väärtust');
    assert.ok(best.v >= VM.BASE[style] * VM.rho('salary', pr) - 1e-9 || pr[0] !== 'salary', 'parem kui ainult palk, kui palk on 1. prioriteet');
  }
  assert.equal(VM.bestP({ style: 'flex', pr: ['salary'], pay: 60000, askU: 10, B: 0 }).v, 0);
});

test('mudel: palga piirid (miinimum ja lagi) kehtivad ja võimatu vahemik ei anna paketti', () => {
  const o = { style: 'flex', pr: ['leave', 'learn', 'remote'], pay: 60000, askU: 10, B: 5 };
  const lo = VM.bestP({ ...o, minSalary: 6 }), hi = VM.bestP({ ...o, maxSalary: 2 });
  assert.ok(lo.p.salary >= 6 && hi.p.salary <= 2);
  assert.ok(VM.bestP({ ...o, maxSalary: 0 }).p.salary === 0);
  assert.equal(VM.bestP({ ...o, minSalary: 8, maxSalary: 3 }).p, null);
  assert.equal(VM.cheapestP({ ...o, minSalary: 8, maxSalary: 3, target: 1 }).p, null);
});

test('mudel: cheapestP leiab odavaima paketi, mille väärtus jõuab siduni, ega ületa eelarvet', () => {
  const o = { style: 'flex', pr: ['remote', 'learn', 'salary'], pay: 60000, askU: 10, B: 5 };
  const best = VM.bestP(o);
  for (const f of [0.3, 0.6, 0.9, 1]) {
    const T = best.v * f, c = VM.cheapestP({ ...o, target: T });
    assert.ok(c.p && c.v >= T - 1e-9 && c.c <= o.B + 1e-9, `siht ${f}`);
    for (let i = 0; i < 4000; i++) { const p = {}; VM.LEV.forEach((l) => { p[l] = Math.floor(rnd() * (VM.levMax(l, 10) + 1)); }); if (VM.valP(p, o.pr, 60000) >= T - 1e-9 && VM.costP(p, o.style, 60000) <= o.B + 1e-9) assert.ok(VM.costP(p, o.style, 60000) >= c.c - 1e-9, `leidus odavam pakett (${f})`); }
  }
  assert.equal(VM.cheapestP({ ...o, target: best.v + 1 }).p, null);                  // sihtväärtust ei saa saavutada
});

test('mudel: kogumise iteratsioon võrdub suletud valemiga ja tagurpidi arvutus ringi peale', () => {
  for (const [target, assets, save, ret] of [[600000, 50000, 1000, 4], [300000, 0, 500, 2], [800000, 120000, 2500, 5], [600000, 50000, 1000, 0]]) {
    const rm = Math.pow(1 + ret / 100, 1 / 12) - 1, closed = rm === 0 ? Math.ceil((target - assets) / save) : Math.ceil(Math.log((target + save / rm) / (assets + save / rm)) / Math.log(1 + rm) - 1e-9);
    assert.equal(VM.monthsToFire(target, assets, save, ret), closed);
  }
  for (const y of [5, 12, 20]) for (const r of [0, 4]) assert.ok(VM.monthsToFire(600000, 50000, VM.requiredSave(600000, 50000, r, y), r) <= y * 12);
  assert.equal(VM.monthsToFire(1e9, 0, 0, 0), Infinity); assert.equal(VM.monthsToFire(100, 200, 0, 4), 0);
});

test('mudel: 1. vaatuse otsused: Miks? ei vähenda tulemust ja jäik eelarve ei murdu tõendiga', () => {
  const rank = { held: 0, weakened: 1, broken: 2 };
  for (const s of ['firm', 'flex', 'busy']) for (const c of Object.keys(VM.VAL)) for (const e of Object.keys(VM.STR[c])) assert.ok(rank[VM.judge(s, c, e, true)] >= rank[VM.judge(s, c, e, false)]);
  assert.equal(VM.judge('firm', 'budget', 'results', true), 'held'); assert.equal(VM.judge('flex', 'budget', 'results', true), 'broken');
  assert.equal(VM.pointsFor('market', 'broken'), 3); assert.equal(VM.pointsFor('market', 'weakened'), 1.5); assert.equal(VM.pointsFor('market', 'held'), 0);
});
