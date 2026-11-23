/**
 * Generates placeholder front/back/spine art for the sample inventory.
 * Run with: npm run seed:art   (writes to public/seed/)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SEED_ITEMS, type SeedItem } from "../data/seed.ts";

const OUT = join(import.meta.dirname, "..", "public", "seed");
mkdirSync(OUT, { recursive: true });

// Case proportions * 4 (see CASE_DIMENSIONS in lib/types.ts)
const SIZE = {
  vhs: { w: 420, h: 760, d: 104 },
  cassette: { w: 280, h: 436, d: 68 },
  cd: { w: 568, h: 500, d: 40 },
} as const;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;").replace(/"/g, "&quot;");

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function rng(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function wrap(text: string, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      lines.push(line.trim());
      line = w;
    } else line += " " + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const ink = (bg: string) => (luminance(bg) > 0.6 ? "#1a1423" : "#fdf6e3");

/** A few original retro motifs, picked per item. */
function motif(item: SeedItem, x: number, y: number, w: number, h: number) {
  const [bg, ac] = item.palette;
  const r = rng(hash(item.slug));
  const kind = hash(item.slug) % 4;
  const cx = x + w / 2;
  const fg = ink(bg);
  if (kind === 0) {
    // sunset with horizon stripes + perspective grid
    const sunR = w * 0.32;
    const sy = y + h * 0.52;
    let s = `<defs><clipPath id="sun"><circle cx="${cx}" cy="${sy}" r="${sunR}"/></clipPath></defs>`;
    s += `<circle cx="${cx}" cy="${sy}" r="${sunR}" fill="${ac}"/>`;
    for (let i = 0; i < 6; i++) {
      const yy = sy + i * sunR * 0.17;
      s += `<rect clip-path="url(#sun)" x="${cx - sunR}" y="${yy}" width="${sunR * 2}" height="${3 + i * 2}" fill="${bg}"/>`;
    }
    const gy = sy + sunR * 0.05;
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      s += `<line x1="${x}" y1="${gy + (y + h - gy) * t * t}" x2="${x + w}" y2="${gy + (y + h - gy) * t * t}" stroke="${ac}" stroke-opacity=".55" stroke-width="2"/>`;
    }
    for (let i = -6; i <= 6; i++) {
      s += `<line x1="${cx + i * 8}" y1="${gy}" x2="${cx + i * w * 0.22}" y2="${y + h}" stroke="${ac}" stroke-opacity=".55" stroke-width="2"/>`;
    }
    return s;
  }
  if (kind === 1) {
    // bold diagonal speed stripes
    let s = "";
    const cols = [ac, fg, ac];
    for (let i = 0; i < 3; i++) {
      const off = i * h * 0.09;
      s += `<polygon points="${x},${y + h * 0.55 + off} ${x + w},${y + h * 0.25 + off} ${x + w},${y + h * 0.31 + off} ${x},${y + h * 0.61 + off}" fill="${cols[i]}" opacity="${1 - i * 0.25}"/>`;
    }
    for (let i = 0; i < 18; i++) {
      s += `<circle cx="${x + r() * w}" cy="${y + r() * h}" r="${1 + r() * 3}" fill="${fg}" opacity=".7"/>`;
    }
    return s;
  }
  if (kind === 2) {
    // memphis confetti
    let s = "";
    for (let i = 0; i < 16; i++) {
      const px = x + r() * w;
      const py = y + r() * h;
      const sz = 10 + r() * w * 0.12;
      const c = r() > 0.5 ? ac : fg;
      const shape = Math.floor(r() * 3);
      if (shape === 0) s += `<circle cx="${px}" cy="${py}" r="${sz / 2}" fill="none" stroke="${c}" stroke-width="5"/>`;
      else if (shape === 1)
        s += `<polygon points="${px},${py - sz / 2} ${px + sz / 2},${py + sz / 2} ${px - sz / 2},${py + sz / 2}" fill="${c}"/>`;
      else s += `<path d="M${px - sz} ${py} q ${sz / 2} -${sz / 2} ${sz} 0 t ${sz} 0" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
    }
    return s;
  }
  // concentric rings / vinyl ripple
  let s = "";
  for (let i = 8; i > 0; i--) {
    s += `<circle cx="${cx}" cy="${y + h * 0.5}" r="${(w * 0.42 * i) / 8}" fill="${i % 2 ? ac : bg}" opacity="${0.35 + i * 0.07}"/>`;
  }
  return s;
}

function barcode(x: number, y: number, seed: string) {
  const r = rng(hash(seed + "bc"));
  let s = `<rect x="${x - 6}" y="${y - 6}" width="112" height="58" fill="#fff"/>`;
  let px = x;
  while (px < x + 100) {
    const bw = 1 + Math.floor(r() * 3);
    if (r() > 0.4) s += `<rect x="${px}" y="${y}" width="${bw}" height="40" fill="#000"/>`;
    px += bw + 1;
  }
  return s;
}

const FONT = `font-family="Impact, 'Arial Black', Helvetica, sans-serif"`;
const BODY = `font-family="Helvetica, Arial, sans-serif"`;

function svg(w: number, h: number, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

function vhs(item: SeedItem) {
  const { w, h, d } = SIZE.vhs;
  const [bg, ac] = item.palette;
  const fg = ink(bg);
  const titleLines = wrap(item.title.toUpperCase(), 12);
  const front = svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
      motif(item, 0, 140, w, 460) +
      `<rect x="0" y="0" width="${w}" height="54" fill="${ac}"/>` +
      `<text x="20" y="36" ${FONT} font-size="22" fill="${ink(ac)}" letter-spacing="2">${esc(item.creator.toUpperCase())}</text>` +
      titleLines
        .map(
          (l, i) =>
            `<text x="${w / 2}" y="${110 + i * 56}" text-anchor="middle" ${FONT} font-size="52" fill="${fg}" stroke="${bg}" stroke-width="2" paint-order="stroke">${esc(l)}</text>`,
        )
        .join("") +
      `<rect x="0" y="${h - 110}" width="${w}" height="110" fill="#000" opacity=".55"/>` +
      `<text x="20" y="${h - 66}" ${BODY} font-size="20" font-weight="bold" fill="#fff" font-style="italic">${esc(item.genres[0].toUpperCase())}</text>` +
      `<rect x="${w - 120}" y="${h - 92}" width="100" height="36" rx="4" fill="none" stroke="#fff" stroke-width="2"/>` +
      `<text x="${w - 70}" y="${h - 67}" text-anchor="middle" ${BODY} font-size="16" font-weight="bold" fill="#fff">HI-FI STEREO</text>` +
      `<text x="20" y="${h - 30}" ${BODY} font-size="16" fill="#fff" opacity=".8">VHS · ${item.releaseYear}</text>`,
  );
  const blurb = wrap(item.blurb, 30);
  const back = svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
      `<rect x="20" y="24" width="${w - 40}" height="64" fill="${ac}"/>` +
      `<text x="${w / 2}" y="68" text-anchor="middle" ${FONT} font-size="34" fill="${ink(ac)}">${esc(item.title.toUpperCase())}</text>` +
      [0, 1, 2]
        .map(
          (i) =>
            `<g transform="translate(${30 + i * 125} 110)"><rect width="110" height="80" fill="#000"/>${motif({ ...item, slug: item.slug + i }, 4, 4, 102, 72)}</g>`,
        )
        .join("") +
      blurb
        .map(
          (l, i) =>
            `<text x="30" y="${236 + i * 30}" ${BODY} font-size="20" fill="${fg}">${esc(l)}</text>`,
        )
        .join("") +
      `<text x="30" y="${h - 210}" ${BODY} font-size="14" fill="${fg}" opacity=".75">Color · Approx. ${80 + (hash(item.slug) % 40)} mins · Hi-Fi Stereo</text>` +
      `<text x="30" y="${h - 186}" ${BODY} font-size="14" fill="${fg}" opacity=".75">© ${item.releaseYear} ${esc(item.creator)}. All rights reserved.</text>` +
      barcode(w - 140, h - 110, item.slug) +
      `<rect x="30" y="${h - 110}" width="60" height="60" fill="none" stroke="${fg}" stroke-width="3"/>` +
      `<text x="60" y="${h - 70}" text-anchor="middle" ${FONT} font-size="26" fill="${fg}">PG</text>`,
  );
  const spine = svg(
    d,
    h,
    `<rect width="${d}" height="${h}" fill="${bg}"/>` +
      `<rect y="0" width="${d}" height="70" fill="${ac}"/>` +
      `<text x="${d / 2}" y="46" text-anchor="middle" ${FONT} font-size="26" fill="${ink(ac)}">${String(item.releaseYear).slice(2)}</text>` +
      `<text transform="translate(${d / 2 + 12} ${h / 2 + 30}) rotate(-90)" text-anchor="middle" ${FONT} font-size="36" fill="${fg}">${esc(item.title.toUpperCase().slice(0, 22))}</text>` +
      `<rect y="${h - 60}" width="${d}" height="60" fill="#000" opacity=".5"/>` +
      `<text x="${d / 2}" y="${h - 24}" text-anchor="middle" ${BODY} font-size="16" font-weight="bold" fill="#fff">VHS</text>`,
  );
  return { front, back, spine };
}

function cassette(item: SeedItem) {
  const { w, h, d } = SIZE.cassette;
  const [bg, ac] = item.palette;
  const fg = ink(bg);
  const front = svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
      motif(item, 0, 90, w, 260) +
      `<text x="18" y="46" ${FONT} font-size="28" fill="${fg}">${esc(item.creator.toUpperCase())}</text>` +
      `<rect x="0" y="${h - 86}" width="${w}" height="86" fill="${ac}"/>` +
      wrap(item.title, 16)
        .map(
          (l, i) =>
            `<text x="18" y="${h - 48 + i * 30}" ${FONT} font-size="30" fill="${ink(ac)}">${esc(l)}</text>`,
        )
        .join("") +
      `<text x="${w - 16}" y="76" text-anchor="end" ${BODY} font-size="12" font-weight="bold" fill="${fg}" opacity=".8">CrO₂ · ${item.releaseYear}</text>`,
  );
  const tracks = item.tracks ?? [];
  const back = svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
      `<text x="18" y="40" ${FONT} font-size="20" fill="${ac}">SIDE A</text>` +
      tracks
        .slice(0, 3)
        .map((t, i) => `<text x="18" y="${70 + i * 24}" ${BODY} font-size="16" fill="${fg}">${i + 1}. ${esc(t)}</text>`)
        .join("") +
      `<text x="18" y="170" ${FONT} font-size="20" fill="${ac}">SIDE B</text>` +
      tracks
        .slice(3)
        .map((t, i) => `<text x="18" y="${200 + i * 24}" ${BODY} font-size="16" fill="${fg}">${i + 4}. ${esc(t)}</text>`)
        .join("") +
      `<text x="18" y="${h - 90}" ${BODY} font-size="11" fill="${fg}" opacity=".7">${esc(item.blurb)}</text>` +
      barcode(w - 124, h - 62, item.slug),
  );
  const spine = svg(
    d,
    h,
    `<rect width="${d}" height="${h}" fill="${ac}"/>` +
      `<text transform="translate(${d / 2 + 8} ${h / 2}) rotate(-90)" text-anchor="middle" ${FONT} font-size="20" fill="${ink(ac)}">${esc(`${item.creator} · ${item.title}`.toUpperCase().slice(0, 30))}</text>`,
  );
  return { front, back, spine };
}

function cd(item: SeedItem) {
  const { w, h, d } = SIZE.cd;
  const [bg, ac] = item.palette;
  const fg = ink(bg);
  const hinge = 34;
  const cw = w - hinge;
  const front = svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="#d9dde3"/>` +
      `<rect x="0" y="0" width="${hinge}" height="${h}" fill="#b9bec6"/>` +
      Array.from({ length: 12 }, (_, i) => `<line x1="${hinge * 0.3}" y1="${20 + i * 40}" x2="${hinge * 0.7}" y2="${20 + i * 40}" stroke="#9aa0a8" stroke-width="2"/>`).join("") +
      `<g transform="translate(${hinge} 0)"><rect width="${cw}" height="${h}" fill="${bg}"/>` +
      motif(item, 0, 60, cw, h - 60) +
      `<text x="24" y="58" ${FONT} font-size="40" fill="${fg}" stroke="${bg}" stroke-width="2" paint-order="stroke">${esc(item.creator.toUpperCase())}</text>` +
      `<text x="${cw - 24}" y="${h - 28}" text-anchor="end" ${FONT} font-size="44" fill="${fg}" stroke="${bg}" stroke-width="3" paint-order="stroke">${esc(item.title)}</text>` +
      `</g>`,
  );
  const tracks = item.tracks ?? [];
  const back = svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="${bg}"/>` +
      `<rect x="0" y="0" width="${d}" height="${h}" fill="${ac}"/>` +
      `<rect x="${w - d}" y="0" width="${d}" height="${h}" fill="${ac}"/>` +
      `<text x="${d + 30}" y="70" ${FONT} font-size="32" fill="${fg}">${esc(item.title.toUpperCase())}</text>` +
      tracks
        .map((t, i) => `<text x="${d + 30}" y="${120 + i * 34}" ${BODY} font-size="22" fill="${fg}">${String(i + 1).padStart(2, "0")}  ${esc(t)}</text>`)
        .join("") +
      `<text x="${d + 30}" y="${h - 40}" ${BODY} font-size="13" fill="${fg}" opacity=".7">℗ © ${item.releaseYear} ${esc(item.creator)}</text>` +
      barcode(w - d - 140, h - 80, item.slug) +
      `<circle cx="${w - d - 60}" cy="70" r="26" fill="none" stroke="${fg}" stroke-width="2"/>` +
      `<text x="${w - d - 60}" y="76" text-anchor="middle" ${BODY} font-size="14" font-weight="bold" fill="${fg}">CD</text>`,
  );
  const spine = svg(
    d,
    h,
    `<rect width="${d}" height="${h}" fill="${ac}"/>` +
      `<text transform="translate(${d / 2 + 6} ${h / 2}) rotate(-90)" text-anchor="middle" ${FONT} font-size="17" fill="${ink(ac)}">${esc(`${item.creator} — ${item.title}`.toUpperCase().slice(0, 36))}</text>`,
  );
  return { front, back, spine };
}

for (const item of SEED_ITEMS) {
  const art = item.format === "vhs" ? vhs(item) : item.format === "cassette" ? cassette(item) : cd(item);
  for (const [role, content] of Object.entries(art)) {
    writeFileSync(join(OUT, `${item.slug}-${role}.svg`), content);
  }
}
console.log(`Wrote art for ${SEED_ITEMS.length} items to ${OUT}`);
