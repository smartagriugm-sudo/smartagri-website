import { useEffect, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  type Variants,
} from "framer-motion";
import {
  ClipboardList,
  FileText,
  FlaskConical,
  GraduationCap,
  LineChart,
  Search,
} from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { MaskLine } from "./NoteParts";
import PartnerGrid from "./PartnerGrid";

// "Our collaboration process": six steps from first contact to a working,
// supported deployment, in smartagri's voice. TODO: team to review the copy.
// Cards follow the Research section (dark on hover, mint tile, a ping and a
// per-step icon motion). A connector threads the cards in order, measured
// from where they actually sit, so it works at 3, 2 or 1 columns; it draws
// itself as the section scrolls and lights each step it reaches.

const loop = (duration: number, repeatDelay = 0) => ({
  duration,
  repeat: Infinity,
  repeatDelay,
  ease: "easeInOut" as const,
});
const rest = { x: 0, y: 0, rotate: 0, scale: 1, transition: { duration: 0.3 } };

const steps: {
  icon: typeof Search;
  title: string;
  desc: string;
  motion: Variants;
}[] = [
  {
    icon: Search,
    title: "Inquiry & Assessment",
    desc: "You reach out and tell us about your land, crop, or challenge. We review your goals and field conditions to see how we can help.",
    // Magnifier sweeping across, looking around.
    motion: {
      show: rest,
      hover: { x: [0, -4, 4, 0], rotate: [0, -8, 8, 0], transition: loop(1.4) },
    },
  },
  {
    icon: ClipboardList,
    title: "Field Scoping & Blueprint",
    desc: "Our researchers study your context, gather technical requirements, and shape an approach tailored to your crop, climate, and scale.",
    // Clipboard being checked off: a small hop.
    motion: {
      show: rest,
      hover: { y: [0, -5, 0, -2, 0], transition: loop(1, 0.3) },
    },
  },
  {
    icon: FileText,
    title: "Proposal & Agreement",
    desc: "We share a clear plan covering timeline, technology, resources, and key milestones, so everyone knows what to expect.",
    // Page turning over.
    motion: {
      show: rest,
      hover: {
        rotate: [0, -12, 6, 0],
        scale: [1, 1.08, 1],
        transition: loop(1.3, 0.2),
      },
    },
  },
  {
    icon: FlaskConical,
    title: "Deployment & Trial",
    desc: "Our team installs sensors, flies drones, or runs models on your plots, testing under real field conditions with open communication.",
    // Flask being swirled.
    motion: {
      show: rest,
      hover: { rotate: [0, 14, -14, 10, -6, 0], transition: loop(1.2, 0.2) },
    },
  },
  {
    icon: GraduationCap,
    title: "Handover & Training",
    desc: "We hand over the working system with documentation and train your team to run it confidently, season after season.",
    // Cap tossed in the air.
    motion: {
      show: rest,
      hover: { y: [0, -9, 0], rotate: [0, -15, 0], transition: loop(1, 0.35) },
    },
  },
  {
    icon: LineChart,
    title: "Review & Support",
    desc: "We measure results against your goals and stay on to maintain, support, and keep improving the system over time.",
    // Chart climbing.
    motion: {
      show: rest,
      hover: { scale: [1, 1.15, 1], y: [0, -3, 0], transition: loop(1.1) },
    },
  },
];

const card: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
  hover: { y: -4, transition: { duration: 0.3, ease: "easeOut" } },
};

const ping: Variants = {
  show: { scale: 1, opacity: 0 },
  hover: {
    scale: [1, 1.45],
    opacity: [0.6, 0],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeOut" },
  },
};

type Box = { left: number; top: number; width: number; height: number };

// Builds the connector through the cards in order, from layout boxes (not
// on-screen rects, so the cards' rise-in animation can't skew it). Within a
// row it runs straight across at icon height; between rows it leaves the card
// bottom, runs along the middle of the row gap, and enters the next card top.
// `joints` are where the line meets each card's edge, drawn as small nodes.
function connectorPath(boxes: Box[]) {
  const r = 16; // corner radius
  const pts = boxes.map((b) => ({
    l: b.left,
    t: b.top,
    b: b.top + b.height,
    cx: b.left + b.width / 2,
    cy: b.top + 44, // level with the icon row
  }));
  let d = "";
  const segs: string[] = [];
  const marks: number[] = [];
  const joints: { x: number; y: number }[] = [];
  pts.forEach((p, i) => {
    if (i === 0) {
      d = `M ${p.cx} ${p.cy}`;
      marks.push(0);
      return;
    }
    const a = pts[i - 1];
    let seg: string;
    if (Math.abs(a.t - p.t) < 8) {
      seg = ` L ${p.cx} ${p.cy}`;
      joints.push({ x: p.l, y: p.cy });
    } else if (Math.abs(p.cx - a.cx) < 2) {
      seg = ` L ${p.cx} ${p.cy}`;
      joints.push({ x: p.cx, y: p.t });
    } else {
      const midY = (a.b + p.t) / 2;
      const dir = p.cx > a.cx ? 1 : -1;
      seg =
        ` L ${a.cx} ${midY - r} Q ${a.cx} ${midY} ${a.cx + dir * r} ${midY}` +
        ` L ${p.cx - dir * r} ${midY} Q ${p.cx} ${midY} ${p.cx} ${midY + r}` +
        ` L ${p.cx} ${p.cy}`;
      joints.push({ x: a.cx, y: a.b }, { x: p.cx, y: p.t });
    }
    segs.push(seg);
    d += seg;
    marks.push(segs.length);
  });
  return {
    d,
    segs,
    start: pts[0] ? `M ${pts[0].cx} ${pts[0].cy}` : "",
    marks,
    joints,
  };
}

export default function CollaborationProcess() {
  const section = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const drawn = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [path, setPath] = useState("");
  const [joints, setJoints] = useState<{ x: number; y: number; at: number }[]>(
    [],
  );
  const [thresholds, setThresholds] = useState<number[]>([]);
  const [reached, setReached] = useState(-1);
  const [drawnTo, setDrawnTo] = useState(0);

  // Measure card positions and rebuild the connector on any resize.
  useEffect(() => {
    const measure = () => {
      const g = grid.current;
      if (!g) return;
      // offset* = layout position inside the (relative) grid, unaffected by
      // the transforms of the reveal and hover animations.
      const boxes = cards.current.filter(Boolean).map((c) => ({
        left: c!.offsetLeft,
        top: c!.offsetTop,
        width: c!.offsetWidth,
        height: c!.offsetHeight,
      }));
      const { d, segs, start, marks, joints } = connectorPath(boxes);
      setSize({ w: g.offsetWidth, h: g.offsetHeight });
      setPath(d);
      // Share of the total length at which each card (and node) is reached.
      const probe = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      probe.setAttribute("d", d);
      const total = probe.getTotalLength() || 1;
      setThresholds(
        marks.map((m) => {
          if (m === 0) return 0;
          probe.setAttribute("d", start + segs.slice(0, m).join(""));
          return probe.getTotalLength() / total;
        }),
      );
      probe.setAttribute("d", d);
      setJoints(
        joints.map((j) => {
          // Length along the path to the point nearest this node.
          let best = 0;
          let bestDist = Infinity;
          const steps = 400;
          for (let k = 0; k <= steps; k++) {
            const pt = probe.getPointAtLength((k / steps) * total);
            const dist = (pt.x - j.x) ** 2 + (pt.y - j.y) ** 2;
            if (dist < bestDist) {
              bestDist = dist;
              best = k / steps;
            }
          }
          return { ...j, at: best };
        }),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (grid.current) ro.observe(grid.current);
    return () => ro.disconnect();
  }, []);

  // Draw the line with scroll: from when the grid enters to when it settles.
  const { scrollYProgress } = useScroll({
    target: grid,
    offset: ["start 80%", "end 85%"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  useMotionValueEvent(progress, "change", (v) => {
    let last = -1;
    thresholds.forEach((t, i) => {
      if (v >= t - 0.002) last = i;
    });
    setReached(last);
    setDrawnTo(v);
    const el = drawn.current;
    const c = dot.current;
    if (el && c && path) {
      const len = el.getTotalLength();
      const pt = el.getPointAtLength(Math.max(0, Math.min(1, v)) * len);
      c.setAttribute("cx", String(pt.x));
      c.setAttribute("cy", String(pt.y));
      c.setAttribute("opacity", v > 0.001 && v < 0.999 ? "1" : "0");
    }
  });

  return (
    <MotionConfig reducedMotion="user">
      <section className="relative" ref={section}>
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-20 md:py-28">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between mb-14">
            <motion.h2
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.5 }}
              className="text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-900 sm:text-5xl md:text-[64px]"
              style={display}
            >
              <MaskLine delay={0}>From first hello</MaskLine>
              <MaskLine delay={0.12}>
                <span style={accent}>to field results.</span>
              </MaskLine>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
              className="max-w-[460px] text-base leading-relaxed text-neutral-500 md:text-lg"
              style={body}
            >
              How a collaboration with smartagri runs, in six steps, from your
              first message to a system your team runs with confidence.
            </motion.p>
          </div>

          <div
            ref={grid}
            className="relative grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-2 md:gap-y-20 lg:grid-cols-3"
          >
            {/* Connector: a faint full route, the mint part drawn with scroll. */}
            {path && (
              <svg
                className="pointer-events-none absolute inset-0 overflow-visible"
                width={size.w}
                height={size.h}
                aria-hidden="true"
              >
                <path
                  d={path}
                  fill="none"
                  stroke="#0B6477"
                  strokeOpacity={0.15}
                  strokeWidth={2}
                  strokeDasharray="4 6"
                />
                <motion.path
                  ref={drawn}
                  d={path}
                  fill="none"
                  stroke="#14919B"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  style={{ pathLength: progress }}
                />
                <circle
                  ref={dot}
                  r={6}
                  fill="#45DFB1"
                  opacity={0}
                  style={{
                    filter: "drop-shadow(0 0 6px rgba(69,223,177,0.9))",
                  }}
                />
              </svg>
            )}

            {steps.map((step, i) => {
              const on = i <= reached;
              return (
                <motion.div
                  key={step.title}
                  ref={(el) => {
                    cards.current[i] = el;
                  }}
                  variants={card}
                  initial="hidden"
                  whileInView="show"
                  whileHover="hover"
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    delay: (i % 3) * 0.1,
                    duration: 0.55,
                    ease: "easeOut",
                  }}
                  className={`group relative z-[1] flex flex-col gap-4 rounded-3xl border bg-white p-7 transition-[background-color,border-color,box-shadow] duration-300 hover:border-[#08313A] hover:bg-[#08313A] hover:shadow-xl ${
                    on
                      ? "border-[#14919B]/45 shadow-[0_18px_50px_-30px_rgba(20,145,155,0.6)]"
                      : "border-[#0B6477]/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="relative h-12 w-12">
                      <motion.span
                        variants={ping}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-2xl border-2 border-[#45DFB1]"
                      />
                      <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#0B6477] transition-colors duration-300 group-hover:bg-[#45DFB1]">
                        <motion.span
                          variants={step.motion}
                          className="inline-flex"
                        >
                          <step.icon className="h-6 w-6 text-[#45DFB1] transition-colors duration-300 group-hover:text-[#08313A]" />
                        </motion.span>
                      </div>
                    </div>
                    <span
                      className={`grid h-8 min-w-8 place-items-center rounded-full px-2 text-[13px] font-semibold tabular-nums transition-colors duration-500 ${
                        on
                          ? "bg-[#45DFB1] text-[#0B2A22]"
                          : "bg-[#F3F7F6] text-neutral-400 group-hover:bg-white/10 group-hover:text-white/70"
                      }`}
                      style={body}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div
                    className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#14919B] transition-colors duration-300 group-hover:text-[#45DFB1]"
                    style={body}
                  >
                    Step {i + 1}
                  </div>
                  <h3
                    className="-mt-2 text-xl font-medium leading-snug text-neutral-900 transition-colors duration-300 group-hover:text-white md:text-2xl"
                    style={display}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed text-neutral-500 transition-colors duration-300 group-hover:text-white/70 md:text-base"
                    style={body}
                  >
                    {step.desc}
                  </p>
                </motion.div>
              );
            })}

            {/* Nodes where the line meets each card, lit once reached; above
                the cards so the card edges don't cover half of each node. */}
            {path && (
              <svg
                className="pointer-events-none absolute inset-0 z-[2] overflow-visible"
                width={size.w}
                height={size.h}
                aria-hidden="true"
              >
                {joints.map((j, k) => {
                  const lit = drawnTo >= j.at - 0.002;
                  return (
                    <circle
                      key={k}
                      cx={j.x}
                      cy={j.y}
                      r={5}
                      fill={lit ? "#45DFB1" : "#FFFFFF"}
                      stroke={lit ? "#14919B" : "#0B6477"}
                      strokeOpacity={lit ? 1 : 0.3}
                      strokeWidth={2}
                      style={{ transition: "fill 300ms, stroke 300ms" }}
                    />
                  );
                })}
              </svg>
            )}
          </div>

          {/* The partners we collaborate with: who pairs with the process above. */}
          <div className="mt-20 md:mt-28 pt-16 md:pt-20 border-t border-[#0B6477]/10">
            <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <motion.h3
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.5 }}
                className="text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-neutral-900 sm:text-5xl md:text-[64px]"
                style={display}
              >
                <MaskLine delay={0}>In collaboration</MaskLine>
                <MaskLine delay={0.12}>
                  <span style={accent}>with leading partners.</span>
                </MaskLine>
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                className="max-w-[460px] text-base leading-relaxed text-neutral-500 md:text-lg"
                style={body}
              >
                Universities, ministries, government institutions, industry and farmer groups
                we research, build and deploy with, at home and abroad.
              </motion.p>
            </div>
            <PartnerGrid />
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
