/* ============================================================================
   NLOGA — privacy-friendly analytics & conversion events
   ----------------------------------------------------------------------------
   No cookies, no build step. Configure one or both providers below and the
   rest works automatically. Leave a value empty to disable that provider.

     plausible : your site domain, e.g. "nloga.com"  (Plausible, cookieless)
     ga4       : your measurement ID, e.g. "G-XXXXXXXXXX" (Google Analytics 4)

   Any module can emit a custom event with:
       window.NLOGA_track('event_name', { key: 'value' })
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    plausible: '',
    ga4: ''
  };
  window.NLOGA_ANALYTICS = CONFIG;

  /* ---------------- provider bootstrapping ---------------- */
  if (CONFIG.plausible) {
    var plausible = document.createElement('script');
    plausible.defer = true;
    plausible.setAttribute('data-domain', CONFIG.plausible);
    plausible.src = 'https://plausible.io/js/script.tagged-events.js';
    document.head.appendChild(plausible);
  }

  if (CONFIG.ga4) {
    var gtag = document.createElement('script');
    gtag.async = true;
    gtag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.ga4);
    document.head.appendChild(gtag);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.ga4, { anonymize_ip: true });
  }

  /* ---------------- public tracking API ---------------- */
  function track(event, props) {
    var name = String(event || '').trim();
    if (!name) return;
    var data = props || {};
    try {
      if (typeof window.plausible === 'function') {
        window.plausible(name, { props: data });
      }
    } catch (e) {}
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, data);
      }
    } catch (e) {}
  }
  window.NLOGA_track = track;

  function closest(el, sel) {
    while (el && el !== document) {
      if (el.matches && el.matches(sel)) return el;
      el = el.parentNode;
    }
    return null;
  }

  /* ---------------- automatic conversion events ---------------- */
  document.addEventListener('click', function (e) {
    var el = closest(e.target, '[data-quote], #book-call, #contact-whatsapp, #fab-whatsapp, a[href]');
    if (!el) return;

    if (el.hasAttribute('data-quote')) {
      track('quote_cta', {
        need: el.getAttribute('data-quote') || '',
        package: el.getAttribute('data-package') || ''
      });
      return;
    }
    if (el.id === 'book-call') {
      track('book_call', { channel: (CONFIG.calendly && el.href && el.href.indexOf('calendly') !== -1) ? 'calendly' : 'whatsapp' });
      return;
    }

    var href = el.getAttribute('href') || '';
    if (el.id === 'contact-whatsapp' || el.id === 'fab-whatsapp' || /wa\.me|whatsapp\.com/i.test(href)) {
      track('whatsapp_click');
      return;
    }
    if (/^mailto:/i.test(href)) {
      track('email_click');
    }
  });

  /* Quote CTAs also reveal intent before the form is even sent. */
  window.addEventListener('nloga:quote-prefill', function (e) {
    track('quote_prefill', (e && e.detail) || {});
  });

  /* Language switches (dispatched by js/i18n.js). */
  window.addEventListener('nloga:langchange', function (e) {
    track('language_change', { language: (e && e.detail && e.detail.lang) || document.documentElement.lang });
  });

  /* Case studies & studio notes opened from the modal grid. */
  document.addEventListener('click', function (e) {
    var trigger = closest(e.target, '[data-modal]');
    if (trigger) track('content_open', { id: trigger.getAttribute('data-modal') || '' });
  });
})();
