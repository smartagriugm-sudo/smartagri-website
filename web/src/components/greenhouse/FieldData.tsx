import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../../lib/auth/auth";
import { loadSeries, loadSites, loadSnapshot, type EdgePoint, type EdgeSite, type SiteSnapshot } from "../../lib/edge/field";
import { sampleSeries, sampleSites, sampleSnapshot } from "../../lib/edge/field-sample";

// Shared state for the Greenhouse sections: which sites this account may read
// (Row Level Security decides, supabase/edge-sync.sql), the selected one, and its
// latest snapshot. It lives in the /field layout so switching sections keeps the
// selected site and does not reload it.

// New averages arrive once per 10 minutes; checking every 2 minutes shows them soon after.
const REFRESH_MS = 120_000;

type SeriesLoader = (deviceId: string, metric: string, hours: number, now?: number) => Promise<{ data: EdgePoint[]; error: string | null }>;

export type FieldData = {
  /** Sign-in is configured, or the development sample stands in for it. */
  available: boolean;
  sample: boolean;
  /** The account is approved (or there is no account model to wait on). */
  active: boolean;
  isAdmin: boolean;
  sites: EdgeSite[] | null;
  site: EdgeSite | null;
  selectSite: (id: string) => void;
  snap: SiteSnapshot | null;
  error: string | null;
  now: number;
  refreshing: boolean;
  refresh: () => void;
  loadSeries: SeriesLoader;
};

const Ctx = createContext<FieldData | null>(null);

export function useFieldData(): FieldData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFieldData outside FieldDataProvider");
  return v;
}

/** For sections rendered only once a site and its snapshot are loaded. */
export function useSiteData(): FieldData & { site: EdgeSite; snap: SiteSnapshot } {
  const v = useFieldData();
  if (!v.site || !v.snap) throw new Error("useSiteData before the site loaded");
  return v as FieldData & { site: EdgeSite; snap: SiteSnapshot };
}

export function FieldDataProvider({ wantedSite, children }: { wantedSite?: string; children: ReactNode }) {
  const { account, isConfigured } = useAuth();
  const sample = !isConfigured && import.meta.env.DEV;
  const active = !account || account.status === "active";
  const [sites, setSites] = useState<EdgeSite[] | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SiteSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const pickFrom = useCallback(
    (list: EdgeSite[]) =>
      setSiteId((cur) =>
        cur && list.some((s) => s.id === cur) ? cur : (list.find((s) => s.code === wantedSite) ?? list[0])?.id ?? null,
      ),
    [wantedSite],
  );

  useEffect(() => {
    if (sample) {
      const list = sampleSites(Date.now());
      setSites(list);
      pickFrom(list);
      return;
    }
    if (!isConfigured || !active) return;
    let stop = false;
    void loadSites().then((r) => {
      if (stop) return;
      setSites(r.data);
      setError(r.error);
      pickFrom(r.data);
    });
    return () => {
      stop = true;
    };
  }, [sample, isConfigured, active, pickFrom, reloadKey]);

  // Latest values every two minutes while the tab is visible.
  useEffect(() => {
    if (!siteId) return;
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      setRefreshing(true);
      if (sample) {
        const at = Date.now();
        setSnap(sampleSnapshot(siteId, at));
        setNow(at);
        setRefreshing(false);
        return;
      }
      const [r, s] = await Promise.all([loadSnapshot(siteId), loadSites()]);
      if (stop) return;
      setSnap(r.data);
      if (s.error === null) setSites(s.data);
      setError(r.error);
      setNow(Date.now());
      setRefreshing(false);
    };
    void tick();
    const id = window.setInterval(tick, REFRESH_MS);
    const onVisible = () => void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [siteId, sample, reloadKey]);

  const selectSite = useCallback((id: string) => {
    setSnap(null);
    setSiteId(id);
  }, []);
  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);
  const series = useCallback<SeriesLoader>(
    async (deviceId, metric, hours, at = Date.now()) =>
      sample ? { data: sampleSeries(metric, hours, at), error: null } : loadSeries(deviceId, metric, hours, at),
    [sample],
  );

  const site = sites?.find((s) => s.id === siteId) ?? null;
  const value = useMemo<FieldData>(
    () => ({
      available: isConfigured || sample,
      sample,
      active,
      isAdmin: !!account?.isAdmin,
      sites,
      site,
      selectSite,
      snap: snap && site ? snap : null,
      error,
      now,
      refreshing,
      refresh,
      loadSeries: series,
    }),
    [isConfigured, sample, active, account?.isAdmin, sites, site, selectSite, snap, error, now, refreshing, refresh, series],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
