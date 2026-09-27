// The site's motion (Stage 2, the Director's pick Q11 · A: once, short, fade and rise only; reduced motion = none). Every page
// ships complete — the CSS hides a `.rv` block only after this script marks <html class="motion">, so without it (or when the
// visitor asks for less motion) everything simply shows. A block rises in when it scrolls into view; a list marked
// data-stagger lets its rows follow one another; a number marked data-to counts up once. The hero's slow push is CSS only.

const reduced = (() => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
})();

/** Count a number up to its value once (about one second, easing out). */
function countUp(el: HTMLElement): void {
  if (el.dataset.done) return;
  el.dataset.done = '1';
  const to = Number(el.dataset.to);
  if (!Number.isFinite(to) || to <= 0) return;
  const start = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / 1000);
    el.textContent = String(Math.round(to * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function show(el: HTMLElement): void {
  el.classList.add('in');
  el.querySelectorAll<HTMLElement>('[data-to]').forEach(countUp);
}

function wire(): void {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('.rv'));
  if (reduced || blocks.length === 0 || !('IntersectionObserver' in window)) return;
  // rows of a staggered list follow one another (their index feeds the CSS delay)
  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((list) => {
    list.querySelectorAll<HTMLElement>('.rv').forEach((row, i) => row.style.setProperty('--i', String(Math.min(i, 9))));
  });
  document.documentElement.classList.add('motion');
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      show(entry.target as HTMLElement);
      io.unobserve(entry.target);
    }
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  blocks.forEach((el) => io.observe(el));
  // a block already on screen when the page opens never waits for a scroll
  window.setTimeout(() => blocks.forEach((el) => { if (el.getBoundingClientRect().top < window.innerHeight) show(el); }), 1200);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
else wire();

export {};
