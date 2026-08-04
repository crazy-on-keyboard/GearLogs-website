// Cloudflare Pages Function — POST /api/contact
// Receives the website contact form and emails it via Resend, using the RAQIOM
// suite's verified sender (pmolikepro.com). The RESEND_API_KEY is a project secret.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function esc(s) {
  return String(s).replace(/[<>&]/g, function (c) {
    return c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;';
  });
}

function htmlPage(status, message) {
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>GearLogs</title>' +
    '<body style="font-family:ui-monospace,monospace;max-width:620px;margin:80px auto;padding:0 20px;color:#2a2520">' +
    '<h1 style="letter-spacing:1px">GEARLOGS</h1><p>' + esc(message) + '</p>' +
    '<p><a href="/">&larr; Back to gearlogs.com</a></p></body>',
    { status: status, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  const reply = function (status, body) {
    return wantsJson
      ? new Response(JSON.stringify(body), { status: status, headers: { 'content-type': 'application/json' } })
      : htmlPage(status, body.ok ? "Thanks — your message is on its way. We'll be in touch." : (body.error || 'Something went wrong.'));
  };

  let data;
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await request.json();
    } else {
      const f = await request.formData();
      data = {};
      for (const [k, v] of f.entries()) data[k] = v;
    }
  } catch (e) {
    return reply(400, { ok: false, error: 'Could not read your submission.' });
  }

  const name = (data.name || '').toString().trim();
  const email = (data.email || '').toString().trim();
  const organization = (data.organization || '').toString().trim();
  const message = (data.message || '').toString().trim();
  const honeypot = (data.company_website || '').toString().trim();

  if (honeypot) return reply(200, { ok: true }); // silently accept bots
  if (!name || !email || !message) return reply(400, { ok: false, error: 'Please fill in your name, email, and message.' });
  if (!EMAIL.test(email)) return reply(400, { ok: false, error: 'Please enter a valid email address.' });
  if (name.length > 200 || email.length > 320 || organization.length > 200 || message.length > 5000) {
    return reply(400, { ok: false, error: 'One of the fields is too long.' });
  }
  if (!env.RESEND_API_KEY) return reply(500, { ok: false, error: 'Email is not configured yet. Please write to admin@gearlogs.com.' });

  const html =
    '<p><strong>New GearLogs contact</strong></p>' +
    '<p><strong>Name:</strong> ' + esc(name) + '<br>' +
    '<strong>Email:</strong> ' + esc(email) + '<br>' +
    '<strong>Organization:</strong> ' + (esc(organization) || '&mdash;') + '</p>' +
    '<p><strong>Message:</strong></p><p>' + esc(message).replace(/\n/g, '<br>') + '</p>';

  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'authorization': 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'GearLogs Website <noreply@pmolikepro.com>',
        to: ['admin@gearlogs.com'],
        reply_to: email,
        subject: 'GearLogs contact — ' + name,
        html: html
      })
    });
  } catch (e) {
    return reply(502, { ok: false, error: 'Could not send right now. Please try again shortly.' });
  }

  if (!res.ok) return reply(502, { ok: false, error: 'Could not send right now. Please try again shortly.' });
  return reply(200, { ok: true });
}

// Any non-POST method (onRequestPost above already handles POST).
export async function onRequest() {
  return new Response('Method Not Allowed', { status: 405, headers: { 'allow': 'POST' } });
}
