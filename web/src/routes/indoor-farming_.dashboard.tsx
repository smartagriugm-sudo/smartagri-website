import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { DashboardProvider } from "../lib/dashboard-state";
import { DashboardShell } from "../components/dashboard/AppShell";
import AgroGate from "../components/agrosphere/AgroGate";
import { isGreenhousePath } from "../components/greenhouse/nav";

// Layout for the dashboard application. Everything under
// /indoor-farming/dashboard renders inside this shell.
//
// The area is namespaced under its research programme rather than sitting at a
// bare /dashboard, so a second programme can bring its own application later
// (smart-uav/dashboard and so on) without either one having to move.
export const Route = createFileRoute("/indoor-farming_/dashboard")({
  component: DashboardLayout,
  head: () => ({
    meta: [
      { title: "Dashboard | smartagri" },
      // An internal tool, kept out of search results the way /ai is.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function DashboardLayout() {
  // Read the path here rather than in the sidebar so the nav has a single
  // source of truth for what is active, including on nested screens.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeTo = pathname.replace(/\/$/, "") || "/indoor-farming/dashboard";

  // Part of agrosphere: everything under /field is the Greenhouse dashboard (measured
  // data, components/greenhouse), every other screen is Indoor (still simulated, so
  // never shown to partners). Each is checked on its own and has its own menu.
  const app = isGreenhousePath(activeTo) ? "greenhouse" : "indoor";

  return (
    <AgroGate app={app}>
      <DashboardProvider>
        <DashboardShell app={app} activeTo={activeTo}>
          <Outlet />
        </DashboardShell>
      </DashboardProvider>
    </AgroGate>
  );
}
