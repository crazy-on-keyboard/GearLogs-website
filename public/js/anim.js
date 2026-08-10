/* GearLogs website — motion (scroll reveals, staggered groups, counters).
   Loaded as an external file to satisfy the strict Content-Security-Policy
   (script-src 'self'). All motion is additive: content is fully visible if
   this script never runs. */
(function () {
  var root = document.documentElement;
  // Signal that JS is live — CSS only hides .reveal elements once this is set,
  // so a failed/blocked script can never leave content hidden.
  root.classList.add('anim-ready');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function reveal(el) { el.classList.add('is-visible'); }

  if (!('IntersectionObserver' in window) || reduce) {
    // No observer support (or user prefers reduced motion): show everything now.
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
            kids[i].style.transitionDelay = Math.min(i, 9) * 70 + 'ms';
            reveal(kids[i]);
          }
        } else {
          reveal(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    // Observe stagger containers, and any standalone .reveal not inside one.
    document.querySelectorAll('[data-stagger]').forEach(function (el) { io.observe(el); });
    document.querySelectorAll('.reveal').forEach(function (el) {
      if (!el.closest('[data-stagger]')) io.observe(el);
    });
  }

  // Calibrating counters — tick up to data-count when scrolled into view.
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      counters.forEach(function (el) {
        el.textContent = (parseInt(el.getAttribute('data-count'), 10) || 0).toLocaleString();
      });
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
})();
