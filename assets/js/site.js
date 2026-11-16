/* KAIDS site behaviour. No dependencies. Everything here is progressive:
   with JavaScript off the page is complete, static and readable. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var clamp = function (n, lo, hi) { return Math.min(hi, Math.max(lo, n)); };

  /* ---------- Smooth Page Loader ---------- */
  var siteLoader = document.getElementById('site-loader');
  if (siteLoader) {
    var dismissed = false;
    var dismissLoader = function () {
      if (dismissed) return;
      dismissed = true;
      siteLoader.classList.add('is-loaded');
      setTimeout(function () {
        if (siteLoader && siteLoader.parentNode) siteLoader.parentNode.removeChild(siteLoader);
      }, 800);
    };

    if (document.readyState === 'complete') {
      setTimeout(dismissLoader, 350);
    } else {
      window.addEventListener('load', function () {
        setTimeout(dismissLoader, 350);
      });
      // Fallback timeout so loader never hangs
      setTimeout(dismissLoader, 2800);
    }
  }

  /* ---------- Header: hairline once scrolled, hide on scroll down, show on scroll up ---------- */
  var header = $('[data-header]');
  var mobileBar = $('[data-mobile-bar]');
  var hero = $('.hero');
  var contact = $('#contact');
  var lastY = window.scrollY;
  var ticking = false;
  var processSteps = $('[data-process]');
  var inset = $('[data-drift]');

  function onFrame() {
    ticking = false;
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 8);
      var goingDown = y > lastY + 4;
      var goingUp = y < lastY - 4;
      if (root.classList.contains('nav-open') || y < 320) header.classList.remove('is-hidden');
      else if (goingDown) header.classList.add('is-hidden');
      else if (goingUp) header.classList.remove('is-hidden');
    }
    if (mobileBar) {
      var pastHero = hero ? y > hero.offsetHeight * 0.7 : y > 500;
      var atContact = contact ? contact.getBoundingClientRect().top < window.innerHeight * 0.6 : false;
      mobileBar.classList.toggle('is-visible', pastHero && !atContact);
    }
    if (processSteps && !reduceMotion) {
      var r = processSteps.getBoundingClientRect();
      var p = clamp((window.innerHeight * 0.8 - r.top) / Math.max(r.height, window.innerHeight * 0.45), 0, 1);
      processSteps.style.setProperty('--p', p.toFixed(3));
      var steps = processSteps.children;
      for (var i = 0; i < steps.length; i++) steps[i].classList.toggle('is-done', p >= (i + 0.35) / steps.length);
    }
    if (inset && !reduceMotion && y < window.innerHeight * 1.5) {
      inset.style.translate = '0 ' + (y * -0.05).toFixed(1) + 'px';
    }
    lastY = y;
  }
  function requestFrame() { if (!ticking) { ticking = true; window.requestAnimationFrame(onFrame); } }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);
  if (processSteps && reduceMotion) $$('.step', processSteps).forEach(function (s) { s.classList.add('is-done'); });
  onFrame();

  /* ---------- Mobile menu ---------- */
  var toggle = $('[data-menu-toggle]');
  var nav = $('#nav');
  function setMenu(open) {
    root.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.firstChild.textContent = open ? 'Close' : 'Menu';
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(!root.classList.contains('nav-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('nav-open')) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 56rem)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* ---------- Current section in the nav ---------- */
  var spyLinks = $$('.nav a[href^="#"]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        spyLinks.forEach(function (a) {
          if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spyLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  /* ---------- Scroll reveals: only elements that start below the fold are hidden ---------- */
  $$('[data-stagger]').forEach(function (group) {
    $$('[data-reveal]', group).forEach(function (el, i) { el.style.setProperty('--i', i); });
  });
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.remove('is-pending');
        revealer.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.95) {
        el.classList.add('is-pending');
        revealer.observe(el);
      }
    });
  }

  /* ---------- Marquees: duplicate the list, loop it, give it a pause button ---------- */
  $$('[data-marquee]').forEach(function (m) {
    if (reduceMotion) return;
    var list = $('ul', m);
    if (!list) return;
    var track = document.createElement('div');
    track.className = 'marquee-track';
    list.classList.add('marquee-group');
    var view = document.createElement('div');
    view.className = 'marquee-view';
    m.insertBefore(view, list);
    view.appendChild(track);
    track.appendChild(list);
    var originals = $$('li', list);
    var guard = 0;
    while (list.scrollWidth < window.innerWidth && guard++ < 6) {
      originals.forEach(function (li) { var c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); list.appendChild(c); });
    }
    var copy = list.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    $$('a, button', copy).forEach(function (el) { el.tabIndex = -1; });
    track.appendChild(copy);
    var pxPerSec = Number(m.getAttribute('data-speed')) || 60;
    m.style.setProperty('--marquee-dur', (list.scrollWidth / pxPerSec).toFixed(1) + 's');
    m.classList.add('is-running');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'marquee-toggle';
    var label = m.getAttribute('data-label') || 'moving list';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Pause ' + label);
    btn.addEventListener('click', function () {
      var paused = m.getAttribute('data-paused') === 'true';
      m.setAttribute('data-paused', String(!paused));
      btn.setAttribute('aria-pressed', String(!paused));
      btn.setAttribute('aria-label', (paused ? 'Pause ' : 'Play ') + label);
    });
    m.appendChild(btn);
  });

  /* ---------- Services: filter by group, photo follows the group in view ---------- */
  var svc = $('[data-services]');
  if (svc) {
    var chips = $$('[data-filter]', svc);
    var groups = $$('[data-group]', svc);
    var shots = $$('[data-shot]', svc);
    var caption = $('[data-shot-caption]', svc);
    var panel = $('.svc-panel', svc);

    var showShot = function (name) {
      shots.forEach(function (img) { img.classList.toggle('is-active', img.getAttribute('data-shot') === name); });
      groups.forEach(function (g) { g.classList.toggle('is-active', g.getAttribute('data-group') === name); });
      var g = groups.filter(function (x) { return x.getAttribute('data-group') === name; })[0];
      if (g && caption) caption.textContent = g.getAttribute('data-caption');
    };

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.getAttribute('data-filter');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        groups.forEach(function (g) { g.hidden = f !== 'all' && g.getAttribute('data-group') !== f; });
        showShot(f === 'all' ? groups[0].getAttribute('data-group') : f);
      });
    });

    groups.forEach(function (g) {
      g.addEventListener('pointerenter', function () { showShot(g.getAttribute('data-group')); });
      g.addEventListener('focusin', function () { showShot(g.getAttribute('data-group')); });
    });

    var syncActiveGroup = function () {
      if (!groups.length) return;
      var triggerY = window.innerHeight * 0.45;
      var currentGroup = null;

      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (g.hidden) continue;
        var rect = g.getBoundingClientRect();
        if (rect.top <= triggerY) {
          currentGroup = g.getAttribute('data-group');
        }
      }

      if (!currentGroup && groups.length > 0) {
        currentGroup = groups[0].getAttribute('data-group');
      }

      if (currentGroup) {
        showShot(currentGroup);
      }
    };

    window.addEventListener('scroll', syncActiveGroup, { passive: true });
    window.addEventListener('resize', syncActiveGroup, { passive: true });

    // Initial state: activate first group
    if (groups.length) showShot(groups[0].getAttribute('data-group'));
  }

  /* ---------- Clients page: search the index ---------- */
  var search = $('[data-client-search]');
  if (search) {
    var rows = $$('[data-client]');
    var count = $('[data-client-count]');
    var empty = $('[data-client-empty]');
    var total = rows.length;
    var run = function () {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (li) {
        var hit = !q || li.textContent.toLowerCase().indexOf(q) !== -1;
        li.hidden = !hit;
        if (hit) shown++;
      });
      count.textContent = q ? shown + ' of ' + total + ' clients match "' + search.value.trim() + '"' : total + ' clients listed';
      empty.hidden = shown !== 0;
    };
    search.addEventListener('input', run);
    run();
  }

  /* ---------- Enquiry form ---------- */
  var form = $('[data-enquiry]');
  if (form) {
    var status = $('[data-form-status]', form);
    var submit = $('button[type="submit"]', form);
    var submitLabel = submit.textContent;
    var phoneFallback = form.getAttribute('data-phone') || '99163 10226';
    var formStartedAt = null;

    form.addEventListener('focusin', function () {
      if (!formStartedAt) formStartedAt = Date.now();
    }, { once: true });

    var rules = {
      name: function (v) { return v.trim().length >= 2 ? '' : 'Enter your name.'; },
      phone: function (v) {
        var d = v.replace(/\D/g, '');
        return d.length >= 10 && d.length <= 13 ? '' : 'Enter a phone number with at least 10 digits.';
      },
      email: function (v) { return !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Check the email address, or leave it empty.'; },
      consent: function (v, el) { return el && el.checked ? '' : 'Tick the box to let us use your details to reply.'; }
    };
    var setError = function (input, msg) {
      var box = $('#' + input.id + '-error', form);
      if (box) box.textContent = msg;
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    };
    var validate = function (input) {
      var rule = rules[input.name];
      var msg = rule ? rule(input.value, input) : '';
      setError(input, msg);
      return !msg;
    };
    var setStatus = function (state, msg) { status.setAttribute('data-state', state); status.textContent = msg; };

    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      if (input.type === 'checkbox') {
        input.addEventListener('change', function () { validate(input); });
      } else {
        input.addEventListener('blur', function () { if (input.value) validate(input); });
        input.addEventListener('input', function () { if (input.getAttribute('aria-invalid')) validate(input); });
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setStatus('', '');
      var firstBad = null;
      Object.keys(rules).forEach(function (name) {
        var input = form.elements[name];
        if (input && !validate(input) && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }
      if (form.elements.website && form.elements.website.value) return; /* honeypot: bots fill this, people never see it */

      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) {
        setStatus('error', 'This form is not connected to an inbox yet. Please call ' + phoneFallback + '.');
        return;
      }
      var payload = {};
      ['name', 'phone', 'email', 'company', 'service', 'message'].forEach(function (k) {
        if (form.elements[k]) payload[k] = form.elements[k].value.trim();
      });
      payload.consent = Boolean(form.elements.consent && form.elements.consent.checked);
      payload.startedAt = formStartedAt || Date.now();
      payload.page = location.pathname;
      var key = form.getAttribute('data-access-key');
      if (key) payload.access_key = key;

      submit.disabled = true;
      submit.textContent = 'Sending enquiry';
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        if (res.status === 422) {
          return res.json().then(function (data) {
            if (data.errors) {
              Object.keys(data.errors).forEach(function (field) {
                var el = form.elements[field];
                if (el) setError(el, data.errors[field]);
              });
            }
            throw new Error('VALIDATION_ERROR');
          });
        }
        if (res.status === 429) {
          return res.json().then(function (data) {
            setStatus('error', data.error || 'Too many enquiries from this connection. Please call ' + phoneFallback + '.');
            throw new Error('RATE_LIMITED');
          });
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        formStartedAt = null;
        setStatus('ok', 'Enquiry sent. We will call you back during office hours, Monday to Friday, 11:00 to 18:30.');
      }).catch(function (err) {
        if (err.message === 'VALIDATION_ERROR' || err.message === 'RATE_LIMITED') return;
        setStatus('error', 'Your enquiry was not sent. Check your connection and send it again, or call ' + phoneFallback + '.');
      }).then(function () {
        clearTimeout(timer);
        submit.disabled = false;
        submit.textContent = submitLabel;
      });
    });
  }
})();
