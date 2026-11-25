import type { MediaPreview } from "@/lib/types";

/** The credit line under a player. Providers like Apple require attribution and a link back. */
export function PlayerCredit({ preview }: { preview: MediaPreview }) {
  if (preview.provider === "generated") {
    return (
      <p className="mt-2 text-center text-xs text-cream-dim">
        Placeholder {preview.kind === "video" ? "footage" : "tune"} made in your browser. Real listings play an official{" "}
        {preview.kind === "video" ? "trailer" : "30-second preview"}.
      </p>
    );
  }
  return (
    <p className="mt-2 text-center text-xs text-cream-dim">
      {preview.attribution ?? "Preview courtesy of the rights holder."}{" "}
      {preview.link && (
        <a href={preview.link} target="_blank" rel="noopener noreferrer" className="underline hover:text-cream">
          {preview.provider === "apple" ? "Listen on Apple Music" : preview.provider === "youtube" ? "Watch on YouTube" : "Open source"}
        </a>
      )}
    </p>
  );
}

export function TransportButton({
  onClick,
  label,
  children,
  primary = false,
  disabled = false,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={`rounded-sm border-b-4 px-4 py-1.5 font-crt text-xl tracking-wide transition active:translate-y-0.5 active:border-b-2 disabled:opacity-40 ${
        primary ? "border-[#8a1f2a] bg-tape text-white" : "border-black/60 bg-[#cfd4de] text-night"
      }`}
    >
      {children}
    </button>
  );
}
