/**
 * Bundles preview/main.tsx, the compiled Tailwind CSS and the seed art into a
 * single self-contained HTML page for sharing a review link.
 * Usage: npm run preview:build -- <output.html>
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const out = resolve(process.argv[2] ?? join(root, "preview-dist", "press-play-preview.html"));
const tmp = mkdtempSync(join(tmpdir(), "pp-preview-"));

// 1. Tailwind CSS (same source file as the site)
const cssFile = join(tmp, "app.css");
execFileSync(join(root, "node_modules/.bin/tailwindcss"), ["-i", "app/globals.css", "-o", cssFile, "--minify"], { cwd: root, stdio: "inherit" });
const css = readFileSync(cssFile, "utf8");

// 2. JS bundle, with next/* swapped for tiny shims
const result = await build({
  entryPoints: [join(root, "preview/main.tsx")],
  bundle: true,
  minify: process.env.PREVIEW_DEBUG !== "1",
  write: false,
  format: "iife",
  target: ["safari15", "chrome100"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "next/link": join(root, "preview/shims/next-link.tsx"),
    "next/navigation": join(root, "preview/shims/next-navigation.ts"),
  },
  tsconfig: join(root, "tsconfig.json"),
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

// 3. Seed art as data URIs
const art = {};
for (const f of readdirSync(join(root, "public/seed"))) {
  const svg = readFileSync(join(root, "public/seed", f));
  art[`/seed/${f}`] = `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

const html = `<title>Press Play Media</title>
<meta name="theme-color" content="#120d1f">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&family=Space+Grotesk:wght@400;500;600;700&family=VT323&display=swap">
<style>
:root{--font-bungee:"Bungee",Impact,"Arial Black",sans-serif;--font-vt323:"VT323",ui-monospace,Menlo,monospace;--font-grotesk:"Space Grotesk",system-ui,sans-serif;color-scheme:dark}
${css}
</style>
<div id="root"></div>
<script>window.__ART__=${JSON.stringify(art)};</script>
<script>${js}</script>
`;
writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
