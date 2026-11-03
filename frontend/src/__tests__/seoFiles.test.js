import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildSitemap, buildRobots, siteUrl, DEFAULT_SITE_URL, PUBLIC_PAGES, PRIVATE_PREFIXES } from "../../scripts/seo.mjs";

/**
 * Search Console said "Sitemap is HTML" because every path of the SPA answered
 * with index.html. These files are real XML / text with ABSOLUTE urls.
 */
describe("sitemap.xml / robots.txt generator", () => {
  it("sitemap is XML (not HTML) with absolute URLs for the public pages only", () => {
    const xml = buildSitemap("https://attendex12345.netlify.app", PUBLIC_PAGES, "2026-11-03");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://attendex12345.netlify.app/</loc>");
    expect(xml).toContain("<loc>https://attendex12345.netlify.app/login</loc>");
    expect(xml).not.toMatch(/<html|<loc>\//i);
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/student");
    expect(xml).toContain("<lastmod>2026-11-03</lastmod>");
  });

  it("robots.txt allows the public site, blocks dashboards + API and points to the sitemap", () => {
    const txt = buildRobots("https://example.edu");
    expect(txt).toContain("User-agent: *");
    expect(txt).toContain("Allow: /");
    for (const p of PRIVATE_PREFIXES) expect(txt).toContain(`Disallow: ${p}`);
    expect(txt.trim().endsWith("Sitemap: https://example.edu/sitemap.xml")).toBe(true);
  });

  it("site URL: SITE_URL wins, then Netlify's URL, then the default; trailing slash removed", () => {
    expect(siteUrl({})).toBe(DEFAULT_SITE_URL);
    expect(siteUrl({ URL: "https://preview--x.netlify.app/" })).toBe("https://preview--x.netlify.app");
    expect(siteUrl({ URL: "https://x.netlify.app", SITE_URL: "https://attendx.college.edu/" })).toBe("https://attendx.college.edu");
  });
});

/**
 * The owner verified the site in Google Search Console with an HTML meta tag.
 * It was lost once when the landing page was rebuilt; this test makes sure the
 * exact tag ships in every build from now on (index.html is the template Vite
 * copies into dist/index.html).
 */
describe("Google Search Console verification tag", () => {
  const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
  const TAG = '<meta name="google-site-verification" content="IzqgkAe2W8AdJsVxSpHdcHXkEOg9q3B4vE13mn-vbR4" />';

  it("index.html carries the exact google-site-verification meta tag inside <head>", () => {
    expect(html).toContain(TAG);
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toContain(TAG);
    expect(html.match(/google-site-verification/g)).toHaveLength(1);
  });

  it("the tag survives a production build (dist/index.html, when present)", () => {
    const dist = resolve(__dirname, "../../dist/index.html");
    if (!existsSync(dist)) return; // not built in this environment
    expect(readFileSync(dist, "utf8")).toContain(TAG);
  });

  it("no em/en dashes in visitor-facing text (title, descriptions, structured data)", () => {
    expect(html).not.toMatch(/[\u2013\u2014]/);
    expect(html).toMatch(/<title>AttendX \| QR Code Attendance System<\/title>/);
  });
});
