import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  MotionConfig,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowRight, ArrowUpRight, FlaskConical, Sprout, Users } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import { MaskLine } from "./NoteParts";

// Closing call to action: a dark card with the invitation on the left and a
// living field illustration on the right that tells "sense. analyze. grow.":
// plants growing in the rows, a field station pinging, a drone scanning, and
// readings flowing up to a floating dashboard. The illustration leans with
// the pointer (parallax by layer), and hovering one of the three ways to work
// with us lights the matching part of the scene.

const MINT = "#45DFB1";
const CYAN = "#0AD1C8";
const GREEN = "#80ED99";
const EASE = [0.16, 1, 0.3, 1] as const;

type Focus = "research" | "pilot" | "team" | null;

const PATHS: { key: Exclude<Focus, null>; icon: typeof Sprout; label: string; to: string; hash?: string }[] = [
  { key: "research", icon: FlaskConical, label: "Partner on research", to: "/research" },
  { key: "pilot", icon: Sprout, label: "Pilot on your fields", to: "/contact-us", hash: "inquiry" },
  { key: "team", icon: Users, label: "Join the team", to: "/team" },
];

// Field geometry: rows run from the horizon (y 262) to the front edge (y 420).
const ROWS = Array.from({ length: 9 }, (_, i) => ({
  top: 132 + i * 37,
  bottom: 40 + i * 60,
}));
const PLANTS = ROWS.slice(1, 8).flatMap((row, i) =>
  [0.28, 0.58, 0.88].map((t, j) => ({
    x: row.top + (row.bottom - row.top) * t,
    y: 262 + 158 * t,
    s: 0.45 + 0.75 * t,
    delay: 0.4 + (i + j * 3) * 0.06,
  })),
);

function Layer({
  depth,
  mx,
  my,
  dim,
  children,
}: {
  depth: number;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  dim: boolean;
  children: React.ReactNode;
}) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.g style={{ x, y }} animate={{ opacity: dim ? 0.28 : 1 }} transition={{ duration: 0.4 }}>
      {children}
    </motion.g>
  );
}

function Illustration({ focus, mx, my }: { focus: Focus; mx: MotionValue<number>; my: MotionValue<number> }) {
  const dim = (part: Exclude<Focus, null>) => focus !== null && focus !== part;
  return (
    <svg viewBox="0 0 560 440" className="h-auto w-full" role="img" aria-label="A smart field: growing plants, a sensor station, a drone and a live dashboard">
      <defs>
        <linearGradient id="cta-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14919B" stopOpacity="0.05" />
          <stop offset="1" stopColor="#14919B" stopOpacity="0.28" />
        </linearGradient>
        <radialGradient id="cta-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={MINT} stopOpacity="0.35" />
          <stop offset="1" stopColor={MINT} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Field: ground, rows, plants (pilot). */}
      <Layer depth={6} mx={mx} my={my} dim={dim("pilot")}>
        <polygon points="40,420 520,420 428,262 132,262" fill="url(#cta-ground)" />
        {ROWS.map((r, i) => (
          <line key={i} x1={r.top} y1={262} x2={r.bottom} y2={420} stroke={MINT} strokeOpacity={0.22} strokeWidth={1.2} />
        ))}
        <line x1={132} y1={262} x2={428} y2={262} stroke={MINT} strokeOpacity={0.3} />
        {PLANTS.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
            <motion.g
              initial={{ scaleY: 0, opacity: 0 }}
              whileInView={{ scaleY: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: p.delay, duration: 0.7, ease: EASE }}
              style={{ originX: 0.5, originY: 1 }}
            >
              <motion.g
                animate={{ rotate: [0, -6, 4, 0] }}
                transition={{ duration: 3.2 + (i % 4) * 0.4, repeat: Infinity, ease: "easeInOut", delay: (i % 5) * 0.3 }}
                style={{ originX: 0.5, originY: 1 }}
              >
                <path d="M0 0 V-16" stroke={GREEN} strokeWidth={2} strokeLinecap="round" />
                <path d="M0 -9 C -8 -12 -10 -18 -9 -21 C -3 -20 0 -15 0 -9 Z" fill={MINT} />
                <path d="M0 -12 C 8 -15 10 -21 9 -24 C 3 -23 0 -18 0 -12 Z" fill={GREEN} />
              </motion.g>
            </motion.g>
          </g>
        ))}
      </Layer>

      {/* Field station with a pulsing sensor (pilot). */}
      <Layer depth={12} mx={mx} my={my} dim={dim("pilot")}>
        <line x1={150} y1={318} x2={150} y2={222} stroke="#CFE9E4" strokeWidth={3} />
        <polygon points="128,214 174,204 178,214 132,224" fill="#0AD1C8" fillOpacity={0.55} stroke="#CFE9E4" strokeWidth={1.2} />
        <rect x={138} y={236} width={24} height={30} rx={3} fill="#0B6477" stroke="#CFE9E4" strokeWidth={1.2} />
        <circle cx={150} cy={251} r={3} fill={MINT} />
        {[0, 0.8, 1.6].map((d) => (
          <motion.circle
            key={d}
            cx={150}
            cy={251}
            fill="none"
            stroke={MINT}
            strokeWidth={1.5}
            initial={{ r: 4, opacity: 0.7 }}
            animate={{ r: [4, 46], opacity: [0.7, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: d, ease: "easeOut" }}
          />
        ))}
      </Layer>

      {/* Readings flowing to the dashboard (research). */}
      <Layer depth={16} mx={mx} my={my} dim={dim("research")}>
        {[
          "M150 210 C 170 140, 260 110, 372 104",
          "M262 168 C 300 150, 340 158, 372 146",
        ].map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke={i ? CYAN : MINT}
            strokeWidth={1.6}
            strokeDasharray="4 7"
            strokeOpacity={0.8}
            animate={{ strokeDashoffset: [0, -44] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </Layer>

      {/* Drone sweeping over the field with its scan cone (team). */}
      <Layer depth={20} mx={mx} my={my} dim={dim("team")}>
        <motion.g
          animate={{ x: [0, 50, 85, 30, -45, 0], y: [0, -10, 8, 16, 4, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.polygon
            points="250,167 214,262 286,262"
            fill={MINT}
            animate={{ fillOpacity: [0.06, 0.16, 0.06] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <line x1={226} y1={155} x2={274} y2={155} stroke="#CFE9E4" strokeWidth={2.5} strokeLinecap="round" />
          <rect x={240} y={151} width={20} height={12} rx={3} fill="#0B6477" stroke="#CFE9E4" strokeWidth={1.4} />
          {[226, 274].map((x) => (
            <motion.ellipse
              key={x}
              cx={x}
              cy={150}
              rx={12}
              initial={{ rx: 12 }}
              ry={2}
              fill="#CFE9E4"
              fillOpacity={0.7}
              animate={{ rx: [12, 4, 12] }}
              transition={{ duration: 0.18, repeat: Infinity }}
            />
          ))}
          <circle cx={250} cy={165} r={2.5} fill={MINT} />
        </motion.g>
      </Layer>

      {/* Floating dashboard with live bars and a trend line (research). */}
      <Layer depth={28} mx={mx} my={my} dim={dim("research")}>
        <motion.g animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx={445} cy={110} r={110} fill="url(#cta-glow)" />
          <rect x={360} y={40} width={172} height={128} rx={16} fill="#0B6477" fillOpacity={0.92} stroke={MINT} strokeOpacity={0.35} />
          <circle cx={378} cy={58} r={3.5} fill={MINT} />
          <rect x={388} y={55} width={48} height={6} rx={3} fill="#CFE9E4" fillOpacity={0.5} />
          <rect x={488} y={53} width={30} height={10} rx={5} fill={MINT} fillOpacity={0.25} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const h = [34, 52, 28, 60, 44, 70][i];
            return (
              <motion.rect
                key={i}
                x={378 + i * 24}
                y={154 - h}
                height={h}
                width={14}
                initial={{ height: h, y: 154 - h }}
                rx={3}
                fill={i === 5 ? MINT : "#14919B"}
                animate={{ height: [h, h * 0.55, h * 0.85, h], y: [154 - h, 154 - h * 0.55, 154 - h * 0.85, 154 - h] }}
                transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
              />
            );
          })}
          <motion.path
            d="M376 110 C 400 96, 420 104, 444 90 S 492 70, 516 76"
            fill="none"
            stroke={GREEN}
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 1.6, ease: EASE }}
          />
        </motion.g>
      </Layer>
    </svg>
  );
}

export default function CallToAction() {
  const [focus, setFocus] = useState<Focus>(null);
  // Pointer position over the card, -1..1 on each axis, eased.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 80, damping: 18 });
  const my = useSpring(rawY, { stiffness: 80, damping: 18 });

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    rawX.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    rawY.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };

  return (
    <MotionConfig reducedMotion="user">
      <section id="contact" className="relative">
        <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: EASE }}
            onPointerMove={onMove}
            onPointerLeave={() => {
              rawX.set(0);
              rawY.set(0);
            }}
            data-header-theme="dark"
            className="relative grid items-center gap-10 overflow-clip rounded-[32px] bg-[#08313A] px-6 py-14 md:px-14 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-6"
          >
            {/* Soft drifting light in the card. */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-[380px] w-[380px] rounded-full bg-[#14919B]/30 blur-3xl animate-wash-a" />
            <div className="pointer-events-none absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full bg-[#45DFB1]/20 blur-3xl animate-wash-b" />

            <div className="relative flex flex-col gap-6">
              <motion.h2
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.5 }}
                className="text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-5xl md:text-[58px]"
                style={display}
              >
                <MaskLine delay={0.1}>Let's grow the future</MaskLine>
                <MaskLine delay={0.22}>
                  of farming <span style={{ ...accent, color: GREEN }}>together.</span>
                </MaskLine>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ delay: 0.35, duration: 0.6, ease: "easeOut" }}
                className="max-w-[520px] text-base leading-relaxed text-white/75 md:text-lg"
                style={body}
              >
                Partner with our researchers, pilot smartagri on your fields, or join the team
                building data-driven agriculture.
              </motion.p>

              {/* Three ways in; hovering one lights its part of the scene. */}
              <motion.ul
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ delay: 0.45, duration: 0.6, ease: "easeOut" }}
                className="flex flex-wrap gap-2"
              >
                {PATHS.map((p) => (
                  <li key={p.key}>
                    <Link
                      to={p.to}
                      hash={p.hash}
                      onMouseEnter={() => setFocus(p.key)}
                      onMouseLeave={() => setFocus(null)}
                      onFocus={() => setFocus(p.key)}
                      onBlur={() => setFocus(null)}
                      className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition-colors hover:border-[#45DFB1]/60 hover:bg-[#45DFB1]/10 hover:text-white"
                      style={body}
                    >
                      <p.icon className="h-4 w-4 text-[#45DFB1]" />
                      {p.label}
                      <ArrowUpRight className="h-3.5 w-3.5 text-white/50 transition-[rotate,color] duration-300 group-hover:rotate-45 group-hover:text-[#45DFB1]" />
                    </Link>
                  </li>
                ))}
              </motion.ul>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ delay: 0.55, duration: 0.6, ease: "easeOut" }}
                className="mt-2 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8"
              >
                <Link
                  to="/contact-us"
                  hash="inquiry"
                  className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#45DFB1] px-6 text-sm font-medium uppercase tracking-[0.08em] text-[#0B2A22] shadow-lg transition-colors hover:bg-[#80ED99] md:h-14 md:px-7 md:text-[15px]"
                  style={body}
                >
                  Start a project
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/about-us"
                  className="group inline-flex items-center gap-2 border-b border-white/40 pb-1.5 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors hover:border-[#45DFB1] md:text-[15px]"
                  style={body}
                >
                  Explore partnerships
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.2, duration: 0.9, ease: EASE }}
              className="relative mx-auto w-full max-w-[560px]"
            >
              <Illustration focus={focus} mx={mx} my={my} />
            </motion.div>
          </motion.div>
        </div>
      </section>
    </MotionConfig>
  );
}
