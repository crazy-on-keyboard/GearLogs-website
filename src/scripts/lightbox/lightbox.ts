// The picture viewer (Stage 2 PR-3, the Director's pick F2 · A "click to enlarge"): ONE shared component. A frame's link
// opens the full-size picture in a native modal <dialog> — the browser gives it Escape, an inert page behind it and focus
// back on the link when it closes. Without scripts the same link simply opens the picture file.

const WORDS = {
  en: { close: 'Close the picture', strip: 'Real screen \u00b7 sample workspace' },
  he: { close: 'סגירת התמונה', strip: 'מסך אמיתי \u00b7 סביבת עבודה לדוגמה' },
} as const;

function build(lang: keyof typeof WORDS): { dialog: HTMLDialogElement; img: HTMLImageElement } {
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'lightbox-close';
  close.setAttribute('aria-label', WORDS[lang].close);
  close.textContent = '×';
  close.addEventListener('click', () => dialog.close());
  // the button stands on a strip ABOVE the picture (the Director's pick "Viewer · A · A strip above the picture"): laid over
  // the picture's corner it hid the app's own Sign out and the person's name on every enlarged screen
  const strip = document.createElement('div');
  strip.className = 'lightbox-strip';
  const words = document.createElement('span');
  words.className = 'lightbox-cap';
  words.textContent = WORDS[lang].strip;
  strip.append(words, close);
  const img = document.createElement('img');
  img.className = 'lightbox-img';
  img.decoding = 'async';
  dialog.append(strip, img);
  // a click on the dark surround (the dialog itself, not the picture) closes it
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { img.removeAttribute('src'); });
  document.body.append(dialog);
  return { dialog, img };
}

function wire(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[data-lightbox]'));
  if (links.length === 0 || typeof HTMLDialogElement !== 'function') return;
  const lang = document.documentElement.lang === 'he' ? 'he' : 'en';
  let viewer: { dialog: HTMLDialogElement; img: HTMLImageElement } | null = null;
  for (const link of links) {
    link.addEventListener('click', (event) => {
      // a new tab, a download or any modified click keeps the browser's own behaviour
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      viewer ??= build(lang);
      const thumb = link.querySelector('img');
      viewer.img.src = link.href;
      viewer.img.alt = thumb?.alt ?? '';
      viewer.dialog.showModal();
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
else wire();

export {};
