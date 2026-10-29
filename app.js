(function () {
  'use strict';
  var ADDR = /^0x[0-9a-fA-F]{40}$/;
  var MINTA = /^https:\/\/minta\.vyrechain\.com(\/[\w\-./?=&%#]*)?$/;
  var $ = function (id) { return document.getElementById(id); };

  /* Copy buttons */
  function copy(btn) {
    var text = btn.getAttribute('data-copy');
    if (!text) { return; }
    var done = function () {
      var old = btn.getAttribute('data-label') || btn.textContent;
      btn.setAttribute('data-label', old);
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-copy]') : null;
    if (b) { copy(b); }
  });

  /* Token section, rendered from token.json */
  function renderToken(t) {
    if (!t || typeof t !== 'object') { return; }
    var minta = typeof t.mintaUrl === 'string' && MINTA.test(t.mintaUrl) ? t.mintaUrl : 'https://minta.vyrechain.com';
    $('token-minta').setAttribute('href', minta);
    if (t.launched === true && typeof t.address === 'string' && ADDR.test(t.address)) {
      var sym = typeof t.symbol === 'string' ? t.symbol.slice(0, 12) : 'VYRA';
      var badge = $('token-status');
      badge.textContent = 'Launched';
      badge.className = 'badge live-badge';
      $('token-note').textContent = 'The ' + sym + ' token is live on MINTA. Check the address below before you trade: it is the only one this page shows.';
      $('token-addr-text').textContent = t.address;
      var cb = $('token-copy');
      cb.setAttribute('data-copy', t.address);
      $('token-addr').hidden = false;
      var ex = $('token-explorer');
      ex.setAttribute('href', 'https://explorer.vyrechain.com/token/' + t.address);
      ex.hidden = false;
    }
  }
  if (window.fetch) {
    fetch('/token.json', { cache: 'no-cache', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(renderToken)
      .catch(function () {});
  }

  /* Subtle hero parallax and glow */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var art = $('hero-art');
  if (art && !reduce && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    var raf = 0;
    document.addEventListener('pointermove', function (e) {
      if (raf) { return; }
      raf = requestAnimationFrame(function () {
        raf = 0;
        var x = e.clientX / window.innerWidth - 0.5;
        var y = e.clientY / window.innerHeight - 0.5;
        art.style.setProperty('--px', x.toFixed(3));
        art.style.setProperty('--py', y.toFixed(3));
      });
    }, { passive: true });
  }
})();
