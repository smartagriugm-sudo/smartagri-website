import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, ArrowLeft, BellRing, CalendarDays, Wallet, Wrench, Fingerprint, UserCheck, BookOpen, Boxes, ClipboardCheck, ClipboardList, Contact, Cpu, Factory, FileText, History, LayoutDashboard, Leaf, MapPin, Menu, Package, Search, ShoppingBag, ShoppingCart, Sprout, Users, X, type LucideIcon } from "lucide-react";
import { A } from "../../lib/assets";
import { body, display } from "../../lib/fonts";
import type { StoreMode } from "../../lib/pf/store";
import { useErpStore } from "./ErpContext";
import { useErpAccess } from "./page";

// The frame around every ERP page. On a large screen, a sidebar on the page's own
// ground: labelled from 1280px, a rail of icons from 1024px so the 3D screens keep
// their width. Below that, a top bar whose button opens the menu as a full sheet.
// Modules that are not built yet are named once at the foot, not offered as links.

type NavItem = { to: NavPath; label: string; icon: LucideIcon; exact?: boolean; purchase?: boolean; people?: boolean; cost?: boolean; maintenance?: boolean };
type NavPath = "/erp" | "/erp/biaya" | "/erp/perawatan" | "/erp/absen" | "/erp/kehadiran" | "/erp/jadwal" | "/erp/orang" | "/erp/stok" | "/erp/pembelian" | "/erp/opname" | "/erp/pesanan" | "/erp/invoice" | "/erp/pelanggan" | "/erp/telusur" | "/erp/monitoring" | "/erp/alarm" | "/erp/perangkat" | "/erp/batch" | "/erp/persemaian" | "/erp/plant-factory" | "/erp/benih" | "/erp/tanaman" | "/erp/resep" | "/erp/pengaturan/lokasi" | "/erp/pengaturan/peran" | "/erp/pengaturan/audit";

const HOME: NavItem = { to: "/erp", label: "Ringkasan", icon: LayoutDashboard, exact: true };

const GROUPS: { label: string; items: NavItem[]; sales?: boolean }[] = [
  {
    label: "Budidaya",
    items: [
      { to: "/erp/batch", label: "Batch", icon: ClipboardList },
      { to: "/erp/persemaian", label: "Persemaian", icon: Sprout },
      { to: "/erp/plant-factory", label: "Plant factory", icon: Factory },
      { to: "/erp/benih", label: "Lot benih", icon: Package },
      { to: "/erp/tanaman", label: "Tanaman", icon: Leaf },
      { to: "/erp/resep", label: "Resep", icon: BookOpen },
    ],
  },
  {
    label: "Penjualan",
    sales: true,
    items: [
      { to: "/erp/pesanan", label: "Pesanan", icon: ShoppingCart },
      { to: "/erp/invoice", label: "Invoice", icon: FileText },
      { to: "/erp/pelanggan", label: "Pelanggan", icon: Contact },
      { to: "/erp/telusur", label: "Telusur", icon: Search },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/erp/stok", label: "Stok", icon: Boxes },
      { to: "/erp/pembelian", label: "Pembelian", icon: ShoppingBag, purchase: true },
      { to: "/erp/opname", label: "Opname", icon: ClipboardCheck },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { to: "/erp/monitoring", label: "Kondisi", icon: Activity },
      { to: "/erp/alarm", label: "Alarm", icon: BellRing },
      { to: "/erp/perangkat", label: "Perangkat", icon: Cpu },
    ],
  },
  {
    label: "SDM",
    items: [
      { to: "/erp/absen", label: "Absen", icon: Fingerprint },
      { to: "/erp/kehadiran", label: "Kehadiran", icon: UserCheck, people: true },
      { to: "/erp/jadwal", label: "Jadwal", icon: CalendarDays, people: true },
      { to: "/erp/orang", label: "Orang", icon: Contact, people: true },
    ],
  },
  {
    label: "Biaya",
    items: [
      { to: "/erp/biaya", label: "Biaya", icon: Wallet, cost: true },
      { to: "/erp/perawatan", label: "Perawatan", icon: Wrench, maintenance: true },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { to: "/erp/pengaturan/lokasi", label: "Lokasi", icon: MapPin },
      { to: "/erp/pengaturan/peran", label: "Peran", icon: Users },
      { to: "/erp/pengaturan/audit", label: "Audit log", icon: History },
    ],
  },
];

const ALL_ITEMS = [HOME, ...GROUPS.flatMap((g) => g.items)];

const MODE_CHIP: Record<StoreMode, { label: string; dot: string }> = {
  loading: { label: "Memuat data", dot: "bg-[#8D9398]" },
  live: { label: "Data asli", dot: "bg-[#0E9F6E]" },
  sample: { label: "Data contoh", dot: "bg-[#E0A526]" },
  error: { label: "Data gagal dimuat", dot: "bg-[#D9433B]" },
};

const isActive = (item: NavItem, pathname: string) => (item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`));

/** One row of the menu. `rail` hides the label from 1024 to 1279px, leaving the icon and its name for assistive tech. */
function NavRow({ item, pathname, rail, count, countLabel }: { item: NavItem; pathname: string; rail: boolean; count?: number; countLabel?: string }) {
  const active = isActive(item, pathname);
  const Icon = item.icon;
  const showCount = !!count;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      aria-label={rail ? (showCount ? `${item.label}, ${countLabel}` : item.label) : undefined}
      title={rail ? (showCount ? `${item.label}: ${countLabel}` : item.label) : undefined}
      className={`relative flex min-h-[44px] items-center gap-2.5 rounded-lg px-2.5 text-[14px] lg:min-h-[32px] ${rail ? "justify-center xl:justify-start" : ""} ${active ? "bg-[#DDE8E8] font-medium text-[#0F2F36]" : "text-[#36525A] hover:bg-[#E9EFEF] hover:text-[#0F2F36]"}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#0B6477]" : "text-[#4F6B73]"}`} strokeWidth={1.75} />
      <span className={rail ? "hidden xl:inline" : ""}>{item.label}</span>
      {showCount && (
        <span title={countLabel} className={`rounded-md bg-[#E3F4F4] px-1.5 text-[12px] font-medium tabular-nums text-[#0B6477] ${rail ? "absolute right-0.5 top-0.5 xl:static xl:ml-auto" : "ml-auto"}`}>
          {count}
          {!rail && <span className="sr-only"> {countLabel}</span>}
        </span>
      )}
    </Link>
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
    <button type="button" disabled={busy} onClick={() => void retry()} className="min-h-[36px] whitespace-nowrap text-[13px] font-medium text-[#0F2F36] underline disabled:cursor-not-allowed disabled:opacity-50">
      {busy ? "Menghubungkan..." : "Coba lagi"}
    </button>
  );
}

function NavBody({ pathname, rail }: { pathname: string; rail: boolean }) {
  const store = useErpStore();
  const { canReadSales, canReadPurchase, canReadPeople, canReadCost, canReadMaintenance } = useErpAccess();
  const allowed = (item: NavItem) => (!item.purchase || canReadPurchase) && (!item.people || canReadPeople) && (!item.cost || canReadCost) && (!item.maintenance || canReadMaintenance);
  const ready = store.readyToMove().reduce((n, r) => n + r.seedlings, 0);
  const alarms = store.monitoring?.alarms.filter((a) => !a.ack_at).length ?? 0;
  const counts: Partial<Record<NavPath, { n: number; label: string }>> = {
    "/erp/persemaian": { n: ready, label: `${ready} bibit siap pindah` },
    "/erp/alarm": { n: alarms, label: `${alarms} alarm belum ditangani` },
  };
  const live = store.mode === "live" && !store.monitoring?.latest.length;
  const chip = live ? { ...MODE_CHIP.live, label: "Batch asli, iklim contoh" } : MODE_CHIP[store.mode];
  const hideOnRail = rail ? "hidden xl:block" : "";

  return (
    <>
      <nav className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2.5 py-2.5" aria-label="Menu ERP">
        <NavRow item={HOME} pathname={pathname} rail={rail} />
        {GROUPS.filter((g) => (!g.sales || canReadSales) && g.items.some(allowed)).map((g) => (
          <div key={g.label}>
            <p className={`mb-1 px-2.5 text-[12.5px] text-[#4F6B73] ${hideOnRail}`}>{g.label}</p>
            {rail && <div className="mx-2.5 mb-2 border-t border-[#DCE7E8] xl:hidden" />}
            <div className="space-y-0.5">
              {g.items.filter(allowed).map((item) => (
                <NavRow key={item.to} item={item} pathname={pathname} rail={rail} count={counts[item.to]?.n} countLabel={counts[item.to]?.label} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-[#DCE7E8] px-2.5 py-2.5">
        <div className={`flex items-center gap-2 px-2.5 py-1 text-[12.5px] text-[#36525A] ${rail ? "justify-center xl:justify-start" : ""}`} title={chip.label}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${chip.dot}`} />
          <span className={rail ? "sr-only xl:not-sr-only" : ""} role="status">{chip.label}</span>
        </div>
        {store.mode === "error" && <div className={`px-2.5 ${hideOnRail}`}><RetryLoad /></div>}
        <Link
          to="/indoor-farming/dashboard"
          aria-label={rail ? "Keluar dari ERP" : undefined}
          title={rail ? "Keluar dari ERP" : undefined}
          className={`flex min-h-[44px] items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-[#36525A] hover:bg-[#E9EFEF] lg:min-h-[32px] ${rail ? "justify-center xl:justify-start" : ""}`}
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-[#4F6B73]" strokeWidth={1.75} />
          <span className={rail ? "hidden xl:inline" : ""}>Keluar dari ERP</span>
        </Link>
      </div>
    </>
  );
}

function Brand({ rail }: { rail: boolean }) {
  return (
    <Link to="/erp" aria-label="smartagri ERP, ke Ringkasan" className={`flex items-center gap-2 ${rail ? "justify-center xl:justify-start" : ""}`}>
      <img src={A.iconColor} alt="" className="h-7 w-7 shrink-0" />
      <span className={rail ? "hidden xl:block" : ""}>
        <span className="block text-[15px] font-semibold leading-tight tracking-[-0.02em] text-[#0F2F36]" style={display}>smartagri <span className="font-medium text-[#0B6477]">ERP</span></span>
        <span className="block text-[12px] leading-tight text-[#4F6B73]">SARC UGM</span>
      </span>
    </Link>
  );
}

/** The phone's menu: one full sheet, closed by its button, Escape, or going somewhere. */
function MenuSheet({ pathname, onClose }: { pathname: string; onClose: () => void }) {
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
    <div role="dialog" aria-modal="true" aria-label="Menu ERP" className="fixed inset-0 z-50 flex flex-col bg-[#F4F7F7] lg:hidden">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#DCE7E8] px-3">
        <Brand rail={false} />
        <button ref={close} type="button" onClick={onClose} aria-label="Tutup menu" className="grid h-11 w-11 place-items-center rounded-lg text-[#36525A] hover:bg-[#E9EFEF]">
          <X className="h-5 w-5" />
        </button>
      </div>
      <NavBody pathname={pathname} rail={false} />
    </div>
  );
}

export default function ErpShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");
  const [menuOpen, setMenuOpen] = useState(false);
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

  const current = ALL_ITEMS.find((i) => isActive(i, pathname));
  const closeMenu = () => {
    setMenuOpen(false);
    menuButton.current?.focus();
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-[#F4F7F7] print:block print:bg-white lg:flex-row [&_:is(a,button,summary,select,input,textarea):focus-visible]:outline-2 [&_:is(a,button,summary,select,input,textarea):focus-visible]:outline-offset-2 [&_:is(a,button,summary,select,input,textarea):focus-visible]:outline-[#0B6477]"
      style={body}
    >
      <aside className="sticky top-0 hidden h-screen print:hidden w-[64px] shrink-0 flex-col border-r border-[#DCE7E8] lg:flex xl:w-[232px]">
        <div className="flex h-14 shrink-0 items-center px-2.5 xl:px-4"><Brand rail /></div>
        <NavBody pathname={pathname} rail />
      </aside>

      <header className="sticky top-0 z-40 flex h-14 print:hidden shrink-0 items-center gap-1 border-b border-[#DCE7E8] bg-[#F4F7F7] px-1.5 lg:hidden">
        <button ref={menuButton} type="button" onClick={() => setMenuOpen(true)} aria-label="Buka menu" aria-expanded={menuOpen} className="grid h-11 w-11 place-items-center rounded-lg text-[#36525A] hover:bg-[#E9EFEF]">
          <Menu className="h-5 w-5" />
        </button>
        <img src={A.iconColor} alt="" className="h-6 w-6 shrink-0" />
        <p className="ml-1.5 truncate text-[15px] font-medium tracking-[-0.01em] text-[#0F2F36]" style={display}>{current?.label ?? "ERP"}</p>
      </header>
      {menuOpen && <MenuSheet pathname={pathname} onClose={closeMenu} />}

      <div className="relative flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
