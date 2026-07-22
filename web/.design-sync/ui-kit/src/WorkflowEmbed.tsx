import { useState } from "react";
import { body } from "./fonts";

export type WorkflowEmbedProps = {
  /** URL of the self-contained workflow HTML to frame. */
  src: string;
  /** Accessible iframe title. */
  title: string;
  /** Panel height in pixels (default 760). */
  height?: number;
};

// Frames a self-contained workflow HTML in a smartagri-styled dark panel. The
// widget is isolated in an iframe so its theme and animation stay sandboxed
// from the host app's CSS. Shows a loading label until the frame is ready.
export function WorkflowEmbed({ src, title, height = 760 }: WorkflowEmbedProps) {
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
