import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { ScreenHeading } from "../components/dashboard/AppShell";
import { FieldDataProvider, useFieldData } from "../components/greenhouse/FieldData";
import { Loading, Notice, SiteBar } from "../components/greenhouse/parts";
import { greenhouseSection } from "../components/greenhouse/nav";

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

  const heading = <ScreenHeading title={section.label} blurb={section.blurb} />;

  if (!available) {
    return (
      <>
        {heading}
        <Notice>Sign-in is not configured on this deployment, so field data cannot be read.</Notice>
      </>
    );
  }
  if (!active) {
    return (
      <>
        {heading}
        <Notice>
          Your account is waiting for approval by the smartagri team. Once it is approved and a site is shared with you,
          its live data appears here.{" "}
          <Link to="/welcome" search={{ redirect: "/indoor-farming/dashboard/field" }} className="font-medium text-[#0B6477] underline underline-offset-2">
            Check your account
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
        {isAdmin ? <Outlet /> : <Notice>Only smartagri lab admins can manage field sites.</Notice>}
      </>
    );
  }

  return (
    <>
      {heading}
      {error && <Notice tone="bad">Could not read field data: {error}</Notice>}
      {sites === null ? (
        <Loading />
      ) : sites.length === 0 ? (
        <Notice>No field site is shared with this account yet. Ask a smartagri lab admin to give your account access to your site.</Notice>
      ) : (
        <>
          <SiteBar />
          {site && snap ? (
            snap.devices.length === 0 && snap.actuators.length === 0 ? (
              <Notice>This site has not sent its device list yet. It appears after the edge PC's first push.</Notice>
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
