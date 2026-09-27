// The header's Help menu (Stage 2): a <details> disclosure opens and closes on click with no script at all; this adds
// what a menu also needs — Escape closes it and puts focus back on its button, and a click or focus outside closes it.

function closeMenu(menu: HTMLDetailsElement, returnFocus: boolean): void {
  if (!menu.open) return;
  menu.open = false;
  if (returnFocus) menu.querySelector<HTMLElement>('summary')?.focus();
}

function wire(): void {
  const menus = Array.from(document.querySelectorAll<HTMLDetailsElement>('details.nav-menu'));
  if (menus.length === 0) return;

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    for (const menu of menus) if (menu.open) closeMenu(menu, menu.contains(document.activeElement));
  });
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Node ? event.target : null;
    for (const menu of menus) if (!target || !menu.contains(target)) closeMenu(menu, false);
  });
  document.addEventListener('focusin', (event) => {
    const target = event.target instanceof Node ? event.target : null;
    for (const menu of menus) if (!target || !menu.contains(target)) closeMenu(menu, false);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
else wire();

export {};
