import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Search,
  Settings,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { indoorDashboardImage } from "../../lib/assets";
import { body, display } from "../../lib/fonts";
import { DASHBOARD_NAV, clockLabel } from "../../lib/indoor-dashboard";
import { useDashboard } from "../../lib/dashboard-state";

// Chrome for the dashboard application: the sidebar and top bar that persist
// across every screen, with the active screen rendered between them.
//
// This is deliberately not the marketing site's header and footer. The app is a
// tool, so it fills the viewport and navigates within itself; the only way back
// out to the site is the explicit link at the top of the sidebar.

export function DashboardSidebar({
  activeTo,
  collapsed = false,
  onToggle,
}: {
  activeTo: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <aside
      className={`hidden lg:flex shrink-0 flex-col gap-1 border-r border-[#0B6477]/8 bg-[#FAFCFB] p-4 transition-[width] duration-200 ${
        collapsed ? "w-[68px] items-center" : "w-[212px]"
      }`}
    >
      <div className={`flex items-center mb-1 ${collapsed ? "flex-col gap-2" : "gap-2 px-2 py-2"}`}>
        <Link to="/indoor-farming" className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0B6477]">
            <img
              src="/brand/icon-white.svg"
              alt=""
              className="h-4 w-4"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </span>
          {!collapsed && (
            <span
              className="truncate text-[15px] font-semibold tracking-[-0.02em] text-neutral-900"
              style={display}
            >
              smartagri
            </span>
          )}
        </Link>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-[#0B6477]/8 hover:text-[#0B6477] transition-colors ${
              collapsed ? "" : "ml-auto"
            }`}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>
      {!collapsed && (
        <Link
          to="/indoor-farming"
          className="flex items-center gap-1.5 px-2 pb-3 text-[11px] font-medium text-neutral-400 hover:text-[#0B6477] transition-colors"
          style={body}
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Indoor Farming
        </Link>
      )}

      <nav className="flex w-full flex-col gap-1">
        {DASHBOARD_NAV.map((item) => {
          const active = item.to === activeTo;
          return (
            <Link
              key={item.label}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-xl py-2 text-[13px] font-medium transition-colors ${
                collapsed ? "justify-center px-2" : "gap-2.5 px-3"
              } ${
                active
                  ? "bg-[#0B6477]/8 text-[#0B6477]"
                  : "text-neutral-500 hover:bg-[#0B6477]/5 hover:text-[#0B6477]"
              }`}
              style={body}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto w-full pt-4">
        {!collapsed && (
        <div className="overflow-hidden rounded-2xl bg-[#08313A]">
          <img
            src={indoorDashboardImage("promo-card.webp")}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-24 w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="p-3.5">
            <div className="text-[13px] font-medium text-white leading-snug" style={display}>
              Built and tested at UGM
            </div>
            <p className="mt-1 text-[11px] text-white/60 leading-relaxed" style={body}>
              Every sensor on this screen runs in our own greenhouses first.
            </p>
          </div>
        </div>
        )}

        <div className={`mt-3 flex items-center rounded-xl py-2 ${collapsed ? "justify-center" : "gap-2.5 px-2"}`}>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#45DFB1] text-[12px] font-semibold text-[#0B2A22]"
            style={display}
          >
            SA
          </span>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-neutral-800 truncate" style={body}>
                  Facility operator
                </div>
                <div className="text-[10px] text-neutral-400" style={body}>
                  Demo account
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-300" />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

export function DashboardTopBar() {
  const { playing, setPlaying, tick } = useDashboard();
  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex min-w-0 flex-1 items-center gap-2 h-9 max-w-[280px] rounded-xl border border-[#0B6477]/10 bg-white px-3">
        <Search className="w-4 h-4 shrink-0 text-neutral-300" />
        <span className="truncate text-[13px] text-neutral-300" style={body}>
          Search rooms, sensors
        </span>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
        <span
          className="hidden sm:flex items-center h-9 rounded-xl border border-[#0B6477]/10 bg-white px-3 text-[12px] font-medium text-neutral-500 tabular-nums"
          style={body}
        >
          {clockLabel(tick)}
        </span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="flex items-center gap-1.5 h-9 rounded-xl border border-[#0B6477]/10 bg-white px-3 text-[12px] font-medium text-[#0B6477] hover:bg-[#F3F7F6] transition-colors"
          style={body}
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {playing ? "Pause" : "Play"}
        </button>
        <span className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-[#0B6477]/10 bg-white">
          <Bell className="w-4 h-4 text-neutral-400" />
        </span>
        <span className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-[#0B6477]/10 bg-white">
          <Settings className="w-4 h-4 text-neutral-400" />
        </span>
      </div>
    </div>
  );
}

// Mobile navigation. The sidebar is hidden below lg, so without this the other
// screens would be unreachable on a phone.
export function DashboardMobileNav({ activeTo }: { activeTo: string }) {
  return (
    <nav className="lg:hidden flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {DASHBOARD_NAV.map((item) => {
        const active = item.to === activeTo;
        return (
          <Link
            key={item.label}
            to={item.to}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              active
                ? "bg-[#0B6477] text-white"
                : "bg-white text-neutral-500 border border-[#0B6477]/10"
            }`}
            style={body}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// The page heading used by every screen except Overview, which carries its own
// photographic hero instead.
export function ScreenHeading({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="max-w-[720px]">
      <h1
        className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.03em] text-neutral-900"
        style={display}
      >
        {title}
      </h1>
      <p className="mt-1.5 text-[13px] text-neutral-500 leading-relaxed" style={body}>
        {blurb}
      </p>
    </div>
  );
}

export function DashboardShell({
  activeTo,
  children,
}: {
  activeTo: string;
  children: ReactNode;
}) {
  // Collapsed state lives here rather than in the sidebar so the whole shell can
  // react to it later (a wider content area, a different chart density) without
  // the sidebar having to publish it.
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-white">
      <DashboardSidebar
        activeTo={activeTo}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <div className="min-w-0 flex-1 bg-[#F3F7F6] p-3 sm:p-4 flex flex-col gap-3">
        <DashboardTopBar />
        <DashboardMobileNav activeTo={activeTo} />
        {children}
      </div>
    </div>
  );
}
