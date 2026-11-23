import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Factory,
  Layers,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { accent, body, display } from "../../lib/fonts";
import { useAuth } from "../../lib/auth/auth";
import { ago } from "../../lib/edge/field";
import {
  accessErrorText,
  agroAppsFor,
  useAgroAccess,
  type AgroAccess,
  type AgroApp,
} from "../../lib/agrosphere";
import { localeOf, useLang, useT, type Lang } from "../../lib/i18n";
import AgrosphereMark from "../AgrosphereMark";
import AgroHeader from "./AgroHeader";
import {
  readingLabel,
  useLauncherData,
  type LauncherData,
  type PlantFactoryLive,
  type SiteLive,
} from "./launcher-data";

// agrosphere's front page. Its one question: "what is happening in the places I
// look after, and where do I go next?". So the title panel states it in one line
// built from live data, and each card carries its own dashboard's figures (a
// greenhouse site's latest readings, the plant factory's batches and alarms)
// instead of an icon and a description. What shows comes from agro_my_apps(),
// so it always matches what the database lets the account read.

const EASE = [0.22, 1, 0.36, 1] as const;
const appInfo = (a: AgroApp, lang: Lang) =>
  agroAppsFor(lang).find((x) => x.app === a)!;

type Card =
  | { kind: "plant-factory"; key: string }
  | { kind: "greenhouse"; key: string; code: string | null; name: string }
  | { kind: "indoor"; key: string };

function cardsFor(
  access: AgroAccess,
  data: LauncherData | null,
  lang: Lang,
): Card[] {
  if (access.state === "open") {
    const sites = data?.sites ?? [];
    return [
      { kind: "plant-factory", key: "plant-factory" },
      ...(sites.length
        ? sites.map((s) => ({
            kind: "greenhouse" as const,
            key: `gh-${s.site.id}`,
            code: s.site.code,
            name: s.site.name,
          }))
        : [
            {
              kind: "greenhouse" as const,
              key: "gh",
              code: null,
              name: "Greenhouse",
            },
          ]),
      { kind: "indoor", key: "indoor" },
    ];
  }
  if (access.state !== "ready") return [];
  const order: AgroApp[] = ["plant-factory", "greenhouse", "indoor"];
  return [...access.entries]
    .sort(
      (x, y) =>
        order.indexOf(x.app) - order.indexOf(y.app) ||
        (x.site_name ?? "").localeCompare(y.site_name ?? ""),
    )
    .map((e): Card =>
      e.app === "greenhouse"
        ? {
            kind: "greenhouse",
            key: `gh-${e.site_id}`,
            code: e.site_code,
            name:
              e.site_name ??
              (lang === "id" ? "Lokasi greenhouse" : "Greenhouse site"),
          }
        : { kind: e.app, key: e.app },
    );
}

// Two cards per row on wide screens; the one carrying live readings takes the
// wider share, a lone last card takes the row.
function spans(cards: Card[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < cards.length; i += 2) {
    const a = cards[i];
    const b = cards[i + 1];
    if (!b) {
      out.push("lg:col-span-12");
      continue;
    }
    const rich = (c: Card) => c.kind === "greenhouse";
    if (rich(a) === rich(b)) out.push("lg:col-span-6", "lg:col-span-6");
    else if (rich(a)) out.push("lg:col-span-7", "lg:col-span-5");
    else out.push("lg:col-span-5", "lg:col-span-7");
  }
  return out;
}

function greeting(lang: Lang): string {
  const h = new Date().getHours();
  if (lang === "id")
    return h < 11
      ? "Selamat pagi"
      : h < 15
        ? "Selamat siang"
        : h < 19
          ? "Selamat sore"
          : "Selamat malam";
  return h < 11
    ? "Good morning"
    : h < 15
      ? "Good afternoon"
      : h < 19
        ? "Good evening"
        : "Good night";
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

// `ago` from lib/edge in Indonesian (same thresholds), for the card foot.
function agoText(iso: string, lang: Lang): string {
  if (lang !== "id") return ago(iso);
  const s = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (s < 60) return "baru saja";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

// The panel's one line: the finding across everything this account can see.
function finding(
  cards: Card[],
  data: LauncherData | null,
  lang: Lang,
): string {
  if (lang === "id") return findingId(cards, data);
  if (!cards.length)
    return "Nothing is shared with this account yet. A smartagri lab admin chooses which dashboards each account can open.";
  if (!data) return "Reading the latest figures from your dashboards...";
  const parts: string[] = [];
  if (data.sites.length) {
    const online = data.sites.filter((s) => s.online).length;
    parts.push(
      data.sites.length === 1
        ? `${data.sites[0].site.name} is ${online ? "reporting" : "offline"}`
        : `${online} of ${plural(data.sites.length, "greenhouse site")} reporting`,
    );
  }
  if (data.plantFactory) {
    const pf = data.plantFactory;
    parts.push(
      `the plant factory has ${plural(pf.growing, "batch", "batches")} growing` +
        (pf.alarms ? ` and ${plural(pf.alarms, "open alarm")}` : ""),
    );
  }
  if (!parts.length)
    return `${plural(cards.length, "dashboard")} open to this account.`;
  const line = parts.join(", ");
  return `${line[0].toUpperCase()}${line.slice(1)}.`;
}

// Indonesian has no plural endings, so the counts read as they are.
function findingId(cards: Card[], data: LauncherData | null): string {
  if (!cards.length)
    return "Belum ada yang dibagikan ke akun ini. Admin lab smartagri menentukan dashboard mana yang bisa dibuka setiap akun.";
  if (!data) return "Membaca angka terbaru dari dashboard Anda...";
  const parts: string[] = [];
  if (data.sites.length) {
    const online = data.sites.filter((s) => s.online).length;
    parts.push(
      data.sites.length === 1
        ? `${data.sites[0].site.name} ${online ? "sedang mengirim data" : "offline"}`
        : `${online} dari ${data.sites.length} lokasi greenhouse mengirim data`,
    );
  }
  if (data.plantFactory) {
    const pf = data.plantFactory;
    parts.push(
      `plant factory punya ${pf.growing} batch berjalan` +
        (pf.alarms ? ` dan ${pf.alarms} alarm aktif` : ""),
    );
  }
  if (!parts.length) return `${cards.length} dashboard terbuka untuk akun ini.`;
  const line = parts.join(", ");
  return `${line[0].toUpperCase()}${line.slice(1)}.`;
}

export default function AgroLauncher() {
  const { account, user } = useAuth();
  const lang = useLang();
  const t = useT();
  const access = useAgroAccess();
  const { data, refreshing, refresh } = useLauncherData(access);
  const cards = cardsFor(access, data, lang);
  const cardSpans = spans(cards);
  const name = account?.name || user?.email?.split("@")[0] || "";
  const firstName = name.split(" ")[0];

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#EEF3F1]" style={body}>
      <AgroHeader />

      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-14 sm:px-6">
        {/* Title panel: the greeting, the screen's question answered in one line, and
            the agrosphere mark from the sign-in page, still turning with the pointer. */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative overflow-hidden rounded-[28px] bg-[#08313A] px-6 py-9 sm:px-10 sm:py-12 lg:min-h-[300px]"
        >
          <div className="absolute inset-0 hidden md:block">
            <AgrosphereMark
              at={{ x: 0.82, y: 0.5 }}
              size={{ w: 0.2, h: 0.5, max: 150 }}
              dots={false}
            />
          </div>
          <div className="relative max-w-[620px]">
            <p className="text-[13px] font-medium tracking-[0.03em] text-[#80ED99]">
              {greeting(lang)}
              {firstName ? `, ${firstName}` : ""}
            </p>
            <h1
              className="mt-3 text-[36px] font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-[52px]"
              style={display}
            >
              {lang === "id" ? (
                <>
                  <span style={{ ...accent, color: "#45DFB1" }}>Dashboard</span>{" "}
                  Anda
                </>
              ) : (
                <>
                  Your{" "}
                  <span style={{ ...accent, color: "#45DFB1" }}>dashboards</span>
                </>
              )}
            </h1>
            <p className="mt-4 text-[17px] leading-[1.5] text-white/80">
              {finding(cards, data, lang)}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/60">
              {account?.isAdmin && (
                <span className="inline-flex items-center gap-1.5 text-[#80ED99]">
                  <ShieldCheck className="h-4 w-4" />
                  {t({
                    en: "Lab admin: every dashboard and site",
                    id: "Admin lab: semua dashboard dan lokasi",
                  })}
                </span>
              )}
              {data?.loadedAt && (
                <button
                  type="button"
                  onClick={refresh}
                  disabled={refreshing}
                  className="group inline-flex min-h-[32px] items-center gap-1.5 rounded-full text-white/60 transition-colors hover:text-white"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : "transition-transform duration-500 group-hover:rotate-180"}`}
                  />
                  {refreshing ? (
                    t({ en: "Refreshing...", id: "Memperbarui..." })
                  ) : (
                    <Freshness at={data.loadedAt} />
                  )}
                </button>
              )}
              {data?.sample && (
                <span className="text-[#FFD48A]">
                  {t({
                    en: "Sample figures, development only",
                    id: "Angka contoh, hanya untuk pengembangan",
                  })}
                </span>
              )}
            </div>
          </div>
        </motion.section>

        <section
          className="mt-5"
          aria-label={t({ en: "Dashboards", id: "Dashboard" })}
        >
          {access.state === "loading" ? (
            <SkeletonGrid />
          ) : access.state === "error" ? (
            <Empty
              title={t({
                en: "Your dashboards could not be loaded",
                id: "Dashboard Anda tidak dapat dimuat",
              })}
              text={accessErrorText(access, lang)}
            />
          ) : cards.length === 0 ? (
            <Empty
              title={t({
                en: "Nothing is shared with this account yet",
                id: "Belum ada yang dibagikan ke akun ini",
              })}
              text={t({
                en: "A smartagri lab admin chooses which dashboards each account can open. Ask them for access, then come back here.",
                id: "Admin lab smartagri menentukan dashboard mana yang bisa dibuka setiap akun. Minta akses kepada mereka, lalu kembali ke sini.",
              })}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
              {cards.map((c, i) => {
                const row = cardSpans[i] === "lg:col-span-12";
                return (
                  <motion.li
                    key={c.key}
                    className={`${cardSpans[i]} ${cards.length % 2 === 1 && i === cards.length - 1 ? "md:col-span-2" : ""}`}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.6,
                      ease: EASE,
                      delay: 0.2 + i * 0.08,
                    }}
                  >
                    {c.kind === "plant-factory" ? (
                      <PlantFactoryCard
                        live={data?.plantFactory ?? null}
                        loading={!data}
                        row={row}
                      />
                    ) : c.kind === "greenhouse" ? (
                      <GreenhouseCard
                        card={c}
                        live={
                          data?.sites.find((s) => s.site.code === c.code) ??
                          null
                        }
                        loading={!data}
                        row={row}
                      />
                    ) : (
                      <IndoorCard row={row} />
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <footer className="mx-auto w-full max-w-[1200px] px-4 pb-6 text-[13px] text-neutral-500 sm:px-6">
        {t({ en: "agrosphere by", id: "agrosphere oleh" })}{" "}
        <Link
          to="/"
          className="font-medium text-neutral-700 hover:text-[#0B6477]"
        >
          smartagri
        </Link>
      </footer>
    </main>
  );
}

/* ------------------------------------------------------------------ cards */

// A card is a head, a body and a foot. On its own in the last row (`row`) it lays
// them side by side as one strip instead of stretching a tall card across the page.
function CardShell({
  href,
  label,
  head,
  body,
  foot,
  tone = "light",
  row = false,
}: {
  href: string;
  label: string;
  head: ReactNode;
  body: ReactNode;
  foot: ReactNode;
  tone?: "light" | "mint";
  row?: boolean;
}) {
  // The address as the router writes it, so on agrosphere's own host a card links
  // straight to /plant-factory or /greenhouse instead of the internal route.
  const router = useRouter();
  const target = new URL(href, "http://local");
  const publicHref = router.buildLocation({
    to: target.pathname as never,
    search: Object.fromEntries(target.searchParams) as never,
  }).publicHref;
  return (
    <a
      href={publicHref}
      aria-label={label}
      className={`group relative flex h-full flex-col rounded-[22px] border p-6 ${
        row
          ? "min-h-[150px] lg:flex-row lg:items-center lg:gap-10"
          : "min-h-[230px]"
      } outline-none transition-[transform,border-color,box-shadow] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[#14919B]/45 hover:shadow-[0_22px_44px_-30px_rgba(8,49,58,0.45)] focus-visible:ring-4 focus-visible:ring-[#45DFB1]/40 active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        tone === "mint"
          ? "border-[#14919B]/15 bg-[#E3F4EE]"
          : "border-[#0B6477]/10 bg-white"
      }`}
    >
      <div className={row ? "lg:w-[30%] lg:shrink-0" : ""}>{head}</div>
      <div className={row ? "lg:flex-1 lg:[&>*:first-child]:mt-0" : ""}>
        {body}
      </div>
      <div
        className={`mt-auto ${row ? "lg:mt-0 lg:shrink-0 lg:[&>*]:pt-0" : ""}`}
      >
        {foot}
      </div>
    </a>
  );
}

function CardHead({
  icon: Icon,
  eyebrow,
  title,
  aside,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[13px] font-medium tracking-[0.03em] text-[#14919B]">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {eyebrow}
        </p>
        <h2
          className="mt-1.5 truncate text-[24px] font-medium leading-tight tracking-[-0.025em] text-neutral-900"
          style={display}
        >
          {title}
        </h2>
      </div>
      {aside}
    </div>
  );
}

function OpenLine({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 pt-6 text-[14px] font-medium text-[#0B6477]">
      {text}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
    </span>
  );
}

function GreenhouseCard({
  card,
  live,
  loading,
  row,
}: {
  card: Extract<Card, { kind: "greenhouse" }>;
  live: SiteLive | null;
  loading: boolean;
  row: boolean;
}) {
  const lang = useLang();
  const t = useT();
  const info = appInfo("greenhouse", lang);
  const href = card.code
    ? `${info.to}?site=${encodeURIComponent(card.code)}`
    : info.to;
  const online = live?.online ?? false;
  return (
    <CardShell
      href={href}
      label={t({
        en: `Open greenhouse ${card.name}`,
        id: `Buka greenhouse ${card.name}`,
      })}
      tone="mint"
      row={row}
      head={
        <>
          <CardHead
            icon={Sprout}
            eyebrow="Greenhouse"
            title={card.name}
            aside={
              live && (
                <span
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-medium ${online ? "bg-white text-[#0B6477]" : "bg-white/70 text-neutral-500"}`}
                >
                  <span className="relative flex h-2 w-2">
                    {online && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#45DFB1] opacity-70 motion-reduce:hidden" />
                    )}
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${online ? "bg-[#14919B]" : "bg-neutral-400"}`}
                    />
                  </span>
                  {online ? t({ en: "Live", id: "Aktif" }) : "Offline"}
                </span>
              )
            }
          />
          {live?.site.location && (
            <p className="mt-1 flex items-center gap-1 text-[13px] text-neutral-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {live.site.location}
            </p>
          )}
        </>
      }
      body={
        loading ? (
          <FigureSkeleton count={3} />
        ) : live && live.readings.length ? (
          <dl className="mt-6 grid grid-cols-3 gap-3">
            {live.readings.map((r) => (
              <div
                key={r.metric}
                className="rounded-2xl bg-white/80 px-3 py-3 transition-colors group-hover:bg-white"
              >
                <dt className="truncate text-[12px] text-neutral-500">
                  {readingLabel(r, lang)}
                </dt>
                <dd
                  className="mt-1 text-[26px] font-medium leading-none tracking-[-0.02em] text-neutral-900 tabular-nums"
                  style={display}
                >
                  <CountUp value={r.value} decimals={r.decimals} />
                  {r.unit && (
                    <span className="ml-0.5 text-[13px] font-normal text-neutral-500">
                      {r.unit}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-6 text-[14px] leading-[1.5] text-neutral-600">
            {info.blurb}
          </p>
        )
      }
      foot={
        <div className="flex flex-wrap items-end justify-between gap-2">
          <OpenLine text={t({ en: "Open site", id: "Buka lokasi" })} />
          {live && (
            <span className="pb-0.5 text-[12px] text-neutral-500">
              {live.site.last_seen_at
                ? t({
                    en: `Last reading ${agoText(live.site.last_seen_at, lang)}`,
                    id: `Data terakhir ${agoText(live.site.last_seen_at, lang)}`,
                  })
                : t({ en: "No reading yet", id: "Belum ada data" })}
              {live.sensors
                ? ` · ${lang === "id" ? `${live.sensors} instrumen` : plural(live.sensors, "instrument")}`
                : ""}
            </span>
          )}
        </div>
      }
    />
  );
}

function PlantFactoryCard({
  live,
  loading,
  row,
}: {
  live: PlantFactoryLive | null;
  loading: boolean;
  row: boolean;
}) {
  const lang = useLang();
  const t = useT();
  const info = appInfo("plant-factory", lang);
  const alarms = live?.alarms ?? null;
  return (
    <CardShell
      href={info.to}
      label={t({ en: "Open Plant Factory", id: "Buka Plant Factory" })}
      row={row}
      head={
        <CardHead
          icon={Factory}
          eyebrow={t({ en: "Operations", id: "Operasional" })}
          title={info.name}
        />
      }
      body={
        loading ? (
          <FigureSkeleton count={3} />
        ) : live ? (
          <dl className="mt-6 grid grid-cols-3 gap-4">
            <Figure
              label={t({ en: "Batches growing", id: "Batch berjalan" })}
              value={live.growing}
            />
            <Figure
              label={t({ en: "Plants in place", id: "Tanaman terpasang" })}
              value={live.plants}
            />
            <Figure
              label={t({ en: "Open alarms", id: "Alarm aktif" })}
              value={alarms}
              warn={!!alarms}
            />
          </dl>
        ) : (
          <p className="mt-4 text-[14px] leading-[1.5] text-neutral-600">
            {info.blurb}
          </p>
        )
      }
      foot={
        <OpenLine
          text={t({ en: "Open Plant Factory", id: "Buka Plant Factory" })}
        />
      }
    />
  );
}

function IndoorCard({ row }: { row: boolean }) {
  const lang = useLang();
  const t = useT();
  const info = appInfo("indoor", lang);
  return (
    <CardShell
      href={info.to}
      label={t({ en: "Open Indoor Farming", id: "Buka Indoor Farming" })}
      row={row}
      head={
        <CardHead
          icon={Layers}
          eyebrow={t({ en: "Facility", id: "Fasilitas" })}
          title={info.name}
          aside={
            <span className="shrink-0 rounded-full bg-[#FFF3DA] px-2.5 py-1 text-[12px] font-medium text-[#8A5A07]">
              {t({ en: "Simulation", id: "Simulasi" })}
            </span>
          }
        />
      }
      body={
        <p className="mt-4 max-w-[52ch] text-[14px] leading-[1.5] text-neutral-600">
          {info.blurb}{" "}
          {t({
            en: "Figures are simulated until the indoor devices report.",
            id: "Angka masih simulasi sampai perangkat indoor mengirim data.",
          })}
        </p>
      }
      foot={
        <OpenLine
          text={t({ en: "Open Indoor Farming", id: "Buka Indoor Farming" })}
        />
      }
    />
  );
}

function Figure({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: number | null;
  warn?: boolean;
}) {
  const lang = useLang();
  return (
    <div>
      <dt className="text-[12px] text-neutral-500">{label}</dt>
      <dd
        className={`mt-1 text-[30px] font-medium leading-none tracking-[-0.025em] tabular-nums ${warn ? "text-[#C4342F]" : "text-neutral-900"}`}
        style={display}
      >
        {value === null ? (
          <span className="text-neutral-300">
            {lang === "id" ? "t/a" : "n/a"}
          </span>
        ) : (
          <CountUp value={value} decimals={0} />
        )}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

// Figures count up once when they first arrive, then change in place.
function CountUp({ value, decimals }: { value: number; decimals: number }) {
  const reduced = useReducedMotion();
  const lang = useLang();
  const [shown, setShown] = useState(reduced ? value : 0);
  const from = useRef(reduced ? value : 0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let frame = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(a + (value - a) * eased);
      if (k < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return (
    <>
      {shown.toLocaleString(localeOf(lang), {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </>
  );
}

function Freshness({ at }: { at: number }) {
  const [, setNow] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setNow((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const t = useT();
  const mins = Math.floor((Date.now() - at) / 60_000);
  return (
    <>
      {mins < 1
        ? t({ en: "Updated just now", id: "Baru saja diperbarui" })
        : t({
            en: `Updated ${mins} min ago`,
            id: `Diperbarui ${mins} menit lalu`,
          })}
    </>
  );
}

function FigureSkeleton({ count }: { count: number }) {
  return (
    <div
      className="mt-6 grid gap-3"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-[62px] animate-pulse rounded-2xl bg-[#0B6477]/[0.06]"
        />
      ))}
    </div>
  );
}

function SkeletonGrid() {
  const t = useT();
  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-12"
      aria-label={t({
        en: "Loading your dashboards",
        id: "Memuat dashboard Anda",
      })}
    >
      <div className="h-[230px] animate-pulse rounded-[22px] bg-white/70 lg:col-span-5" />
      <div className="h-[230px] animate-pulse rounded-[22px] bg-white/70 lg:col-span-7" />
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#0B6477]/20 bg-white/70 px-6 py-12 text-center">
      <h2
        className="text-[20px] font-medium tracking-[-0.02em] text-neutral-900"
        style={display}
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-[440px] text-[15px] leading-[1.5] text-neutral-600">
        {text}
      </p>
    </div>
  );
}
