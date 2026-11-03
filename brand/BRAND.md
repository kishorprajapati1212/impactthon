# AttendX brand kit

The identity is taken from the Instagram promotion that is already running
(profile picture, 8 reels, 3 carousels). Everything in this folder and in the
website reproduces it exactly, so a visitor who comes from a reel recognises
the site instantly.

## The mark

A QR **viewfinder square** whose four strokes overshoot the corners (crop-mark
style) with a short **rounded scan-line** through the centre.

Proportions (measured from the profile picture and normalised to a 96-unit
box): frame side 64 (stroke centre to centre), stroke 8, corner overshoot 7,
scan-line 34 × 7 with fully rounded ends, centred.

## Colours

| Token  | Hex       | Where it comes from                                   | Use                                              |
|--------|-----------|-------------------------------------------------------|--------------------------------------------------|
| navy   | `#11172f` | reel background, profile picture                      | app-icon tile, dark surfaces (gradient to `#1e2654`) |
| indigo | `#5a65f1` | scan-line in the mark, pills in the reels             | scan-line + "X" on **dark** surfaces             |
| blue   | `#0b4ff8` | the "X" in the carousel wordmark                      | scan-line + "X" on **white** surfaces            |
| ink    | `#0a1248` | "Attend" in the carousels                             | wordmark on white                                |
| white  | `#ffffff` |                                                       | wordmark + frame on dark                         |

Rule of thumb: **white surface → blue accent, dark surface → indigo accent.**
That is exactly how the carousels (white) and reels (navy) differ, and the
website follows it automatically (light mode / dark mode).

The website's UI accent (buttons, links) deliberately stays **cyan** - the
brand colours are used for the logo only.

## Wordmark and tagline

- Wordmark: `AttendX` in Inter Black, tracking −2.5 %, only the **X** coloured.
- Tagline: **Attendance, made simple.** - set in small caps with wide tracking
  under the stacked logo (login page, footer, profile picture).

## Files

```
brand/svg/attendx-mark-light.svg          mark, ink + blue, transparent   (white backgrounds)
brand/svg/attendx-mark-dark.svg           mark, white + indigo, transparent (dark backgrounds)
brand/svg/attendx-mark-tile.svg           app icon: navy tile + white mark (= favicon.svg)
brand/svg/attendx-logo-horizontal-*.svg   mark + wordmark, light / dark (wordmark is outlined - no font needed)
brand/svg/attendx-logo-stacked-*.svg      mark over wordmark over tagline (profile-picture arrangement)
brand/png/attendx-profile-1080.png        Instagram / WhatsApp profile picture
brand/png/attendx-endcard-1080x1920.png   reel / story end-card with the site URL
brand/png/attendx-logo-horizontal-*.png   transparent 2400-px logos for thumbnails and slides
brand/png/attendx-app-icon-1024.png       store / Play-Console sized icon
```

On the website (`frontend/public/`): `favicon.svg`, `favicon.ico` (16/32/48),
`apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `site.webmanifest` (installable as an app on
students' phones with the brand icon), `og-image.png` (1200 × 630 link preview).

In code: `frontend/src/brand.js` (constants), `components/Brand/BrandMark.jsx`
(SVG mark; `tone="auto" | "tile" | "onDark"`), `components/Brand/BrandLogo.jsx`
(lock-up; `size`, `stacked`, `tagline`, `as`). Tailwind exposes the colours as
`brand-navy`, `brand-ink`, `brand-blue`, `brand-indigo`.

## Regenerating

```bash
cd frontend && python3 scripts/brand-assets.py
```

Needs Pillow (and fontTools for the outlined SVG wordmarks). Inter TTFs are
downloaded into `scripts/brand-fonts/` on first run (ignored by git); without
internet the script falls back to DejaVu Sans for the PNGs.

## Clear space and minimum size

Keep clear space of at least one stroke-overshoot (7 / 96 of the mark width)
on every side. Do not use the mark smaller than 16 px - the favicon is the
floor. Never recolour the scan-line to cyan or change the frame proportions.

## Social profiles

The footer Instagram link and the `sameAs` entry in the structured data are
left empty on purpose. To publish them: set `BRAND.social.instagram` in
`frontend/src/brand.js` and add `"sameAs": ["<url>"]` to the Organization
block in `frontend/index.html`.
