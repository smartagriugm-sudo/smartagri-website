// Soft brand-colour washes drifting slowly behind light content (after the
// Quayside journal). Place inside a `relative overflow-hidden` wrapper and
// keep the content above it `relative`. Blobs are radial gradients with no
// background colour, so the header's backdrop check still sees the page white.
// Keyframes live in styles.css (.animate-wash-a/b/c) and stop for reduced motion.

const TINTS = [
  "rgba(69,223,177,0.24)", // mint
  "rgba(10,209,200,0.14)", // cyan
  "rgba(128,237,153,0.20)", // green
  "rgba(20,145,155,0.10)", // teal
];
const DRIFT = ["animate-wash-a", "animate-wash-b", "animate-wash-c"];

export default function AmbientWash({ count = 3 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-clip" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const left = i % 2 === 0;
        return (
          <div
            key={i}
            className={`absolute h-[min(900px,90vw)] w-[min(900px,90vw)] rounded-full will-change-transform ${DRIFT[i % DRIFT.length]}`}
            style={{
              // Never closer to the top than its own radius, so the first wash
              // isn't sliced flat by the wrapper's top edge.
              top: `max(${((i + 0.2) / count) * 100}%, min(450px, 45vw))`,
              ...(left ? { left: "-18%" } : { right: "-16%" }),
              // Centred on `top` via margin: the drift keyframes own `transform`.
              marginTop: "calc(min(900px, 90vw) / -2)",
              background: `radial-gradient(closest-side, ${TINTS[i % TINTS.length]}, transparent)`,
            }}
          />
        );
      })}
    </div>
  );
}
