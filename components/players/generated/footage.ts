/**
 * Placeholder "footage" for sample VHS listings, drawn on a canvas and run
 * through a CRT treatment (scanlines, colour fringing, rolling bar, noise).
 * Only for footage we own: real trailers play untouched inside the TV frame.
 */
import { hashString, rng } from "./params";

export const SCREEN_W = 320;
export const SCREEN_H = 240;

export type Scene = "drive" | "ghost" | "toon" | "studio";

export function sceneFor(genres: string[]): Scene {
  const g = genres.map((x) => x.toLowerCase());
  if (g.includes("horror")) return "ghost";
  if (g.includes("action") || g.includes("sci-fi")) return "drive";
  if (g.includes("family") || g.includes("animation")) return "toon";
  return "studio";
}

export interface FootageInfo {
  slug: string;
  title: string;
  creator: string;
  year: number;
  accent: string;
  ground: string;
  scene: Scene;
}

export interface FrameState {
  /** Seconds into the clip. */
  t: number;
  /** Real time, for noise that keeps moving while paused. */
  wall: number;
  paused: boolean;
  reducedMotion: boolean;
}

export function drawFrame(ctx: CanvasRenderingContext2D, info: FootageInfo, f: FrameState) {
  const { t } = f;
  ctx.save();
  switch (info.scene) {
    case "drive":
      drive(ctx, info, t);
      break;
    case "ghost":
      ghost(ctx, info, t, f.wall);
      break;
    case "toon":
      toon(ctx, info, t);
      break;
    default:
      studio(ctx, info, t);
  }
  ctx.restore();

  // Title card for the first few seconds, then a lower-third.
  if (t > 0.6 && t < 5.5) titleCard(ctx, info, Math.min(1, (t - 0.6) / 0.6) * Math.min(1, (5.5 - t) / 0.5));

  vcrOverlay(ctx, t, f.paused);
  crt(ctx, f);
}

// ── Scenes ───────────────────────────────────────────────────────────────
function drive(ctx: CanvasRenderingContext2D, info: FootageInfo, t: number) {
  const W = SCREEN_W, H = SCREEN_H, horizon = H * 0.55;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#0b0420");
  sky.addColorStop(1, info.ground);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon);
  // Stars
  const r = rng(hashString(info.slug));
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 40; i++) ctx.fillRect(r() * W, r() * horizon * 0.8, 1, 1);
  // Striped sun
  const sunR = 58, cx = W / 2, cy = horizon - 6;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, sunR, Math.PI, 0);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, cy - sunR, 0, cy);
  sun.addColorStop(0, "#ffd23f");
  sun.addColorStop(1, info.accent);
  ctx.fillStyle = sun;
  ctx.fillRect(cx - sunR, cy - sunR, sunR * 2, sunR);
  ctx.fillStyle = info.ground;
  for (let i = 0; i < 6; i++) ctx.fillRect(cx - sunR, cy - 26 + i * 5 + ((t * 6) % 5), sunR * 2, 1 + i * 0.6);
  ctx.restore();
  // Ground and scrolling grid
  ctx.fillStyle = "#07030f";
  ctx.fillRect(0, horizon, W, H - horizon);
  ctx.strokeStyle = info.accent;
  ctx.lineWidth = 1;
  const speed = (t * 0.9) % 1;
  for (let i = 0; i < 12; i++) {
    const z = (i + speed) / 12;
    const y = horizon + (H - horizon) * z * z;
    ctx.globalAlpha = 0.25 + z * 0.75;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.8;
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 6, horizon);
    ctx.lineTo(cx + i * 70, H);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // A car's tail lights weaving down the road
  const carX = cx + Math.sin(t * 0.8) * 30;
  ctx.fillStyle = "#111";
  ctx.fillRect(carX - 22, H - 46, 44, 18);
  ctx.fillStyle = "#ff2a2a";
  ctx.shadowColor = "#ff2a2a";
  ctx.shadowBlur = 8;
  ctx.fillRect(carX - 20, H - 40, 8, 4);
  ctx.fillRect(carX + 12, H - 40, 8, 4);
  ctx.shadowBlur = 0;
}

function ghost(ctx: CanvasRenderingContext2D, info: FootageInfo, t: number, wall: number) {
  const W = SCREEN_W, H = SCREEN_H;
  // Snow
  const img = ctx.createImageData(W / 2, H / 2);
  const seed = Math.floor(wall * 30);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 120;
    img.data[i] = v * 0.7;
    img.data[i + 1] = v;
    img.data[i + 2] = v * 0.7;
    img.data[i + 3] = 255;
  }
  const tmp = new OffscreenCanvasLike(W / 2, H / 2);
  tmp.ctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp.canvas, 0, 0, W, H);
  // A face that surfaces through the static every few seconds
  const phase = (t % 6) / 6;
  const a = Math.max(0, Math.sin(phase * Math.PI)) ** 2;
  ctx.globalAlpha = a * 0.85;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(W / 2, H / 2 + 4, 46, 62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = info.accent;
  ctx.shadowColor = info.accent;
  ctx.shadowBlur = 10;
  for (const dx of [-16, 16]) {
    ctx.beginPath();
    ctx.ellipse(W / 2 + dx, H / 2 - 8, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(W / 2, H / 2 + 30, 10, 4 + 3 * Math.sin(t * 3), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  // Channel number
  ctx.fillStyle = info.accent;
  ctx.font = "bold 22px monospace";
  ctx.fillText("CH 0", W - 86, 46);
}

function toon(ctx: CanvasRenderingContext2D, info: FootageInfo, t: number) {
  const W = SCREEN_W, H = SCREEN_H;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#6ec6ff");
  sky.addColorStop(1, info.ground);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Smiling sun
  const sx = 60, sy = 54;
  ctx.fillStyle = "#ffd23f";
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(t * 0.6);
  for (let i = 0; i < 10; i++) {
    ctx.rotate((Math.PI * 2) / 10);
    ctx.fillRect(28, -3, 12, 6);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(sx, sy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1423";
  ctx.fillRect(sx - 9, sy - 6, 4, 6);
  ctx.fillRect(sx + 5, sy - 6, 4, 6);
  ctx.beginPath();
  ctx.arc(sx, sy + 4, 9, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#1a1423";
  ctx.stroke();
  // Rolling hills
  ctx.fillStyle = "#3bbf6b";
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H - 50 - 14 * Math.sin(x / 40 + t * 0.5));
  ctx.lineTo(W, H);
  ctx.fill();
  // Bouncing stars in the cover colours
  const r = rng(hashString(info.slug) + 3);
  for (let i = 0; i < 5; i++) {
    const bx = 70 + i * 50 + Math.sin(t + i) * 10;
    const by = H - 70 - Math.abs(Math.sin(t * 2.4 + r() * 6)) * 70;
    star(ctx, bx, by, 10, i % 2 ? info.accent : "#fff");
  }
}

function studio(ctx: CanvasRenderingContext2D, info: FootageInfo, t: number) {
  const W = SCREEN_W, H = SCREEN_H;
  if (t < 2) {
    // Colour bars before the programme starts
    const bars = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];
    bars.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect((i * W) / 7, 0, W / 7 + 1, H * 0.7);
    });
    ctx.fillStyle = "#111";
    ctx.fillRect(0, H * 0.7, W, H * 0.3);
    return;
  }
  ctx.fillStyle = info.ground;
  ctx.fillRect(0, 0, W, H);
  // Sliding stripes
  ctx.fillStyle = info.accent;
  for (let i = -2; i < 8; i++) {
    const x = ((i * 60 + t * 40) % (W + 120)) - 60;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 0);
    ctx.lineTo(x - 36, H);
    ctx.lineTo(x - 60, H);
    ctx.fill();
  }
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#fff";
  const bounce = Math.abs(Math.sin(t * 3)) * 10;
  ctx.font = "bold 26px Impact, 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NOW SHOWING", W / 2, H / 2 - bounce);
  ctx.globalAlpha = 1;
  ctx.textAlign = "start";
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r / 2.2 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fill();
}

function titleCard(ctx: CanvasRenderingContext2D, info: FootageInfo, alpha: number) {
  const W = SCREEN_W, H = SCREEN_H;
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.textAlign = "center";
  ctx.font = "bold 28px Impact, 'Arial Black', sans-serif";
  const title = info.title.toUpperCase();
  // Cheap chromatic fringing on the title
  ctx.fillStyle = "#ff004c";
  ctx.fillText(title, W / 2 - 1.5, H * 0.32, W - 30);
  ctx.fillStyle = "#00e5ff";
  ctx.fillText(title, W / 2 + 1.5, H * 0.32, W - 30);
  ctx.fillStyle = "#fff";
  ctx.fillText(title, W / 2, H * 0.32, W - 30);
  ctx.font = "12px monospace";
  ctx.fillText(`${info.creator.toUpperCase()} · ${info.year}`, W / 2, H * 0.32 + 20, W - 30);
  ctx.textAlign = "start";
  ctx.globalAlpha = 1;
}

function vcrOverlay(ctx: CanvasRenderingContext2D, t: number, paused: boolean) {
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 2;
  if (paused) ctx.fillText("PAUSE ❚❚", 16, 28);
  else if (t < 3) ctx.fillText("PLAY ▶", 16, 28);
  const s = Math.floor(t);
  ctx.fillText(`SP 0:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`, SCREEN_W - 130, SCREEN_H - 16);
  ctx.shadowBlur = 0;
}

// ── CRT treatment ────────────────────────────────────────────────────────
function crt(ctx: CanvasRenderingContext2D, f: FrameState) {
  const W = SCREEN_W, H = SCREEN_H;
  // Scanlines
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
  if (f.reducedMotion) return;
  // Rolling hum bar
  const barY = ((f.wall * 40) % (H + 60)) - 30;
  const g = ctx.createLinearGradient(0, barY - 30, 0, barY + 30);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, barY - 30, W, 60);
  // Tracking glitch: a band of shifted lines now and then
  const r = rng(Math.floor(f.wall * 12));
  if (r() < 0.12) {
    const y = Math.floor(r() * H);
    const h = 3 + Math.floor(r() * 8);
    const shift = (r() - 0.5) * 16;
    const band = ctx.getImageData(0, y, W, h);
    ctx.putImageData(band, shift, y);
  }
  // Speckle noise
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 40; i++) ctx.fillRect(r() * W, r() * H, 1, 1);
}

/** Small helper so scenes can render noise at half resolution. */
class OffscreenCanvasLike {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  constructor(w: number, h: number) {
    this.canvas = scratch ?? (scratch = document.createElement("canvas"));
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext("2d")!;
  }
}
let scratch: HTMLCanvasElement | null = null;
