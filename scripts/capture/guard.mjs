// The privacy guard of the capture (CAPTURE-1; hardened by DEBT-106 and taught the invented numbers of DEBT-102, the bug
// sweep's stage 8 — the Director's picks "Demo numbers · A · Plainly invented numbers" and "Demo pattern · A · Zero-run tails").
//
// The law: a picture never shows a real person's address, and never a number that could be somebody's. The demo's own numbers
// are plainly invented (a phone `<prefix>-000-0001`, an ID number `000000001`, a personal number `E-000-0001` / `0000001`) and
// MAY be shown; every other phone number, 8–9-digit run, e-mail address or network address in the picture's area is blanked
// when the guard can hide it, and REFUSES the picture when it cannot (SVG text keeps its ink under a transparent fill).
//
// Two functions run INSIDE the page through `page.evaluate` — they are self-contained (no closure over this module) and take
// every pattern as a regex SOURCE in their argument, so the capture and `scripts/check-capture-guard.mjs` share ONE definition.

/** The patterns, as regex sources (no flags; the in-page functions add them). */
export const PATTERNS = {
  /** an e-mail address · an IPv4 address · an IPv6 address, full or compressed (`::1`, `fe80::1`, `2001:db8::`) */
  address: String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+|(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?![\d.])|(?<![0-9A-Za-z:])(?:(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,7}:(?:[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,6})?|::(?:[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,6})?)(?![0-9A-Za-z:])`,
  /** a phone number as people write one: `+` country code and groups (`+972-54-123-4567`), OR a local form that starts
   *  with 0 (`054-123-4567` · `03-1234567` · `054 1234567`) — a code such as LOG-03-001 is neither */
  phone: String.raw`\+\d{1,3}[-\s.]?\(?\d{1,4}\)?(?:[-\s.]?\d{2,4}){2,3}|(?<![\d-])0\d{1,2}[-\s.]?\d{3}[-\s.]?\d{4}(?![\d-])|(?<![\d-])0\d[-\s.]?\d{7}(?![\d-])`,
  /** a bare run of 8–9 digits — an ID number written as plain text (not inside a longer number, a code or a date) */
  idRun: String.raw`(?<![\d.,:/-])\d{8,9}(?![\d.,:/-])`,
  /** the demo's INVENTED shapes, which may be shown: the phone's last two groups `000-NNNN`, the ID `00000NNNN`,
   *  the personal number `E-000-NNNN` or `000NNNN` */
  inventedPhone: String.raw`^\+\d{1,3}(?:[-\s.]\d{1,4})?[-\s.]000[-\s.]\d{4}$`,
  inventedId: String.raw`^00000\d{4}$`,
  inventedPersonal: String.raw`^(?:E-000-\d{4}|000\d{4})$`,
};

/** The reserved test domains and the documentation network ranges (RFC 5737 · RFC 3849) — nobody's. */
export const ALLOWED_ADDRESS = String.raw`\.(?:example|test|invalid|localhost)$|^(?:192\.0\.2|198\.51\.100|203\.0\.113)\.\d+$|^2001:0?db8:`;

/**
 * Runs in the page: where an e-mail address, a network address, a phone number or a bare ID-number run would be READ inside
 * the picture's area, and what the guard could not hide. Reads every visible element's JOINED text (an address split across
 * elements is one address), every field's value, a native select's chosen option, open shadow roots and same-origin iframes.
 * What a shot or `blankPersonal` BLANKED is not read; an invented number is allowed; a value under an allowed label (the
 * company's own External ID column) is allowed; SVG text that matches is reported as `svg` — it cannot be blanked.
 * Answers the elements' descriptions, never the values.
 */
export function addressesShown({ box, open, patterns, allowedAddress, allowWords }) {
  const ADDRESS = new RegExp(patterns.address, 'g');
  const PHONE = new RegExp(patterns.phone, 'g');
  const ID_RUN = new RegExp(patterns.idRun, 'g');
  const INVENTED = [patterns.inventedPhone, patterns.inventedId, patterns.inventedPersonal].map((p) => new RegExp(p));
  const ALLOWED = new RegExp(allowedAddress, 'i');
  const allowedAddr = (a) => open.includes(a.toLowerCase()) || ALLOWED.test(a);
  const invented = (v) => INVENTED.some((re) => re.test(v.trim()));
  const inPicture = (el) => {
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > box.x && r.left < box.x + box.width && r.bottom > box.y && r.top < box.y + box.height;
  };
  const blanked = (el) => Boolean(el.closest('[data-capture-blank]'));
  // the company's own ID column: a cell under a header that reads one of the allowed words, or a field labelled so
  const underAllowedLabel = (el) => {
    const words = (allowWords ?? []).map((w) => w.trim()).filter(Boolean);
    if (!words.length) return false;
    const cell = el.closest('td, th');
    if (cell) {
      const row = cell.parentElement; const table = cell.closest('table');
      const i = row ? [...row.children].indexOf(cell) : -1;
      const head = table && i >= 0 ? table.querySelector('thead tr')?.children[i] : null;
      if (head && words.includes(head.textContent.trim())) return true;
    }
    const field = el.closest('input, textarea, select');
    const label = field ? (field.labels?.[0]?.textContent ?? field.getAttribute('aria-label') ?? '') : '';
    if (words.includes(label.trim())) return true;
    // a line that reads "<label>: <value>" — the words before the value inside its own parent are the label
    let before = '';
    for (const n of el.parentElement?.childNodes ?? []) { if (n === el) break; before += n.textContent ?? ''; }
    return words.includes(before.trim().replace(/[:：]\s*$/, '').trim());
  };
  const hitsIn = (text) => [
    ...(text.match(ADDRESS) ?? []).filter((a) => !allowedAddr(a)),
    ...(text.match(PHONE) ?? []).filter((p) => !invented(p)),
    ...(text.match(ID_RUN) ?? []).filter((d) => !invented(d)),
  ];
  // an element's words as the screen shows them: its text nodes, leaving out a script's source, a stylesheet, a template and a select's options
  // Two text nodes are joined WITHOUT a space only when both sit in inline elements (an address split across spans is one
  // address); a block boundary between them is a space, so a tile's "142" beside a tile's "10" never reads as one number.
  const isInline = (e) => { const d = getComputedStyle(e).display; return d === 'inline' || d === 'contents'; };
  // the nearest ancestor that is not inline: two text nodes join without a space only inside the same one
  const blockOf = (n) => { let e = n.parentElement; while (e && isInline(e)) e = e.parentElement; return e; };
  const innerText = (el) => {
    const doc = el.ownerDocument ?? document;
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let out = ''; let last = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.parentElement?.closest('script, style, noscript, template, select')) continue;
      if (last && !(last.parentElement === n.parentElement || blockOf(last) === blockOf(n))) out += ' ';
      out += n.nodeValue; last = n;
    }
    return out.replace(/\s+/g, ' ');
  };
  const found = [];
  const say = (el, note) => found.push(`${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}${el.closest('[role="dialog"]') ? ' in a dialog' : ''}${note ? ` (${note})` : ''}`);
  const roots = [document];
  const walk = (root) => {
    const all = root.querySelectorAll('*');
    for (const el of all) {
      if (el.shadowRoot) roots.push(el.shadowRoot);
      if (el.tagName === 'IFRAME') { try { if (el.contentDocument) roots.push(el.contentDocument); } catch { /* a foreign frame is not ours to read */ } }
      // a script's source, a stylesheet, a template and a select's option list are not what the picture shows (the chosen option is read as the field's value below)
      if (el.closest('script, style, noscript, template, select')) continue;
      // the innermost element that carries the hit: skip an ancestor whose matching text sits whole inside one child
      const own = innerText(el);
      if (!own.trim()) continue;
      const hits = hitsIn(own);
      if (!hits.length) continue;
      // every hit sits whole inside some child → the children answer for it; a hit no child holds whole is split across them and is this element's
      const children = [...el.children].map(innerText);
      if (hits.every((h) => children.some((c) => c.includes(h)))) continue;
      if (blanked(el) || !inPicture(el) || underAllowedLabel(el)) continue;
      say(el, el.closest('svg') ? 'svg — cannot be blanked' : '');
    }
    for (const field of root.querySelectorAll('input, textarea, select')) {
      const value = field.tagName === 'SELECT' ? (field.selectedOptions?.[0]?.textContent ?? '') : String(field.value ?? '');
      if (hitsIn(value).length && !blanked(field) && inPicture(field) && !underAllowedLabel(field)) say(field);
    }
  };
  for (let i = 0; i < roots.length; i++) walk(roots[i]);
  return found;
}

/**
 * Runs in the page, before every picture: the personal values a picture never shows — a PHONE number, an ID NUMBER (a bare
 * 8–9-digit run, its field, or the value beside the app's own "ID number" / "Personal number" label) — wherever they are
 * written, unless the value is one of the demo's INVENTED shapes (shown) or sits under an allowed label. Their words are drawn
 * transparent — the box, the label and the icon stay — and put back by `unblank`. SVG text is never blanked (a transparent fill
 * does not hide it; `addressesShown` refuses it instead). Answers how many values were blanked.
 */
export function blankPersonal({ idWords, patterns, allowWords }) {
  const PHONE = new RegExp(patterns.phone);
  const ID_RUN = new RegExp(patterns.idRun);
  const INVENTED = [patterns.inventedPhone, patterns.inventedId, patterns.inventedPersonal].map((p) => new RegExp(p));
  const invented = (v) => INVENTED.some((re) => re.test(v.trim()));
  const personal = (text) => {
    const t = text.replace(/\s+/g, ' ');
    const hits = [...(t.match(new RegExp(patterns.phone, 'g')) ?? []), ...(t.match(new RegExp(patterns.idRun, 'g')) ?? [])];
    return hits.some((h) => !invented(h));
  };
  let count = 0;
  const blank = (el) => {
    if (!el || el.dataset.captureBlank || el.closest('svg')) return;
    el.dataset.captureBlank = el.style.getPropertyValue('-webkit-text-fill-color') || 'none';
    el.style.setProperty('-webkit-text-fill-color', 'transparent');
    count++;
  };
  const words = (allowWords ?? []).map((w) => w.trim()).filter(Boolean);
  const isId = (label) => idWords.some((w) => label.trim().startsWith(w));
  const allowedField = (field) => {
    const label = field.labels?.[0]?.textContent ?? field.getAttribute('aria-label') ?? '';
    return words.includes(label.trim());
  };
  const roots = [document];
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) roots.push(el.shadowRoot);
      if (el.tagName === 'IFRAME') { try { if (el.contentDocument) roots.push(el.contentDocument); } catch { /* not ours */ } }
    }
    const walker = (root.ownerDocument ?? root).createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node);
    for (const node of texts) {
      if (!personal(node.nodeValue)) continue;
      const el = node.parentElement;
      // a script's source, a stylesheet or a template is not on the screen; a select's options are read with the field below
      if (!el || el.closest('script, style, noscript, template, select')) continue;
      if (words.length) {
        // the company's own ID: a cell under an allowed header, or a value on a "<label>: <value>" line
        const cell = el.closest('td');
        if (cell) {
          const row = cell.parentElement; const table = cell.closest('table');
          const i = row ? [...row.children].indexOf(cell) : -1;
          const head = table && i >= 0 ? table.querySelector('thead tr')?.children[i] : null;
          if (head && words.includes(head.textContent.trim())) continue;
        }
        let before = '';
        for (const n of el.parentElement?.childNodes ?? []) { if (n === el) break; before += n.textContent ?? ''; }
        if (words.includes(before.trim().replace(/[:：]\s*$/, '').trim())) continue;
      }
      blank(el);
    }
    for (const field of root.querySelectorAll('input, textarea, select')) {
      const value = field.tagName === 'SELECT' ? (field.selectedOptions?.[0]?.textContent ?? '') : String(field.value ?? '');
      const label = field.labels?.[0]?.textContent ?? field.getAttribute('aria-label') ?? '';
      if (allowedField(field)) continue;
      // a personal value anywhere, or any digits in a field the app labels as an identifier — unless the value is an invented one
      if (personal(value) || (/\d/.test(value) && isId(label) && !invented(value))) blank(field);
    }
    // a card's contact line: the label's own span, then the value beside it
    for (const label of root.querySelectorAll('span')) {
      if (label.children.length || !idWords.includes(label.textContent.trim())) continue;
      for (const beside of label.parentElement?.children ?? []) {
        if (beside === label || beside.children.length) continue;
        // the value is ONE token with a digit (an identifier), never a sentence that happens to carry a number
        const value = beside.textContent.trim();
        if (!/^\S+$/.test(value) || !/\d/.test(value)) continue;
        if (!invented(value)) blank(beside);
      }
    }
  };
  for (let i = 0; i < roots.length; i++) walk(roots[i]);
  return count;
}

/** Runs in the page, after the picture: every blanked value is drawn again as it was. */
export function unblank() {
  const roots = [document];
  for (let i = 0; i < roots.length; i++) {
    for (const el of roots[i].querySelectorAll('*')) {
      if (el.shadowRoot) roots.push(el.shadowRoot);
      if (el.tagName === 'IFRAME') { try { if (el.contentDocument) roots.push(el.contentDocument); } catch { /* not ours */ } }
    }
    for (const el of roots[i].querySelectorAll('[data-capture-blank]')) {
      const was = el.dataset.captureBlank;
      if (was && was !== 'none') el.style.setProperty('-webkit-text-fill-color', was); else el.style.removeProperty('-webkit-text-fill-color');
      delete el.dataset.captureBlank;
    }
  }
}
