/**
 * Browser-side photo prep for listings: honours the phone's rotation, shrinks
 * to a sensible size and re-encodes as JPEG before upload. Also reads the
 * cover's colours so generated spines and previews match the real box.
 */
const MAX_EDGE = 1600;

export interface PreparedPhoto {
  blob: Blob;
  width: number;
  height: number;
  /** Object URL for showing the photo before it's uploaded. */
  localUrl: string;
  colors: { ground: string; accent: string };
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo."))), "image/jpeg", 0.85),
  );
  return { blob, width, height, localUrl: URL.createObjectURL(blob), colors: readColors(canvas) };
}

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Average colour as the background, and the most vivid colour as the accent. */
export function readColors(source: HTMLCanvasElement): { ground: string; accent: string } {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(source, 0, 0, 32, 32);
  const d = ctx.getImageData(0, 0, 32, 32).data;
  let r = 0, g = 0, b = 0, best = -1, accent: [number, number, number] = [255, 61, 129];
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    const min = Math.min(d[i], d[i + 1], d[i + 2]);
    const vivid = (max - min) * (max / 255);
    if (vivid > best) {
      best = vivid;
      accent = [d[i], d[i + 1], d[i + 2]];
    }
  }
  const n = d.length / 4;
  return { ground: hex(r / n, g / n, b / n), accent: hex(...accent) };
}
