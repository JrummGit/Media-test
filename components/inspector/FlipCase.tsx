"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CASE_DIMENSIONS, imageFor, type Item } from "@/lib/types";

type Face = "front" | "spine" | "back";
const FACE_ANGLE: Record<Face, number> = { front: 0, spine: 90, back: 180 };

/** Nearest angle to `from` that is equivalent (mod 360) to `target`. */
function nearestEquivalent(from: number, target: number) {
  const k = Math.round((from - target) / 360);
  return target + k * 360;
}

function faceAt(angle: number): Face {
  const a = ((angle % 360) + 360) % 360;
  if (a >= 45 && a < 135) return "spine";
  if (a >= 135 && a < 225) return "back";
  return "front";
}

/**
 * A physical media case rendered as a CSS 3D box. Faces use the seller's own
 * scans (front / back / spine). Drag or swipe to turn it, tap the face buttons,
 * or use the arrow keys.
 */
export function FlipCase({
  item,
  maxHeight = 420,
  onZoom,
}: {
  item: Item;
  maxHeight?: number;
  onZoom?: (src: string, alt: string) => void;
}) {
  const dim = CASE_DIMENSIONS[item.format];
  const front = imageFor(item, "front");
  const back = imageFor(item, "back");
  const spine = imageFor(item, "spine");

  const [rotY, setRotY] = useState(-18);
  const [rotX, setRotX] = useState(6);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; ry: number; rx: number; moved: boolean } | null>(null);

  // Gentle intro spin so people notice the case is 3D.
  useEffect(() => {
    const t = setTimeout(() => {
      setRotY(0);
      setRotX(0);
    }, 350);
    return () => clearTimeout(t);
  }, []);

  const goTo = useCallback((face: Face) => {
    setRotX(0);
    setRotY((r) => nearestEquivalent(r, FACE_ANGLE[face]));
  }, []);

  const snap = useCallback((angle: number, velocity: number) => {
    // Snap to a multiple of 90, but skip the plain right edge (270deg) in the
    // direction the user was turning.
    let target = Math.round(angle / 90) * 90;
    const norm = ((target % 360) + 360) % 360;
    if (norm === 270) target += velocity >= 0 ? 90 : -90;
    setRotY(target);
    setRotX(0);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ry: rotY, rx: rotX, moved: false };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    setRotY(d.ry + dx * 0.6);
    setRotX(Math.max(-25, Math.min(25, d.rx - dy * 0.25)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (!d.moved) {
      // A tap flips to the other side.
      const current = faceAt(rotY);
      goTo(current === "front" ? "back" : "front");
      return;
    }
    snap(rotY, e.clientX - d.x);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      snap(rotY + 90, 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      snap(rotY - 90, -1);
    }
  };

  const current = faceAt(rotY);
  const currentImage = current === "back" ? back : current === "spine" ? spine : front;

  // Size the case to fit the available height (and the viewport width on phones).
  const u = `min(${maxHeight / dim.h}px, calc(72vw / ${dim.w}))`;
  const W = `calc(${dim.w} * ${u})`;
  const H = `calc(${dim.h} * ${u})`;
  const D = `calc(${dim.d} * ${u})`;
  const edge = `color-mix(in srgb, ${item.accent} 55%, #111)`;
  const sheen = Math.cos(((rotY % 360) * Math.PI) / 180);

  const face = (style: React.CSSProperties, children?: React.ReactNode, className = "") => (
    <div className={`backface-hidden absolute left-1/2 top-1/2 ${className}`} style={style}>
      {children}
    </div>
  );
  const img = (src: string | undefined, alt: string) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} draggable={false} className="h-full w-full select-none object-cover" />
    ) : (
      <div className="grid h-full w-full place-items-center p-2 text-center font-display text-xs" style={{ background: item.accent }}>
        {item.title}
      </div>
    );

  return (
    <div className="flex flex-col items-center">
      <div
        role="img"
        aria-label={`${item.title} case, showing the ${current}. Drag or use arrow keys to turn it.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative grid w-full cursor-grab touch-pan-y place-items-center active:cursor-grabbing"
        style={{ perspective: "1400px", height: `calc(${H} + 48px)` }}
      >
        <div
          className="preserve-3d relative"
          style={{
            width: W,
            height: H,
            transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            transition: dragging ? "none" : "transform 650ms cubic-bezier(.2,.8,.2,1)",
          }}
        >
          {/* front */}
          {face(
            { width: W, height: H, transform: `translate(-50%,-50%) translateZ(calc(${D} / 2))` },
            <>
              {img(front?.src, `${item.title} front cover`)}
              {/* plastic sleeve glare */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `linear-gradient(${115 + sheen * 30}deg, transparent 30%, rgb(255 255 255 / ${item.format === "cd" ? 0.22 : 0.12}) 45%, transparent 60%)`,
                }}
              />
            </>,
            "overflow-hidden rounded-[3px] shadow-[0_30px_60px_-20px_#000]",
          )}
          {/* back */}
          {face(
            { width: W, height: H, transform: `translate(-50%,-50%) rotateY(180deg) translateZ(calc(${D} / 2))` },
            img(back?.src, `${item.title} back cover`),
            "overflow-hidden rounded-[3px]",
          )}
          {/* spine (left side) */}
          {face(
            { width: D, height: H, transform: `translate(-50%,-50%) rotateY(-90deg) translateZ(calc(${W} / 2))` },
            img(spine?.src, `${item.title} spine`),
            "overflow-hidden",
          )}
          {/* right edge */}
          {face({
            width: D,
            height: H,
            background: `linear-gradient(to right, ${edge}, #0008)`,
            transform: `translate(-50%,-50%) rotateY(90deg) translateZ(calc(${W} / 2))`,
          })}
          {/* top + bottom */}
          {face({
            width: W,
            height: D,
            background: edge,
            transform: `translate(-50%,-50%) rotateX(90deg) translateZ(calc(${H} / 2))`,
          })}
          {face({
            width: W,
            height: D,
            background: "#0a0a0a",
            transform: `translate(-50%,-50%) rotateX(-90deg) translateZ(calc(${H} / 2))`,
          })}
        </div>
      </div>

      <div className="relative z-10 mt-2 flex items-center gap-1 rounded-full border border-night-3 bg-night-2 p-1" role="group" aria-label="Turn case">
        {(["front", "spine", "back"] as Face[]).map((f) => (
          <button
            key={f}
            onClick={() => goTo(f)}
            aria-pressed={current === f}
            className={`rounded-full px-3 py-1 font-crt text-lg uppercase tracking-wide transition ${
              current === f ? "bg-mustard text-night" : "text-cream-dim hover:text-cream"
            }`}
          >
            {f}
          </button>
        ))}
        {onZoom && currentImage && (
          <button
            onClick={() => onZoom(currentImage.src, `${item.title} ${current}`)}
            className="rounded-full px-3 py-1 font-crt text-lg uppercase tracking-wide text-teal hover:text-cream"
            aria-label={`Zoom in on the ${current}`}
          >
            Zoom ⌕
          </button>
        )}
      </div>
    </div>
  );
}
