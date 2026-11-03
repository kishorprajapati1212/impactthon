# AttendX — keyword plan and how to use it

This is the keyword set the website is now written around (title, meta
description, H1/H2s, intro copy, FAQ and structured data). Keep this file in
sync when you change the landing page.

## 1. One thing to know about Google Search Console first

**You cannot "add keywords" to Search Console.** It has no keyword field —
Google decides what you rank for from your page text, titles and links.
Search Console only *reports* the queries you already appear for.
So the keywords below go in two places:

1. **The website** — done in v3.6.4 (see §4 for exactly where each one sits).
2. **Search Console → Performance → Queries** — use them as *filters* to
   track progress: `Performance` → `+ New` → `Query` → `Queries containing`
   → e.g. `qr attendance`. Export the table weekly and watch impressions →
   clicks → average position.

If you ever run ads, the same list is what you paste into Google Ads /
Keyword Planner (Keyword Planner also shows real monthly volumes for India —
use it to re-rank this list; the priorities below are editorial, not volumes).

## 2. Primary keywords (the page is optimised for these)

| # | Keyword | Intent | Where it is on the site |
|---|---|---|---|
| 1 | **QR code attendance system** | commercial | `<title>`, meta description, hero eyebrow, H1 ("QR attendance…"), intro, FAQ 1, JSON-LD |
| 2 | **QR attendance system for colleges** | commercial | `<title>` ("…for Colleges & Schools"), hero eyebrow, intro, CTA H2 |
| 3 | **student attendance management system** | commercial | hero paragraph, intro, WebSite JSON-LD keywords |
| 4 | **GPS attendance system / geofence attendance** | commercial | meta description, features ("GPS Geofence Verification"), FAQ 2, intro |
| 5 | **proxy attendance** (stop / prevent proxy attendance) | problem | H1 ("without proxies"), meta description, FAQ 2, intro |
| 6 | **attendance app for college** | commercial | hero paragraph ("dashboards for admin, faculty and students"), FAQ 5 (no app install) |

## 3. Secondary and long-tail keywords (FAQ, features, future pages)

| Keyword | Where / what to do |
|---|---|
| smart attendance system | features H2 context, meta keywords |
| online attendance system for students | FAQ 5 ("web app… no app install") |
| attendance tracking software for schools | intro ("schools and coaching institutes"), FAQ 4 |
| attendance system without biometric / biometric alternative | FAQ 3, features "Zero Hardware" |
| faculty attendance app / teacher attendance app | Roles section "For Faculty" |
| attendance report Excel / attendance sheet download | features "One-click Excel Reports", FAQ 7 |
| 75% attendance rule / attendance below 75% | admin report copy, FAQ 7 — good topic for a blog post |
| college attendance app India | intro ("in India and beyond"), `og:locale en_IN` |
| mentor student attendance tracking | Roles "For Faculty" (mentees) — unique to AttendX, low competition |
| how to stop proxy attendance in college | FAQ 2 — write a 600-word article with this exact title |
| QR code attendance system project / open source attendance system | GitHub README + a "Developers" paragraph (students search this a lot) |
| AttendX, AttendX login, AttendX attendance | brand — title suffix, Organization JSON-LD, login page title |

## 4. What changed on the site (v3.6.4)

- **Title** (58 chars, keyword first, brand last):
  `QR Code Attendance System for Colleges & Schools | AttendX`
- **Meta description** (159 chars):
  `Free QR code attendance system for colleges & schools. Rotating QR + GPS geofence stops proxy attendance; admin, faculty and student dashboards; Excel reports.`
- **Hero eyebrow**: "QR Code Attendance System for Colleges & Schools"
  **H1**: "QR attendance without proxies, paper or queues" (same design).
- **Section H2s**: "Everything a college attendance system needs, in one place" ·
  "How QR + GPS attendance works: four steps, thirty seconds" ·
  "One attendance system, three role-based dashboards" ·
  "Ready to make college attendance automatic?"
- **Intro paragraph** rewritten with keywords 1–6 (still one short paragraph).
- **FAQ**: 8 questions (added "schools and coaching institutes", "no app
  install", biometric/RFID comparison, proxy wording); the FAQ JSON-LD mirrors
  the visible list exactly (Google requires that).
- **Structured data**: SoftwareApplication (+keywords, audience), FAQPage,
  Organization + WebSite — all with absolute URLs from `SITE_URL`.
- **Login page** title: "Login · AttendX QR Attendance System".
- Dashboards remain `noindex` / disallowed — only `/` and `/login` are meant to rank.

## 5. Weekly routine (15 minutes)

1. Search Console → Performance → filter `Query contains "attendance"` →
   note impressions and average position for the §2 keywords.
2. Pages report: `/` must be *Indexed*. If a dashboard URL shows up, it is
   blocked by robots.txt — expected.
3. Any query with impressions but position 11–30 → add one sentence using
   that exact phrase to the FAQ or intro (then redeploy).
4. Once a month: publish one article page (ideas in §3: "how to stop proxy
   attendance in college", "QR vs biometric attendance cost", "75 % attendance
   rule explained"). New pages must be added to `frontend/scripts/seo.mjs`
   → `PUBLIC_PAGES` so they enter the sitemap.

## 6. Things that outrank any keyword work

- A **custom domain** with the brand in it (`attendx.in`, `attendx.yourcollege.edu`).
- **Links**: college website footer, GitHub README, LinkedIn project post,
  hackathon/Devfolio page, a short YouTube demo with the URL in the description.
- **Speed and stability**: Netlify static + the no-cache `index.html` header
  already set; keep images small.
- **Real usage**: Google favours sites people return to — the login page
  traffic from your own students counts.
