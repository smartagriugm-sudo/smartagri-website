import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, ChevronsUpDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, UserRound, X } from "lucide-react";
import { useAuth } from "../../lib/auth/auth";
import { A } from "../../lib/assets";
import { display } from "../../lib/fonts";
import { batchStage } from "../../lib/pf/batch";
import { searchErp, type SearchHit } from "../../lib/pf/erp-search";
import { accessLabel, type ErpAccess } from "../../lib/pf/foundation";
import type { StoreMode } from "../../lib/pf/store";
import { notifications } from "../../lib/pf/work";
import { useErpStore } from "./ErpContext";
import { NAV_GROUPS, NAV_HOME, navActive, navAllowed, navGroupOf } from "./erpNav";
import { WorkLinkTo } from "./WorkLinkTo";

// The bar above every ERP page, in the same shape as the public site's header: a
// floating 64px bar with a 12px radius and one hairline. The page's place on the
// left; search, the bell and the profile on the right.

const MODE_CHIP: Record<StoreMode, { label: string; dot: string }> = {
  loading: { label: "Loading data", dot: "bg-[#8D9398]" },
  live: { label: "Real data", dot: "bg-[#0E9F6E]" },
  sample: { label: "Sample data", dot: "bg-[#E0A526]" },
  error: { label: "Could not load data", dot: "bg-[#D9433B]" },
};

const iconButton = "relative grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#36525A] transition-colors hover:bg-[#0B6477]/8 hover:text-[#0F2F36] lg:h-9 lg:w-9";
const popover = "absolute z-50 rounded-xl border border-[#0B6477]/12 bg-white shadow-[0_8px_24px_rgba(8,49,58,0.12)]";

/** Closes what is open on Escape or a press outside the given element. */
function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPress = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPress);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPress);
    };
  }, [open, onClose]);
  return ref;
}

/* ---------------------------------------------------------------- search */

function useSearchSource(access: ErpAccess) {
  const store = useErpStore();
  return useMemo(
    () => ({
      pages: [{ to: NAV_HOME.to as string, label: NAV_HOME.label, group: "Dashboard" }, ...NAV_GROUPS.flatMap((g) => g.items.filter((i) => navAllowed(i, access)).map((i) => ({ to: i.to as string, label: i.label, group: g.label })))],
      batches: [...store.batches.values()].map((b) => ({
        id: b.id,
        code: b.code,
        crop: b.crop,
        stage: batchStage({ status: "berjalan", sown_at: b.sownAt, cycle_days: b.cycle, plants_now: store.holesOfBatch(b.code).length, trays_now: store.traysOfBatch(b.code).length }, store.today),
      })),
      isHole: (code: string) => !!store.pf.getHole(code),
      isSlot: (code: string) => !!store.chamber.getSlot(code),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, store.dataVersion, access],
  );
}

function SearchBox({ access }: { access: ErpAccess }) {
  const source = useSearchSource(access);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const close = () => {
    setFocused(false);
    setPhoneOpen(false);
    setQuery("");
    setActive(0);
    input.current?.blur();
  };
  const box = useDismiss<HTMLDivElement>(focused || phoneOpen, close);

  const hits = searchErp(query, source);
  const open = focused && query.trim().length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPhoneOpen(true);
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (hit: SearchHit) => {
    close();
    void navigate({ to: hit.to as never, params: hit.params as never, search: hit.search as never });
  };

  return (
    <>
      <button type="button" className={`${iconButton} md:hidden`} aria-label="Search" onClick={() => { setPhoneOpen(true); window.setTimeout(() => input.current?.focus()); }}>
        <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </button>
      <div ref={box} className={`${phoneOpen ? "absolute inset-x-2 top-2.5 z-10 block" : "hidden"} md:relative md:inset-auto md:top-auto md:block md:w-[220px] lg:w-[260px] xl:w-[320px]`}>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-[#0B6477]/15 bg-white px-3 focus-within:border-[#14919B] md:h-9">
          <Search className="h-4 w-4 shrink-0 text-[#4F6B73]" strokeWidth={1.75} />
          <span className="sr-only">Search the ERP</span>
          <input
            ref={input}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && hits[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            placeholder="Search batches, pages, codes"
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, hits.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && hits[active]) {
                e.preventDefault();
                go(hits[active]);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[#0F2F36] outline-none placeholder:text-[#4F6B73] [&:focus-visible]:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-[#0B6477]/15 px-1.5 text-[11px] text-[#4F6B73] xl:block">Ctrl K</kbd>
          {phoneOpen && (
            <button type="button" aria-label="Close search" className="-mr-2 grid h-10 w-10 place-items-center text-[#36525A] md:hidden" onClick={close}>
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        {open && (
          <div className={`${popover} right-0 top-full mt-2 w-full p-1.5 md:w-[420px]`}>
            {hits.length === 0 ? (
              <p className="px-2.5 py-3 text-[14px] text-[#4F6B73]">Nothing matches &ldquo;{query.trim()}&rdquo;.</p>
            ) : (
              <ul id={listId} role="listbox" aria-label="Search results">
                {hits.map((h, i) => (
                  <li key={h.key} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(h)}
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left ${i === active ? "bg-[#EEF5F5]" : ""}`}
                    >
                      <span className="w-[62px] shrink-0 text-[12px] text-[#4F6B73]">{h.kind}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-[#0F2F36]">{h.title}</span>
                        <span className="block truncate text-[12.5px] text-[#4F6B73]">{h.detail}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ bell */

const NOTICE_SHOWN = 7;

function NotificationBell() {
  const store = useErpStore();
  const [open, setOpen] = useState(false);
  const box = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const items = notifications(store);
  const urgent = items.filter((i) => i.tone === "urgent").length;

  return (
    <div ref={box} className="relative">
      <button type="button" className={iconButton} aria-haspopup="dialog" aria-expanded={open} aria-label={items.length ? `Notifications, ${items.length} waiting` : "Notifications"} onClick={() => setOpen(!open)}>
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {items.length > 0 && (
          <span className={`absolute right-0.5 top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[11px] font-semibold tabular-nums text-white ${urgent ? "bg-[#B3362C]" : "bg-[#0B6477]"}`}>
            {items.length > 99 ? "99+" : items.length}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className={`${popover} -right-[60px] top-full mt-2 w-[calc(100vw-24px)] max-w-[380px] sm:right-0`}>
          <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-3">
            <p className="text-[15px] font-medium tracking-[-0.02em] text-[#0F2F36]">Notifications</p>
            {urgent > 0 && <p className="text-[12.5px] text-[#B3362C]">{urgent} urgent</p>}
          </div>
          {items.length === 0 ? (
            <p className="border-t border-[#EDF2F2] px-4 py-6 text-center text-[14px] text-[#4F6B73]">{store.hasData ? "Nothing waiting from batches and sensors." : "Cannot be read yet."}</p>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto">
              {items.slice(0, NOTICE_SHOWN).map((item) => (
                <li key={item.key} className="border-t border-[#EDF2F2]">
                  <WorkLinkTo link={item.link} onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-[#F6F8F8]">
                    <span className="flex items-center gap-2">
                      {item.tone === "urgent" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#B3362C]" />}
                      <span className="truncate text-[14px] font-medium text-[#0F2F36]">{item.title}</span>
                    </span>
                    <span className="block truncate text-[12.5px] text-[#4F6B73]">{item.tag} · {item.detail}</span>
                  </WorkLinkTo>
                </li>
              ))}
            </ul>
          )}
          <Link to="/erp" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center border-t border-[#EDF2F2] px-4 text-[14px] font-medium text-[#0B6477] hover:underline">
            {items.length > NOTICE_SHOWN ? `View all (${items.length}) on the Overview` : "Full list on the Overview"}
          </Link>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- profile */

function useProfile(access: ErpAccess) {
  const { user, account, signOut } = useAuth();
  const email = user?.email ?? "";
  const name = account?.name ?? "";
  const parts = (name || email).trim().split(/[\s@]+/).filter(Boolean);
  const initials = name ? ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() : (email[0] ?? "?").toUpperCase();
  return { name, email, initials, avatarUrl: account?.avatarUrl ?? null, role: accessLabel(access), signOut };
}

function Avatar({ initials, url, className = "h-9 w-9 text-[13px]" }: { initials: string; url: string | null; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#45DFB1] font-semibold text-[#0B2A22] ${className}`}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initials}
    </span>
  );
}

function ProfileItems({ access, onPick }: { access: ErpAccess; onPick: () => void }) {
  const p = useProfile(access);
  const row = "flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[14px] text-[#36525A] hover:bg-[#EEF5F5] hover:text-[#0F2F36] lg:min-h-[36px]";
  return (
    <>
      <div className="px-2.5 py-2">
        <p className="truncate text-[14px] font-medium text-[#0F2F36]">{p.name || p.email || "No login"}</p>
        {p.name && <p className="truncate text-[12.5px] text-[#4F6B73]">{p.email}</p>}
        <p className="mt-0.5 text-[12.5px] text-[#0B6477]">{p.role}</p>
      </div>
      <div className="my-1 h-px bg-[#EDF2F2]" />
      <Link to="/account" onClick={onPick} className={row}><UserRound className="h-4 w-4 text-[#4F6B73]" strokeWidth={1.75} />My account</Link>
      <Link to="/indoor-farming/dashboard" onClick={onPick} className={row}><ArrowLeft className="h-4 w-4 text-[#4F6B73]" strokeWidth={1.75} />Back to smartagri</Link>
      <button type="button" onClick={() => { onPick(); void p.signOut(); }} className={row}><LogOut className="h-4 w-4 text-[#4F6B73]" strokeWidth={1.75} />Sign out</button>
    </>
  );
}

/** The avatar in the headbar. */
export function ProfileButton({ access }: { access: ErpAccess }) {
  const [open, setOpen] = useState(false);
  const box = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const p = useProfile(access);
  return (
    <div ref={box} className="relative">
      <button type="button" className="grid h-11 w-11 place-items-center rounded-full lg:h-9 lg:w-9" aria-haspopup="menu" aria-expanded={open} aria-label={p.name ? `Account menu: ${p.name}` : "Account menu"} onClick={() => setOpen(!open)}>
        <Avatar initials={p.initials} url={p.avatarUrl} />
      </button>
      {open && <div className={`${popover} right-0 top-full mt-2 w-[250px] p-1.5`}><ProfileItems access={access} onPick={() => setOpen(false)} /></div>}
    </div>
  );
}

/** The row at the foot of the sidebar. Its menu opens upward. */
export function ProfileRow({ access }: { access: ErpAccess }) {
  const [open, setOpen] = useState(false);
  const box = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const p = useProfile(access);
  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-[52px] w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-[#E9EFEF]">
        <Avatar initials={p.initials} url={p.avatarUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-[#0F2F36]">{p.name || p.email || "No login"}</span>
          <span className="block truncate text-[12.5px] text-[#4F6B73]">{p.role}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-[#4F6B73]" strokeWidth={1.75} />
      </button>
      {open && <div className={`${popover} inset-x-0 bottom-full mb-2 p-1.5`}><ProfileItems access={access} onPick={() => setOpen(false)} /></div>}
    </div>
  );
}

/* ------------------------------------------------------------------- bar */

function DataChip() {
  const store = useErpStore();
  const live = store.mode === "live" && !store.monitoring?.latest.length;
  const chip = live ? { ...MODE_CHIP.live, label: "Real batches, sample climate" } : MODE_CHIP[store.mode];
  return (
    <span role="status" className="hidden items-center gap-1.5 whitespace-nowrap rounded-md border border-[#0B6477]/12 px-2 py-1 text-[12.5px] text-[#36525A] 2xl:flex">
      <span className={`h-1.5 w-1.5 rounded-full ${chip.dot}`} />
      {chip.label}
    </span>
  );
}

export default function ErpHeadbar({ pathname, access, sidebarShown, showLogo, onToggleSidebar, onOpenMenu, menuButton }: { pathname: string; access: ErpAccess; sidebarShown: boolean; showLogo: string; onToggleSidebar: () => void; onOpenMenu: () => void; menuButton: React.RefObject<HTMLButtonElement | null> }) {
  const group = navGroupOf(pathname);
  const page = [NAV_HOME, ...NAV_GROUPS.flatMap((g) => g.items)].find((i) => navActive(i, pathname));
  const PanelIcon = sidebarShown ? PanelLeftClose : PanelLeftOpen;
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 print:hidden md:px-4">
      <div className="relative flex h-16 items-center gap-1 rounded-xl border border-[#0B6477]/15 bg-[#F3F7F6]/92 pl-2 pr-2 backdrop-blur-lg md:gap-2 md:pr-3">
        <button ref={menuButton} type="button" className={`${iconButton} lg:hidden`} aria-label="Open menu" onClick={onOpenMenu}>
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <button type="button" className={`${iconButton} hidden lg:grid`} aria-label={sidebarShown ? "Hide menu" : "Show menu"} title={`${sidebarShown ? "Hide" : "Show"} menu (Ctrl B)`} aria-pressed={sidebarShown} onClick={onToggleSidebar}>
          <PanelIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        <Link to="/erp" aria-label="agrosphere, to Overview" className={`shrink-0 ${showLogo}`}>
          <img src={A.agrosphereIcon} alt="" className="h-7 w-7" />
        </Link>
        <div className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 text-[14px]" style={display}>
          {group && <><span className="hidden whitespace-nowrap text-[#4F6B73] sm:inline">{group.label}</span><span className="hidden text-[#9AAEB2] sm:inline">/</span></>}
          <span className="truncate font-medium tracking-[-0.01em] text-[#0F2F36]">{page?.label ?? "ERP"}</span>
        </div>
        <DataChip />
        <SearchBox access={access} />
        <NotificationBell />
        <ProfileButton access={access} />
      </div>
    </header>
  );
}
