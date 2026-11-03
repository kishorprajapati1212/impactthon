#!/usr/bin/env python3
"""
AttendX brand asset generator.

Writes every static brand file from one geometry + one colour set so the
favicon, app icons, OG image and the vector logo kit can never drift apart.

    python3 scripts/brand-assets.py          # from frontend/

Outputs
  public/favicon.svg, favicon.ico, apple-touch-icon.png,
  public/icon-192.png, icon-512.png, icon-maskable-512.png,
  public/og-image.png (1200x630), public/site.webmanifest
  ../brand/svg/*.svg   vector logos (mark, horizontal, stacked; light/dark)
  ../brand/png/*.png   Instagram profile 1080, reel end-card 1080x1920,
                       transparent horizontal logos, 1024 app icon

Requires Pillow. fontTools is optional (used to convert the Inter wordmark to
outlines so the SVG logos need no installed font). Inter TTFs are looked up in
scripts/brand-fonts/ and downloaded from Google Fonts if absent.

Geometry (viewBox 0 0 96 96) - measured from the Instagram profile picture
(frame side 90, stroke 11, overshoot 10, scan-line 47x9) and normalised:
  frame side 64 (stroke centre to centre), stroke 8, corner overshoot 7,
  scan-line 34x7 with fully rounded ends, centred.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]          # frontend/
REPO = ROOT.parent                                   # impactthon/
PUBLIC = ROOT / "public"
BRAND_DIR = REPO / "brand"
FONT_DIR = ROOT / "scripts" / "brand-fonts"

NAME = "AttendX"
TAGLINE = "Attendance, made simple."
URL_TEXT = "attendex12345.netlify.app"

C = {
    "navy": "#11172f",
    "navyDeep": "#090f22",
    "navyLight": "#1e2654",
    "ink": "#0a1248",
    "blue": "#0b4ff8",
    "indigo": "#5a65f1",
    "white": "#ffffff",
    "muted": "#aab3d6",
}

# ---------------------------------------------------------------- geometry --
FRAME = [(5, 12, 86, 8), (5, 76, 86, 8), (12, 5, 8, 86), (76, 5, 8, 86)]  # x y w h
DASH = (31, 44.5, 34, 7)                                                   # x y w h (r = h/2)


def svg_mark_group(frame_fill: str, dash_fill: str, transform: str | None = None) -> str:
    rects = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>' for x, y, w, h in FRAME)
    x, y, w, h = DASH
    g = (f'<g fill="{frame_fill}">{rects}</g>'
         f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h/2}" fill="{dash_fill}"/>')
    return f'<g transform="{transform}">{g}</g>' if transform else g


def draw_mark(img: Image.Image, cx: float, cy: float, unit: float, frame: str, dash: str) -> None:
    """Draw the mark centred on (cx, cy); `unit` = pixels per viewBox unit (96 units wide)."""
    d = ImageDraw.Draw(img)
    ox, oy = cx - 48 * unit, cy - 48 * unit
    for x, y, w, h in FRAME:
        d.rectangle([ox + x * unit, oy + y * unit, ox + (x + w) * unit, oy + (y + h) * unit], fill=frame)
    x, y, w, h = DASH
    d.rounded_rectangle([ox + x * unit, oy + y * unit, ox + (x + w) * unit, oy + (y + h) * unit],
                        radius=h * unit / 2, fill=dash)


# ------------------------------------------------------------------- fonts --
GF_CSS = "https://fonts.googleapis.com/css2?family=Inter:wght@{w}"


def font_path(weight: int) -> Path | None:
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    p = FONT_DIR / f"Inter-{weight}.ttf"
    if p.exists():
        return p
    try:  # Google Fonts serves TTF to a client without a user agent
        req = urllib.request.Request(GF_CSS.format(w=weight), headers={"User-Agent": ""})
        css = urllib.request.urlopen(req, timeout=20).read().decode()
        m = re.search(r"https://fonts\.gstatic\.com/[^)]+\.ttf", css)
        if m:
            urllib.request.urlretrieve(m.group(0), p)
            return p
    except Exception as e:  # offline → fall back below
        print(f"  (Inter {weight} not downloadable: {e}; using DejaVu Sans)")
    return None


def load_font(weight: int, size: int) -> ImageFont.FreeTypeFont:
    p = font_path(weight)
    if p:
        return ImageFont.truetype(str(p), size)
    fallback = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    return ImageFont.truetype(fallback, size) if os.path.exists(fallback) else ImageFont.load_default()


def text_width(font, text, tracking=0.0):
    return sum(font.getlength(ch) for ch in text) + tracking * (len(text) - 1)


def draw_text(img, xy, text, font, fill, tracking=0.0, spans=None):
    """Draw text char-by-char with tracking. spans: {index: colour} overrides."""
    d = ImageDraw.Draw(img)
    x, y = xy
    for i, ch in enumerate(text):
        d.text((x, y), ch, font=font, fill=(spans or {}).get(i, fill))
        x += font.getlength(ch) + tracking


# --------------------------------------------------------- text as SVG paths --
def text_svg_paths(text: str, weight: int, size_px: float, tracking_em: float):
    """Outline `text` in Inter <weight> as SVG path commands.
    Returns (list of (d, char), total_width) or (None, None) without fontTools."""
    p = font_path(weight)
    try:
        from fontTools.ttLib import TTFont
        from fontTools.pens.svgPathPen import SVGPathPen
        from fontTools.pens.transformPen import TransformPen
    except Exception:
        p = None
    if not p:
        return None, None
    tt = TTFont(str(p))
    upm = tt["head"].unitsPerEm
    cmap = tt.getBestCmap()
    glyphs = tt.getGlyphSet()
    hmtx = tt["hmtx"]
    scale = size_px / upm
    tracking = tracking_em * size_px
    x = 0.0
    out = []
    for ch in text:
        gname = cmap.get(ord(ch)) or cmap.get(ord(" "))
        pen = SVGPathPen(glyphs)
        # font units are y-up, SVG is y-down: flip; baseline at y = 0
        glyphs[gname].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
        out.append((pen.getCommands(), ch))
        x += hmtx[gname][0] * scale + tracking
    return out, x - tracking


def svg_wordmark(x0, baseline, size_px, ink, accent):
    """'AttendX' in Inter Black, tracking -2.5 % (Tailwind tracking-tight); X in the accent."""
    paths, width = text_svg_paths(NAME, 900, size_px, -0.025)
    if paths is None:
        return (f'<text x="{x0}" y="{baseline}" font-family="Inter, system-ui, sans-serif" font-weight="900" '
                f'font-size="{size_px}" letter-spacing="-0.025em" fill="{ink}">Attend<tspan fill="{accent}">X</tspan></text>'), size_px * 4.1
    body = "".join(f'<path fill="{accent if ch == "X" else ink}" d="{d}"/>' for d, ch in paths if d)
    return f'<g transform="translate({x0} {baseline})">{body}</g>', width


def svg_tagline(cx, baseline, size_px, fill):
    """Tagline in Inter SemiBold small caps, tracking 0.2 em, centred on cx."""
    txt = TAGLINE.upper()
    paths, width = text_svg_paths(txt, 600, size_px, 0.2)
    if paths is None:
        return (f'<text x="{cx}" y="{baseline}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" '
                f'font-weight="600" font-size="{size_px}" letter-spacing="0.2em" fill="{fill}">{txt}</text>')
    body = "".join(f'<path d="{d}"/>' for d, ch in paths if d)
    return f'<g fill="{fill}" transform="translate({cx - width / 2} {baseline})">{body}</g>'


# ------------------------------------------------------------- SVG writers --
def write(path: Path, content: str | bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    mode = "wb" if isinstance(content, bytes) else "w"
    with open(path, mode) as f:
        f.write(content)
    print("  wrote", path.relative_to(REPO))


def svg_doc(w, h, body, bg=None, title=f"{NAME} logo"):
    rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{rect}{body}</svg>\n')


def build_svgs():
    print("SVG")
    # favicon: tile + mark (hard-coded colours; no CSS)
    tile = f'<rect width="96" height="96" rx="22" fill="{C["navy"]}"/>' + svg_mark_group(C["white"], C["indigo"], "translate(15 15) scale(0.6875)")
    write(PUBLIC / "favicon.svg", svg_doc(96, 96, tile, title=f"{NAME} icon"))
    write(BRAND_DIR / "svg" / "attendx-mark-tile.svg", svg_doc(96, 96, tile, title=f"{NAME} app icon"))
    write(BRAND_DIR / "svg" / "attendx-mark-light.svg", svg_doc(96, 96, svg_mark_group(C["ink"], C["blue"]), title=f"{NAME} mark"))
    write(BRAND_DIR / "svg" / "attendx-mark-dark.svg", svg_doc(96, 96, svg_mark_group(C["white"], C["indigo"]), title=f"{NAME} mark"))

    # horizontal lock-up: mark 96 tall, wordmark cap-height ≈ 0.52 of mark
    for variant, ink, accent, bg in (("light", C["ink"], C["blue"], None), ("dark", C["white"], C["indigo"], None)):
        size = 74
        wm, ww = svg_wordmark(112, 74, size, ink, accent)
        w = int(112 + ww + 8)
        body = svg_mark_group(ink, accent) + wm
        write(BRAND_DIR / "svg" / f"attendx-logo-horizontal-{variant}.svg", svg_doc(w, 96, body, bg))

    # stacked lock-up (profile-picture arrangement) with tagline
    for variant, ink, accent, bg in (("light", C["ink"], C["blue"], None), ("dark", C["white"], C["indigo"], C["navy"])):
        W, H = 480, 420
        size = 92
        wm, ww = svg_wordmark(0, 0, size, ink, accent)
        wm = f'<g transform="translate({(W - ww) / 2} 300)">{wm}</g>'
        mark = f'<g transform="translate({(W - 2 * 96) / 2} 30) scale(2)">{svg_mark_group(ink, accent)}</g>'
        tag = svg_tagline(W / 2, 356, 19, C["muted"] if variant == "dark" else "#5b6478")
        write(BRAND_DIR / "svg" / f"attendx-logo-stacked-{variant}.svg", svg_doc(W, H, mark + wm + tag, bg))


# ------------------------------------------------------------- PNG writers --
def tile_png(size: int, rounded: bool, mark_ratio: float, bg=C["navy"]) -> Image.Image:
    """Navy tile with white mark. mark_ratio = mark extent / tile size."""
    ss = 4
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=S * 0.229, fill=bg)
    else:
        d.rectangle([0, 0, S, S], fill=bg)
    unit = S * mark_ratio / 86  # mark extent is 86 units (5..91)
    draw_mark(img, S / 2, S / 2, unit, C["white"], C["indigo"])
    return img.resize((size, size), Image.LANCZOS)


def build_icons():
    print("Icons")
    write(PUBLIC / "icon-192.png", b"")
    tile_png(192, True, 0.62).save(PUBLIC / "icon-192.png")
    tile_png(512, True, 0.62).save(PUBLIC / "icon-512.png")
    tile_png(512, False, 0.50).save(PUBLIC / "icon-maskable-512.png")      # inside the 80% safe zone
    tile_png(180, False, 0.62).save(PUBLIC / "apple-touch-icon.png")       # iOS applies its own corner mask
    ico = tile_png(256, True, 0.66)
    ico.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("  wrote public/icon-512.png, icon-maskable-512.png, apple-touch-icon.png, favicon.ico")
    tile_png(1024, True, 0.62).save(BRAND_DIR / "png" / "attendx-app-icon-1024.png")
    print("  wrote brand/png/attendx-app-icon-1024.png")


def vertical_gradient(w, h, top, bottom):
    img = Image.new("RGB", (w, h), top)
    t = Image.new("RGB", (1, 1), top).getpixel((0, 0))
    b = Image.new("RGB", (1, 1), bottom).getpixel((0, 0))
    px = img.load()
    for y in range(h):
        k = y / max(h - 1, 1)
        col = tuple(int(t[i] + (b[i] - t[i]) * k) for i in range(3))
        for x in range(w):
            px[x, y] = col
    return img


def wordmark_png(img, cx, baseline_top, size, ink, accent, center=True, x0=None):
    f = load_font(900, size)
    tracking = -0.025 * size
    w = text_width(f, NAME, tracking)
    x = (cx - w / 2) if center else x0
    draw_text(img, (x, baseline_top), NAME, f, ink, tracking, spans={len(NAME) - 1: accent})
    return w


def tagline_png(img, cx, y, size, fill):
    f = load_font(600, size)
    tracking = 0.2 * size
    txt = TAGLINE.upper()
    w = text_width(f, txt, tracking)
    draw_text(img, (cx - w / 2, y), txt, f, fill, tracking)


def build_og():
    print("OG image")
    W, H = 1200, 630
    img = vertical_gradient(W, H, C["navy"], C["navyLight"]).convert("RGBA")
    # soft indigo glow bottom-right (as in the reels)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W * 0.55, H * 0.45, W * 1.25, H * 1.4], fill=(90, 101, 241, 70))
    from PIL import ImageFilter
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img = Image.alpha_composite(img, glow)
    # left: mark + wordmark + tagline
    draw_mark(img, 150, 232, 1.9, C["white"], C["indigo"])
    f = load_font(900, 96)
    draw_text(img, (262, 172), NAME, f, C["white"], -2.4, spans={len(NAME) - 1: C["indigo"]})
    f2 = load_font(600, 22)
    draw_text(img, (266, 292), TAGLINE.upper(), f2, C["muted"], 4.4)
    # bottom: positioning line + URL
    f3 = load_font(600, 30)
    ImageDraw.Draw(img).text((70, 440), "QR code attendance system for colleges & schools", font=f3, fill="#e6e9f7")
    f4 = load_font(600, 24)
    ImageDraw.Draw(img).text((70, 492), "Rotating QR + GPS geofence · stops proxy attendance · free", font=f4, fill=C["muted"])
    pill_w = text_width(f4, URL_TEXT) + 44
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([70, 548, 70 + pill_w, 548 + 44], radius=22, fill=C["indigo"])
    d.text((92, 556), URL_TEXT, font=f4, fill=C["white"])
    img.convert("RGB").save(PUBLIC / "og-image.png", optimize=True)
    print("  wrote public/og-image.png")


def build_promo_pngs():
    print("Promo PNGs")
    # Instagram profile picture 1080 - same arrangement as the current avatar
    S = 1080
    img = vertical_gradient(S, S, C["navy"], C["navyLight"]).convert("RGBA")
    draw_mark(img, S / 2, 400, 4.9, C["white"], C["indigo"])
    wordmark_png(img, S / 2, 640, 150, C["white"], C["indigo"])
    tagline_png(img, S / 2, 830, 36, C["muted"])
    img.convert("RGB").save(BRAND_DIR / "png" / "attendx-profile-1080.png", optimize=True)
    # Reel / story end-card 1080x1920
    W, H = 1080, 1920
    img = vertical_gradient(W, H, C["navy"], C["navyLight"]).convert("RGBA")
    draw_mark(img, W / 2, 700, 5.2, C["white"], C["indigo"])
    wordmark_png(img, W / 2, 960, 160, C["white"], C["indigo"])
    tagline_png(img, W / 2, 1165, 38, C["muted"])
    f = load_font(600, 40)
    pill_w = text_width(f, URL_TEXT) + 80
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([(W - pill_w) / 2, 1320, (W + pill_w) / 2, 1320 + 84], radius=42, fill=C["indigo"])
    d.text(((W - text_width(f, URL_TEXT)) / 2, 1338), URL_TEXT, font=f, fill=C["white"])
    f2 = load_font(600, 28)
    s = "NO REGISTER. NO PROXY. NO HARDWARE."
    draw_text(img, ((W - text_width(f2, s, 5)) / 2, 1460), s, f2, C["muted"], 5)
    img.convert("RGB").save(BRAND_DIR / "png" / "attendx-endcard-1080x1920.png", optimize=True)
    # Transparent horizontal logos (light + dark), 2400 px wide
    for variant, ink, accent in (("light", C["ink"], C["blue"]), ("dark", C["white"], C["indigo"])):
        size = 300
        f9 = load_font(900, size)
        tracking = -0.025 * size
        ww = text_width(f9, NAME, tracking)
        mark_px = 400
        W = int(mark_px + 60 + ww + 20)
        img = Image.new("RGBA", (W, 400), (0, 0, 0, 0))
        draw_mark(img, 200, 200, mark_px / 96, ink, accent)
        asc, desc = f9.getmetrics()
        draw_text(img, (mark_px + 50, 200 - asc * 0.72), NAME, f9, ink, tracking, spans={len(NAME) - 1: accent})
        img.save(BRAND_DIR / "png" / f"attendx-logo-horizontal-{variant}.png", optimize=True)
    print("  wrote brand/png/attendx-profile-1080.png, attendx-endcard-1080x1920.png, attendx-logo-horizontal-{light,dark}.png")


def build_manifest():
    manifest = {
        "name": "AttendX - QR attendance",
        "short_name": "AttendX",
        "description": "QR code + GPS attendance system for colleges and schools.",
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "background_color": C["white"],
        "theme_color": C["navy"],
        "icons": [
            {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    write(PUBLIC / "site.webmanifest", json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    PUBLIC.mkdir(exist_ok=True)
    (BRAND_DIR / "png").mkdir(parents=True, exist_ok=True)
    build_svgs()
    build_icons()
    build_og()
    build_promo_pngs()
    build_manifest()
    print("done")
