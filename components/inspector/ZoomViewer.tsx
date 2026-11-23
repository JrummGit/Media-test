"use client";

import { useEffect, useState } from "react";

/** Full-screen image viewer. Tap or click to toggle 2.5x zoom at that point; pinch works natively. */
export function ZoomViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label={`Zoomed view: ${alt}`}
      className="fixed inset-0 z-[70] flex flex-col bg-black/95"
      style={{ touchAction: "pinch-zoom" }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <p className="font-crt text-xl text-cream-dim">{zoom ? "TAP TO ZOOM OUT" : "TAP TO ZOOM IN"}</p>
        <button onClick={onClose} className="font-crt text-3xl text-cream" aria-label="Close zoom">
          ✕
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onClick={(e) => {
            if (zoom) return setZoom(null);
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          className="absolute inset-0 m-auto max-h-full max-w-full cursor-zoom-in object-contain transition-transform duration-300"
          style={{
            transform: zoom ? "scale(2.5)" : "scale(1)",
            transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center",
            cursor: zoom ? "zoom-out" : "zoom-in",
          }}
        />
      </div>
    </div>
  );
}
