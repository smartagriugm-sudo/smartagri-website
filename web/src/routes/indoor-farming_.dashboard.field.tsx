import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { ScreenHeading } from "../components/dashboard/AppShell";
import { FieldDataProvider, useFieldData } from "../components/greenhouse/FieldData";
import { Loading, Notice, SiteBar } from "../components/greenhouse/parts";
import { greenhouseSection } from "../components/greenhouse/nav";
import { greenhouseNavCopy } from "../components/greenhouse/parts";
import { useLang, useT } from "../lib/i18n";

// The Greenhouse dashboard (agrosphere /greenhouse): measured data pushed by each
// field site's edge PC (supabase/edge-sync.sql). This layout loads the sites the
// account may read and the selected site's snapshot once; the sections below it
// (Overview, Sensors, Trends, Actuators, Manage sites) each show one part of it.
export const Route = createFileRoute("/indoor-farming_/dashboard/field")({
  // ?site=<code> opens that site first (the agrosphere launcher links each site this way).
  validateSearch: (search: Record<string, unknown>) => ({
    site: typeof search.site === "string" && /^[a-z0-9-]{2,40}$/.test(search.site) ? search.site : undefined,
  }),
  component: FieldLayout,
});

function FieldLayout() {
  const { site } = Route.useSearch();
  return (
    <FieldDataProvider wantedSite={site}>
      <FieldFrame />
    </FieldDataProvider>
  );
}

function FieldFrame() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const section = greenhouseSection(pathname);
  const { available, active, isAdmin, sites, site, snap, error } = useFieldData();
  const t = useT();
  const copy = greenhouseNavCopy(section, useLang());

  const heading = <ScreenHeading title={copy.label} blurb={copy.blurb} />;

  if (!available) {
    return (
      <>
        {heading}
        <Notice>{t({ en: "Sign-in is not configured on this deployment, so field data cannot be read.", id: "Login belum dikonfigurasi di deployment ini, jadi data lapangan tidak dapat dibaca." })}</Notice>
      </>
    );
  }
  if (!active) {
    return (
      <>
        {heading}
        <Notice>
          {t({
            en: "Your account is waiting for approval by the smartagri team. Once it is approved and a site is shared with you, its live data appears here.",
            id: "Akun Anda sedang menunggu persetujuan tim smartagri. Setelah disetujui dan sebuah lokasi dibagikan kepada Anda, data langsungnya tampil di sini.",
          })}{" "}
          <Link to="/welcome" search={{ redirect: "/indoor-farming/dashboard/field" }} className="font-medium text-[#0B6477] underline underline-offset-2">
            {t({ en: "Check your account", id: "Cek akun Anda" })}
          </Link>
        </Notice>
      </>
    );
  }

  // Managing sites works with no site yet (that is where the first one is made).
  if (section.adminOnly) {
    return (
      <>
        {heading}
        {isAdmin ? <Outlet /> : <Notice>{t({ en: "Only smartagri lab admins can manage field sites.", id: "Hanya admin lab smartagri yang dapat mengelola lokasi lapangan." })}</Notice>}
      </>
    );
  }

  return (
    <>
      {heading}
      {error && <Notice tone="bad">{t({ en: "Could not read field data:", id: "Data lapangan tidak dapat dibaca:" })} {error}</Notice>}
      {sites === null ? (
        <Loading />
      ) : sites.length === 0 ? (
        <Notice>{t({ en: "No field site is shared with this account yet. Ask a smartagri lab admin to give your account access to your site.", id: "Belum ada lokasi lapangan yang dibagikan ke akun ini. Minta admin lab smartagri memberi akun Anda akses ke lokasi Anda." })}</Notice>
      ) : (
        <>
          <SiteBar />
          {site && snap ? (
            snap.devices.length === 0 && snap.actuators.length === 0 ? (
              <Notice>{t({ en: "This site has not sent its device list yet. It appears after the edge PC's first push.", id: "Lokasi ini belum mengirim daftar perangkatnya. Daftar tampil setelah kiriman pertama edge PC." })}</Notice>
            ) : (
              <Outlet />
            )
          ) : (
            <Loading />
          )}
        </>
      )}
    </>
  );
}
