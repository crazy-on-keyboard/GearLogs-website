#!/usr/bin/env node
// The site's look laws (Stage 2, 2026-09-27 — ~/.claude/rules/ui-standards.md applied to the website), checked on the
// stylesheet's partials in src/styles/. Every colour, size and duration comes from tokens.css; one radius (2 px) with the
// named true circles; flat, with the one shadow only on what floats; focus-visible only; Hebrew without tracking or
// capitals (the label tokens switch under [dir=rtl]). A planted violation of each law fails (--self-test proves it).
// Zero dependencies.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src', 'styles');
/** Files outside the laws: the tokens define the values, the fonts are @font-face only, and the home's interim sheet is
 *  deleted when the home is rebuilt (Stage 2 PR-4). */
const EXEMPT = new Set(['tokens.css', 'fonts.css', 'home-legacy.css']);
/** The things that float (menus, popovers, the lightbox…): the only selectors that may carry the shadow — by name. */
const FLOATING = ['.nav-menu-list'];
/** The named true circles besides .dot (pseudo-elements cannot wear a class): the contact form's radio mark and error icon. */
const CIRCLES = ['.contact-chip span::before', '.contact-error::before'];

/** Every rule as { selector, decls: [[prop, value]], context } — context is the enclosing at-rules. */
export function rulesOf(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const stack = [];
  let buf = '';
  for (const ch of text) {
    if (ch === '{') { stack.push(buf.trim()); buf = ''; continue; }
    if (ch === '}') {
      const prelude = stack.pop() ?? '';
      const context = stack.filter((s) => s.startsWith('@')).join(' ');
      if (!prelude.startsWith('@') && !/@keyframes/.test(context)) {
        const decls = buf.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
          const at = d.indexOf(':');
          return [d.slice(0, at).trim().toLowerCase(), d.slice(at + 1).trim()];
        });
        out.push({ selector: prelude.replace(/\s+/g, ' '), decls, context });
      }
      buf = '';
      continue;
    }
    buf += ch;
  }
  return out;
}

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/i;
const TIME = /(?<![\w-])\d*\.?\d+m?s\b/;

/** The problems in one stylesheet's text. */
export function problemsIn(css, file) {
  const problems = [];
  const say = (sel, what) => problems.push(`${file}: ${sel} — ${what}`);
  for (const { selector, decls, context } of rulesOf(css)) {
    const reduced = /prefers-reduced-motion/.test(context);
    if (/:focus(?![-\w])/.test(selector)) say(selector, 'a :focus rule (focus-visible only — a click must not draw a ring)');
    for (const [prop, value] of decls) {
      if (prop.startsWith('--')) { say(selector, `a token defined outside tokens.css (${prop})`); continue; }
      if (COLOUR.test(value)) say(selector, `a colour literal in ${prop} (colours come from tokens.css)`);
      if (prop === 'font-size' && !/^var\(--fs-[\w-]+\)$/.test(value) && value !== 'inherit') say(selector, `font-size ${value} (the type scale's var(--fs-*) only)`);
      if (prop === 'font' && !/var\(--fs-[\w-]+\)/.test(value) && value !== 'inherit') say(selector, `a font shorthand without a scale size (${value})`);
      if (prop === 'letter-spacing' && !/^(0|normal|var\(--track-[\w-]+\))$/.test(value)) say(selector, `letter-spacing ${value} (var(--track-*) only, so Hebrew drops it)`);
      if (prop === 'text-transform' && !/^(none|var\(--case-[\w-]+\))$/.test(value)) say(selector, `text-transform ${value} (var(--case-label) only, so Hebrew drops it)`);
      if (prop === 'border-radius' || /^border-(?:[a-z]+-)*radius$/.test(prop)) {
        const circle = value === '50%' && (/\.dot\b/.test(selector) || CIRCLES.includes(selector));
        if (!circle && !/^(0|var\(--radius\))$/.test(value)) say(selector, `border-radius ${value} (var(--radius); a true circle wears .dot)`);
      }
      if (prop === 'box-shadow' && value !== 'none') {
        const floating = FLOATING.includes(selector) && value === 'var(--shadow-float)';
        const edge = /^inset\b/.test(value) && !/,/.test(value);
        if (!floating && !edge) say(selector, `a shadow on something that does not float (${value})`);
      }
      if (/^(transition|animation)(-duration|-delay)?$/.test(prop) && !reduced && TIME.test(value)) say(selector, `a literal duration in ${prop} (var(--d-*) only)`);
    }
  }
  return problems;
}

function selfTest() {
  const planted = {
    '.a { color: #ff0000; }': 'colour literal',
    '.a { font-size: 13.5px; }': 'font-size',
    '.a { letter-spacing: 0.1em; }': 'letter-spacing',
    '.a { text-transform: uppercase; }': 'text-transform',
    '.a { border-radius: 6px; }': 'border-radius',
    '.a { border-radius: 50%; }': 'border-radius',
    '.card { box-shadow: 0 4px 8px var(--ink); }': 'shadow',
    '.a:focus { outline: 0; }': ':focus',
    '.a { transition: color 300ms; }': 'duration',
    '.a { --brand-new: 1px; }': 'token defined',
  };
  const fine = '.x { color: var(--text); font-size: var(--fs-15); border-radius: var(--radius); } .dot { border-radius: 50%; } .nav-menu-list { box-shadow: var(--shadow-float); } .x:focus-visible { outline: 0; } @media (prefers-reduced-motion: reduce) { * { transition-duration: 0.001ms !important; } }';
  const failures = [];
  for (const [css, what] of Object.entries(planted)) if (!problemsIn(css, 'planted').some((p) => p.includes(what))) failures.push(`NOT CAUGHT  ${css}`);
  const falseAlarms = problemsIn(fine, 'fine');
  if (falseAlarms.length) failures.push(...falseAlarms.map((p) => `FALSE ALARM ${p}`));
  if (failures.length) { console.error(`check-uistd self-test: ${failures.length} problem(s)\n  ${failures.join('\n  ')}`); process.exit(1); }
  console.log(`check-uistd self-test: OK — ${Object.keys(planted).length} planted violations caught, the allowed forms pass`);
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/check-uistd.mjs');
if (isMain) {
  selfTest();
  const problems = [];
  const files = readdirSync(DIR).filter((f) => f.endsWith('.css') && !EXEMPT.has(f));
  for (const file of files) problems.push(...problemsIn(readFileSync(join(DIR, file), 'utf8'), file));
  if (problems.length) {
    console.error(`check-uistd: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`check-uistd: OK — ${files.length} stylesheets on the tokens (colour · type scale · tracking · one radius · flat · focus-visible · durations)`);
}
