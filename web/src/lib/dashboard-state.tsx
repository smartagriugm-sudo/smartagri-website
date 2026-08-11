import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CloudRain, CloudSun, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AERIAL_KEYS,
  INITIAL_TICK,
  POINTS_PER_DAY,
  ROOT_KEYS,
  ZONES,
  type MetricKey,
  type Sample,
  type Status,
  type WeatherSample,
  type Zone,
  alertsAt,
  devicesAt,
  rainfallToDate,
  readingAt,
  sampleWeather,
  seriesFor,
  statusOf,
  type AlertRow,
  type DeviceRow,
} from "./indoor-dashboard";

// Shared state for the dashboard application.
//
// It lives in a context rather than in the page because the app is now several
// routes (overview, zones, sensors, and so on) that must agree on one playhead
// and one selected zone. Without this, navigating from Overview to Zones would
// silently restart the clock and reset the selection, and the two screens would
// disagree about what "now" is.
//
// Hydration safety is the same constraint as before: the playhead starts at a
// fixed INITIAL_TICK so server and client render identically, and only starts
// moving after mount.

type DashboardState = {
  /** Playhead index into the modelled day, 0 to POINTS_PER_DAY - 1. */
  tick: number;
  setTick: (t: number) => void;
  playing: boolean;
  setPlaying: (fn: (p: boolean) => boolean) => void;

  zoneId: string;
  setZoneId: (id: string) => void;
  zone: Zone;

  metricKey: MetricKey;
  setMetricKey: (k: MetricKey) => void;

  reading: Sample;
  chartSeries: number[];
  weather: WeatherSample;
  WeatherIcon: LucideIcon;
  rain: number;
  devices: DeviceRow[];
  alerts: AlertRow[];

  onlineZones: Zone[];
  totalArea: number;
  /** Overall status of a zone, rolled up from its metrics. */
  zoneStatus: (z: Zone) => Status;
  /** How many online zones are fully inside their bands right now. */
  inBand: number;
};

const Ctx = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [zoneId, setZoneId] = useState(ZONES[0].id);
  const [metricKey, setMetricKey] = useState<MetricKey>("vpd");
  const [tick, setTick] = useState(INITIAL_TICK);
  const [playing, setPlaying] = useState(true);

  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];

  // The clock only starts after mount, so first paint matches the server.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTick((t) => (t + 1) % POINTS_PER_DAY);
    }, 2600);
    return () => clearInterval(id);
  }, [playing]);

  const reading = useMemo(() => readingAt(zone, tick), [zone, tick]);
  const chartSeries = useMemo(() => seriesFor(zone, metricKey), [zone, metricKey]);
  const weather = useMemo(() => sampleWeather(tick), [tick]);
  const rain = useMemo(() => rainfallToDate(tick), [tick]);
  const devices = useMemo(() => devicesAt(tick), [tick]);
  const alerts = useMemo(() => alertsAt(tick), [tick]);

  const onlineZones = ZONES.filter((z) => z.online);
  const totalArea = onlineZones.reduce((sum, z) => sum + z.area, 0);

  // A zone is healthy when every aerial and root metric sits inside its band.
  const zoneStatus = (z: Zone): Status => {
    if (!z.online) return "alert";
    const r = readingAt(z, tick);
    // PPFD, DLI, and flow are all schedule-driven: a dark room at 02:00 and a
    // closed irrigation valve are correct states, not faults, so they are not
    // allowed to drag a zone's overall status down.
    const keys = [...AERIAL_KEYS, ...ROOT_KEYS].filter(
      (k) => k !== "flow" && k !== "dli" && k !== "ppfd",
    );
    const statuses = keys.map((k) => statusOf(k, r[k], z));
    if (statuses.includes("alert")) return "alert";
    if (statuses.includes("watch")) return "watch";
    return "optimal";
  };

  const inBand = onlineZones.filter((z) => zoneStatus(z) === "optimal").length;
  const WeatherIcon =
    weather.condition === "Rain" ? CloudRain : weather.condition === "Clear" ? Sun : CloudSun;

  const value: DashboardState = {
    tick,
    setTick,
    playing,
    setPlaying,
    zoneId,
    setZoneId,
    zone,
    metricKey,
    setMetricKey,
    reading,
    chartSeries,
    weather,
    WeatherIcon,
    rain,
    devices,
    alerts,
    onlineZones,
    totalArea,
    zoneStatus,
    inBand,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboard(): DashboardState {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useDashboard must be used inside a DashboardProvider");
  }
  return v;
}
