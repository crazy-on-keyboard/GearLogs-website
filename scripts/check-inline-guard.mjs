#!/usr/bin/env node
// Proves the build's "no inline code" guard (scripts/lib/inline-code.mjs) on the security gate's cases (SEC-PR1-2): every
// spelling it must refuse, and the prose and attributes it must let through. Zero dependencies.
import { inlineCodeIn } from './lib/inline-code.mjs';

const MUST_REFUSE = [
  '<p style="color:red">x</p>',
  '<p id="a"style="color:red">x</p>',
  '<div STYLE="width:1px">x</div>',
  '<a title="a>b" style="x:y">x</a>',
  '<svg><rect style="fill:red"/></svg>',
  '<p\nstyle="x:y">x</p>',
  '<button onclick=go()>x</button>',
  '<button onClick="go()">x</button>',
  '<button onclick = "go()">x</button>',
  '<svg><animate onbegin="go()"/></svg>',
  '<a href="javascript:go()">x</a>',
  '<a href="jav&#x61;script:go()">x</a>',
  '<a href="java&#115;cript:go()">x</a>',
  '<a href=" JavaScript:go()">x</a>',
  '<a href="javascript&colon;go()">x</a>',
  '<style>p{color:red}</style>',
];
const MUST_PASS = [
  '<p>Requires JavaScript: turn it on</p>',
  '<img alt="the style = compact view" src="/x.png">',
  '<a href="/contact?from=onboarding">x</a>',
  '<div data-once="1" class="styled">x</div>',
  '<script type="application/ld+json">{"description":"onclick style= javascript:"}</script>',
  '<meta name="description" content="style=compact; onload=nothing">',
  '<input name="online" value="on=off">',
];

const problems = [];
for (const html of MUST_REFUSE) if (!inlineCodeIn(html).length) problems.push(`NOT REFUSED  ${JSON.stringify(html)}`);
for (const html of MUST_PASS) { const got = inlineCodeIn(html); if (got.length) problems.push(`REFUSED      ${JSON.stringify(html)} (${got.join(', ')})`); }
if (problems.length) {
  console.error(`check-inline-guard: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-inline-guard: OK — ${MUST_REFUSE.length} spellings refused, ${MUST_PASS.length} look-alikes let through`);
