import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User } from "lucide-react";
import { A } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import { RESEARCH_AREAS, type ResearchArea } from "../lib/research";

const PILL_ROW_HEIGHT = 56;
const PILL_GAP = 18;
const ACTIVE_HEIGHT = 80;
const ACTIVE_GAP = 22;

const ITEMS = RESEARCH_AREAS;

function Pill({ item, isActive }: { item: ResearchArea; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className={
        isActive
          ? "w-[calc(100%_-_60px)] mx-[30px] h-[80px] bg-white/25 backdrop-blur-xl shadow-xl rounded-full flex items-center gap-[8.5px]"
          : "w-[261px] h-[56px] px-3 bg-white/15 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-[8.5px]"
      }
      style={isActive ? { padding: 8.5 } : undefined}
    >
      <div
        className="rounded-full bg-white/30 shrink-0 flex items-center justify-center"
        style={isActive ? { width: 63, height: 63 } : { width: 44, height: 44 }}
      >
        {isActive ? (
          <motion.div layoutId={`icon-${item.label}`}>
            <Icon className="w-7 h-7 text-white" />
          </motion.div>
        ) : (
          <div className="w-full h-full rounded-full bg-white/10" />
        )}
      </div>
      <div className="relative flex-1 h-[44px] text-left ml-1">
        <motion.div
          className="absolute inset-0 flex flex-col justify-center"
          animate={{ opacity: isActive ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-white text-lg font-medium" style={body}>
            {item.label}
          </div>
          <div
            className="text-white/70 text-[11px] font-medium tracking-[0.15em] uppercase"
            style={body}
          >
            SMARTAGRI FOCUS
          </div>
        </motion.div>
        <motion.div
          className="absolute inset-0 flex flex-col justify-center gap-1.5"
          animate={{ opacity: isActive ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-2 w-[140px] bg-white/50 rounded-full" />
          <div className="h-2 w-[70px] bg-white/35 rounded-full" />
        </motion.div>
      </div>
    </motion.div>
  );
}

function FocusCarouselCard() {
  const [active, setActive] = useState(2);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % ITEMS.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  const len = ITEMS.length;

  return (
    <div className="relative flex-1 h-[585px] rounded-3xl overflow-hidden bg-[#0B6477]">
      {/* TODO: field.jpg is missing; deep teal gradient stands in until it lands in public/brand/ */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B6477] via-[#14919B] to-[#08313A]" />
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${A.backgroundCard})` }}
      />
      <div className="absolute inset-0 bg-[#08313A]/25" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full" style={{ height: ACTIVE_HEIGHT }}>
          {ITEMS.map((item, i) => {
            const diff =
              ((i - active + len + Math.floor(len / 2)) % len) -
              Math.floor(len / 2);
            const isActive = diff === 0;
            const visible = Math.abs(diff) <= 2;
            const y =
              diff === 0
                ? 0
                : diff < 0
                  ? diff * (PILL_ROW_HEIGHT + PILL_GAP) - ACTIVE_GAP
                  : diff * (PILL_ROW_HEIGHT + PILL_GAP) + ACTIVE_GAP;
            const opacity = !visible ? 0 : Math.abs(diff) === 2 ? 0.55 : 1;
            return (
              <motion.div
                key={item.label}
                animate={{ y, opacity }}
                transition={{
                  y: { type: "spring", stiffness: 260, damping: 28 },
                  opacity: { type: "tween", ease: "easeInOut", duration: 0.4 },
                }}
                className="absolute left-0 right-0 flex justify-center pointer-events-none"
              >
                <Pill item={item} isActive={isActive} />
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="pointer-events-none absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#08313A]/30 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#08313A]/30 to-transparent" />
    </div>
  );
}

function MorphBubble() {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setFilled(true), 1100);
    return () => clearTimeout(id);
  }, []);

  return (
    <motion.div
      layout
      animate={{ backgroundColor: filled ? "#14919B" : "#FAFAFA14" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="mx-[45px] h-[135px] rounded-3xl p-[22px] overflow-hidden relative"
    >
      <AnimatePresence mode="wait">
        {filled ? (
          <motion.div
            key="filled"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="flex items-center gap-[12px] h-[44px]">
              <div className="w-[44px] h-[44px] rounded-xl bg-white/20 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <span
                className="text-white text-base font-medium leading-none"
                style={body}
              >
                Farmer
              </span>
            </div>
            <p
              className="text-white text-[15px] leading-snug mt-[-9px] ml-[56px]"
              style={body}
            >
              Can smartagri flag crop disease before it spreads across my plots?
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FFFFFF54]" />
            <div className="ml-[12px] flex-1 flex flex-col gap-[9px] pr-[22px]">
              <div className="h-[6px] w-[31px] bg-[#FFFFFF3D] rounded-full mt-[17px]" />
              <div className="h-[6px] w-[85%] bg-[#FFFFFF3D] rounded-full" />
              <div className="h-[6px] w-[55%] bg-[#FFFFFF3D] rounded-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FieldQuestionCard() {
  const words = "Insights that empower every farmer".split(" ");
  return (
    <div className="relative flex-1 h-[585px] rounded-3xl overflow-hidden bg-[#08313A] flex flex-col pt-10 pb-10 justify-between">
      <div className="flex-1 flex flex-col justify-center gap-[10px] mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mx-[58px] h-[108px] rounded-2xl bg-[#FAFAFA14] flex items-start pt-[22px] pl-[22px] relative"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFFFFF54]" />
          <div className="ml-[12px] flex-1 flex flex-col gap-[9px] pr-[22px]">
            <div className="h-[6px] w-[31px] bg-[#FFFFFF3D] rounded-full mt-[17px]" />
            <div className="h-[6px] w-[85%] bg-[#FFFFFF3D] rounded-full" />
            <div className="h-[6px] w-[55%] bg-[#FFFFFF3D] rounded-full" />
          </div>
        </motion.div>
        <MorphBubble />
      </div>
      <div className="flex justify-between items-end pl-[32px] pr-[32px]">
        <h3
          className="w-64 text-white text-3xl md:text-4xl font-medium leading-tight"
          style={display}
        >
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: "easeOut" }}
              className="inline-block mr-[0.25em]"
            >
              {word}
            </motion.span>
          ))}
        </h3>
        <div className="flex items-center">
          <div
            className="relative w-10 h-10 rounded-full border-2 border-[#08313A] flex items-center justify-center text-xl font-medium bg-[#14919B] text-white z-30"
            style={body}
          >
            01
          </div>
          <div
            className="relative w-10 h-10 rounded-full border-2 border-[#08313A] flex items-center justify-center text-xl font-medium bg-[#0B6477] text-white/50 -ml-3 z-20"
            style={body}
          >
            2
          </div>
          <div
            className="relative w-10 h-10 rounded-full border-2 border-[#08313A] flex items-center justify-center text-xl font-medium bg-[#0B6477] text-white/40 -ml-3 z-10"
            style={body}
          >
            3
          </div>
        </div>
      </div>
    </div>
  );
}

const adaptableItems = [
  { label: "Crop & soil monitoring", color: "#0B6477" },
  { label: "Resource optimization", color: "#14919B" },
  { label: "Predictive analytics", color: "#14919B" },
];

function AdaptableCard() {
  const words =
    "Tune smartagri to fit your crop, climate, and goals, whether you manage open fields, orchards, or controlled-environment greenhouses.".split(
      " ",
    );
  return (
    <div className="relative flex-1 h-[585px] rounded-3xl overflow-hidden flex flex-col px-[33px] pt-[44px] pb-10 bg-[#14919B]">
      <div className="flex flex-col gap-[26px]">
        <h3
          className="text-white text-3xl md:text-4xl font-semibold tracking-[-0.025em] leading-[1.05]"
          style={display}
        >
          It's completely
          <br />
          adaptable.
        </h3>
        <p
          className="text-white/70 text-base md:text-lg font-normal leading-snug max-w-[340px]"
          style={body}
        >
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.6 + i * 0.04, duration: 0.4, ease: "easeOut" }}
              className="inline-block mr-[5px]"
            >
              {word}
            </motion.span>
          ))}
        </p>
      </div>
      <div className="mt-auto z-10 relative">
        <div className="flex flex-col gap-[12px]">
          {adaptableItems.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                delay: 1.1 + idx * 0.18,
                duration: 0.55,
                ease: "easeOut",
              }}
              className="w-full py-[15px] px-[27px] rounded-2xl bg-white flex items-center justify-between"
            >
              <span
                className="text-lg font-medium"
                style={{ ...body, color: item.color }}
              >
                {item.label}
              </span>
              <svg
                className="w-[22px] h-[22px] text-neutral-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </motion.div>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 -bottom-10 h-[140px] -mx-4 z-20"
          style={{
            background:
              "linear-gradient(to top, rgba(20,145,155,1) 0%, rgba(20,145,155,1) 35%, rgba(20,145,155,0.7) 65%, rgba(20,145,155,0) 80%)",
          }}
        />
      </div>
    </div>
  );
}

export default function ResearchAreas() {
  const cards = [
    <FocusCarouselCard key="carousel" />,
    <FieldQuestionCard key="question" />,
    <AdaptableCard key="adaptable" />,
  ];
  return (
    <section id="research" className="bg-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 pt-16 pb-20">
        <h2
          className="text-center text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.1] mb-12 text-neutral-900"
          style={display}
        >
          <span style={accent}>Smart research</span>{" "}
          for the
          <br />
          fields of tomorrow
        </h2>
        <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.35, duration: 1.1, ease: "easeOut" }}
              className="flex flex-1"
            >
              {card}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
