/* Meeleraha vastusekast: tekst või hääl. Hääl tehakse tekstiks lause kaupa Workeris (/kirjuta, Whisper),
   terve salvestus läheb kirja manusena (/saada). Heli lahkub seadmest ainult siis, kui lugeja salvestab ja saadab.
   Kasutus: <div data-vastus data-teema="vastus" data-placeholder="Vasta Mirkole…"></div> */
(function () {
  'use strict';
  var MAX_MS = 180000, MAX_BYTES = 3 * 1024 * 1024;
  var ICON = {
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };
  var LANGS = [['et', 'eesti'], ['en', 'english']];

  function wav16(chunks, rate) {
    var len = 0; chunks.forEach(function (c) { len += c.length; });
    var all = new Float32Array(len), o = 0; chunks.forEach(function (c) { all.set(c, o); o += c.length; });
    var ratio = rate / 16000, n = Math.floor(all.length / ratio), pcm = new Int16Array(n);
    for (var i = 0; i < n; i++) {
      var a = Math.floor(i * ratio), b = Math.min(all.length, Math.floor((i + 1) * ratio)), s = 0, k = 0;
      for (var j = a; j < b; j++) { s += all[j]; k++; }
      var v = k ? s / k : 0; v = Math.max(-1, Math.min(1, v)); pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    var buf = new ArrayBuffer(44 + pcm.length * 2), dv = new DataView(buf);
    function str(p, t) { for (var q = 0; q < t.length; q++) dv.setUint8(p + q, t.charCodeAt(q)); }
    str(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 16000, true);
    dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
    for (var m = 0; m < pcm.length; m++) dv.setInt16(44 + m * 2, pcm[m], true);
    return new Blob([buf], { type: 'audio/wav' });
  }
  function pickMime() {
    var c = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'];
    if (!window.MediaRecorder) return '';
    for (var i = 0; i < c.length; i++) { try { if (MediaRecorder.isTypeSupported(c[i])) return c[i]; } catch (e) {} }
    return '';
  }
  function ext(m) { return /mp4/.test(m) ? 'm4a' : /ogg/.test(m) ? 'ogg' : 'webm'; }
  function mmss(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  function mount(host) {
    var teema = host.getAttribute('data-teema') || 'vastus', ph = host.getAttribute('data-placeholder') || 'Vasta Mirkole…';
    var key = 'meeleraha-mustand-' + teema, uid = 'v-' + teema;
    host.innerHTML =
      '<div class="composer"><label class="vh" for="' + uid + '">Sinu vastus</label>' +
      '<textarea id="' + uid + '" placeholder="' + ph + '" autocomplete="off"></textarea>' +
      '<div class="cbar"><button type="button" class="pill" data-k="keel"></button><span class="sp"></span>' +
      '<button type="button" class="ibtn" data-k="mic">' + ICON.mic + '</button>' +
      '<button type="button" class="ibtn send" data-k="saada" aria-label="Saada">' + ICON.up + '</button></div></div>' +
      '<div class="olek rida" data-k="olek" role="status" aria-live="polite"></div>' +
      '<div class="selgitus rida">Kiri ja häälsõnum lähevad Mirkole. Häälsõnum tehakse tekstiks Cloudflare\'i serveris ja saadetakse kirja manusena. Sinu IP-d ei salvestata. Mustand jääb sinu brauserisse, kuni saadad.</div>';
    var $ = function (k) { return host.querySelector('[data-k="' + k + '"]'); };
    var ta = host.querySelector('textarea'), box = host.querySelector('.composer'), keel = $('keel'), mic = $('mic'), send = $('saada'), olek = $('olek');
    var li = 0, rec = null, audio = null, sentBusy = false;
    function setLang() { keel.textContent = LANGS[li][1]; keel.setAttribute('aria-label', 'Keel: ' + LANGS[li][1] + '. Vaheta keelt'); }
    function status(t) { olek.textContent = t; }
    function upd() { send.classList.toggle('on', ta.value.trim().length > 0 || !!audio); }
    function idle() { mic.innerHTML = ICON.mic; mic.setAttribute('aria-label', 'Salvesta häälsõnum'); mic.setAttribute('aria-pressed', 'false'); mic.classList.remove('rec'); box.classList.remove('salvestab'); ta.readOnly = false; }
    setLang(); idle();
    try { var d = localStorage.getItem(key); if (d) ta.value = d; } catch (e) {}
    upd();
    status('Kirjuta või räägi.');
    ta.addEventListener('input', function () { upd(); try { localStorage.setItem(key, ta.value); } catch (e) {} });
    keel.addEventListener('click', function () { if (rec) return; li = (li + 1) % LANGS.length; setLang(); });

    // --- salvestus ---
    function startRec() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { status('Selles brauseris ei saa mikrofoni kasutada. Kirjuta tekstina.'); return; }
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
        var AC = window.AudioContext || window.webkitAudioContext, ctx = new AC(), src = ctx.createMediaStreamSource(stream);
        var proc = ctx.createScriptProcessor(4096, 1, 1), mime = pickMime(), mr = null, parts = [];
        if (mime) { try { mr = new MediaRecorder(stream, { mimeType: mime }); mr.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); }; mr.start(1000); } catch (e) { mr = null; } }
        var r = { stream: stream, ctx: ctx, src: src, proc: proc, mr: mr, parts: parts, mime: mime, base: ta.value.replace(/\s+$/, ''), sent: [], chunk: [], chunkMs: 0, silence: 0, voiced: false, min: 1, t0: Date.now(), lang: LANGS[li][0], tick: null, stopped: false };
        rec = r;
        function flush() {
          if (r.voiced && r.chunk.length) {
            var blob = wav16(r.chunk, ctx.sampleRate), slot = { text: null }; r.sent.push(slot);
            slot.p = fetch('/kirjuta?keel=' + r.lang, { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: blob })
              .then(function (x) { return x.ok ? x.json() : null; }).then(function (j) { slot.text = j && j.tekst ? String(j.tekst).trim() : ''; render(); })
              .catch(function () { slot.text = ''; render(); });
            render();
          }
          r.chunk = []; r.chunkMs = 0; r.silence = 0; r.voiced = false;
        }
        r.flush = flush;
        proc.onaudioprocess = function (e) {
          var inp = e.inputBuffer.getChannelData(0), copy = new Float32Array(inp), sum = 0;
          for (var i = 0; i < copy.length; i++) sum += copy[i] * copy[i];
          var rms = Math.sqrt(sum / copy.length), ms = copy.length / ctx.sampleRate * 1000;
          if (rms > 1e-5 && rms < r.min) r.min = rms;
          var thr = Math.max(r.min * 2.5, 0.012);
          mic.style.setProperty('--lvl', Math.min(1, rms * 8).toFixed(2));
          if (rms > thr) { r.voiced = true; r.silence = 0; } else r.silence += ms;
          r.chunk.push(copy); r.chunkMs += ms;
          if ((r.silence >= 600 && r.chunkMs >= 1200) || r.chunkMs >= 10000) flush();
        };
        src.connect(proc); proc.connect(ctx.destination);
        mic.innerHTML = ICON.stop; mic.setAttribute('aria-label', 'Lõpeta salvestus'); mic.setAttribute('aria-pressed', 'true'); mic.classList.add('rec');
        box.classList.add('salvestab'); ta.readOnly = true;
        r.tick = setInterval(function () {
          var el = Date.now() - r.t0;
          status('Salvestan ' + mmss(el) + ' · räägi rahulikult, tekst tuleb kasti lause kaupa · lõpetamiseks vajuta ruutu');
          if (el >= MAX_MS) stopRec();
        }, 250);
        status('Salvestan 0:00 · räägi rahulikult, tekst tuleb kasti lause kaupa · lõpetamiseks vajuta ruutu');
      }).catch(function () { status('Mikrofon ei ole lubatud. Luba see brauseri aadressiribalt või kirjuta tekstina.'); });
    }
    function render() {
      if (!rec) return;
      var s = rec.sent.map(function (x) { return x.text === null ? '…' : x.text; }).filter(Boolean).join(' ');
      ta.value = (rec.base ? rec.base + (s ? ' ' : '') : '') + s; upd();
    }
    function stopRec() {
      var r = rec; if (!r || r.stopped) return; r.stopped = true; clearInterval(r.tick);
      try { r.proc.disconnect(); r.src && r.src.disconnect(); } catch (e) {}
      r.flush(); mic.style.setProperty('--lvl', 0);
      status('Lõpetan salvestust ja teen lauseid tekstiks…');
      var done = new Promise(function (res) { if (r.mr && r.mr.state !== 'inactive') { r.mr.onstop = res; try { r.mr.stop(); } catch (e) { res(); } } else res(); });
      r.stream.getTracks().forEach(function (t) { t.stop(); });
      Promise.all([done].concat(r.sent.map(function (x) { return x.p; }))).then(function () {
        try { r.ctx.close(); } catch (e) {}
        var failed = r.sent.some(function (x) { return !x.text; });
        render();
        var blob = r.parts.length ? new Blob(r.parts, { type: r.mime || 'audio/webm' }) : null;
        audio = null; var note = '';
        if (blob && blob.size <= MAX_BYTES) { audio = { blob: blob, mime: r.mime }; }
        else if (blob) note = ' Häälsõnum oli manuseks liiga pikk, kirja läheb ainult tekst.';
        rec = null; idle(); upd();
        try { localStorage.setItem(key, ta.value); } catch (e) {}
        status(failed ? 'Mõne lause tekstiks tegemine ei õnnestunud. Paranda tekst käsitsi.' + note : 'Valmis. Vaata tekst üle ja vajuta saatmisnoolt.' + note);
      });
    }
    mic.addEventListener('click', function () { if (rec) stopRec(); else startRec(); });

    // --- saatmine ---
    function doSend() {
      if (sentBusy || rec) return;
      var txt = ta.value.trim();
      if (!txt && !audio) { status('Kirjuta enne midagi või salvesta häälsõnum. Piisab ka ühest värvist.'); return; }
      sentBusy = true; send.classList.remove('on'); status('Saadan…');
      var fd = new FormData(); fd.append('tekst', txt); fd.append('keel', LANGS[li][0]); fd.append('teema', teema); fd.append('veeb', '');
      if (audio) fd.append('heli', audio.blob, 'heli.' + ext(audio.mime));
      fetch('/saada', { method: 'POST', body: fd }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          sentBusy = false;
          if (x.ok) {
            ta.value = ''; audio = null; try { localStorage.removeItem(key); } catch (e) {}
            send.innerHTML = ICON.ok; send.classList.add('on'); status('Aitäh! Kiri jõudis Mirkoni.');
            setTimeout(function () { send.innerHTML = ICON.up; upd(); }, 4000);
          } else { upd(); status((x.j && x.j.viga) ? x.j.viga : 'Saatmine ei õnnestunud. Proovi uuesti või kasuta kontaktilehte.'); }
        }).catch(function () { sentBusy = false; upd(); status('Saatmine ei õnnestunud. Proovi uuesti või kasuta kontaktilehte.'); });
    }
    send.addEventListener('click', doSend);
    ta.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); doSend(); } });
  }
  function boot() { Array.prototype.forEach.call(document.querySelectorAll('[data-vastus]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
