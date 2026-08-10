/* GearLogs website — motion (scroll reveals, staggered groups, counters, ledger controls).
   External file per the strict Content-Security-Policy (script-src 'self').
   All motion is additive: content is fully visible if this script never runs, and if
   any step below throws, the `anim-ready` flag is removed so nothing stays hidden. */
(function () {
  var root = document.documentElement;
  try {
    // CSS only hides .reveal elements once this is set.
    root.classList.add('anim-ready');

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function reveal(el) { el.classList.add('is-visible'); }

    if (!('IntersectionObserver' in window) || reduce) {
      document.querySelectorAll('.reveal').forEach(reveal);
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          io.unobserve(el);
          if (el.hasAttribute('data-stagger')) {
            var kids = el.querySelectorAll('.reveal');
            for (var i = 0; i < kids.length; i++) {
              var k = kids[i];
              k.style.transitionDelay = Math.min(i, 9) * 70 + 'ms';
              reveal(k);
              // clear the stagger delay after the reveal so later transitions (hover) aren't delayed
              (function (node) { setTimeout(function () { node.style.transitionDelay = ''; }, 1500); })(k);
            }
          } else {
            reveal(el);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      document.querySelectorAll('[data-stagger]').forEach(function (el) { io.observe(el); });
      document.querySelectorAll('.reveal').forEach(function (el) { if (!el.closest('[data-stagger]')) io.observe(el); });
    }

    // Calibrating counters — tick up to data-count when scrolled into view.
    var counters = document.querySelectorAll('[data-count]');
    if (counters.length) {
      if (reduce || !('IntersectionObserver' in window)) {
        counters.forEach(function (el) { el.textContent = (parseInt(el.getAttribute('data-count'), 10) || 0).toLocaleString(); });
      } else {
        var cObs = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            cObs.unobserve(e.target);
            var el = e.target, target = parseInt(el.getAttribute('data-count'), 10) || 0, n = 0;
            (function step() {
              n += Math.ceil((target - n) / 12);
              if (n >= target) n = target;
              el.textContent = n.toLocaleString();
              if (n < target) setTimeout(step, 45);
            })();
          });
        }, { threshold: 0.6 });
        counters.forEach(function (el) { cObs.observe(el); });
      }
    }

    // Activity ledger: pause when off-screen (perf) and give a real Pause control (WCAG 2.2.2).
    var feed = document.getElementById('actfeed');
    if (feed) {
      var userPaused = false, onScreen = true;
      function apply() { feed.style.animationPlayState = (userPaused || !onScreen) ? 'paused' : ''; }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; apply(); }, { threshold: 0 }).observe(feed);
      }
      var btn = document.getElementById('actpause');
      if (btn) {
        btn.addEventListener('click', function () {
          userPaused = !userPaused;
          btn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
          btn.textContent = userPaused ? 'Play' : 'Pause';
          apply();
        });
      }
    }
  } catch (e) {
    // Never leave content hidden if anything above failed.
    root.classList.remove('anim-ready');
  }
})();
