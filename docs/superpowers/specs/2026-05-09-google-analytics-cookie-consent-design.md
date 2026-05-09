# Google Analytics + Cookie Consent — Design

**Date:** 2026-05-09
**Status:** Approved (for implementation)
**Measurement ID:** `G-E7K3YV5K2Y`

## Goal

Add Google Analytics 4 pageview tracking across both web surfaces of MentiSphere (MediaWiki at `/` and the Next.js chat service at `/chat`), gated by an explicit-consent cookie banner that satisfies GDPR.

## Approach

Use **vanilla-cookieconsent v3** (orestbida/cookieconsent, MIT, ~22KB) together with **Google Consent Mode v2**:

1. On every page, before any GA call, set `gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ... })`.
2. Load the `gtag.js` snippet unconditionally — Consent Mode keeps it cookie-less until consent.
3. When the user accepts the *analytics* category, call `gtag('consent', 'update', { analytics_storage: 'granted' })`. GA flushes the queued pageview.
4. The library persists the choice in `cc_cookie`. Reload reads it and re-applies consent state without re-prompting.

This pattern is the GA4-recommended one: GA loads everywhere, but writes nothing until allowed.

## Cookie categories

| Category   | Locked? | Cookies covered            |
|------------|---------|----------------------------|
| Necessary  | yes     | MediaWiki session, CSRF    |
| Analytics  | no      | `_ga`, `_ga_*` (GA4)       |

No advertising, personalization, or functional categories — the site has none of those.

## Integration points

### 1. MediaWiki

Extend the existing `BeforePageDisplay` hook in `mediawiki/LocalSettings.php` (the same hook already wires Google Fonts + Common.css). The hook injects:

- `<link rel="stylesheet" href=".../cookieconsent.css">` (CDN)
- `<script defer src=".../cookieconsent.umd.js">` (CDN)
- Inline `<script>` that:
  - Runs `gtag('consent', 'default', { ...denied })`
  - Loads `gtag.js?id=G-E7K3YV5K2Y`
  - Calls `CookieConsent.run({ ...config })` with the shared config

### 2. Next.js chat service

Add a single client component `chat-service/src/components/CookieConsent.tsx`. It:

- Imports `vanilla-cookieconsent` from npm (`"vanilla-cookieconsent": "^3.x"`).
- Imports the library's CSS.
- Runs the same consent-default + gtag.js + `CookieConsent.run(...)` setup inside `useEffect`.

Mounted once in `chat-service/src/app/layout.tsx` so it covers `/chat` and any future Next.js pages.

### 3. Shared config

The cookieconsent `run()` config is identical across both surfaces (categories, copy, GA callback). Duplication is fine — it's ~30 lines and the two surfaces use different runtimes (PHP-emitted inline JS vs TS module). No build-time sharing.

## Files touched

- `mediawiki/LocalSettings.php` — extend the `BeforePageDisplay` hook (~30 lines added)
- `chat-service/src/components/CookieConsent.tsx` — new client component
- `chat-service/src/app/layout.tsx` — mount the component
- `chat-service/package.json` — add `vanilla-cookieconsent` dep

## Out of scope

- Granular ad / personalization consent (no ads on the site)
- Server-side consent logging (the cookie is the source of truth)
- Self-hosting cookieconsent assets (CDN is fine for MVP)
- GA event tracking beyond automatic pageviews
- Tracking inside the embedded chat widget on agent pages — already covered, since the widget loads inside MediaWiki pages where GA is injected
