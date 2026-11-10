import { Activity, BellRing, BookOpen, Boxes, CalendarCheck, CalendarDays, ClipboardCheck, ClipboardList, Contact, Cpu, Factory, FileText, Fingerprint, History, LayoutDashboard, Leaf, MapPin, Package, ScanSearch, ShieldCheck, ShoppingBag, ShoppingCart, Sprout, UserCheck, Users, Wallet, Wrench, type LucideIcon } from "lucide-react";
import type { ErpAccess } from "../../lib/pf/foundation";

// The ERP's menu, in the order a day runs: what is growing, what the sensors say,
// what is on the shelf, who buys it, who does the work, then the records everything
// else leans on. Only the first two sections start open, so the menu fits a screen.

export type NavPath = "/erp" | "/erp/costs" | "/erp/maintenance" | "/erp/clock-in" | "/erp/attendance" | "/erp/schedule" | "/erp/bookings" | "/erp/people" | "/erp/stock" | "/erp/purchasing" | "/erp/stock-count" | "/erp/orders" | "/erp/invoice" | "/erp/customers" | "/erp/trace" | "/erp/monitoring" | "/erp/alarms" | "/erp/devices" | "/erp/batch" | "/erp/seedlings" | "/erp/plant-factory" | "/erp/seed-lots" | "/erp/crops" | "/erp/recipes" | "/erp/settings/locations" | "/erp/settings/roles" | "/erp/settings/audit";

export type NavItem = { to: NavPath; label: string; icon: LucideIcon; exact?: boolean; gate?: keyof ErpAccess };
export type NavGroup = { key: string; label: string; items: NavItem[]; startsOpen?: boolean };

export const NAV_HOME: NavItem = { to: "/erp", label: "Overview", icon: LayoutDashboard, exact: true };

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "budidaya",
    label: "Growing",
    startsOpen: true,
    items: [
      { to: "/erp/batch", label: "Batch", icon: ClipboardList },
      { to: "/erp/seedlings", label: "Seedlings", icon: Sprout },
      { to: "/erp/plant-factory", label: "Plant factory", icon: Factory },
    ],
  },
  {
    key: "monitoring",
    label: "Monitoring",
    startsOpen: true,
    items: [
      { to: "/erp/monitoring", label: "Conditions", icon: Activity },
      { to: "/erp/alarms", label: "Alarm", icon: BellRing },
      { to: "/erp/devices", label: "Devices", icon: Cpu },
      { to: "/erp/maintenance", label: "Maintenance", icon: Wrench, gate: "canReadMaintenance" },
    ],
  },
  {
    key: "persediaan",
    label: "Inventory",
    items: [
      { to: "/erp/stock", label: "Stock", icon: Boxes },
      { to: "/erp/seed-lots", label: "Seed lots", icon: Package },
      { to: "/erp/purchasing", label: "Purchasing", icon: ShoppingBag, gate: "canReadPurchase" },
      { to: "/erp/stock-count", label: "Stock count", icon: ClipboardCheck },
    ],
  },
  {
    key: "penjualan",
    label: "Sales and costs",
    items: [
      { to: "/erp/orders", label: "Orders", icon: ShoppingCart, gate: "canReadSales" },
      { to: "/erp/invoice", label: "Invoice", icon: FileText, gate: "canReadSales" },
      { to: "/erp/customers", label: "Customers", icon: Contact, gate: "canReadSales" },
      { to: "/erp/trace", label: "Trace", icon: ScanSearch, gate: "canReadSales" },
      { to: "/erp/costs", label: "Costs", icon: Wallet, gate: "canReadCost" },
    ],
  },
  {
    key: "tim",
    label: "Team",
    items: [
      { to: "/erp/clock-in", label: "Clock in", icon: Fingerprint },
      { to: "/erp/attendance", label: "Attendance", icon: UserCheck, gate: "canReadPeople" },
      { to: "/erp/schedule", label: "Schedule", icon: CalendarDays, gate: "canReadPeople" },
      { to: "/erp/bookings", label: "Bookings", icon: CalendarCheck },
      { to: "/erp/people", label: "People", icon: Users, gate: "canReadPeople" },
    ],
  },
  {
    key: "data-induk",
    label: "Master data",
    items: [
      { to: "/erp/crops", label: "Crops", icon: Leaf },
      { to: "/erp/recipes", label: "Recipes", icon: BookOpen },
      { to: "/erp/settings/locations", label: "Location", icon: MapPin },
    ],
  },
  {
    key: "administrasi",
    label: "Administration",
    items: [
      { to: "/erp/settings/roles", label: "Roles", icon: ShieldCheck },
      { to: "/erp/settings/audit", label: "Audit log", icon: History },
    ],
  },
];

export const navAllowed = (item: NavItem, access: ErpAccess) => !item.gate || access[item.gate];

export const navActive = (item: NavItem, pathname: string) => (item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`));

export const navGroupOf = (pathname: string) => NAV_GROUPS.find((g) => g.items.some((i) => navActive(i, pathname))) ?? null;
