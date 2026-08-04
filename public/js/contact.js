// Contact form handler — progressive enhancement over a native POST to /api/contact.
// Loaded as an external file because the site's CSP disallows inline scripts.
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var statusEl = document.getElementById('contact-status');
  var btn = document.getElementById('contact-submit');
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = 'form-status' + (kind ? ' form-status-' + kind : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    // Honeypot: real users never see or fill this field.
    if (form.company_website && form.company_website.value) { setStatus('Thanks — your message is on its way.', 'ok'); form.reset(); return; }

    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var message = form.message.value.trim();
    if (!name || !email || !message) { setStatus('Please fill in your name, email, and message.', 'err'); return; }
    if (!EMAIL.test(email)) { setStatus('Please enter a valid email address.', 'err'); return; }

    btn.disabled = true;
    setStatus('Sending…', '');

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: email,
        organization: form.organization.value.trim(),
        message: message,
        company_website: ''
      })
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, data: d }; });
      })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          setStatus("Thanks — your message is on its way. We'll be in touch.", 'ok');
        } else {
          setStatus((res.data && res.data.error) || 'Something went wrong. Please try again, or write to admin@gearlogs.com.', 'err');
          btn.disabled = false;
        }
      })
      .catch(function () {
        setStatus('Network error. Please try again, or write to admin@gearlogs.com.', 'err');
        btn.disabled = false;
      });
  });
})();
