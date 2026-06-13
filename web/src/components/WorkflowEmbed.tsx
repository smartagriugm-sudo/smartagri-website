import { useState } from "react";
import { body } from "../lib/fonts";

// Frames a self-contained workflow HTML (under public/) in a smartagri-styled
// dark panel. The widget is isolated in an iframe so its theme and animation
// stay sandboxed from the app's CSS.
export default function WorkflowEmbed({
  src,
  title,
  height = 760,
}: {
  src: string;
  title: string;
  height?: number;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-[#08313A]">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-sm font-normal text-white/60 animate-pulse"
            style={body}
          >
            Loading workflow…
          </span>
        </div>
      )}
      <iframe
        title={title}
        src={src}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="block w-full border-0"
        style={{ height }}
      />
    </div>
  );
}
