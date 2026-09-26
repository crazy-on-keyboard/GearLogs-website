#!/usr/bin/env node
// The contact form's browser rules, tested (Stage 1, 2026-09-26). src/scripts/contact/rules.ts MIRRORS the server's
// rules (GearLogs repo, supabase/functions/contact-inbound/rules.ts + rules_test.ts); these are the same cases, so a
// drift between the two sides fails here. Bundled in memory with esbuild, imported, asserted. Run by `npm run check`.
import { build } from 'esbuild';
import assert from 'node:assert/strict';

const out = await build({ entryPoints: ['src/scripts/contact/rules.ts'], bundle: true, format: 'esm', write: false, platform: 'neutral' });
const R = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

const base = { reason: 'access', first_name: 'Dana', last_name: 'Levi', email: 'dana@acme.co.il', company: 'Acme Ltd', job_title: '', company_website: '', message: '' };
const errs = (p) => R.validateAll({ ...base, ...p });
let n = 0;
const t = (name, fn) => { fn(); n++; };

t('the required set, and the seven reasons', () => {
  assert.deepEqual(errs({}), {});
  assert.deepEqual(errs({ reason: '' }), { reason: 'missing' });
  assert.deepEqual(errs({ reason: 'sales' }), { reason: 'missing' });
  assert.deepEqual(errs({ first_name: ' ' }), { first_name: 'empty' });
  assert.deepEqual(errs({ email: '' }), { email: 'empty' });
  assert.deepEqual(errs({ company: 'A' }), { company: 'short' });
  for (const r of R.REASONS) assert.deepEqual(errs({ reason: r, message: 'x'.repeat(25) }), {}, r);
  assert.equal(R.REASONS.length, 7);
});

t('the message: optional, 20+ only for Something else, 4,000 and 3 links at most', () => {
  assert.deepEqual(errs({ reason: 'other', message: 'too short' }), { message: 'short' });
  assert.deepEqual(errs({ reason: 'other', message: 'x'.repeat(20) }), {});
  assert.deepEqual(errs({ message: 'x'.repeat(4001) }), { message: 'long' });
  assert.deepEqual(errs({ message: 'see https://a.io https://b.io www.c.io' }), {});
  assert.deepEqual(errs({ message: 'see https://a.io https://b.io www.c.io http://d.io' }), { message: 'links' });
});

t('names, organisation, job title, website', () => {
  assert.deepEqual(errs({ first_name: "O'Neil-Smith Jr." }), {});
  assert.deepEqual(errs({ first_name: 'דנה', last_name: 'לוי' }), {});
  assert.deepEqual(errs({ first_name: 'Dana3' }), { first_name: 'chars' });
  assert.deepEqual(errs({ first_name: 'Aaaaaa' }), { first_name: 'repeat' });
  assert.deepEqual(errs({ first_name: 'x'.repeat(61) }), { first_name: 'long' });
  assert.deepEqual(errs({ first_name: 'ab'.repeat(30), last_name: 'cd'.repeat(30) }), { last_name: 'name_long' });
  assert.deepEqual(errs({ company: 'אקמה בע"מ' }), {});
  assert.deepEqual(errs({ company: 'Acmeeeee' }), { company: 'repeat' });
  assert.deepEqual(errs({ company: 'Acme<script>' }), { company: 'chars' });
  assert.deepEqual(errs({ job_title: 'x'.repeat(81) }), { job_title: 'long' });
  assert.deepEqual(errs({ company_website: 'javascript:alert(1)' }), { company_website: 'scheme' });
  assert.deepEqual(errs({ company_website: 'acme' }), { company_website: 'shape' });
  assert.deepEqual(errs({ company_website: 'https://acme.co.il/about' }), {});
});

t('work email (W1): personal, temporary, own, no-reply refused; government, army and academic always accepted', () => {
  const k = (e) => R.classifyEmail(e).k;
  assert.equal(k('bob@gmail.com'), 'personal');
  assert.equal(k('bob@mail.walla.co.il'), 'personal');
  assert.equal(k('a@netvision.net.il'), 'personal');
  assert.equal(k('x@mailinator.com'), 'temporary');
  assert.equal(k('me@gearlogs.com'), 'own');
  assert.equal(k('noreply@acme.com'), 'noreply');
  assert.equal(k('dana@acme.co.il'), 'ok');
  assert.equal(R.classifyEmail('sgt@idf.il').always, true);
  assert.equal(R.classifyEmail('prof@tau.ac.il').always, true);
  for (const bad of ['a@b', 'a@b.c', 'a b@c.co', '.a@c.co', 'a..b@c.co', 'a@-c.co', 'a@c_d.co', '@c.co', 'a@']) assert.equal(k(bad), 'shape', bad);
  assert.equal(R.asciiDomain('bücher.de'), 'xn--bcher-kva.de');
});

t('a mistyped ending is a hint on blur and "not found" on Send', () => {
  const v = R.classifyEmail('dana@acme.con');
  assert.equal(v.k, 'typo');
  assert.equal(v.suggestion, 'acme.com');
  assert.equal(R.emailCode('dana@acme.con'), 'not_found');
  assert.equal(R.classifyEmail('dana@acme.coil').suggestion, 'acme.co.il');
});

t('invisible direction and zero-width marks are removed before a rule runs', () => {
  const rlo = String.fromCharCode(0x202e), zw = String.fromCharCode(0x200b);
  assert.deepEqual(errs({ first_name: rlo + 'Dana' + zw }), {});
  assert.equal(R.cleanLine(rlo + 'Dana' + zw), 'Dana');
});

t("the server's codes land on the page's fields; an unknown key is dropped", () => {
  assert.deepEqual(R.fromServer({ email: 'not_found', name: 'long', bogus: 'x', company: 3 }), { email: 'not_found', last_name: 'name_long' });
  assert.deepEqual(R.fromServer(null), {});
});

t('where the visitor came from is a closed list', () => {
  assert.equal(R.isFromPage('pricing'), true);
  assert.equal(R.isFromPage('<script>'), false);
  assert.equal(R.isReason('partner'), true);
  assert.equal(R.isReason('question'), false);
});

console.log(`check-contact: OK — ${n} groups of browser-rule cases`);
