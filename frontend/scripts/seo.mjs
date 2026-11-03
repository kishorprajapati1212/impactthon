/**
 * SEO files for the static host (Netlify, Vercel, nginx…), written into
 * public/ before every `npm run build`:
 *
 *   public/sitemap.xml - the PUBLIC pages only (home, login)
 *   public/robots.txt - allow everything public, keep crawlers out of the
 *                          dashboards and the API, point to the sitemap
 *
 * Why a generator and not two hand-written files: the URLs must be ABSOLUTE
 * (Google rejects relative ones) and they change with the domain. Set
 *   SITE_URL=https://your-domain.example      (Netlify: Site configuration →
 *   Environment variables) and rebuild. Default: the current Netlify site.
 *
 * Why this fixes "Sitemap is HTML" in Search Console: a single-page app
 * answers EVERY path with index.html (the SPA redirect), so /home or a
 * missing /sitemap.xml returned the landing page. Real files in public/ are
 * served before the redirect rule, so /sitemap.xml is now XML.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SITE_URL = "https://attendex12345.netlify.app";

export const PUBLIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/login", changefreq: "monthly", priority: "0.3" },
];

// Everything behind a login, plus the API alias. Crawlers that land here are
// redirected to /login anyway; this keeps them from wasting crawl budget.
export const PRIVATE_PREFIXES = ["/admin", "/faculty", "/student", "/register", "/api/"];

export function siteUrl(env = process.env) {
  return (env.SITE_URL || env.VITE_SITE_URL || env.URL /* Netlify sets URL */ || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

export function buildSitemap(base, pages = PUBLIC_PAGES, lastmod = new Date().toISOString().slice(0, 10)) {
  const urls = pages
    .map(
      (p) => `  <url>
    <loc>${base}${p.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function buildRobots(base, privatePrefixes = PRIVATE_PREFIXES) {
  return `# AttendX - public pages are crawlable; dashboards and the API are not.
User-agent: *
Allow: /
${privatePrefixes.map((p) => `Disallow: ${p}`).join("\n")}

Sitemap: ${base}/sitemap.xml
`;
}

export function writeSeoFiles(publicDir, base = siteUrl()) {
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(resolve(publicDir, "sitemap.xml"), buildSitemap(base));
  writeFileSync(resolve(publicDir, "robots.txt"), buildRobots(base));
  return base;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));
  const base = writeSeoFiles(resolve(here, "../public"));
  console.log(`[seo] sitemap.xml + robots.txt written for ${base} (override with SITE_URL=…)`);
}
