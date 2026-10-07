/* ============================================================
   NLOGA — interactions
   ============================================================ */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------------- 0. Theme (white default, dark optional) ---------------- */
  (function () {
    var root = document.documentElement;
    var toggle = $('#theme-toggle');
    var drawerToggle = $('#theme-toggle-drawer');
    var drawerLabel = $('#theme-toggle-drawer-label');
    var meta = document.getElementById('meta-theme-color');

    function current() {
      return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function lang() {
      if (typeof window.NLOGA_getLang === 'function') return window.NLOGA_getLang();
      return root.getAttribute('lang') === 'fr' ? 'fr' : 'en';
    }

    function apply(theme, silent) {
      var next = theme === 'dark' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('nloga-theme', next); } catch (e) {}
      if (meta) meta.setAttribute('content', next === 'dark' ? '#101415' : '#f8fafc');
      var isDark = next === 'dark';
      var isFr = lang() === 'fr';
      var toLight = isFr ? 'Passer au thème clair' : 'Switch to light theme';
      var toDark = isFr ? 'Passer au thème sombre' : 'Switch to dark theme';
      if (toggle) {
        toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        toggle.setAttribute('aria-label', isDark ? toLight : toDark);
        toggle.setAttribute('title', isDark ? toLight : toDark);
      }
      if (drawerToggle) drawerToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      if (drawerLabel) drawerLabel.textContent = isDark ? toLight : toDark;
      if (!silent && typeof window.triggerStudioPulse === 'function') {
        window.triggerStudioPulse(next === 'dark'
          ? (isFr ? 'Thème sombre activé' : 'Dark Theme Enabled')
          : (isFr ? 'Thème clair activé' : 'Light Theme Enabled'));
      }
    }

    function toggleTheme() { apply(current() === 'dark' ? 'light' : 'dark'); }

    if (toggle) toggle.addEventListener('click', toggleTheme);
    if (drawerToggle) drawerToggle.addEventListener('click', toggleTheme);

    /* Sync on load (inline head script already set the initial theme). */
    apply(current(), true);
    window.setNlogaTheme = apply;
  })();

  /* ---------------- 1. Blueprint preloader ---------------- */
  var loader = $('#route-pulse-overlay');
  var loaderMin = 1100;

  function hideLoader() {
    if (!loader || loader.dataset.done) return;
    loader.dataset.done = '1';
    loader.classList.remove('is-visible');
    setTimeout(function () { loader.classList.add('is-gone'); }, 700);
  }
  window.addEventListener('load', function () { setTimeout(hideLoader, loaderMin); });
  setTimeout(hideLoader, 3200); /* safety net if a resource stalls */

  /* ---------------- 2. Studio pulse overlay ---------------- */
  var pulse = $('#interactive-pulse');
  var pulseMessage = $('#pulse-message');
  var pulseTimer = null;

  function triggerStudioPulse(message) {
    if (!pulse) return;
    if (message && pulseMessage) pulseMessage.textContent = message;
    pulse.classList.add('is-visible');
    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(function () { pulse.classList.remove('is-visible'); }, 1400);
  }
  window.triggerStudioPulse = triggerStudioPulse;

  $$('[data-pulse]').forEach(function (el) {
    el.addEventListener('click', function () {
      triggerStudioPulse(el.getAttribute('data-pulse'));
    });
  });

  /* ---------------- 3. Header scroll state ---------------- */
  var header = $('#site-header');
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 8) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- 4. Mobile drawer ---------------- */
  var drawer = $('#mobile-drawer');
  var scrim = $('#drawer-scrim');
  var navToggle = $('#nav-toggle');

  function setDrawer(open) {
    if (!drawer || !navToggle) return;
    drawer.classList.toggle('open', open);
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (scrim) {
      if (open) { scrim.hidden = false; requestAnimationFrame(function () { scrim.classList.add('visible'); }); }
      else { scrim.classList.remove('visible'); setTimeout(function () { scrim.hidden = true; }, 300); }
    }
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (navToggle) navToggle.addEventListener('click', function () {
    setDrawer(!drawer.classList.contains('open'));
  });
  if (scrim) scrim.addEventListener('click', function () { setDrawer(false); });
  $$('.mobile-drawer a').forEach(function (link) {
    link.addEventListener('click', function () { setDrawer(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setDrawer(false);
  });

  /* ---------------- 5. Capabilities carousel ---------------- */
  (function () {
    var track = $('#capabilities-track');
    var prevBtn = $('#carousel-prev');
    var nextBtn = $('#carousel-next');
    var progress = $('#car-progress-bar');
    if (!track || !prevBtn || !nextBtn) return;

    var offset = 0;

    function metrics() {
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 24;
      var card = track.children[0];
      var step = (card ? card.getBoundingClientRect().width : 460) + gap;
      var max = Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
      return { step: step, max: max };
    }

    function render() {
      var m = metrics();
      offset = Math.min(0, Math.max(-m.max, offset));
      track.style.transform = 'translateX(' + offset + 'px)';
      prevBtn.disabled = offset >= -1;
      nextBtn.disabled = offset <= -(m.max + 1);
      if (progress) {
        var pct = m.max === 0 ? 100 : Math.round((1 + offset / m.max) * 100);
        progress.style.width = pct + '%';
      }
    }

    prevBtn.addEventListener('click', function () {
      offset += metrics().step;
      render();
    });
    nextBtn.addEventListener('click', function () {
      offset -= metrics().step;
      render();
    });

    /* Drag / swipe */
    var dragging = false, startX = 0, startOffset = 0;
    track.addEventListener('pointerdown', function (e) {
      dragging = true; startX = e.clientX; startOffset = offset;
      track.classList.add('dragging');
      track.setPointerCapture && track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      offset = startOffset + (e.clientX - startX);
      render();
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('dragging');
      var m = metrics();
      var snapped = Math.round(offset / m.step) * m.step;
      offset = Math.min(0, Math.max(-m.max, snapped));
      render();
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('pointerleave', endDrag);
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });

    window.addEventListener('resize', render);
    render();
  })();

  /* ---------------- 6. Project filter tabs ---------------- */
  (function () {
    var tabs = $$('.tab');
    var cards = $$('.work-card');
    if (!tabs.length || !cards.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.getAttribute('data-filter');
        cards.forEach(function (card) {
          var cat = card.getAttribute('data-category');
          var show = target === 'all' || target === cat;
          card.classList.toggle('is-hidden', !show);
        });
        if (typeof window.triggerStudioPulse === 'function') {
          var isFr = (typeof window.NLOGA_isFr === 'function' && window.NLOGA_isFr()) ||
            (typeof window.NLOGA_getLang === 'function' && window.NLOGA_getLang() === 'fr');
          window.triggerStudioPulse((isFr ? 'Projets · ' : 'Work Filter · ') + tab.textContent.trim());
        }
      });
    });
  })();

  /* ---------------- 6b. Modal dialog (cases, articles, legal) ---------------- */
  (function () {
    var overlay = $('#modal-overlay');
    var body = $('#modal-body');
    var closeBtn = $('#modal-close');
    if (!overlay || !body) return;
    var lastFocus = null;

    function open(id) {
      var src = document.getElementById(id);
      if (!src) return;
      lastFocus = document.activeElement;
      body.innerHTML = src.innerHTML;
      overlay.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        overlay.classList.add('open');
      }); });
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    }
    window.openNlogaModal = open;

    function close() {
      overlay.classList.remove('open');
      setTimeout(function () {
        overlay.hidden = true;
        body.innerHTML = '';
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      }, 380);
    }
    window.closeNlogaModal = close;

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest ? e.target.closest('[data-modal]') : null;
      if (trigger) {
        e.preventDefault();
        open(trigger.getAttribute('data-modal'));
        return;
      }
      /* In-modal anchor links (e.g. "Start a similar project") close first. */
      var anchor = e.target.closest ? e.target.closest('.modal-body a[href^="#"]') : null;
      if (anchor) { close(); return; } /* default anchor navigation proceeds */
      if (e.target === overlay) close();
    });
    if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) close();
    });
  })();

  /* ---------------- 6c. Animated counters ---------------- */
  (function () {
    var counters = $$('[data-count]');
    if (!counters.length) return;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function render(el, value) {
      el.textContent = String(Math.round(value)) + (el.getAttribute('data-suffix') || '');
    }
    function animate(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      if (reduced || !('requestAnimationFrame' in window)) { render(el, target); return; }
      var start = null, duration = 1400;
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - p, 4);
        render(el, target * eased);
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animate);
      return;
    }
    var seen = new WeakSet();
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !seen.has(entry.target)) {
          seen.add(entry.target);
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { observer.observe(el); });
  })();

  /* ---------------- 6d. Lightbox gallery ---------------- */
  (function () {
    var box = $('#lightbox');
    if (!box) return;
    var img = $('#lb-img');
    var cap = $('#lb-cap');
    var count = $('#lb-count');
    var items = $$('.work-media img, .eco-grid .eco-media img, .about-side .eco-media img');
    if (!items.length || !img) return;
    var index = 0;
    var lastFocus = null;

    function render() {
      var el = items[index];
      img.classList.remove('zoomed');
      img.src = el.getAttribute('data-full') || el.currentSrc || el.src;
      img.alt = el.alt || '';
      if (cap) cap.textContent = el.alt || '';
      if (count) count.textContent = (index + 1) + ' / ' + items.length;
    }
    function open(i) {
      index = (i + items.length) % items.length;
      lastFocus = document.activeElement;
      render();
      box.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        box.classList.add('open');
      }); });
      document.body.style.overflow = 'hidden';
    }
    function close() {
      box.classList.remove('open');
      setTimeout(function () {
        box.hidden = true;
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      }, 380);
    }
    window.openNlogaLightbox = open;
    window.closeNlogaLightbox = close;

    items.forEach(function (el, i) {
      el.addEventListener('click', function () { open(i); });
    });
    img.addEventListener('click', function () { img.classList.toggle('zoomed'); });

    function prev() { index = (index - 1 + items.length) % items.length; render(); }
    function next() { index = (index + 1) % items.length; render(); }
    var prevBtn = $('#lb-prev');
    var nextBtn = $('#lb-next');
    var closeBtn = $('#lb-close');
    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (closeBtn) closeBtn.addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    });
    var touchX = null;
    box.addEventListener('touchstart', function (e) {
      touchX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : null;
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : touchX) - touchX;
      touchX = null;
      if (Math.abs(dx) < 40) return;
      if (dx > 0) prev(); else next();
    }, { passive: true });
  })();

  /* ---------------- 6e. Card tilt (fine pointers only) ---------------- */
  (function () {
    if (!window.matchMedia) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    $$('.work-card, .eco-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'perspective(900px) rotateX(' + (-py * 5).toFixed(2) + 'deg)' +
          ' rotateY(' + (px * 5).toFixed(2) + 'deg) translateY(-4px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  })();

  /* ---------------- 7. FAQ accordion ---------------- */
  (function () {
    var items = $$('.faq-item');
    items.forEach(function (item) {
      var btn = $('.faq-q', item);
      var panel = $('.faq-a', item);
      if (!btn || !panel) return;
      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');
        items.forEach(function (other) {
          other.classList.remove('open');
          var q = $('.faq-q', other);
          var a = $('.faq-a', other);
          if (q) q.setAttribute('aria-expanded', 'false');
          if (a) a.style.maxHeight = '0px';
        });
        if (!isOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      });
    });
  })();

  /* ---------------- 8. Reveal on scroll ---------------- */
  (function () {
    var revealEls = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    revealEls.forEach(function (el) {
      var d = el.getAttribute('data-d');
      if (d) el.style.transitionDelay = d + 'ms';
      observer.observe(el);
    });
  })();

  /* ---------------- 8b. Ambient scroll parallax ---------------- */
  (function () {
    if (!('requestAnimationFrame' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var layers = $$('.blueprint-layer');
    var ribbons = $$('.ribbon');
    var spots = $$('.spotlight');
    if (!layers.length && !spots.length && !ribbons.length) return;
    var target = 0, current = 0, running = false;
    function frame() {
      /* Ease toward the target for a slow, buttery drift. */
      current += (target - current) * 0.06;
      if (Math.abs(target - current) < 0.1) {
        current = target;
        running = false;
      } else {
        requestAnimationFrame(frame);
      }
      layers.forEach(function (l) { l.style.transform = 'translate3d(0,' + (current * -0.05) + 'px,0)'; });
      ribbons.forEach(function (r) { r.style.transform = 'translate3d(0,' + (current * -0.03) + 'px,0)'; });
      spots.forEach(function (s) { s.style.transform = 'translate3d(0,' + (current * 0.04) + 'px,0)'; });
    }
    window.addEventListener('scroll', function () {
      target = window.scrollY || window.pageYOffset || 0;
      if (!running) { running = true; requestAnimationFrame(frame); }
    }, { passive: true });
  })();

  /* ---------------- 8c. Scroll progress + back-to-top ---------------- */
  (function () {
    var bar = $('#scroll-progress-bar');
    var topBtn = $('#back-to-top');
    if (!bar && !topBtn) return;
    var ticking = false;
    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, (window.scrollY || 0) / max) : 0;
      if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
      if (topBtn) topBtn.classList.toggle('visible', (window.scrollY || 0) > 600);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
    if (topBtn) topBtn.addEventListener('click', function () {
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  })();

  /* ---------------- 9. Scroll-spy navigation ---------------- */
  (function () {
    var navLinks = $$('.nav-link');
    if (!navLinks.length || !('IntersectionObserver' in window)) return;
    var map = {};
    navLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (href && href.charAt(0) === '#') map[href.slice(1)] = link;
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (l) { l.classList.remove('active'); });
        var active = map[id];
        if (active) {
          active.classList.add('active');
          $$('.nav-link[href="#' + id + '"]').forEach(function (l) { l.classList.add('active'); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    Object.keys(map).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  })();

  /* ---------------- 10. Language switcher (EN | FR) ---------------- */
  (function () {
    var toast = $('#toast');
    var toastTimer = null;
    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
    }
    window.showToast = showToast;

    function currentLang() {
      if (typeof window.NLOGA_getLang === 'function') return window.NLOGA_getLang();
      return document.documentElement.getAttribute('lang') === 'fr' ? 'fr' : 'en';
    }

    $$('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-lang') === 'fr' ? 'fr' : 'en';
        if (typeof window.setNlogaLang === 'function') {
          window.setNlogaLang(lang);
          return;
        }
        /* Fallback if i18n.js failed to load: toggle button state only. */
        $$('.lang-switch').forEach(function (group) {
          $$('.lang-btn', group).forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-lang') === lang);
          });
        });
        document.documentElement.setAttribute('lang', lang);
        if (lang === 'fr') showToast('La version française arrive bientôt · French version coming soon');
        else showToast('Language: English');
      });
    });

    /* Expose for dynamic messages elsewhere in this file. */
    window.NLOGA_isFr = function () { return currentLang() === 'fr'; };
  })();

  /* ---------------- 11. Contact forms — registration + project enquiry, quotes & booking ---------------- */
  (function () {
    /* TODO: set your real WhatsApp business number (country code + number, no "+"). */
    /* Optional integrations — leave a value empty to disable that channel:
       - formspree : Formspree endpoint ID (e.g. "xabcdefg") for enquiry email delivery.
       - sheetWebhook : Google Apps Script /any/ webhook URL to log enquiries in a sheet.
       - calendly : full Calendly event URL for the "book a call" button.
       - paymentNumber : MoMo / Orange Money number shown in the registration confirmation.
       - supabaseUrl / supabaseKey : Supabase REST endpoint — logs registrations and
         enquiries (tables "registrations" and "enquiries"). Empty URL disables logging. */
    var CONTACT = {
      whatsapp: '237680643244',
      paymentNumber: '+237 6 80 64 32 44',
      formspree: '',
      sheetWebhook: '',
      calendly: '',
      /* Set these to your own project values only in deployment; keep them empty in source. */
      supabaseUrl: '',
      supabaseKey: ''
    };
    window.NLOGA_CONTACT = CONTACT;
    window.NLOGA_CONFIG = CONTACT; /* Alias used by the registration feature. */

    function isFr() {
      return (typeof window.NLOGA_isFr === 'function' && window.NLOGA_isFr()) ||
        (typeof window.NLOGA_getLang === 'function' && window.NLOGA_getLang() === 'fr');
    }

    /* Keep every WhatsApp entry point in sync with the config above. */
    ['contact-whatsapp', 'fab-whatsapp'].forEach(function (id) {
      var a = document.getElementById(id);
      if (a) a.href = 'https://wa.me/' + CONTACT.whatsapp;
    });

    /* "Book a call" — Calendly when configured, otherwise a WhatsApp fallback. */
    var book = $('#book-call');
    if (book) {
      if (CONTACT.calendly) {
        book.href = CONTACT.calendly;
      } else {
        var bookMsg = isFr()
          ? 'Bonjour Nloga, je souhaite réserver un appel stratégique de 30 minutes.'
          : 'Hello Nloga, I would like to book a 30-minute strategy call.';
        book.href = 'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(bookMsg);
      }
      book.setAttribute('target', '_blank');
      book.setAttribute('rel', 'noopener');
    }

    function scrollToContact() {
      var target = document.getElementById('contact');
      if (!target) return;
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var top = target.getBoundingClientRect().top + (window.scrollY || 0) - 84;
      window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
      });
    }

    function legacyCopy(text) {
      var t = document.createElement('textarea');
      t.value = text;
      t.setAttribute('readonly', '');
      t.style.position = 'absolute';
      t.style.left = '-9999px';
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(t);
    }

    function copyText(text, btn) {
      var done = function () {
        var original = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined icon-sm">check</span><span>' +
          (isFr() ? 'Copié' : 'Copied') + '</span>';
        window.showToast && window.showToast(isFr() ? 'Copié dans le presse-papiers' : 'Copied to clipboard');
        setTimeout(function () { btn.innerHTML = original; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { legacyCopy(text); done(); });
      } else { legacyCopy(text); done(); }
    }

    /* Shared lead log (Supabase REST) used by both forms. */
    function logToTable(table, payload) {
      if (!CONTACT.supabaseUrl || CONTACT.supabaseUrl.indexOf('YOURPROJECT') !== -1) return;
      try {
        fetch(CONTACT.supabaseUrl + '/rest/v1/' + table, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CONTACT.supabaseKey,
            'Authorization': 'Bearer ' + CONTACT.supabaseKey,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function () {});
      } catch (err) {}
    }

    function waLink(data) {
      var lines = [
        (isFr() ? 'Bonjour Nloga, je suis ' : 'Hello Nloga, I am ') + data.name + ' (' + data.email + ')',
        data.organization ? ((isFr() ? 'Organisation : ' : 'Organization: ') + data.organization) : null,
        (isFr() ? 'Besoin : ' : 'Need: ') + (data.needLabel || data.need),
        data.budget ? ((isFr() ? 'Budget : ' : 'Budget: ') + data.budget) : null,
        data.timeline ? ((isFr() ? 'Échéance : ' : 'Timeline: ') + data.timeline) : null,
        data.package ? ((isFr() ? 'Formule : ' : 'Package: ') + data.package) : null,
        '',
        data.message
      ].filter(function (l) { return l !== null; });
      return 'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(lines.join('\n'));
    }

    /* ============================================================
       FORM SWITCHER (registration <-> enquiry)
       Directional swipe: the outgoing form slides out (fade + blur)
       while the incoming one slides in from the opposite side and
       the container morphs its height between the two forms.
       Reduced-motion users get an instant swap. No pulse on switch.
       ============================================================ */
    var switcher = document.getElementById('form-switcher');
    var switchTabs = switcher ? Array.prototype.slice.call(switcher.querySelectorAll('.switcher-tab')) : [];
    var switchIndicator = switcher ? switcher.querySelector('.switcher-indicator') : null;
    var switchPanels = Array.prototype.slice.call(document.querySelectorAll('.form-panel'));

    function placeIndicator(tab) {
      if (!switchIndicator || !tab) return;
      var parentRect = switcher.getBoundingClientRect();
      var tabRect = tab.getBoundingClientRect();
      switchIndicator.style.width = tabRect.width + 'px';
      switchIndicator.style.transform = 'translateX(' + (tabRect.left - parentRect.left - 4) + 'px)';
    }

    var switchTimer = null;   /* pending end-of-transition cleanup */
    var leavingEl = null;     /* panel currently sliding out */

    function activateForm(name, focus) {
      name = (name === 'enquiry') ? 'enquiry' : 'register';
      switchTabs.forEach(function (t) {
        var on = t.getAttribute('data-form') === name;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) placeIndicator(t);
      });

      var wrap = switchPanels.length ? switchPanels[0].parentNode : null;
      var current = null;
      var target = null;
      switchPanels.forEach(function (p) {
        if (p.classList.contains('active')) current = p;
        if (p.getAttribute('data-panel') === name) target = p;
      });
      if (!target) return;

      clearTimeout(switchTimer);
      /* Settle a panel still mid-exit — unless it is the target coming back. */
      if (leavingEl && leavingEl !== target) {
        leavingEl.classList.remove('is-leaving');
        leavingEl.setAttribute('hidden', '');
      }
      leavingEl = null;

      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      function focusFirstField() {
        var first = target.querySelector('input, select, textarea');
        if (first) first.focus({ preventScroll: true });
      }

      /* Instant path: reduced motion, first call, no-op re-click, or broken DOM. */
      if (reduced || !current || current === target || !wrap || current.parentNode !== wrap) {
        switchPanels.forEach(function (p) {
          var on = p === target;
          p.classList.toggle('active', on);
          p.classList.remove('is-leaving', 'is-entering');
          if (on) p.removeAttribute('hidden');
          else p.setAttribute('hidden', '');
        });
        if (wrap) { wrap.classList.add('has-switched'); wrap.style.height = ''; }
        if (focus) setTimeout(focusFirstField, 180);
        return;
      }

      /* ---- Directional swipe: old form out, new form in, height morph ---- */
      var ORDER = { register: 0, enquiry: 1 };
      var dir = ORDER[name] > ORDER[current.getAttribute('data-panel')] ? 'next' : 'prev';

      var startH = wrap.getBoundingClientRect().height;
      wrap.style.height = startH + 'px';
      wrap.setAttribute('data-dir', dir);
      wrap.classList.add('has-switched'); /* intro cascade stays first-load-only */

      current.classList.remove('active', 'is-entering');
      current.classList.add('is-leaving');
      leavingEl = current;

      target.classList.remove('is-leaving');
      target.classList.add('active', 'is-entering');
      target.removeAttribute('hidden');

      void wrap.offsetHeight; /* commit the start height so the morph animates */

      wrap.style.height = target.getBoundingClientRect().height + 'px';

      switchTimer = setTimeout(function () {
        if (leavingEl) {
          leavingEl.classList.remove('is-leaving');
          leavingEl.setAttribute('hidden', '');
          leavingEl = null;
        }
        target.classList.remove('is-entering');
        wrap.style.height = '';
        wrap.removeAttribute('data-dir');
        switchTimer = null;
      }, 700);

      if (focus) setTimeout(focusFirstField, 560);
    }
    window.NLOGA_activateForm = activateForm;

    switchTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activateForm(tab.getAttribute('data-form'), true);
      });
    });

    placeIndicator(switcher ? switcher.querySelector('.switcher-tab.active') : null);
    window.addEventListener('load', function () {
      var active = switcher ? switcher.querySelector('.switcher-tab.active') : null;
      placeIndicator(active);
    });
    window.addEventListener('resize', function () {
      var active = switcher ? switcher.querySelector('.switcher-tab.active') : null;
      placeIndicator(active);
    });

    /* "Get a quote" buttons → switch to the enquiry panel + prefill + scroll + focus. */
    function prefillQuote(needValue, pkgValue) {
      activateForm('enquiry', false);
      var needSel = $('#enq-need');
      if (needSel && needValue) {
        var matched = false;
        $$('option', needSel).forEach(function (o) { if (o.value === needValue) matched = true; });
        if (matched) needSel.value = needValue;
        else $$('option', needSel).forEach(function (o) {
          if (o.textContent.trim() === needValue) needSel.value = o.value;
        });
      }
      var pkg = $('#enq-package');
      if (pkg) pkg.value = pkgValue || '';
      var msg = $('#enq-msg');
      if (msg && pkgValue) {
        var line = (isFr() ? 'Formule souhaitée : ' : 'Package of interest: ') + pkgValue;
        if (msg.value.indexOf(line) === -1) {
          msg.value = msg.value.trim() ? (msg.value.trim() + '\n' + line) : line;
        }
      }
      scrollToContact();
      window.setTimeout(function () {
        var name = $('#enq-name');
        if (name) name.focus({ preventScroll: true });
      }, 600);
      window.triggerStudioPulse && window.triggerStudioPulse(isFr() ? 'Demande de devis préremplie' : 'Quote request prefilled');
      window.showToast && window.showToast(isFr() ? 'Formulaire prérempli — complétez et envoyez' : 'Form prefilled — complete and send');
      window.dispatchEvent(new CustomEvent('nloga:quote-prefill', {
        detail: { need: needValue || '', package: pkgValue || '' }
      }));
    }
    window.NLOGA_prefillQuote = prefillQuote;
    $$('[data-quote]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        prefillQuote(btn.getAttribute('data-quote'), btn.getAttribute('data-package'));
      });
    });

    /* ============================================================
       REGISTRATION FORM (course registration via WhatsApp)
       ============================================================ */
    var form = document.getElementById('contact-form');
    if (form) {
      var nameEl    = document.getElementById('cf-name');
      var emailEl   = document.getElementById('cf-email');
      var phoneEl   = document.getElementById('cf-phone');
      var courseEl  = document.getElementById('cf-course');
      var availEl   = document.getElementById('cf-availability');
      var submitBtn = document.getElementById('cf-submit');
      var statusEl  = document.getElementById('form-status');
      var statusTextEl = statusEl ? statusEl.querySelector('.form-status-text') : null;
      var noteEl    = document.getElementById('form-note');

      function isEmail(v) { return /^\S+@\S+\.\S+$/.test(v); }
      function isPhone(v) { return v.replace(/\D/g, '').length >= 8; }

      function validateReg() {
        var checks = {
          name:  !!(nameEl  && nameEl.value.trim().length >= 2),
          email: !!(emailEl && isEmail(emailEl.value.trim())),
          phone: !!(phoneEl && isPhone(phoneEl.value.trim())),
          course: !!(courseEl && courseEl.value !== ''),
          availability: !!(availEl && availEl.value !== '')
        };
        return {
          valid: checks.name && checks.email && checks.phone && checks.course && checks.availability,
          checks: checks
        };
      }
      function paint(el, ok) { if (el) el.classList.toggle('field-error', !ok && el.value !== ''); }
      function renderStatus() {
        var r = validateReg();
        paint(nameEl, r.checks.name);
        paint(emailEl, r.checks.email);
        paint(phoneEl, r.checks.phone);
        paint(courseEl, r.checks.course);
        paint(availEl, r.checks.availability);
        if (submitBtn) submitBtn.disabled = !r.valid;
        if (statusEl) {
          statusEl.classList.toggle('is-valid', r.valid);
          statusEl.classList.toggle('is-invalid', !r.valid);
        }
        if (statusTextEl) {
          statusTextEl.textContent = r.valid
            ? (isFr() ? 'Tout est prêt — inscription sur WhatsApp' : 'All set — ready to register on WhatsApp')
            : (isFr() ? 'Remplissez le formulaire pour activer l’inscription' : 'Fill the form to enable registration');
        }
        return r;
      }
      [nameEl, emailEl, phoneEl, courseEl, availEl].forEach(function (el) {
        if (!el) return;
        el.addEventListener('input', renderStatus);
        el.addEventListener('change', renderStatus);
        el.addEventListener('blur', renderStatus);
      });
      renderStatus();

      function buildWhatsAppMessage() {
        var name = nameEl.value.trim();
        var email = emailEl.value.trim();
        var phone = phoneEl.value.trim();
        var course = courseEl.value;
        var availability = availEl.value;
        if (isFr()) {
          return [
            'Bonjour NLOGA, je m’appelle ' + name + '.',
            '',
            'Je viens de m’inscrire au cours « ' + course + ' » et je souhaite procéder au paiement.',
            'Envoyez-moi s’il vous plaît les coordonnées de paiement (MoMo ou Orange Money) pour confirmer ma place.',
            '',
            '— Mes informations d’inscription —',
            'Nom complet : ' + name,
            'E-mail : ' + email,
            'WhatsApp : ' + phone,
            'Cours : ' + course,
            'Disponibilité souhaitée : ' + availability
          ].join('\n');
        }
        return [
          'Hello NLOGA, my name is ' + name + '.',
          '',
          'I have just registered for the course "' + course + '" and I would like to proceed with the payment.',
          'Please send me the payment details (MoMo or Orange Money) so I can confirm my seat.',
          '',
          '— My registration details —',
          'Full name: ' + name,
          'Email: ' + email,
          'WhatsApp: ' + phone,
          'Course: ' + course,
          'Preferred availability: ' + availability
        ].join('\n');
      }

      function showConfirmationPanel(waUrl, payNumberDisplay, message) {
        var fr = isFr();
        var panel = document.createElement('div');
        panel.className = 'cf-confirmation';
        panel.innerHTML =
          '<span class="label-caps tone-primary">' + (fr ? 'Presque terminé' : 'Almost done') + '</span>' +
          '<h3 class="headline-md" style="margin-top:6px;">' + (fr ? 'Inscription prête' : 'Registration ready') + '</h3>' +
          '<p class="body-md muted">' + (fr
            ? 'WhatsApp devrait s’ouvrir sur votre appareil. Sinon, utilisez les boutons ci-dessous.'
            : 'WhatsApp should have opened on your device. If it did not, use the buttons below.') + '</p>' +
          '<div class="cf-copy-block">' +
            '<span class="cf-copy-label">WhatsApp NLOGA</span>' +
            '<code class="cf-copy-value">' + escapeHtml('+' + CONTACT.whatsapp) + '</code>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-copy="' + escapeHtml('+' + CONTACT.whatsapp) + '">' +
              '<span class="material-symbols-outlined icon-sm">content_copy</span><span>' + (fr ? 'Copier le numéro' : 'Copy number') + '</span>' +
            '</button>' +
          '</div>' +
          '<div class="cf-copy-block">' +
            '<span class="cf-copy-label">' + (fr ? 'Numéro de paiement (MoMo / OM)' : 'Payment number (MoMo / OM)') + '</span>' +
            '<code class="cf-copy-value">' + escapeHtml(payNumberDisplay) + '</code>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-copy="' + escapeHtml(payNumberDisplay) + '">' +
              '<span class="material-symbols-outlined icon-sm">content_copy</span><span>' + (fr ? 'Copier le numéro de paiement' : 'Copy payment number') + '</span>' +
            '</button>' +
          '</div>' +
          '<div class="cf-copy-block">' +
            '<span class="cf-copy-label">' + (fr ? 'Message à envoyer' : 'Message to send') + '</span>' +
            '<textarea class="cf-copy-msg" readonly rows="8"></textarea>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-copy-msg>' +
              '<span class="material-symbols-outlined icon-sm">content_copy</span><span>' + (fr ? 'Copier le message' : 'Copy message') + '</span>' +
            '</button>' +
          '</div>' +
          '<a class="btn btn-primary btn-block" style="margin-top:10px;" href="' + waUrl + '" target="_blank" rel="noopener">' +
            '<span>' + (fr ? 'Rouvrir WhatsApp' : 'Open WhatsApp again') + '</span><span class="material-symbols-outlined icon-sm">chat</span>' +
          '</a>' +
          '<button type="button" class="btn btn-outline btn-block" data-cf-reset style="margin-top:8px;">' +
            '<span>' + (fr ? 'Inscrire un autre étudiant' : 'Register another student') + '</span>' +
          '</button>';
        var ta = panel.querySelector('.cf-copy-msg');
        if (ta) ta.value = message;
        form.parentNode.insertBefore(panel, form);
        form.style.display = 'none';
        panel.querySelectorAll('[data-copy]').forEach(function (b) {
          b.addEventListener('click', function () { copyText(b.getAttribute('data-copy'), b); });
        });
        panel.querySelectorAll('[data-copy-msg]').forEach(function (b) {
          b.addEventListener('click', function () { copyText(message, b); });
        });
        panel.querySelectorAll('[data-cf-reset]').forEach(function (b) {
          b.addEventListener('click', function () {
            panel.remove();
            form.style.display = '';
            form.reset();
            renderStatus();
            scrollToContact();
          });
        });
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var r = renderStatus();
        if (!r.valid) {
          if (noteEl) noteEl.textContent = isFr()
            ? 'Veuillez remplir tous les champs avant de vous inscrire.'
            : 'Please complete every field before registering.';
          window.showToast && window.showToast(isFr() ? 'Veuillez compléter les champs surlignés' : 'Please complete the highlighted fields');
          return;
        }
        var payload = {
          full_name: nameEl.value.trim(),
          email: emailEl.value.trim(),
          whatsapp: phoneEl.value.trim(),
          course: courseEl.value,
          availability: availEl.value,
          language: isFr() ? 'FR' : 'EN',
          page_url: window.location.href,
          user_agent: navigator.userAgent
        };
        logToTable('registrations', payload);
        var msg = buildWhatsAppMessage();
        var url = 'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(msg);
        window.open(url, '_blank', 'noopener');
        showConfirmationPanel(url, CONTACT.paymentNumber, msg);
        window.triggerStudioPulse && window.triggerStudioPulse(isFr() ? 'Inscription envoyée sur WhatsApp' : 'Registration dispatched to WhatsApp');
        window.showToast && window.showToast(isFr() ? 'Ouverture de WhatsApp…' : 'Opening WhatsApp…');
        window.NLOGA_track && window.NLOGA_track('generate_lead', {
          course: payload.course,
          availability: payload.availability,
          logged: CONTACT.supabaseUrl ? 'yes' : 'no'
        });
      });
    }

    /* ============================================================
       PROJECT ENQUIRY FORM
       ============================================================ */
    var enqForm = document.getElementById('enquiry-form');
    if (enqForm) {
      var eName = document.getElementById('enq-name');
      var eEmail = document.getElementById('enq-email');
      var eOrg = document.getElementById('enq-org');
      var eNeed = document.getElementById('enq-need');
      var ePkg = document.getElementById('enq-package');
      var eBudget = document.getElementById('enq-budget');
      var eTimeline = document.getElementById('enq-timeline');
      var eMsg = document.getElementById('enq-msg');
      var eNote = document.getElementById('enq-note');


      enqForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = true;
        [eName, eEmail, eMsg].forEach(function (f) {
          if (!f) return;
          var bad = !f.value || !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value.trim()));
          f.classList.toggle('field-error', bad);
          if (bad) ok = false;
        });
        if (!ok) {
          if (eNote) eNote.textContent = isFr()
            ? 'Veuillez indiquer votre nom, un e-mail valide et quelques mots sur votre projet.'
            : 'Please complete your name, a valid email, and a short project note.';
          window.showToast && window.showToast(isFr() ? 'Veuillez compléter les champs surlignés' : 'Please complete the highlighted fields');
          return;
        }

        var needText = '';
        if (eNeed) {
          needText = eNeed.selectedOptions && eNeed.selectedOptions[0]
            ? eNeed.selectedOptions[0].textContent.trim()
            : eNeed.value;
        }
        var payload = {
          full_name: eName.value.trim(),
          email: eEmail.value.trim(),
          organization: eOrg ? eOrg.value.trim() : '',
          need: eNeed ? eNeed.value : '',
          budget: eBudget ? eBudget.value : '',
          timeline: eTimeline ? eTimeline.value : '',
          package: ePkg ? ePkg.value : '',
          message: eMsg.value.trim(),
          language: isFr() ? 'FR' : 'EN',
          page_url: window.location.href,
          user_agent: navigator.userAgent
        };
        /* Lead log (Supabase) + real backends (Formspree / sheet webhook). */
        logToTable('enquiries', payload);
        var wire = {};
        Object.keys(payload).forEach(function (k) { wire[k] = payload[k]; });
        wire.name = payload.full_name;
        wire.page = payload.page_url;
        wire.needLabel = needText;

        if (CONTACT.formspree) {
          try {
            fetch('https://formspree.io/f/' + CONTACT.formspree, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify(wire)
            }).catch(function () {});
          } catch (err) {}
        }
        if (CONTACT.sheetWebhook) {
          try {
            var body = JSON.stringify(wire);
            if (navigator.sendBeacon) {
              navigator.sendBeacon(CONTACT.sheetWebhook, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
            } else {
              fetch(CONTACT.sheetWebhook, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                body: body
              }).catch(function () {});
            }
          } catch (err) {}
        }

        var link = waLink(wire);
        window.open(link, '_blank', 'noopener');
        var saved = CONTACT.formspree || CONTACT.sheetWebhook || CONTACT.supabaseUrl;
        if (eNote) eNote.textContent = isFr()
          ? (saved
            ? 'Merci ! Votre demande est enregistrée — nous répondons sous un jour ouvré. WhatsApp s’ouvre avec votre message.'
            : 'Merci ! WhatsApp s’ouvre avec votre message — envoyez-le pour nous le faire parvenir.')
          : (saved
            ? 'Thank you! Your enquiry is logged — we reply within one business day. WhatsApp is opening with your message.'
            : 'Thank you! WhatsApp is opening with your message — press send to deliver it to us.');
        window.triggerStudioPulse && window.triggerStudioPulse(isFr() ? 'Demande de projet reçue' : 'Project Enquiry Received');
        window.showToast && window.showToast(isFr() ? 'Demande envoyée — merci' : 'Enquiry sent — thank you');
        window.NLOGA_track && window.NLOGA_track('generate_lead', {
          kind: 'enquiry',
          need: payload.need,
          package: payload.package,
          language: payload.language,
          logged: saved ? 'yes' : 'no'
        });

        setTimeout(function () {
          enqForm.reset();
          if (ePkg) ePkg.value = '';
        }, 1200);
      });
    }
  })();

  /* ---------------- 12b. Service worker (PWA offline) ---------------- */
  (function () {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return; /* skip on file:// */
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  })();

  /* ---------------- 12. Footer year ---------------- */
  (function () {
    var year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  })();

})();

