// GearLogs — "Request access" form on the home page (external file: the site CSP forbids
// inline scripts). Custom validation (the form is `novalidate` — no browser bubbles), a
// Turnstile token, one JSON POST to the contact-inbound function, and three states:
// ready · field error · RECEIVED. The mailto line under the form stays as the fallback door.
(function () {
  var ENDPOINT = 'https://kfowbpvlejfnntaeljsf.supabase.co/functions/v1/contact-inbound';
  var form = document.getElementById('contact-form');
  if (!form) return;

  var status = document.getElementById('contact-status');
  var received = document.getElementById('contact-received');
  var submit = document.getElementById('contact-submit');
  var fields = {
    name: form.querySelector('#cf-name'),
    email: form.querySelector('#cf-email'),
    org: form.querySelector('#cf-org'),
    message: form.querySelector('#cf-message'),
    website: form.querySelector('#cf-website'),
  };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function errorEl(input) {
    return form.querySelector('[data-error-for="' + input.id + '"]');
  }
  function setInvalid(input, invalid) {
    input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    input.closest('.cta-field').classList.toggle('is-invalid', invalid);
    var err = errorEl(input);
    if (err) err.hidden = !invalid;
  }
  function validate() {
    var ok = true;
    var name = fields.name.value.trim();
    var email = fields.email.value.trim();
    var message = fields.message.value.trim();
    setInvalid(fields.name, !name); if (!name) ok = false;
    setInvalid(fields.email, !EMAIL_RE.test(email)); if (!EMAIL_RE.test(email)) ok = false;
    setInvalid(fields.message, message.length < 10); if (message.length < 10) ok = false;
    return ok;
  }
  function say(text, tone) {
    status.textContent = text;
    status.hidden = !text;
    status.className = 'cta-form-status' + (tone ? ' is-' + tone : '');
  }
  function turnstileToken() {
    var el = form.querySelector('[name="cf-turnstile-response"]');
    return el && el.value ? el.value : '';
  }
  function resetTurnstile() {
    if (window.turnstile && typeof window.turnstile.reset === 'function') {
      try { window.turnstile.reset(); } catch (e) { /* widget not mounted yet */ }
    }
  }

  // Clear a field's error as soon as it becomes valid again.
  ['name', 'email', 'message'].forEach(function (k) {
    fields[k].addEventListener('input', function () {
      if (fields[k].getAttribute('aria-invalid') === 'true') validate();
    });
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    say('', '');
    if (!validate()) {
      var first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    var token = turnstileToken();
    if (!token) {
      say('One moment — the human check is still running. Try again in a second.', 'warn');
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Sending…';

    var body = {
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      org: fields.org.value.trim(),
      message: fields.message.value.trim(),
      website: fields.website.value,
      turnstileToken: token,
    };

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, data: data };
      });
    }).then(function (out) {
      if (out.status === 200 && out.data && out.data.ok) {
        form.hidden = true;
        received.hidden = false;
        received.focus && received.setAttribute('tabindex', '-1');
        if (received.focus) received.focus();
        return;
      }
      var code = (out.data && out.data.error) || 'failed';
      var messages = {
        invalid: 'Please check the highlighted fields.',
        turnstile: 'The human check did not pass — please try again.',
        rate_limited: 'Too many requests from this connection — please try again in a few minutes, or email hello@gearlogs.com.',
        not_configured: 'The form is not available right now — please email hello@gearlogs.com directly.',
        delivery_failed: 'We could not deliver your message — please email hello@gearlogs.com directly.',
      };
      say(messages[code] || 'Something went wrong — please email hello@gearlogs.com directly.', 'error');
      resetTurnstile();
    }).catch(function () {
      say('We could not reach the server — please email hello@gearlogs.com directly.', 'error');
      resetTurnstile();
    }).then(function () {
      submit.disabled = false;
      submit.textContent = 'Request Access';
    });
  });
})();
