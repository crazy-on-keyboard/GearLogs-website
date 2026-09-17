// GearLogs website — the pricing calculator on /pricing (external file: the site CSP forbids
// inline scripts, script-src 'self'). Progressive enhancement: the page ships with a correct
// resting state ($199, the base plan, monthly) that is fully readable if this script never
// runs; here it makes the cycle switch, the seat stepper and the Priority Operations toggle
// live and keeps a running total. If the markup is absent (any other page) it no-ops. Every
// user-facing string exists in EN + HE, following the page language (the app's bilingual rule).
(function () {
  var root = document.getElementById('price-calc');
  if (!root) return;

  var HE = document.documentElement.lang === 'he';
  var T = HE ? {
    perMonth: 'לחודש \u00b7 חמישה חשבונות כלולים',
    perYear: 'לשנה \u00b7 חמישה חשבונות כלולים',
    totalMonth: 'לחודש',
    totalYear: 'לשנה',
    seatMonth: 'כל אחד לחודש, מעבר לחמישה הכלולים',
    seatYear: 'כל אחד לשנה, מעבר לחמישה הכלולים',
    slaMonth: 'לחודש \u00b7 תגובה ראשונה תוך 4 שעות עבודה (ראשון\u2013חמישי 09:00\u201318:00, שעון ישראל)',
    slaYear: 'לשנה \u00b7 תגובה ראשונה תוך 4 שעות עבודה (ראשון\u2013חמישי 09:00\u201318:00, שעון ישראל)'
  } : {
    perMonth: 'per month \u00b7 5 accounts included',
    perYear: 'per year \u00b7 5 accounts included',
    totalMonth: '/ month',
    totalYear: '/ year',
    seatMonth: 'each a month, beyond the five included',
    seatYear: 'each a year, beyond the five included',
    slaMonth: 'a month \u00b7 a first reply within 4 business hours (Sunday\u2013Thursday 09:00\u201318:00, Israel time)',
    slaYear: 'a year \u00b7 a first reply within 4 business hours (Sunday\u2013Thursday 09:00\u201318:00, Israel time)'
  };

  function n(v) { var x = parseInt(v, 10); return isFinite(x) ? x : 0; }
  var PRICE = {
    base: { month: n(root.dataset.baseMonth), year: n(root.dataset.baseYear) },
    seat: { month: n(root.dataset.seatMonth), year: n(root.dataset.seatYear) },
    sla:  { month: n(root.dataset.slaMonth),  year: n(root.dataset.slaYear) }
  };
  var SEAT_CAP = 995;

  function money(v) { return '$' + v.toLocaleString('en-US'); }
  function el(sel) { return root.querySelector(sel); }

  var state = { cycle: 'month', seats: 0, sla: false };

  var seatMinus = el('[data-step="-1"]');
  var seatPlus = el('[data-step="1"]');

  function render() {
    var yr = state.cycle === 'year';
    var base = yr ? PRICE.base.year : PRICE.base.month;
    var seat = yr ? PRICE.seat.year : PRICE.seat.month;
    var sla = yr ? PRICE.sla.year : PRICE.sla.month;
    var total = base + state.seats * seat + (state.sla ? sla : 0);

    el('[data-price-base]').textContent = money(base);
    el('[data-price-base-per]').textContent = yr ? T.perYear : T.perMonth;
    el('[data-price-seats]').textContent = String(state.seats);
    el('[data-price-seat-amt]').textContent = money(seat);
    el('[data-price-seat-words]').textContent = yr ? T.seatYear : T.seatMonth;
    el('[data-price-sla-amt]').textContent = '+' + money(sla);
    el('[data-price-sla-words]').textContent = yr ? T.slaYear : T.slaMonth;
    el('[data-price-total]').textContent = money(total);
    el('[data-price-total-per]').textContent = yr ? T.totalYear : T.totalMonth;

    var save = el('[data-price-save]');
    if (save) save.hidden = !yr;
    if (seatMinus) seatMinus.disabled = state.seats <= 0;
    if (seatPlus) seatPlus.disabled = state.seats >= SEAT_CAP;
  }

  var cycle = el('[data-price-cycle]');
  if (cycle) {
    cycle.querySelectorAll('.price-seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.cycle = btn.getAttribute('data-cycle') === 'year' ? 'year' : 'month';
        cycle.querySelectorAll('.price-seg-btn').forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        render();
      });
    });
  }

  var step = el('[data-price-step]');
  if (step) {
    step.querySelectorAll('.price-step-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var d = parseInt(btn.getAttribute('data-step'), 10) || 0;
        state.seats = Math.max(0, Math.min(SEAT_CAP, state.seats + d));
        render();
      });
    });
  }

  var toggle = el('[data-price-sla]');
  if (toggle) {
    toggle.addEventListener('click', function () {
      state.sla = !state.sla;
      toggle.setAttribute('aria-pressed', state.sla ? 'true' : 'false');
      render();
    });
  }

  render();
})();
