/*
  ══════════════════════════════════════════════════════════════
   Terrapin Feedback Widget
   Opt-in user feedback via Formspree. Loaded from our own domain —
   no third-party scripts run inside tools.
   - Zero impact until user clicks "Did this help?"
   - POST only fires when user hits Send
   - No tracking, no pixels, no beacons
  ══════════════════════════════════════════════════════════════
*/
(function () {
  var ENDPOINT = 'https://formspree.io/f/mnjldbzv';
  var LANG_KEY = 'terrapin-language';

  var T = {
    en: {
      prompt: 'Did this tool help?',
      yes: '❤ Yes',
      bug: '⚑ Report issue',
      request: '+ Request a feature',
      placeholder: 'Tell Ryan what you think (optional)…',
      email_placeholder: 'Your email (optional — only if you want a reply)',
      send: 'Send',
      cancel: 'Cancel',
      sending: 'Sending…',
      thanks: 'Thanks — this goes straight to Ryan. 🐢',
      error: "Couldn't send. Try again in a minute."
    },
    es: {
      prompt: '¿Te ayudó esta herramienta?',
      yes: '❤ Sí',
      bug: '⚑ Reportar problema',
      request: '+ Pedir una función',
      placeholder: 'Cuéntale a Ryan lo que piensas (opcional)…',
      email_placeholder: 'Tu correo (opcional — solo si quieres una respuesta)',
      send: 'Enviar',
      cancel: 'Cancelar',
      sending: 'Enviando…',
      thanks: 'Gracias — esto va directo a Ryan. 🐢',
      error: 'No se pudo enviar. Inténtalo en un minuto.'
    }
  };

  function lang() {
    try { return localStorage.getItem(LANG_KEY) === 'es' ? 'es' : 'en'; } catch (e) { return 'en'; }
  }

  function css() {
    return (
      '.tt-fb{margin:32px auto 16px;max-width:640px;text-align:center;font-family:"DM Sans",sans-serif;color:#6B6B6B;font-size:14px}' +
      '.tt-fb-prompt{margin-bottom:10px}' +
      '.tt-fb-btns{display:inline-flex;gap:8px;flex-wrap:wrap;justify-content:center}' +
      '.tt-fb-btn{background:#fff;border:1px solid #E8E0D0;border-radius:20px;padding:7px 16px;font-family:inherit;font-size:13px;color:#2C3E2D;cursor:pointer;transition:all .15s}' +
      '.tt-fb-btn:hover{border-color:#2C3E2D;background:#FDFAF4}' +
      '.tt-fb-form{display:none;background:#fff;border:1px solid #E8E0D0;border-radius:12px;padding:18px;margin-top:12px;text-align:left;box-shadow:0 2px 10px rgba(0,0,0,0.04)}' +
      '.tt-fb-form.open{display:block}' +
      '.tt-fb-form textarea,.tt-fb-form input{width:100%;box-sizing:border-box;font-family:inherit;font-size:14px;padding:10px 12px;border:1px solid #E8E0D0;border-radius:8px;background:#FDFAF4;color:#1A1A1A;margin-bottom:10px;resize:vertical}' +
      '.tt-fb-form textarea{min-height:84px}' +
      '.tt-fb-form textarea:focus,.tt-fb-form input:focus{outline:none;border-color:#2C3E2D;background:#fff}' +
      '.tt-fb-actions{display:flex;gap:8px;justify-content:flex-end}' +
      '.tt-fb-actions button{padding:8px 18px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;border:none}' +
      '.tt-fb-send{background:#2C3E2D;color:#fff}' +
      '.tt-fb-send:hover{background:#3A5240}' +
      '.tt-fb-send:disabled{opacity:.5;cursor:not-allowed}' +
      '.tt-fb-cancel{background:none;border:1px solid #E8E0D0!important;color:#6B6B6B}' +
      '.tt-fb-cancel:hover{border-color:#2C3E2D!important;color:#2C3E2D}' +
      '.tt-fb-status{margin-top:10px;font-size:13px}' +
      '.tt-fb-status.success{color:#4A7C59}' +
      '.tt-fb-status.error{color:#B85C2C}' +
      '.tt-fb-note{margin-top:14px;font-size:11px;color:#B8B0A0;text-align:center}' +
      '.tt-fb-note a{color:#6B6B6B}'
    );
  }

  function ensureStyle() {
    if (document.getElementById('tt-fb-style')) return;
    var s = document.createElement('style');
    s.id = 'tt-fb-style';
    s.textContent = css();
    document.head.appendChild(s);
  }

  function noteLine(l) {
    return l === 'es'
      ? 'Tu mensaje va a Ryan vía Formspree. <a href="/privacy" style="color:#6B6B6B;">Privacidad</a>'
      : 'Your message goes to Ryan via Formspree. <a href="/privacy" style="color:#6B6B6B;">Privacy</a>';
  }

  function render(host, opts) {
    var l = lang();
    var labels = T[l];
    host.className = 'tt-fb';
    host.innerHTML =
      '<div class="tt-fb-prompt">' + labels.prompt + '</div>' +
      '<div class="tt-fb-btns">' +
        '<button class="tt-fb-btn" data-kind="like">' + labels.yes + '</button>' +
        '<button class="tt-fb-btn" data-kind="bug">' + labels.bug + '</button>' +
        '<button class="tt-fb-btn" data-kind="request">' + labels.request + '</button>' +
      '</div>' +
      '<div class="tt-fb-form" id="tt-fb-form">' +
        '<textarea class="tt-fb-message" placeholder="' + labels.placeholder + '" rows="3"></textarea>' +
        '<input type="email" class="tt-fb-email" placeholder="' + labels.email_placeholder + '">' +
        '<div class="tt-fb-actions">' +
          '<button type="button" class="tt-fb-cancel">' + labels.cancel + '</button>' +
          '<button type="button" class="tt-fb-send">' + labels.send + '</button>' +
        '</div>' +
        '<div class="tt-fb-status"></div>' +
      '</div>' +
      '<div class="tt-fb-note">' + noteLine(l) + '</div>';

    var form = host.querySelector('#tt-fb-form');
    var status = host.querySelector('.tt-fb-status');
    var send = host.querySelector('.tt-fb-send');
    var cancel = host.querySelector('.tt-fb-cancel');
    var message = host.querySelector('.tt-fb-message');
    var email = host.querySelector('.tt-fb-email');
    var currentKind = 'like';

    host.querySelectorAll('[data-kind]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentKind = btn.getAttribute('data-kind');
        form.classList.add('open');
        status.textContent = '';
        status.className = 'tt-fb-status';
        setTimeout(function () { message.focus(); }, 60);
      });
    });

    cancel.addEventListener('click', function () {
      form.classList.remove('open');
      message.value = '';
      email.value = '';
      status.textContent = '';
    });

    send.addEventListener('click', function () {
      submit({
        kind: currentKind,
        tool: opts.tool,
        toolName: opts.toolName || opts.tool,
        message: message.value.trim(),
        email: email.value.trim(),
        button: send,
        status: status,
        form: form
      });
    });
  }

  function submit(ctx) {
    var l = lang();
    var labels = T[l];
    ctx.button.disabled = true;
    ctx.status.className = 'tt-fb-status';
    ctx.status.textContent = labels.sending;

    var body = {
      kind: ctx.kind,
      tool: ctx.tool,
      tool_name: ctx.toolName,
      message: ctx.message,
      email: ctx.email,
      page: location.pathname,
      lang: l,
      _subject: '[Terrapin ' + ctx.kind + '] ' + ctx.toolName
    };

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) {
        if (r.ok) {
          ctx.status.className = 'tt-fb-status success';
          ctx.status.textContent = labels.thanks;
          setTimeout(function () {
            ctx.form.classList.remove('open');
            ctx.form.querySelector('.tt-fb-message').value = '';
            ctx.form.querySelector('.tt-fb-email').value = '';
          }, 2400);
        } else {
          throw new Error('bad status');
        }
      })
      .catch(function () {
        ctx.status.className = 'tt-fb-status error';
        ctx.status.textContent = labels.error;
        ctx.button.disabled = false;
      });
  }

  window.terrapinFeedback = {
    mount: function (opts) {
      opts = opts || {};
      if (!opts.tool) return;
      ensureStyle();
      var host = opts.host ? document.querySelector(opts.host) : document.getElementById('tt-feedback');
      if (!host) {
        host = document.createElement('div');
        host.id = 'tt-feedback';
        document.body.appendChild(host);
      }
      render(host, opts);
    }
  };
})();
