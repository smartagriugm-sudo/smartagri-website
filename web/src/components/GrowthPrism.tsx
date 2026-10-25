import { useEffect, useRef } from "react";
import { A } from "../lib/assets";

// Sign-in illustration, a "prism" made of the smartagri mark: plant stems
// grow in from the left, pass through a 3D logo and leave on the right as
// a fan of circuit traces with nodes (field in, data out). It sways on its own;
// moving the pointer over the panel tilts the logo and bends the stems and the
// fan with it. Everything is drawn in one requestAnimationFrame loop that
// writes SVG attributes directly, so React does not re-render per frame.
// Reduced motion draws a single still frame.

const TRACE_COLORS = ["#0B6477", "#14919B", "#0AD1C8", "#45DFB1", "#80ED99", "#3E9B5B"];
// Three stems enter from the left and meet at the mark. start: height on the
// left edge (fraction of the panel), end: offset where it enters the mark
// (fraction of the logo), bend: how much the stem arches on the way in.
const STEMS = [
  { start: -0.13, end: 0, bend: -24, phase: 0, width: 3, leaves: [0.22, 0.4, 0.58, 0.76], size: 1, speed: 0.32 },
  { start: -0.31, end: -0.12, bend: 34, phase: 1.7, width: 2.2, leaves: [0.3, 0.52, 0.74], size: 0.78, speed: 0.26 },
  { start: 0.1, end: 0.12, bend: -46, phase: 3.1, width: 2.4, leaves: [0.26, 0.48, 0.7], size: 0.86, speed: 0.29 },
];
const LEAF_COUNT = STEMS.reduce((n, st) => n + st.leaves.length, 0);
const LAYERS = 16; // extrusion depth of the 3D mark

type Pt = { x: number; y: number };

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

function bezierAngle(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): number {
  const u = 1 - t;
  const dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  const dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  return Math.atan2(dy, dx);
}

// Point at fraction f along a polyline.
function along(pts: Pt[], f: number): Pt {
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    lens.push(l);
    total += l;
  }
  let d = f * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) {
      const k = lens[i] ? d / lens[i] : 0;
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k };
    }
    d -= lens[i];
  }
  return pts[pts.length - 1];
}

const poly = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

export default function GrowthPrism() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const stemRefs = useRef<(SVGPathElement | null)[]>([]);
  const stemGlowRefs = useRef<(SVGPathElement | null)[]>([]);
  const sapRefs = useRef<(SVGCircleElement | null)[]>([]);
  const leafRefs = useRef<(SVGPathElement | null)[]>([]);
  const traceRefs = useRef<(SVGPathElement | null)[]>([]);
  const glowRefs = useRef<(SVGPathElement | null)[]>([]);
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([]);
  const pulseRefs = useRef<(SVGCircleElement | null)[]>([]);
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

    const draw = (time: number) => {
      const t = (time - start) / 1000;
      const { a, b } = cur;
      const S = Math.min(W * 0.3, H * 0.2, 180); // logo size
      const cx = W * 0.47;
      const cy = H * 0.4;

      // 3D mark
      if (logoRef.current) {
        logoRef.current.style.width = `${S}px`;
        logoRef.current.style.height = `${S}px`;
        logoRef.current.style.transform = `translate(${cx - S / 2}px, ${cy - S / 2}px) rotateX(${(-a * 16).toFixed(2)}deg) rotateY(${(b * 32).toFixed(2)}deg)`;
      }
      haloRef.current?.setAttribute("cx", String(cx));
      haloRef.current?.setAttribute("cy", String(cy));
      haloRef.current?.setAttribute("r", String(S * 1.25));

      // Stems: from the left edge into the mark, swaying gently.
      let leaf = 0;
      STEMS.forEach((st, si) => {
        const sway = Math.sin(t * 0.9 + st.phase) * 6;
        const p0 = { x: -30, y: cy + st.start * H + a * H * 0.16 };
        const p3 = { x: cx - S * 0.36, y: cy + st.end * S + a * S * 0.06 };
        const p1 = { x: W * 0.12, y: p0.y + st.bend + sway };
        const p2 = { x: p3.x - W * 0.16, y: p3.y - st.bend * 0.6 + 34 - sway };
        const d = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
        stemRefs.current[si]?.setAttribute("d", d);
        stemGlowRefs.current[si]?.setAttribute("d", d);
        st.leaves.forEach((f, i) => {
          const el = leafRefs.current[leaf++];
          if (!el) return;
          const p = bezier(p0, p1, p2, p3, f);
          const ang = (bezierAngle(p0, p1, p2, p3, f) * 180) / Math.PI;
          const side = (i + si) % 2 ? 1 : -1;
          const flutter = Math.sin(t * 1.6 + i + st.phase) * 6;
          const scale = (S / 150) * st.size * (0.85 + (i % 3) * 0.12);
          el.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${ang + side * (38 + flutter)}) scale(${scale})`);
        });
        const sap = sapRefs.current[si];
        if (sap) {
          const p = bezier(p0, p1, p2, p3, (t * st.speed + si * 0.33) % 1);
          sap.setAttribute("cx", String(p.x));
          sap.setAttribute("cy", String(p.y));
        }
      });

      // Circuit fan: leaves the mark like light from a prism, then snaps to
      // circuit angles (45 and 0 degrees) and runs to the right edge.
      const exit = { x: cx + S * 0.36, y: cy + S * 0.1 };
      const base = 0.5 + a * 0.28 + b * 0.14;
      TRACE_COLORS.forEach((_, i) => {
        const k = i - (TRACE_COLORS.length - 1) / 2;
        const ang = base + k * 0.13;
        const l1 = S * (0.8 + i * 0.12);
        const p1 = { x: exit.x + Math.cos(ang) * l1, y: exit.y + Math.sin(ang) * l1 };
        const snap = Math.max(0, Math.round(ang / (Math.PI / 4))) * (Math.PI / 4);
        const l2 = S * (0.5 + ((i * 37) % 5) * 0.1);
        const p2 = { x: p1.x + Math.cos(snap) * l2, y: p1.y + Math.sin(snap) * l2 };
        const p3 = { x: W + 40, y: p2.y };
        const pts = [exit, p1, p2, p3];
        const d = poly(pts);
        traceRefs.current[i]?.setAttribute("d", d);
        glowRefs.current[i]?.setAttribute("d", d);
        const n1 = nodeRefs.current[i * 2];
        const n2 = nodeRefs.current[i * 2 + 1];
        n1?.setAttribute("cx", String(p1.x));
        n1?.setAttribute("cy", String(p1.y));
        n2?.setAttribute("cx", String(p2.x));
        n2?.setAttribute("cy", String(p2.y));
        const pulse = pulseRefs.current[i];
        if (pulse) {
          const q = along(pts, (t * 0.16 + i * 0.17) % 1);
          pulse.setAttribute("cx", String(q.x));
          pulse.setAttribute("cy", String(q.y));
        }
      });
    };

    const loop = (time: number) => {
      const t = (time - start) / 1000;
      if (!hovering) {
        target.a = Math.sin(t * 0.35) * 0.45;
        target.b = Math.sin(t * 0.27 + 1) * 0.55;
      }
      cur.a += (target.a - cur.a) * 0.06;
      cur.b += (target.b - cur.b) * 0.06;
      draw(time);
      frame = requestAnimationFrame(loop);
    };

    const resize = () => {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      if (reduced) draw(start);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      hovering = true;
      target.a = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.4) * 2.2));
      target.b = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2.2));
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
  }, []);

  return (
    <div ref={wrapRef} aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <svg ref={svgRef} className="absolute inset-0 h-full w-full" fill="none">
        <defs>
          <pattern id="gp-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.9" fill="#0B6477" fillOpacity="0.1" />
          </pattern>
          <radialGradient id="gp-halo">
            <stop offset="0" stopColor="#45DFB1" stopOpacity="0.28" />
            <stop offset="1" stopColor="#45DFB1" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="gp-stem" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3E9B5B" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#3E9B5B" />
            <stop offset="1" stopColor="#14919B" />
          </linearGradient>
          <filter id="gp-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#gp-dots)" />
        <circle ref={haloRef} fill="url(#gp-halo)" />

        {/* Stems with leaves and drops of sap running in */}
        {STEMS.map((st, si) => (
          <g key={st.start}>
            <path
              ref={(el) => {
                stemGlowRefs.current[si] = el;
              }}
              stroke="#45DFB1"
              strokeOpacity="0.22"
              strokeWidth={st.width * 3}
              strokeLinecap="round"
              filter="url(#gp-blur)"
            />
            <path
              ref={(el) => {
                stemRefs.current[si] = el;
              }}
              stroke="url(#gp-stem)"
              strokeWidth={st.width}
              strokeLinecap="round"
            />
          </g>
        ))}
        {Array.from({ length: LEAF_COUNT }, (_, i) => (
          <path
            key={i}
            ref={(el) => {
              leafRefs.current[i] = el;
            }}
            d="M 0 0 C 8 -12, 24 -13, 36 0 C 24 8, 8 8, 0 0 Z"
            fill={i % 2 ? "#80ED99" : "#45DFB1"}
            fillOpacity="0.85"
            stroke="#3E9B5B"
            strokeOpacity="0.5"
            strokeWidth="1"
          />
        ))}
        {STEMS.map((st, si) => (
          <circle
            key={`sap-${st.start}`}
            ref={(el) => {
              sapRefs.current[si] = el;
            }}
            r={si ? 2.4 : 3}
            fill="#FFFFFF"
            stroke="#45DFB1"
            strokeWidth="2"
          />
        ))}

        {/* Circuit fan */}
        {TRACE_COLORS.map((c, i) => (
          <path
            key={`glow-${c}`}
            ref={(el) => {
              glowRefs.current[i] = el;
            }}
            stroke={c}
            strokeOpacity="0.16"
            strokeWidth="12"
            strokeLinejoin="round"
            filter="url(#gp-blur)"
          />
        ))}
        {TRACE_COLORS.map((c, i) => (
          <path
            key={`trace-${c}`}
            ref={(el) => {
              traceRefs.current[i] = el;
            }}
            stroke={c}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {TRACE_COLORS.flatMap((c, i) =>
          [0, 1].map((j) => (
            <circle
              key={`node-${c}-${j}`}
              ref={(el) => {
                nodeRefs.current[i * 2 + j] = el;
              }}
              r={j ? 4.5 : 3.5}
              fill="#FFFFFF"
              stroke={c}
              strokeWidth="1.8"
            />
          )),
        )}
        {TRACE_COLORS.map((c, i) => (
          <circle
            key={`pulse-${c}`}
            ref={(el) => {
              pulseRefs.current[i] = el;
            }}
            r="2.6"
            fill={c}
          />
        ))}
      </svg>

      {/* The 3D mark: stacked copies of the logo give it depth. */}
      <div className="pointer-events-none absolute inset-0" style={{ perspective: 900 }}>
        <div ref={logoRef} className="absolute left-0 top-0" style={{ transformStyle: "preserve-3d", willChange: "transform" }}>
          {Array.from({ length: LAYERS }, (_, i) => {
            const back = LAYERS - 1 - i; // 0 = front
            return (
              <img
                key={i}
                src={A.iconColor}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full select-none"
                style={{
                  transform: `translateZ(${-back * 2.2}px)`,
                  filter: back ? `brightness(${0.62 + (1 - back / LAYERS) * 0.2}) saturate(0.9)` : "drop-shadow(0 18px 28px rgba(8,49,58,0.22))",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
