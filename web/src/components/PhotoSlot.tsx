import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { body } from "../lib/fonts";

// A photo slot that degrades gracefully.
//
// The brand-colored placeholder is always rendered underneath and the photo
// paints on top of it, so there is nothing to toggle and no dependency on load
// events firing. A file that is not in public/brand/ yet shows the placeholder rather
// than a broken image, and photos can be dropped in later with no code change.
export default function PhotoSlot({
  src,
  alt,
  icon: Icon,
  caption,
  className = "",
  ratio = "aspect-[4/3]",
  tone = "light",
}: {
  src?: string;
  alt?: string;
  icon?: LucideIcon;
  /** Small label on the placeholder describing the intended photo. */
  caption?: string;
  className?: string;
  ratio?: string;
  tone?: "light" | "dark";
}) {
  const [failed, setFailed] = useState(false);
  const dark = tone === "dark";

  return (
    <div
      className={`${ratio} relative overflow-hidden rounded-2xl border ${
        dark ? "border-white/10" : "border-[#0B6477]/10"
      } ${className}`}
      style={{
        background: dark
          ? "linear-gradient(135deg, #08313A 0%, #0B6477 70%, #14919B 100%)"
          : "linear-gradient(135deg, #EAF4F2 0%, #DCEFEA 55%, #CDE9E4 100%)",
      }}
    >
      {/* soft brand blooms so the placeholder still reads as designed */}
      <div
        className={`pointer-events-none absolute -top-16 -right-12 w-56 h-56 rounded-full blur-3xl ${
          dark ? "bg-[#45DFB1]/20" : "bg-[#45DFB1]/30"
        }`}
      />
      <div
        className={`pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full blur-3xl ${
          dark ? "bg-[#0AD1C8]/15" : "bg-[#0AD1C8]/20"
        }`}
      />
      <div className="relative h-full w-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        {Icon && (
          <Icon
            className={`w-8 h-8 ${dark ? "text-white/70" : "text-[#0B6477]/60"}`}
            strokeWidth={1.5}
          />
        )}
        {caption && (
          <span
            className={`text-xs font-medium ${
              dark ? "text-white/60" : "text-[#0B6477]/70"
            }`}
            style={body}
          >
            {caption}
          </span>
        )}
      </div>

      {/* The photo paints on top of the placeholder. If the file is missing,
          onError drops the img so the placeholder underneath shows through. */}
      {src && !failed && (
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
