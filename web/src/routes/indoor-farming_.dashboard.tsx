import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { DashboardProvider } from "../lib/dashboard-state";
import { DashboardShell } from "../components/dashboard/AppShell";
import RequireAuth from "../components/RequireAuth";

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

  return (
    <RequireAuth>
      <DashboardProvider>
        <DashboardShell activeTo={activeTo}>
          <Outlet />
        </DashboardShell>
      </DashboardProvider>
    </RequireAuth>
  );
}
