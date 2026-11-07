import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, X } from "lucide-react";
import { A } from "../../lib/assets";
import { body } from "../../lib/fonts";
import type { ErpAccess } from "../../lib/pf/foundation";
import { useErpStore } from "./ErpContext";
import ErpHeadbar, { ProfileRow } from "./ErpHeadbar";
import { NAV_GROUPS, NAV_HOME, navActive, navAllowed, navGroupOf, type NavGroup, type NavItem, type NavPath } from "./erpNav";
import { useErpAccess } from "./page";

// The frame around every ERP page: the agrosphere menu on the page's own ground, and
// the headbar above the work. Each section of the menu folds, a folded one carries
// its section's counts so nothing waiting goes out of sight, and the whole menu can
// hide to give the work the full width. The choices last while the ERP is open: the
// project keeps no localStorage. Below 1024px the menu is a full sheet.

const SIDEBAR_WIDTH = 240;

type Counts = Partial<Record<NavPath, { n: number; label: string }>>;

function NavRow({ item, pathname, count, countLabel }: { item: NavItem; pathname: string; count?: number; countLabel?: string }) {
  const active = navActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[44px] items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors lg:min-h-[32px] ${active ? "bg-[#DDE8E8] font-medium text-[#0F2F36]" : "text-[#36525A] hover:bg-[#E9EFEF] hover:text-[#0F2F36]"}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#0B6477]" : "text-[#4F6B73]"}`} strokeWidth={1.75} />
      <span className="truncate">{item.label}</span>
      {!!count && (
        <span title={countLabel} className="ml-auto rounded-md bg-[#E3F4F4] px-1.5 text-[12px] font-medium tabular-nums text-[#0B6477]">
          {count}
          <span className="sr-only"> {countLabel}</span>
        </span>
      )}
    </Link>
  );
}

function NavSection({ group, items, pathname, counts, open, onToggle }: { group: NavGroup; items: NavItem[]; pathname: string; counts: Counts; open: boolean; onToggle: () => void }) {
  const waiting = items.reduce((n, i) => n + (counts[i.to]?.n ?? 0), 0);
  const panel = `nav-${group.key}`;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={onToggle}
        className="group flex min-h-[44px] w-full items-center gap-1.5 rounded-lg px-2.5 text-left text-[12.5px] text-[#4F6B73] hover:text-[#0F2F36] lg:min-h-[28px]"
      >
        <span className="truncate">{group.label}</span>
        {!open && waiting > 0 && <span className="rounded-md bg-[#E3F4F4] px-1.5 text-[12px] font-medium tabular-nums text-[#0B6477]">{waiting}</span>}
        <ChevronDown className={`ml-auto h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-150 group-hover:opacity-100 motion-reduce:transition-none ${open ? "" : "-rotate-90"}`} strokeWidth={2} />
      </button>
      <div id={panel} hidden={!open} className="mt-0.5 space-y-0.5">
        {items.map((item) => (
          <NavRow key={item.to} item={item} pathname={pathname} count={counts[item.to]?.n} countLabel={counts[item.to]?.label} />
        ))}
      </div>
    </div>
  );
}

function NavBody({ pathname, access }: { pathname: string; access: ErpAccess }) {
  const store = useErpStore();
  const ready = store.readyToMove().reduce((n, r) => n + r.seedlings, 0);
  const alarms = store.monitoring?.alarms.filter((a) => !a.ack_at).length ?? 0;
  const counts: Counts = {
    "/erp/seedlings": { n: ready, label: `${ready} seedlings ready to transplant` },
    "/erp/alarms": { n: alarms, label: `${alarms} alarms not handled` },
  };

  const [openKeys, setOpenKeys] = useState(() => new Set(NAV_GROUPS.filter((g) => g.startsOpen).map((g) => g.key)));
  // Going to a page in a folded section opens it, so the place you are in stays visible.
  const here = navGroupOf(pathname)?.key;
  useEffect(() => {
    if (here) setOpenKeys((keys) => (keys.has(here) ? keys : new Set(keys).add(here)));
  }, [here]);

  const toggle = (key: string) =>
    setOpenKeys((keys) => {
      const next = new Set(keys);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <>
      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-2" aria-label="ERP menu">
        <NavRow item={NAV_HOME} pathname={pathname} />
        {NAV_GROUPS.map((g) => {
          const items = g.items.filter((i) => navAllowed(i, access));
          if (items.length === 0) return null;
          return <NavSection key={g.key} group={g} items={items} pathname={pathname} counts={counts} open={openKeys.has(g.key)} onToggle={() => toggle(g.key)} />;
        })}
      </nav>
      {store.mode === "error" && <RetryLoad />}
      <div className="border-t border-[#DCE7E8] px-2 py-2">
        <ProfileRow access={access} />
      </div>
    </>
  );
}

function RetryLoad() {
  const store = useErpStore();
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    setBusy(true);
    await store.load();
    setBusy(false);
  };
  return (
    <div className="flex items-center justify-between gap-2 border-t border-[#DCE7E8] px-4 py-1.5 text-[13px] text-[#B3362C]">
      Could not load data
      <button type="button" disabled={busy} onClick={() => void retry()} className="min-h-[36px] whitespace-nowrap font-medium text-[#0F2F36] underline disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "Connecting..." : "Try again"}
      </button>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/erp" aria-label="agrosphere, to Overview" className="block min-w-0">
      <img src={A.agrosphereLogo} alt="agrosphere" className="h-[26px] w-auto" />
    </Link>
  );
}

/** The phone's menu: one full sheet, closed by its button, Escape, or going somewhere. */
function MenuSheet({ pathname, access, onClose }: { pathname: string; access: ErpAccess; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="ERP menu" className="fixed inset-0 z-50 flex flex-col bg-[#F4F7F7] lg:hidden">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#DCE7E8] pl-4 pr-2">
        <Brand />
        <button ref={close} type="button" onClick={onClose} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-lg text-[#36525A] hover:bg-[#E9EFEF]">
          <X className="h-5 w-5" />
        </button>
      </div>
      <NavBody pathname={pathname} access={access} />
    </div>
  );
}

export default function ErpShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");
  const access = useErpAccess();
  const [menuOpen, setMenuOpen] = useState(false);
  // Null until someone chooses: shown from 1280px, tucked away on a smaller laptop.
  const [sidebarChoice, setSidebarChoice] = useState<boolean | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // The ERP is written in Indonesian, the public site it sits in is not.
  useEffect(() => {
    const before = document.documentElement.lang;
    document.documentElement.lang = "id";
    return () => {
      document.documentElement.lang = before;
    };
  }, []);

  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const sidebarShown = sidebarChoice ?? wide;
  const toggleSidebar = () => setSidebarChoice(!sidebarShown);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const closeMenu = () => {
    setMenuOpen(false);
    menuButton.current?.focus();
  };

  const sidebarClass = sidebarChoice === null ? "invisible w-0 xl:visible xl:w-[240px]" : sidebarChoice ? "w-[240px]" : "invisible w-0";
  const headLogoClass = sidebarChoice === null ? "xl:hidden" : sidebarChoice ? "lg:hidden" : "";

  return (
    <div
      className="flex min-h-screen bg-[#F4F7F7] print:block print:bg-white [&_:is(a,button,summary,select,input,textarea):focus-visible]:outline-2 [&_:is(a,button,summary,select,input,textarea):focus-visible]:outline-offset-2 [&_:is(a,button,summary,select,input,textarea):focus-visible]:outline-[#0B6477]"
      style={body}
    >
      <aside className={`sticky top-0 hidden h-screen shrink-0 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none print:hidden lg:block ${sidebarClass}`}>
        <div className="flex h-full flex-col border-r border-[#DCE7E8]" style={{ width: SIDEBAR_WIDTH }}>
          <div className="flex h-[76px] shrink-0 items-center pl-[18px] pr-2 pt-3"><Brand /></div>
          <NavBody pathname={pathname} access={access} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <ErpHeadbar
          pathname={pathname}
          access={access}
          sidebarShown={sidebarShown}
          showLogo={headLogoClass}
          onToggleSidebar={toggleSidebar}
          onOpenMenu={() => setMenuOpen(true)}
          menuButton={menuButton}
        />
        {menuOpen && <MenuSheet pathname={pathname} access={access} onClose={closeMenu} />}
        <div className="relative flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
