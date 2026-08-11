import { DashboardProvider } from "../lib/dashboard-state";
import { DashboardSidebar, DashboardTopBar } from "./dashboard/AppShell";
import DashboardOverview from "./dashboard/DashboardOverview";

// A preview of the dashboard, embedded in the public Instrumentation page.
//
// It is the same Overview screen the real application renders, wrapped in a
// floating browser-like frame so that on a marketing page it reads as a picture
// of a tool rather than as the tool itself. Sharing the screen rather than
// copying it means the preview cannot drift out of date: change a panel once
// and both the page and the application move together.
//
// The sidebar links do navigate into the real application, which is gated, so a
// visitor who follows one lands on the sign-in page. That is the intended
// funnel: the preview shows what is behind the door, and the door still asks.
export default function IndoorDashboard() {
  return (
    <DashboardProvider>
      <div className="rounded-[26px] border border-white/15 bg-[#F3F7F6] p-2 shadow-[0_30px_80px_rgba(3,26,31,0.45)]">
        <div className="flex rounded-[20px] bg-white overflow-hidden">
          <DashboardSidebar activeTo="/indoor-farming/dashboard" />
          <div className="min-w-0 flex-1 bg-[#F3F7F6] p-3 sm:p-4 flex flex-col gap-3">
            <DashboardTopBar />
            <DashboardOverview />
          </div>
        </div>
      </div>
    </DashboardProvider>
  );
}
