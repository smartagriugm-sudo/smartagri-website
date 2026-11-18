import { useEffect, useRef } from "react";

// Sign-in illustration for agrosphere: the two parts of the agrosphere mark, the
// cyan frame and the mint leaf in its corner, come in one after the other and lock
// together as a thin 3D mark, then rounded frames ripple slowly outwards from it, the "sphere" the
// dashboards cover. It sways on its own; moving the pointer over the panel tilts
// the mark. One requestAnimationFrame loop writes styles and SVG attributes
// directly, so React does not re-render per frame. Reduced motion draws the
// assembled mark and its ripples as a single still frame.

const VIEW = 2357; // the icon's own viewBox
const PIECES = [
  {
    d: "M1609.43 0.00390625C2022.52 1.31187 2357 336.595 2357 750V770H2057V750C2057 501.472 1855.53 300 1607 300H750C501.472 300 300 501.472 300 750V1607C300 1855.53 501.472 2057 750 2057H860V2357H750C335.786 2357 0 2021.21 0 1607V750C2.7439e-05 336.595 334.476 1.31183 747.574 0.00390625L750 0H1607L1609.43 0.00390625Z",
    fill: "#0AD1C8",
    // Where it comes from (fraction of the mark), its start scale and turn, the
    // point it turns around, and when it starts.
    from: { x: 0, y: 0, scale: 0.82, turn: -10 },
    origin: "50% 50%",
    delay: 0,
  },
  {
    // The leaf: both mint shapes of the icon, one piece.
    d: "M2357 1609.43C2355.69 2022.52 2020.4 2357 1607 2357H1540V2057H1607C1855.53 2057 2057 1855.53 2057 1607V960H2357V1609.43Z M2357 1260H1800C1551.47 1260 1350 1461.47 1350 1710V2357H1050V1710C1050 1296.6 1384.48 961.312 1797.57 960.004L1800 960H2357V1260Z",
    fill: "#45DFB1",
    from: { x: 0.34, y: 0.34, scale: 0.7, turn: 18 },
    origin: "72% 70%",
    delay: 0.45,
  },
];
const ASSEMBLE = 1.1; // seconds per piece
// Assembly waits for the page curtain to lift on a first load (PageCurtain: 0.45s
// then a 0.65s lift), so it plays in view rather than behind it.
const ASSEMBLE_START = 0.85;
const LAYERS = 14; // extrusion depth of the 3D mark
const RIPPLES = 3;
const RIPPLE_PERIOD = 7.5; // seconds for one ripple to travel out
const RIPPLE_START = ASSEMBLE_START + 1.4; // first ripple once the mark has locked together
const CORNER = 750 / VIEW; // corner radius of the frame, as a fraction of its size

// Same curve as the site's [0.22, 1, 0.36, 1] ease: fast start, long settle.
function easeOut(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return 1 - Math.pow(1 - c, 3.4);
}

/**
 * `at` places the mark (fractions of the panel) and `size` caps it, so the same
 * mark can sit in the sign-in panel or beside the launcher's title. `dots` draws
 * the faint dot grid behind it.
 */
export default function AgrosphereMark({
  at = { x: 0.5, y: 0.38 },
  size = { w: 0.34, h: 0.24, max: 200 },
  dots = true,
}: {
  at?: { x: number; y: number };
  size?: { w: number; h: number; max: number };
  dots?: boolean;
} = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const pieceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rippleRefs = useRef<(SVGRectElement | null)[]>([]);
  const haloRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let frame = 0;
    let hovering = false;
    const target = { a: 0, b: 0 };
    const cur = { a: 0, b: 0 };
    const start = performance.now();

    const draw = (t: number) => {
      const S = Math.min(W * size.w, H * size.h, size.max); // mark size
      const cx = W * at.x;
      const cy = H * at.y;
      const { a, b } = cur;

      if (markRef.current) {
        const bob = reduced ? 0 : Math.sin(t * 0.8) * 4;
        markRef.current.style.width = `${S}px`;
        markRef.current.style.height = `${S}px`;
        markRef.current.style.transform = `translate(${cx - S / 2}px, ${cy - S / 2 + bob}px) rotateX(${(-a * 18 + 8).toFixed(2)}deg) rotateY(${(b * 30 - 14).toFixed(2)}deg)`;
      }

      PIECES.forEach((p, i) => {
        const el = pieceRefs.current[i];
        if (!el) return;
        const k = reduced ? 1 : easeOut((t - ASSEMBLE_START - p.delay) / ASSEMBLE);
        const x = (1 - k) * p.from.x * S;
        const y = (1 - k) * p.from.y * S;
        const z = (1 - k) * 60;
        const scale = p.from.scale + (1 - p.from.scale) * k;
        const turn = (1 - k) * p.from.turn;
        el.style.opacity = String(Math.min(1, k * 1.6));
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotate(${turn.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      });

      haloRef.current?.setAttribute("cx", String(cx));
      haloRef.current?.setAttribute("cy", String(cy));
      haloRef.current?.setAttribute("r", String(S * 1.3));

      // Rounded frames leave the mark and fade as they grow.
      rippleRefs.current.forEach((el, i) => {
        if (!el) return;
        const phase = reduced
          ? 0.22 + i * 0.26
          : (t - RIPPLE_START) / RIPPLE_PERIOD - i / RIPPLES;
        if (phase < 0) {
          el.setAttribute("opacity", "0");
          return;
        }
        const f = phase % 1;
        const size = S * (1.08 + f * 2.6);
        el.setAttribute("x", String(cx - size / 2));
        el.setAttribute("y", String(cy - size / 2));
        el.setAttribute("width", String(size));
        el.setAttribute("height", String(size));
        el.setAttribute("rx", String(size * CORNER));
        const fadeIn = Math.min(1, f * 8);
        el.setAttribute("opacity", ((1 - f) * fadeIn * 0.55).toFixed(3));
      });
    };

    const loop = (time: number) => {
      const t = (time - start) / 1000;
      const idleA = Math.sin(t * 0.45) * 0.18;
      const idleB = Math.sin(t * 0.33 + 1) * 0.22;
      const goalA = hovering ? target.a : idleA;
      const goalB = hovering ? target.b : idleB;
      cur.a += (goalA - cur.a) * 0.06;
      cur.b += (goalB - cur.b) * 0.06;
      draw(t);
      frame = requestAnimationFrame(loop);
    };

    const resize = () => {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      if (reduced) draw(0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      hovering = true;
      target.a = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - at.y) * 2.2));
      target.b = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - at.x) * 2.2));
    };
    const onLeave = () => {
      hovering = false;
    };

    if (!reduced) {
      frame = requestAnimationFrame(loop);
      wrap.addEventListener("pointermove", onMove);
      wrap.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
    // Placement is fixed for the life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <svg ref={svgRef} className="absolute inset-0 h-full w-full" fill="none">
        <defs>
          <pattern id="am-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.9" fill="#0B6477" fillOpacity="0.1" />
          </pattern>
          <radialGradient id="am-halo">
            <stop offset="0" stopColor="#0AD1C8" stopOpacity="0.22" />
            <stop offset="0.55" stopColor="#45DFB1" stopOpacity="0.08" />
            <stop offset="1" stopColor="#45DFB1" stopOpacity="0" />
          </radialGradient>
        </defs>
        {dots && <rect width="100%" height="100%" fill="url(#am-dots)" />}
        <circle ref={haloRef} fill="url(#am-halo)" />
        {Array.from({ length: RIPPLES }, (_, i) => (
          <rect
            key={i}
            ref={(el) => {
              rippleRefs.current[i] = el;
            }}
            opacity="0"
            stroke={i % 2 ? "#45DFB1" : "#0AD1C8"}
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* The 3D mark: each piece is its own stack of layers, so it can slide in on its own. */}
      <div className="pointer-events-none absolute inset-0" style={{ perspective: 900 }}>
        <div ref={markRef} className="absolute left-0 top-0" style={{ transformStyle: "preserve-3d", willChange: "transform" }}>
          {PIECES.map((p, i) => (
            <div
              key={p.d.slice(0, 12)}
              ref={(el) => {
                pieceRefs.current[i] = el;
              }}
              className="absolute inset-0"
              style={{ transformStyle: "preserve-3d", transformOrigin: p.origin, opacity: 0 }}
            >
              {Array.from({ length: LAYERS }, (_, layer) => {
                const back = LAYERS - 1 - layer; // 0 = front
                return (
                  <svg
                    key={layer}
                    viewBox={`0 0 ${VIEW} ${VIEW}`}
                    className="absolute inset-0 h-full w-full"
                    style={{
                      transform: `translateZ(${-back * 2.2}px)`,
                      filter: back
                        ? `brightness(${0.6 + (1 - back / LAYERS) * 0.22}) saturate(0.9)`
                        : "drop-shadow(0 18px 28px rgba(8,49,58,0.2))",
                    }}
                  >
                    <path d={p.d} fill={p.fill} />
                  </svg>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
