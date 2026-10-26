/* Meeleraha lubaduse liugur: 0, 1, 12, 123 ... 123 456 789 eurot. Lubadus, mitte makse: raha ei liigu kuskile.
   Saadetakse Workerisse /saada (teema "lubadus"), nimi või kontakt on valikuline. Kasutus: <div data-lubadus></div> */
(function () {
  'use strict';
  var STEPS = [0, 1, 12, 123, 1234, 12345, 123456, 1234567, 12345678, 123456789];
  function eur(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function sone(n) { return n === 0 ? 'Null on ka lubadus.' : 'Sinu lubadus: ' + eur(n) + (n === 1 ? ' euro' : ' eurot') + '.'; }

  function mount(host) {
    host.innerHTML =
      '<div class="liugur">' +
      '<div class="summa" aria-hidden="true"><span data-k="arv">0</span><span class="eur"> €</span></div>' +
      '<label class="vh" for="lub-liugur">Lubaduse suurus eurodes</label>' +
      '<input id="lub-liugur" type="range" min="0" max="' + (STEPS.length - 1) + '" step="1" value="0" aria-describedby="lub-sone">' +
      '<div class="skaala rida" aria-hidden="true"><span>0</span><span>1</span><span>12</span><span>123</span><span class="v">…</span><span>123 456 789</span></div>' +
      '<p class="sone" id="lub-sone" data-k="sone"></p>' +
      '<label class="vh" for="lub-nimi">Nimi või kontakt, valikuline</label>' +
      '<input id="lub-nimi" class="nimi" type="text" maxlength="200" autocomplete="off" placeholder="Nimi või kontakt, kui tahad (valikuline)">' +
      '<div class="lrida"><button type="button" class="luban" data-k="luban">Luban</button><span class="rida" data-k="olek" role="status" aria-live="polite"></span></div>' +
      '<p class="selgitus rida">Ilma nime ja kontaktita jääb lubadus anonüümseks. Sinu IP-d ei salvestata.</p>' +
      '</div>';
    var q = function (k) { return host.querySelector('[data-k="' + k + '"]'); };
    var r = host.querySelector('input[type=range]'), arv = q('arv'), so = q('sone'), nimi = host.querySelector('.nimi'), btn = q('luban'), olek = q('olek');
    var busy = false;
    function upd() {
      var n = STEPS[+r.value];
      arv.textContent = eur(n); so.textContent = sone(n);
      r.setAttribute('aria-valuetext', eur(n) + ' eurot');
      r.style.setProperty('--p', (+r.value / (STEPS.length - 1) * 100) + '%');
    }
    r.addEventListener('input', upd); upd();
    btn.addEventListener('click', function () {
      if (busy) return;
      busy = true; olek.textContent = 'Saadan…';
      var n = STEPS[+r.value], note = nimi.value.trim();
      var fd = new FormData();
      fd.append('tekst', 'Lubadus: ' + eur(n) + ' eurot' + (note ? '\n\n' + note : ''));
      fd.append('keel', 'et'); fd.append('teema', 'lubadus'); fd.append('veeb', '');
      fetch('/saada', { method: 'POST', body: fd })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, j: j }; }); })
        .then(function (x) {
          busy = false;
          olek.textContent = x.ok ? 'Aitäh! Lubadus jõudis Mirkoni. Raha ei liigu kuskile.' : ((x.j && x.j.viga) ? x.j.viga : 'Saatmine ei õnnestunud. Proovi uuesti või kasuta kontaktilehte.');
        })
        .catch(function () { busy = false; olek.textContent = 'Saatmine ei õnnestunud. Proovi uuesti või kasuta kontaktilehte.'; });
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-lubadus]'), mount);
})();
