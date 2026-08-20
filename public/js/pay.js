// GearLogs /pay — Paddle.js bootstrap (external file: the site CSP forbids
// inline scripts). Paddle.js v2 auto-detects the ?_ptxn= transaction param
// after Initialize and opens the overlay checkout itself.
(function () {
  function boot() {
    if (!window.Paddle) { setTimeout(boot, 50); return; }
    window.Paddle.Initialize({ token: 'live_b6523069175149de0fe0601d27b' });
    var hasTxn = new URLSearchParams(window.location.search).has('_ptxn');
    if (!hasTxn) {
      var state = document.getElementById('paystate');
      var missing = document.getElementById('paymissing');
      if (state) state.style.display = 'none';
      if (missing) missing.style.display = '';
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
