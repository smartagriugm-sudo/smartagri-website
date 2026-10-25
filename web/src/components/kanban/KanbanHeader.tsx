// App bar for a board page, in place of the marketing SiteHeader: the board
// fills the screen, so the bar is one slim row over the board background with
// the logo, a breadcrumb back to all boards, the board's own controls and the
// account menu. Tools reachable from the account menu match SiteHeader's.
import { useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Boxes, ChevronRight, LayoutGrid, LogOut, Settings, SquareKanban, UserPlus, Users } from "lucide-react";
import { A } from "../../lib/assets";
import { body } from "../../lib/fonts";
import { useAuth } from "../../lib/auth/auth";
import { initials, personName, type KanbanPerson } from "../../lib/kanban";
import { Avatar, useDismiss } from "./parts";

export const BAR_BUTTON =
  "inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-sm text-white transition-colors hover:bg-white/20";

export default function KanbanHeader({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  return (
    <header
      className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-[#08313A]/75 px-3 text-white backdrop-blur-md md:px-5"
      style={body}
    >
      <Link to="/" aria-label="smartagri home" className="hidden shrink-0 sm:block">
        <img src={A.logoWhite} alt="smartagri" className="h-6 w-auto" />
      </Link>
      <span className="hidden h-6 w-px shrink-0 bg-white/20 sm:block" aria-hidden="true" />
      <Link
        to="/kanban"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="All boards"
      >
        <SquareKanban className="h-4 w-4 text-[#45DFB1]" />
        <span className="hidden md:inline">Kanban</span>
      </Link>
      {title && (
        <>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
          <div className="flex min-w-0 items-center gap-1.5">{title}</div>
        </>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {children}
        {/* The board's own controls end here; what follows is you. */}
        <span className="mx-1 hidden h-6 w-px bg-white/15 sm:block" aria-hidden="true" />
        <AccountButton />
      </div>
    </header>
  );
}

// Board members as one control: the stacked faces open Menu > Members. With
// nobody but you on the board it becomes an invitation to share instead.
export function MembersButton({
  people,
  canInvite,
  onOpen,
}: {
  people: KanbanPerson[];
  canInvite: boolean;
  onOpen: () => void;
}) {
  if (people.length <= 1 && canInvite) {
    return (
      <button type="button" onClick={onOpen} className={BAR_BUTTON} title="Add people to this board">
        <UserPlus className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${BAR_BUTTON} gap-2 pl-2`}
      title={`Board members: ${people.map((p) => personName(p)).join(", ")}`}
      aria-label={`Board members (${people.length})`}
    >
      <Users className="h-4 w-4 sm:hidden" />
      <span className="hidden -space-x-1.5 sm:flex">
        {people.slice(0, 3).map((p) => (
          <Avatar key={p.user_id} person={p} size={24} />
        ))}
      </span>
      <span className="tabular-nums">{people.length}</span>
    </button>
  );
}

function AccountButton() {
  const { user, signOut, account } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  // Same name and photo as on cards and in Profile & settings.
  const me = account ? { name: account.name, avatar: account.avatarUrl } : null;

  if (!user) return null;
  const email = user.email ?? "";
  const name = me?.name || email.split("@")[0] || "You";
  const row = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-[#F3F7F6]";
  const face = (size: number) =>
    me?.avatar ? (
      <img src={me.avatar} alt="" className="aspect-square shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    ) : (
      <span
        className="grid aspect-square shrink-0 place-items-center rounded-full bg-[#45DFB1] font-semibold text-[#0B2A22]"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      >
        {initials(name)}
      </span>
    );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Account: ${name}`}
        title={name}
        className="grid h-9 w-9 place-items-center rounded-full ring-2 ring-[#45DFB1]/60 ring-offset-2 ring-offset-[#08313A] transition-shadow hover:ring-[#80ED99]"
      >
        {face(32)}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[#0B6477]/10 bg-white p-2 shadow-xl">
          <div className="flex items-center gap-3 px-3 py-2">
            {face(36)}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-neutral-900">{name}</div>
              <div className="truncate text-xs text-neutral-500">{email}</div>
            </div>
          </div>
          <div className="my-1 h-px bg-[#0B6477]/8" />
          <Link to="/kanban" className={row} onClick={() => setOpen(false)}>
            <LayoutGrid className="h-4 w-4" />
            All boards
          </Link>
          <Link to="/inventory" className={row} onClick={() => setOpen(false)}>
            <Boxes className="h-4 w-4" />
            Instrument inventory
          </Link>
          <Link to="/account" className={row} onClick={() => setOpen(false)}>
            <Settings className="h-4 w-4" />
            Profile &amp; settings
          </Link>
          <button type="button" className={row} onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
