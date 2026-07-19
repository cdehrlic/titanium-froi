/* CompShield — shared site behavior: theme, mobile nav, reveal, contact form */
(function () {
  // ---- Theme ----
  function getTheme() { try { return localStorage.getItem('wcr_theme') || 'dark'; } catch (e) { return 'dark'; } }
  function applyTheme(t) {
    document.body.classList.toggle('light', t === 'light');
    document.querySelectorAll('[data-theme-icon]').forEach(function (el) { el.textContent = t === 'dark' ? '☀' : '☾'; });
    document.querySelectorAll('[data-theme-label]').forEach(function (el) { el.textContent = t === 'dark' ? 'Light' : 'Dark'; });
    try { localStorage.setItem('wcr_theme', t); } catch (e) {}
  }
  window.toggleTheme = function () { applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); };
  applyTheme(getTheme());
  // Mark JS active so reveal animations engage (content stays visible without JS)
  if (document.body) document.body.classList.add('js');

  document.addEventListener('DOMContentLoaded', function () {
    // ---- Mobile nav ----
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');
    if (toggle && links) {
      toggle.addEventListener('click', function () { links.classList.toggle('open'); });
      links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { links.classList.remove('open'); });
      });
    }

    // ---- Active nav link ----
    var path = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.nav-links > a[href]').forEach(function (a) {
      var href = a.getAttribute('href').replace(/\/$/, '') || '/';
      if (href === path) a.classList.add('active');
    });

    // ---- Scroll reveal ----
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && reveals.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('in'); });
    }

    // ---- Contact form ----
    var form = document.getElementById('contactForm');
    if (form) {
      var msg = document.getElementById('formMsg');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = form.querySelector('button[type="submit"]');
        var data = {};
        new FormData(form).forEach(function (v, k) { data[k] = v; });
        if (!data.name || !data.email || !data.message) {
          msg.className = 'form-msg err'; msg.textContent = 'Please fill in your name, email, and a message.'; return;
        }
        btn.disabled = true; var orig = btn.textContent; btn.textContent = 'Sending…';
        fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j.success) {
              form.reset();
              msg.className = 'form-msg ok';
              msg.textContent = 'Thanks, ' + (data.name.split(' ')[0]) + ' — your message is on its way. A CompShield specialist will reach out shortly.';
            } else {
              msg.className = 'form-msg err'; msg.textContent = j.error || 'Something went wrong. Please email us directly.';
            }
          })
          .catch(function () { msg.className = 'form-msg err'; msg.textContent = 'Network error. Please email us directly at info@comp-shield.com.'; })
          .finally(function () { btn.disabled = false; btn.textContent = orig; msg.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      });
    }

    // ---- Footer year ----
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  });
})();
