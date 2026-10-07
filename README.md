# NLOGA — Digital Ecosystem Platform

One-page site for **NLOGA Venture Studio** (Douala & Yaoundé, Cameroon) and its
three pillars: **Forgeware** (software), **CreativePics Art** (brand &
creative), **Now Just Create** (training).

![NLOGA preview](screen.png)

> `screen.png` is a placeholder capture — retake it after your next visual
> update so the repo preview stays accurate.

## Stack

No build step, no dependencies. Plain HTML + CSS + vanilla JS, fonts and icons
loaded from Google Fonts CDN:

```
index.html                  Structure & content (EN source of truth)
css/styles.css              Electric Neo-Blueprint design system
js/script.js                Interactions (theme, modal, lightbox, forms…)
js/analytics.js             Optional analytics + conversion events
js/i18n.js                  EN→FR dictionary + translation engine
NLOGA_VISUAL_IDENTITY/      Brand & case-study imagery
manifest.webmanifest, sw.js PWA shell (installable, offline-first)
```

## Features

- **Light / dark theme** — white default, toggle in header + mobile drawer,
  persisted in `localStorage`, pre-paint script avoids any flash.
- **EN / FR translation** — full-site dictionary (`js/i18n.js`), persisted,
  applied pre-paint. Brand names, icon ligatures, emails and codes are never
  translated; context-sensitive words (e.g. *Build*, *Launch*) use
  location-aware overrides.
- **Case studies & articles** — `data-modal` buttons clone hidden
  `.modal-src` sources into an accessible dialog (ESC/backdrop close, focus
  restore, in-modal `#contact` links close-then-jump).
- **Lightbox gallery** — work, ecosystem and about imagery opens fullscreen
  with prev/next, keyboard arrows, touch swipe and click-to-zoom.
- **Contact that works** — validated form opens WhatsApp with a prefilled
  enquiry; optional Formspree email backend and/or an Apps Script sheet
  webhook (rows + auto-reply email); floating WhatsApp bubble.
- **Packages & pricing** — fixed FCFA starting points per pillar with
  prefilled "get a quote" CTAs in the ecosystem, work, and pricing cards.
- **Book a call** — Calendly booking button (WhatsApp fallback when no
  Calendly URL is configured).
- **Structured data** — Organization + Service offers + FAQPage JSON-LD
  for rich search results.
- **WebP image pipeline** — every photo ships as responsive WebP
  (`-640`/`-1280` widths) with the original `.jfif` fallback via
  `<picture>`; the hero banner uses CSS `image-set()`.
- **Analytics & conversion events** — cookieless Plausible and/or GA4
  (both off by default). Auto-tracks WhatsApp/email clicks, bookings, quote
  CTAs/prefill, language switches, content opens, and `generate_lead`.
- **Client logo strip & outcome metrics** — sample wordmarks under the hero
  and per-case metric badges (both placeholders, marked `TODO`).
- **Airy vertical rhythm** — every section is separated by a responsive
  `--section-pad` clamp (plus matching scroll-margin) so the page breathes.
- **Scroll choreography** — directional/zoom reveals per section, eased
  parallax on the blueprint layer, progress hairline, back-to-top.
- **Animated counters, testimonials, FAQ accordion, legal modals.**

## Configuration (before going live)

1. **WhatsApp number** — `js/script.js`, `CONTACT.whatsapp`
   (country code + number, no `+`; currently a placeholder). It drives the
   form, the Contact button and the floating bubble. Same number appears in
   two `TODO` hrefs in `index.html`.
2. **Form email (optional)** — `js/script.js`, `CONTACT.formspree`: paste a
   [Formspree](https://formspree.io) endpoint ID to receive enquiries by
   email. Enable Formspree's *autoresponse* in the dashboard to auto-reply.
3. **Lead sheet + auto-reply (optional)** — `js/script.js`,
   `CONTACT.sheetWebhook`: paste a Google Apps Script web-app URL to log
   every lead and send an automatic reply. Deploy a script bound to a Sheet:

   ```js
   function doPost(e) {
     var d = JSON.parse(e.postData.contents);
     SpreadsheetApp.getActiveSheet().appendRow([
       new Date(), d.name, d.email, d.organization, d.need,
       d.budget, d.timeline, d.package, d.message, d.language, d.page
     ]);
     if (d.email) {
       MailApp.sendEmail(d.email, 'NLOGA — we received your request',
         'Hi ' + d.name + ',\n\nThank you for reaching out. We reply within one business day.\n\n— NLOGA Venture Studio');
     }
     return ContentService.createTextOutput('ok');
   }
   ```

   Deploy as **Web app**, access **Anyone**, and paste the `/exec` URL into
   `sheetWebhook`. The form posts via `sendBeacon` (no CORS issues) and the
   request also opens WhatsApp as before.
4. **Booking (optional)** — `js/script.js`, `CONTACT.calendly`: paste your
   full Calendly event URL. Until then the "Book a 30-min strategy call"
   button falls back to a prefilled WhatsApp message.
5. **Pricing** — package names and FCFA amounts live in the `#pricing`
   section of `index.html` (and the matching Service offers in the JSON-LD
   in `<head>`). Update both when rates change.
6. **Domain** — replace `https://nloga.com` in `sitemap.xml`, `robots.txt`,
   and make `og:image` / `twitter:image` absolute once deployed.
7. **Testimonials, logos & metrics** — testimonials and the client logo strip
   are sample placeholders marked `TODO` in `index.html`; per-case outcome
   badges are placeholders too. Swap in real quotes (EN + FR in
   `js/i18n.js`), logos, and verified metrics.
8. **Analytics (optional)** — `js/analytics.js`, `CONFIG`: set
   `plausible: 'your-domain.com'` (cookieless, no banner needed) and/or
   `ga4: 'G-XXXXXXXXXX'`. Leave both empty to ship with zero analytics.
   Emit custom events anywhere with `window.NLOGA_track('event', {…})`.
9. **Images** — regenerate WebP variants after replacing a photo. Example
   with [sharp](https://sharp.pixelplumbing.com) (dev-only, not shipped):
   `sharp(src).resize({ width: 1280 }).webp({ quality: 76 }).toFile(out)`.

10. **Payment number** — `js/script.js`, `CONTACT.paymentNumber`: the MoMo /
    Orange Money number shown (and copyable) in the registration confirmation
    panel after a student submits the course form.
11. **Supabase lead log (optional)** — `js/script.js`, `CONTACT.supabaseUrl`
    and `CONTACT.supabaseKey`: both forms log submissions to the
    `registrations` and `enquiries` tables via PostgREST. Empty the URL to
    disable logging.

## Run & deploy

```powershell
# preview locally (SW only registers over http, not file://)
npx serve .
```

Any static host works (GitHub Pages, Netlify, Vercel). No server code, no
secrets in the repo. After deploy: check `sw.js` updates propagate
(cache name `nloga-v6` — bump it when shipping shell changes).

## Translations

Add the English string to `index.html`, then its French twin to `FR_RAW`
in `js/i18n.js`. Keys match on normalized text (case/whitespace/punctuation
insensitive); hidden modal sources are translated too. Brand names, Material
Symbols ligatures, emails, numbers and codes are skipped by convention.
