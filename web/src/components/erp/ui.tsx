import { useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import type { PerspectiveCamera } from "three";
import { body, display } from "../../lib/fonts";
import { HOLE_STATES, HOLE_STATE_KEYS, stateColor, type Batch, type HoleState, type Reading } from "../../lib/pf/facility";
import { LIFECYCLE_PHASES, lifecycleDay } from "../../lib/pf/store";

// Pieces shared by the two ERP screens, the plant factory and the growth chamber.

/** True from the first time the scene is wanted, and only after hydration, since the engines need the browser. */
export function useSceneGate(wanted: boolean) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (wanted) setOn(true);
  }, [wanted]);
  return on;
}

/** How long a hidden engine keeps drawing, so a preloaded one compiles its shaders before it is first shown. */
const PAUSE_AFTER_MS = 1000;

/**
 * Stops a hidden engine from using the GPU, and brings it up to date when it
 * shows again, since the other screen may have changed the data. The engines
 * have no pause of their own: their loop keeps running, but it draws through
 * the composer, so an own no-op render shadows the real one until it is deleted.
 */
export function useEngineActivity(engine: { three: { composer: unknown }; refresh: () => void } | null, active: boolean) {
  useEffect(() => {
    if (!engine) return;
    const composer = engine.three.composer as { render?: () => void };
    if (active) {
      delete composer.render;
      engine.refresh();
      return;
    }
    const t = window.setTimeout(() => {
      composer.render = () => {};
    }, PAUSE_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [engine, active]);
}

/** Moves the camera of either 3D engine along its line of sight; k below 1 moves closer. */
export function dolly(engine: { three: { camera: PerspectiveCamera; controls: unknown } }, k: number) {
  const { camera, controls } = engine.three;
  const orbit = controls as { target: PerspectiveCamera["position"]; update: () => void };
  camera.position.sub(orbit.target).multiplyScalar(k).add(orbit.target);
  orbit.update();
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[#DCE7E8] bg-white ${className}`}>
      {children}
    </div>
  );
}

/** A label and a number. What it counts is in its words, not in an icon. */
export function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="min-w-[150px] px-3.5 py-2.5">
      <p className="text-[13px] font-medium text-[#4F6B73]" style={body}>{label}</p>
      <p className="text-[22px] font-semibold leading-tight tabular-nums tracking-[-0.02em] text-[#0F2F36]" style={display}>{value}</p>
      <p className="text-[12px] text-[#4F6B73]" style={body}>{sub}</p>
    </Card>
  );
}

export function Segmented<T extends string | number>({ label, value, options, onChange }: { label?: string; value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex max-w-full items-center gap-1.5">
      {label && <span className="text-[12px] text-[#4F6B73]">{label}</span>}
      <div className="flex min-w-0 overflow-x-auto rounded-lg bg-[#EEF3F4] p-0.5 text-[13px] font-medium">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={value === o.key}
            onClick={() => onChange(o.key)}
            className={`min-h-[44px] whitespace-nowrap rounded-md px-2.5 py-1 lg:min-h-[28px] ${value === o.key ? "bg-white text-[#0F2F36] shadow-sm" : "text-[#4F6B73] hover:text-[#0F2F36]"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Readings({ title, items }: { title: string; items: Reading[] }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-[#4F6B73]">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {items.map((r) => (
          <div key={r.label} className="rounded-lg bg-[#F3F7F7] px-3 py-2">
            <p className="text-[12px] text-[#4F6B73]">{r.label}</p>
            <p className="text-[16px] font-semibold tracking-[-0.01em] text-[#0F2F36]">
              {r.value} <span className="text-[12px] font-normal text-[#4F6B73]">{r.unit}</span>
            </p>
            {!r.ok && <p className="text-[12px] font-medium text-[#B26205]">Out of range</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Bar({ value, max, color = "#14919B" }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5EEEF]">
      <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

export function StateBreakdown({ counts, total }: { counts: Record<HoleState, number>; total: number }) {
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {HOLE_STATE_KEYS.map((s) => (
          <div key={s} style={{ width: `${(counts[s] / total) * 100}%`, background: stateColor(s) }} />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {HOLE_STATE_KEYS.map((s) => (
          <div key={s} className="flex items-center justify-between text-[12.5px]">
            <span className="flex items-center gap-1.5 text-[#4F6B73]">
              <span className="h-2 w-2 rounded-full" style={{ background: stateColor(s) }} />
              {HOLE_STATES[s].label}
            </span>
            <span className="font-medium text-[#0F2F36]">{counts[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Work that is not the next step: one quiet line, opened when wanted. */
/** Its content mounts on first open, so what is folded away (a 3D model, a fetch) costs nothing until wanted. */
export function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [opened, setOpened] = useState(false);
  return (
    <details className="group" onToggle={(e) => { if (e.currentTarget.open) setOpened(true); }}>
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-xl border border-[#DCE7E8] bg-white px-4 py-2.5 text-[14px] font-medium text-[#0F2F36] hover:border-[#14919B] [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 text-[#4F6B73] transition-transform group-open:rotate-90" />
        {title}
      </summary>
      <div className="mt-2">{opened && children}</div>
    </details>
  );
}

/** Where something stands in a fixed run of steps. */
export function StepStrip({ steps, current, label }: { steps: readonly string[]; current: number; label: string }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[13px]" aria-label={label}>
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-1" aria-current={i === current ? "step" : undefined}>
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-[#9DB2B6]" aria-hidden="true" />}
          <span className={i === current ? "rounded-md bg-[#E3F4F4] px-2 py-0.5 font-medium text-[#0B6477]" : i < current ? "text-[#36525A]" : "text-[#4F6B73]"}>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="space-y-2 text-[13.5px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3">
          <span className="text-[#4F6B73]">{k}</span>
          <span className="text-right font-medium tabular-nums text-[#0F2F36]">{v}</span>
        </div>
      ))}
    </div>
  );
}

export function Note({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warn" }) {
  const cls = tone === "warn" ? "bg-[#FFF6E5] text-[#8A5A07]" : "bg-[#F3F7F7] text-[#4F6B73]";
  return <p role={tone === "warn" ? "alert" : undefined} className={`rounded-lg px-3 py-2 text-[12.5px] ${cls}`}>{children}</p>;
}

export function PanelHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="border-b border-[#E3ECED] pb-3">
      <p className="text-[13px] font-medium tracking-[0.03em] text-[#0B6477]">{eyebrow}</p>
      <h2 className="text-[19px] font-semibold tracking-[-0.025em] text-[#0F2F36]" style={display}>{title}</h2>
      {sub && <p className="text-[13px] text-[#4F6B73]">{sub}</p>}
    </div>
  );
}

/** Soft hyphens where the long step names may break; the browser shows one only when it breaks there. */
const breakable = (label: string) => label.replace(/^Germination$/, "Germi­nation").replace(/^Vegetative$/, "Vege­tative");

/** One batch's way from sowing in the chamber to harvest in the plant factory. */
export function Lifecycle({ batch, phase, compact = false }: { batch: Batch; phase: number; compact?: boolean }) {
  return (
    <Card className="h-full px-5 py-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#0F2F36]" style={display}>Batch flow</p>
        <p className="text-[12.5px] text-[#4F6B73]">{batch.code} · {batch.crop} · {batch.recipe}</p>
      </div>
      <ol className="grid grid-cols-5">
        {LIFECYCLE_PHASES.map((p, i) => {
          const done = i < phase;
          const now = i === phase;
          return (
            <li key={p.label} className="relative flex min-w-0 flex-col items-center px-0.5 text-center">
              {i > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${i <= phase ? "bg-[#14919B]" : "bg-[#DCE7E8]"}`} />}
              <span
                className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-[12px] font-semibold ${
                  now ? "border-[#14919B] bg-white text-[#0B6477] ring-4 ring-[#14919B]/15" : done ? "border-[#14919B] bg-[#14919B] text-white" : "border-[#DCE7E8] bg-white text-[#4F6B73]"
                }`}
              >
                {i + 1}
              </span>
              {/* A fifth of a phone is narrower than "Germination": it breaks at a soft hyphen instead of running into the next step. */}
              <span className={`mt-1.5 w-full text-[11.5px] font-medium leading-tight sm:text-[12.5px] ${now ? "text-[#0F2F36]" : "text-[#4F6B73]"}`}>{breakable(p.label)}</span>
              <span className="text-[12px] text-[#4F6B73]">{compact ? "" : `${p.place} · `}day {lifecycleDay(i, batch)}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export function SceneStatus({ failed }: { failed: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-[#4F6B73]">
      {failed ? (
        <span className="text-[13px]">The 3D model could not be loaded. Reload the page to try again.</span>
      ) : (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#0B6477]" />
          <span className="text-[13px]" style={body}>Loading 3D model…</span>
        </>
      )}
    </div>
  );
}
