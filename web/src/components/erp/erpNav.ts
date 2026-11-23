import { Activity, BellRing, BookOpen, Boxes, CalendarCheck, CalendarDays, ClipboardCheck, ClipboardList, Contact, Cpu, Factory, FileText, Fingerprint, History, LayoutDashboard, Leaf, MapPin, Package, ScanSearch, ShieldCheck, ShoppingBag, ShoppingCart, Sprout, UserCheck, Users, Wallet, Wrench, type LucideIcon } from "lucide-react";
import type { ErpAccess } from "../../lib/pf/foundation";
import type { Bi } from "../../lib/i18n";

// The ERP's menu, in the order a day runs: what is growing, what the sensors say,
// what is on the shelf, who buys it, who does the work, then the records everything
// else leans on. Only the first two sections start open, so the menu fits a screen.

export type NavPath = "/erp" | "/erp/costs" | "/erp/maintenance" | "/erp/clock-in" | "/erp/attendance" | "/erp/schedule" | "/erp/bookings" | "/erp/people" | "/erp/stock" | "/erp/purchasing" | "/erp/stock-count" | "/erp/orders" | "/erp/invoice" | "/erp/customers" | "/erp/trace" | "/erp/monitoring" | "/erp/alarms" | "/erp/devices" | "/erp/batch" | "/erp/seedlings" | "/erp/plant-factory" | "/erp/seed-lots" | "/erp/crops" | "/erp/recipes" | "/erp/settings/locations" | "/erp/settings/roles" | "/erp/settings/audit";

export type NavItem = { to: NavPath; label: Bi; icon: LucideIcon; exact?: boolean; gate?: keyof ErpAccess };
export type NavGroup = { key: string; label: Bi; items: NavItem[]; startsOpen?: boolean };

export const NAV_HOME: NavItem = { to: "/erp", label: { en: "Overview", id: "Ringkasan" }, icon: LayoutDashboard, exact: true };

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "budidaya",
    label: { en: "Growing", id: "Budidaya" },
    startsOpen: true,
    items: [
      { to: "/erp/batch", label: { en: "Batch", id: "Batch" }, icon: ClipboardList },
      { to: "/erp/seedlings", label: { en: "Seedlings", id: "Bibit" }, icon: Sprout },
      { to: "/erp/plant-factory", label: { en: "Plant factory", id: "Plant factory" }, icon: Factory },
    ],
  },
  {
    key: "monitoring",
    label: { en: "Monitoring", id: "Pemantauan" },
    startsOpen: true,
    items: [
      { to: "/erp/monitoring", label: { en: "Conditions", id: "Kondisi" }, icon: Activity },
      { to: "/erp/alarms", label: { en: "Alarms", id: "Alarm" }, icon: BellRing },
      { to: "/erp/devices", label: { en: "Devices", id: "Perangkat" }, icon: Cpu },
      { to: "/erp/maintenance", label: { en: "Maintenance", id: "Pemeliharaan" }, icon: Wrench, gate: "canReadMaintenance" },
    ],
  },
  {
    key: "persediaan",
    label: { en: "Inventory", id: "Persediaan" },
    items: [
      { to: "/erp/stock", label: { en: "Stock", id: "Stok" }, icon: Boxes },
      { to: "/erp/seed-lots", label: { en: "Seed lots", id: "Lot benih" }, icon: Package },
      { to: "/erp/purchasing", label: { en: "Purchasing", id: "Pembelian" }, icon: ShoppingBag, gate: "canReadPurchase" },
      { to: "/erp/stock-count", label: { en: "Stock count", id: "Stok opname" }, icon: ClipboardCheck },
    ],
  },
  {
    key: "penjualan",
    label: { en: "Sales and costs", id: "Penjualan dan biaya" },
    items: [
      { to: "/erp/orders", label: { en: "Orders", id: "Pesanan" }, icon: ShoppingCart, gate: "canReadSales" },
      { to: "/erp/invoice", label: { en: "Invoices", id: "Invoice" }, icon: FileText, gate: "canReadSales" },
      { to: "/erp/customers", label: { en: "Customers", id: "Pelanggan" }, icon: Contact, gate: "canReadSales" },
      { to: "/erp/trace", label: { en: "Trace", id: "Telusur" }, icon: ScanSearch, gate: "canReadSales" },
      { to: "/erp/costs", label: { en: "Costs", id: "Biaya" }, icon: Wallet, gate: "canReadCost" },
    ],
  },
  {
    key: "tim",
    label: { en: "Team", id: "Tim" },
    items: [
      { to: "/erp/clock-in", label: { en: "Clock in", id: "Absen" }, icon: Fingerprint },
      { to: "/erp/attendance", label: { en: "Attendance", id: "Presensi" }, icon: UserCheck, gate: "canReadPeople" },
      { to: "/erp/schedule", label: { en: "Schedule", id: "Jadwal" }, icon: CalendarDays, gate: "canReadPeople" },
      { to: "/erp/bookings", label: { en: "Bookings", id: "Reservasi" }, icon: CalendarCheck },
      { to: "/erp/people", label: { en: "People", id: "Personel" }, icon: Users, gate: "canReadPeople" },
    ],
  },
  {
    key: "data-induk",
    label: { en: "Master data", id: "Data induk" },
    items: [
      { to: "/erp/crops", label: { en: "Crops", id: "Tanaman" }, icon: Leaf },
      { to: "/erp/recipes", label: { en: "Recipes", id: "Resep" }, icon: BookOpen },
      { to: "/erp/settings/locations", label: { en: "Locations", id: "Lokasi" }, icon: MapPin },
    ],
  },
  {
    key: "administrasi",
    label: { en: "Administration", id: "Administrasi" },
    items: [
      { to: "/erp/settings/roles", label: { en: "Roles", id: "Peran" }, icon: ShieldCheck },
      { to: "/erp/settings/audit", label: { en: "Audit log", id: "Log audit" }, icon: History },
    ],
  },
];

export const navAllowed = (item: NavItem, access: ErpAccess) => !item.gate || access[item.gate];

export const navActive = (item: NavItem, pathname: string) => (item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`));

export const navGroupOf = (pathname: string) => NAV_GROUPS.find((g) => g.items.some((i) => navActive(i, pathname))) ?? null;
