import { useState } from "react";

/**
 * GreenhouseWorkflow
 * Embeds the Smart Greenhouse workflow simulator (Agent / Linear views, 8 scenarios).
 *
 * Integration:
 *  1. Copy `greenhouse-workflow.html` into your app's static/public folder
 *     (e.g. Next.js: /public/greenhouse-workflow.html  -> src="/greenhouse-workflow.html").
 *  2. Render <GreenhouseWorkflow /> anywhere in your page.
 *
 * The widget is fully self-contained (no external deps, no network calls),
 * so an <iframe> keeps its dark theme and animation isolated from your app's CSS.
 */
export default function GreenhouseWorkflow({
  src = "/greenhouse-workflow.html",
  height = 760,
  title = "Smart Greenhouse Workflow Simulator",
  className = "",
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        background: "#141518",
      }}
    >
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8a8d93",
            fontFamily: "Helvetica, Arial, sans-serif",
            fontSize: 14,
          }}
        >
          Loading workflow…
        </div>
      )}
      <iframe
        title={title}
        src={src}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        style={{
          display: "block",
          width: "100%",
          height,
          border: 0,
        }}
      />
    </div>
  );
}
