/* Meeleraha taevas: päris taevas ja ilm taustaks (avaleht, /laps, /keskus, /avatud).
   Päikese kõrgus arvutatakse brauseris (J2000). Ilm tuleb saidi enda Workerist /ilm (MET Norway, CC BY 4.0),
   nii et lugeja IP ei lähe MET-ile. Näidis-hash: #koit #paev #loojang #oo, #selge #pilves #vihm #rb (päike ja vihm), #t12 (loo algus 12 s). */
(function () {
  'use strict';
  var root = document.documentElement;
  var LAT = 59.4586, LON = 24.6773; // Kopli Kase park, Tallinn
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  function sunAlt(date, lat, lon) {
    var rad = Math.PI / 180, d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
    var L = (280.460 + 0.9856474 * d) % 360, g = (357.528 + 0.9856003 * d) % 360;
    var lam = L + 1.915 * Math.sin(g * rad) + 0.020 * Math.sin(2 * g * rad);
    var eps = 23.439 - 0.0000004 * d;
    var ra = Math.atan2(Math.cos(eps * rad) * Math.sin(lam * rad), Math.cos(lam * rad)) / rad;
    var dec = Math.asin(Math.sin(eps * rad) * Math.sin(lam * rad)) / rad;
    var gmst = (280.46061837 + 360.98564736629 * d) % 360;
    var H = (gmst + lon - ra) * rad;
    return Math.asin(Math.sin(lat * rad) * Math.sin(dec * rad) + Math.cos(lat * rad) * Math.cos(dec * rad) * Math.cos(H)) / rad;
  }
  var STOPS = [
    [-18, '#0b1020', '#1a2140'], [-10, '#101a3a', '#2b2f5c'], [-4, '#2a2f63', '#8a5a86'],
    [0, '#4b4a8a', '#f0875a'], [4, '#6d86c4', '#f5c079'], [10, '#7fa8de', '#cfe3f2'], [30, '#5f9be0', '#bfdcf5']
  ];
  var NAMES = ['sügav öö', 'öö', 'hämarik', 'päikesetõus või -loojang', 'kuldne tund', 'hele', 'päev'];
  function hex(c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  function css(a) { return 'rgb(' + a.join(',') + ')'; }
  function lum(a) { var f = a.map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * f[0] + .7152 * f[1] + .0722 * f[2]; }
  function skyAt(alt) {
    alt = Math.max(-18, Math.min(30, alt));
    for (var i = 0; i < STOPS.length - 1; i++) {
      if (alt <= STOPS[i + 1][0]) {
        var t = (alt - STOPS[i][0]) / (STOPS[i + 1][0] - STOPS[i][0]);
        return { top: mix(hex(STOPS[i][1]), hex(STOPS[i + 1][1]), t), hor: mix(hex(STOPS[i][2]), hex(STOPS[i + 1][2]), t) };
      }
    }
  }

  // kihid
  function build() {
    var b = document.body, bl = [['taevas', 'div'], ['loor', 'div']];
    bl.forEach(function (x) { if (!$(x[0])) { var e = document.createElement(x[1]); e.id = x[0]; e.setAttribute('aria-hidden', 'true'); b.insertBefore(e, b.firstChild); } });
    if (!document.querySelector('.pilved')) {
      var p = document.createElement('div'); p.className = 'pilved'; p.id = 'pilved'; p.setAttribute('aria-hidden', 'true');
      var blobs = [[4, 10, 26, 16], [20, 26, 30, 18], [42, 8, 24, 14], [58, 32, 28, 17], [74, 12, 22, 14], [6, 48, 26, 16], [46, 52, 30, 18], [80, 44, 18, 12]];
      blobs.forEach(function (q) { var i = document.createElement('i'); i.style.cssText = 'left:' + q[0] + '%;top:' + q[1] + '%;width:' + q[2] + '%;height:' + q[3] + '%'; p.appendChild(i); });
      b.insertBefore(p, b.children[2] || null);
    }
    if (!$('vihm')) { var c = document.createElement('canvas'); c.id = 'vihm'; c.setAttribute('aria-hidden', 'true'); b.insertBefore(c, b.children[3] || null); }
  }

  var state = { alt: null, cloud: 0, rain: 0, demoT: null, demoW: null, live: null };
  var DEMO_T = { koit: -3, paev: 35, loojang: 0.5, oo: -25 };
  var DEMO_W = { selge: { cloud: 5, rain: 0 }, pilves: { cloud: 95, rain: 0 }, vihm: { cloud: 95, rain: 2 }, rb: { cloud: 25, rain: 1.4 } };
  (location.hash || '').slice(1).split('-').forEach(function (tok) {
    if (DEMO_T[tok] !== undefined) state.demoT = DEMO_T[tok];
    if (DEMO_W[tok]) state.demoW = DEMO_W[tok];
  });

  var Taevas = window.Taevas = { state: state, rainbow: false, listeners: [], onChange: function (f) { Taevas.listeners.push(f); } };

  function apply() {
    var alt = state.demoT !== null ? state.demoT : sunAlt(new Date(), LAT, LON);
    var w = state.demoW || state.live || { cloud: 0, rain: 0 };
    state.alt = alt; state.cloud = w.cloud; state.rain = w.rain;
    var s = skyAt(alt), blend = mix(s.top, s.hor, .45), night = lum(blend) < .32;
    var st = root.style;
    st.setProperty('--sky-top', css(s.top)); st.setProperty('--sky-horizon', css(s.hor));
    st.setProperty('--ink', night ? '#f2f4fa' : '#161b28');
    st.setProperty('--muted', night ? '#f2f4facc' : '#161b28b3');
    st.setProperty('--accent', night ? '#ffd27a' : '#1d4f91');
    st.setProperty('--on-accent', night ? '#161b28' : '#ffffff');
    st.setProperty('--surface', night ? '#ffffff1f' : '#ffffff59');
    st.setProperty('--border', night ? '#ffffff4d' : '#161b2840');
    st.setProperty('--control-off', night ? '#ffffff40' : '#161b2833');
    st.setProperty('--raha', night ? '#f0b84a' : '#e0a526'); st.setProperty('--kunst', night ? '#ef7487' : '#d1495b');
    st.setProperty('--tunded', night ? '#a28bf0' : '#7b5bd1'); st.setProperty('--tarkus', night ? '#5cb7e0' : '#2b8cb8');
    var loor = $('loor'); if (loor) { loor.style.opacity = (w.cloud / 100) * .45; loor.style.background = night ? '#3a4256' : '#c9ced8'; }
    var pil = $('pilved'); if (pil) pil.style.opacity = Math.min(.9, w.cloud / 100 * 1.1);
    Taevas.rainbow = alt > 2 && w.rain > 0 && w.cloud < 70;
    st.setProperty('--rb', Taevas.rainbow ? .95 : .14);
    var i = alt < -14 ? 0 : alt < -7 ? 1 : alt < -2 ? 2 : alt < 2 ? 3 : alt < 7 ? 4 : alt < 20 ? 5 : 6;
    var wt = w.rain > 0 ? (w.cloud < 70 ? 'päike ja vihm' : 'vihm') : (w.cloud > 60 ? 'pilves' : 'selge');
    var r = $('taevarida'); if (r) r.textContent = 'taevas: ' + NAMES[i] + ' · päike ' + (Math.round(alt * 10) / 10) + '° · ' + wt;
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', css(s.top));
    Taevas.listeners.forEach(function (f) { try { f(state); } catch (e) {} });
  }
  Taevas.apply = apply;

  // ilm
  function weather() {
    if (state.demoW || !window.fetch) return;
    fetch('/ilm', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || typeof j.cloud !== 'number') return;
      state.live = { cloud: j.cloud, rain: Math.max(0, +j.precip || 0) }; apply();
    }).catch(function () {});
  }

  // vihm (canvas)
  var cv, cx, drops = [], paused = false;
  function fit() { cv.width = innerWidth; cv.height = innerHeight; }
  function frame() {
    if (!paused && cv) {
      cx.clearRect(0, 0, cv.width, cv.height);
      if (state.rain > 0 && !reduce) {
        var want = Math.min(220, Math.round(state.rain * 70));
        while (drops.length < want) drops.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, v: 9 + Math.random() * 7, l: 10 + Math.random() * 12 });
        drops.length = Math.min(drops.length, want);
        cx.strokeStyle = getComputedStyle(root).getPropertyValue('--ink').trim() || '#000';
        cx.globalAlpha = .2; cx.lineWidth = 1.2; cx.beginPath();
        drops.forEach(function (d) { cx.moveTo(d.x, d.y); cx.lineTo(d.x - 2, d.y + d.l); d.y += d.v; d.x -= .6; if (d.y > cv.height) { d.y = -20; d.x = Math.random() * cv.width; } });
        cx.stroke();
      }
    }
    requestAnimationFrame(frame);
  }

  function start() {
    build();
    cv = $('vihm'); cx = cv.getContext('2d'); fit(); addEventListener('resize', fit);
    document.addEventListener('visibilitychange', function () { paused = document.hidden; });
    apply(); weather(); frame();
    setInterval(apply, 60000); setInterval(weather, 600000);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
