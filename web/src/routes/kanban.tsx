import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Globe2, Loader2, Lock, Plus, Star, X } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";
import AmbientWash from "../components/AmbientWash";
import AuthGate from "../components/AuthGate";
import { EASE, MaskLine } from "../components/NoteParts";
import { Toasts, useToasts } from "../components/kanban/parts";
import { useAuth } from "../lib/auth/auth";
import {
  BOARD_BACKGROUNDS,
  type BoardBackground,
  type BoardVisibility,
} from "../lib/kanban";
import { createBoard, listBoards, setStarred, updateBoard, type BoardSummary } from "../lib/kanban-data";

export const Route = createFileRoute("/kanban")({
  component: KanbanPage,
  head: () => ({
    meta: [
      { title: "Kanban | smartagri" },
      // Private, gated internal tool: keep it out of search engines.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

// Team Kanban: masthead with the new-board form, then the boards grouped as
// starred, the boards you belong to, and team boards you can read.

const EYEBROW = "text-[13px] font-medium tracking-[0.03em]";
const BACKGROUND_KEYS = Object.keys(BOARD_BACKGROUNDS) as BoardBackground[];

function KanbanPage() {
  return (
    <AuthGate>
      <MotionConfig reducedMotion="user">
        <main>
          <SiteHeader />
          <div className="relative min-h-[70vh] overflow-clip bg-white">
            <AmbientWash count={4} />
            <div className="relative">
              <KanbanContent />
            </div>
          </div>
          <Footer />
        </main>
      </MotionConfig>
    </AuthGate>
  );
}

function KanbanContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, push, dismiss } = useToasts();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Keyed on the id: a token refresh gives a new user object, not a new user.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    listBoards(userId)
      .then((res) => {
        if (!active) return;
        if (res.error !== null) setError(res.error);
        else setBoards(res.data);
      })
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [userId]);

  const groups = useMemo(() => {
    const all = (boards ?? []).filter((b) => !b.archived_at);
    return [
      { key: "starred", title: "Starred", rows: all.filter((b) => b.starred) },
      { key: "mine", title: "Your boards", rows: all.filter((b) => b.role) },
      { key: "team", title: "Team boards", rows: all.filter((b) => !b.role) },
    ].filter((g) => g.rows.length > 0 || g.key === "mine");
  }, [boards]);

  const archived = (boards ?? []).filter((b) => b.archived_at && b.role === "owner");

  const reopen = async (b: BoardSummary) => {
    const res = await updateBoard(b.id, { archived_at: null });
    if (res.error !== null) {
      push({ text: res.error, tone: "error" });
      return;
    }
    setBoards((rows) => rows?.map((r) => (r.id === b.id ? { ...r, archived_at: null } : r)) ?? rows);
    push({ text: `Reopened "${b.name}".` });
  };

  const toggleStar = async (b: BoardSummary) => {
    if (!user || !b.role) return;
    const next = !b.starred;
    setBoards((rows) => rows?.map((r) => (r.id === b.id ? { ...r, starred: next } : r)) ?? rows);
    const res = await setStarred(b.id, user.id, next);
    if (res.error !== null) {
      setBoards((rows) => rows?.map((r) => (r.id === b.id ? { ...r, starred: b.starred } : r)) ?? rows);
      push({ text: res.error, tone: "error" });
    }
  };

  const onCreate = async (input: { name: string; visibility: BoardVisibility; background: BoardBackground }) => {
    if (!user) return false;
    const res = await createBoard({ ...input, userId: user.id });
    if (res.error !== null) {
      push({ text: res.error, tone: "error" });
      return false;
    }
    navigate({ to: "/kanban/$board", params: { board: res.data.slug } });
    return true;
  };

  return (
    <>
      <section className="mx-auto max-w-[1360px] px-6 pt-12 md:px-12 md:pt-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`flex items-center gap-2 text-[#14919B] ${EYEBROW}`}
              style={body}
            >
              <span className="h-1.5 w-1.5 bg-[#45DFB1]" aria-hidden="true" />
              Team workspace
            </motion.p>
            <motion.h1
              initial="hidden"
              animate="show"
              className="mt-5 text-[44px] font-semibold leading-[1.0] tracking-[-0.035em] text-neutral-900 sm:text-6xl md:text-[72px]"
              style={display}
            >
              <MaskLine delay={0}>Kanban boards</MaskLine>
              <MaskLine delay={0.12}>
                <span style={accent}>for every project.</span>
              </MaskLine>
            </motion.h1>
          </div>
          <div className="lg:col-span-4">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
              className="text-base leading-relaxed text-neutral-600 md:text-lg"
              style={body}
            >
              Plan research, publications and lab work as lists of cards. Drag cards between lists as
              work moves forward.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
              className="mt-6"
            >
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#45DFB1] px-6 text-sm font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99]"
                style={body}
              >
                <Plus className="h-4 w-4" />
                New board
              </button>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {creating && <NewBoardForm onCancel={() => setCreating(false)} onCreate={onCreate} />}
        </AnimatePresence>
      </section>

      <section className="mx-auto max-w-[1360px] px-6 pb-24 pt-12 md:px-12">
        {error ? (
          <p className="rounded-[24px] border border-[#E25555]/20 bg-[#E25555]/5 p-6 text-sm text-[#9B2C2C]" style={body}>
            {error}
          </p>
        ) : !boards ? (
          <div className="flex items-center gap-3 py-16 text-neutral-500" style={body}>
            <Loader2 className="h-5 w-5 animate-spin text-[#0B6477]" />
            Loading boards...
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {groups.map((g) => (
              <div key={g.key}>
                <h2
                  className="flex items-center gap-2 text-xl font-semibold tracking-[-0.025em] text-neutral-900"
                  style={display}
                >
                  {g.key === "starred" && <Star className="h-4 w-4 fill-[#F2B84B] text-[#F2B84B]" />}
                  {g.title}
                  <span className="text-sm font-normal text-neutral-400">{g.rows.length}</span>
                </h2>
                {g.rows.length === 0 ? (
                  <p className="mt-4 text-sm text-neutral-500" style={body}>
                    No boards yet. Create one to get started.
                  </p>
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {g.rows.map((b, i) => (
                      <BoardTile key={`${g.key}-${b.id}`} board={b} index={i} onToggleStar={() => toggleStar(b)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {archived.length > 0 && (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-semibold tracking-[-0.02em] text-neutral-500 hover:text-neutral-800" style={display}>
                  Archived boards
                  <span className="text-sm font-normal text-neutral-400">{archived.length}</span>
                </summary>
                <ul className="mt-4 flex flex-col gap-2">
                  {archived.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-3 rounded-[18px] border border-[#0B6477]/10 bg-white/80 px-4 py-3"
                    >
                      <span
                        className="h-8 w-10 shrink-0 rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${(BOARD_BACKGROUNDS[b.background] ?? BOARD_BACKGROUNDS.teal).from}, ${(BOARD_BACKGROUNDS[b.background] ?? BOARD_BACKGROUNDS.teal).to})`,
                        }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-800" style={body}>
                        {b.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => reopen(b)}
                        className="h-9 rounded-lg bg-[#F3F7F6] px-3 text-sm text-neutral-700 hover:bg-[#E6EFED]"
                        style={body}
                      >
                        Reopen
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>
      <Toasts toasts={toasts} dismiss={dismiss} />
    </>
  );
}

function BoardTile({ board, index, onToggleStar }: { board: BoardSummary; index: number; onToggleStar: () => void }) {
  const bg = BOARD_BACKGROUNDS[board.background] ?? BOARD_BACKGROUNDS.teal;
  const dark = board.background !== "mint";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.5, ease: EASE }}
      className="group relative"
    >
      <Link
        to="/kanban/$board"
        params={{ board: board.slug }}
        className="flex h-32 flex-col justify-between rounded-[24px] p-5 shadow-[0_14px_40px_-30px_rgba(8,49,58,0.5)] transition-transform duration-300 hover:-translate-y-0.5"
        style={{ background: `linear-gradient(135deg, ${bg.from}, ${bg.to})` }}
        aria-label={`Open board ${board.name}`}
      >
        <span
          className={`line-clamp-2 pr-8 text-lg font-medium leading-snug tracking-[-0.02em] ${dark ? "text-white" : "text-[#0B2A22]"}`}
          style={display}
        >
          {board.name}
        </span>
        <span className={`flex items-center gap-1.5 text-xs ${dark ? "text-white/70" : "text-[#0B2A22]/70"}`} style={body}>
          {board.visibility === "team" ? <Globe2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {board.visibility === "team" ? "Team" : "Private"}
          {board.role && <span className="capitalize"> · {board.role}</span>}
        </span>
      </Link>
      {board.role && (
        <button
          type="button"
          onClick={onToggleStar}
          aria-label={board.starred ? "Unstar board" : "Star board"}
          aria-pressed={board.starred}
          className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg transition-opacity ${
            board.starred ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          } ${dark ? "text-white hover:bg-white/15" : "text-[#0B2A22] hover:bg-black/10"}`}
        >
          <Star className={`h-4 w-4 ${board.starred ? "fill-[#F2B84B] text-[#F2B84B]" : ""}`} />
        </button>
      )}
    </motion.div>
  );
}

function NewBoardForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: { name: string; visibility: BoardVisibility; background: BoardBackground }) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<BoardVisibility>("private");
  const [background, setBackground] = useState<BoardBackground>("teal");
  const [busy, setBusy] = useState(false);
  const bg = BOARD_BACKGROUNDS[background];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const ok = await onCreate({ name, visibility, background });
    if (!ok) setBusy(false);
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="mt-10 grid gap-6 rounded-[24px] border border-[#0B6477]/10 bg-white/90 p-6 shadow-[0_14px_40px_-30px_rgba(8,49,58,0.35)] backdrop-blur md:grid-cols-[220px_minmax(0,1fr)] md:p-8"
    >
      <div
        className="flex h-32 items-end rounded-[18px] p-4"
        style={{ background: `linear-gradient(135deg, ${bg.from}, ${bg.to})` }}
        aria-hidden="true"
      >
        <span
          className={`line-clamp-2 text-base font-medium ${background === "mint" ? "text-[#0B2A22]" : "text-white"}`}
          style={display}
        >
          {name.trim() || "Board name"}
        </span>
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-[-0.025em] text-neutral-900" style={display}>
            New board
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-900/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="flex flex-col gap-1.5 text-sm text-neutral-700" style={body}>
          Board name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="e.g. Hyperspectral calibration study"
            className="h-11 rounded-lg border border-[#0B6477]/15 bg-white px-3 text-sm text-neutral-800 outline-none focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20"
          />
        </label>
        <div className="flex flex-wrap gap-8">
          <fieldset className="flex flex-col gap-2" style={body}>
            <legend className="mb-2 text-sm text-neutral-700">Background</legend>
            <div className="flex gap-2">
              {BACKGROUND_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setBackground(k)}
                  aria-label={BOARD_BACKGROUNDS[k].name}
                  aria-pressed={background === k}
                  className={`h-9 w-12 rounded-lg ring-offset-2 transition-shadow ${background === k ? "ring-2 ring-[#14919B]" : ""}`}
                  style={{ background: `linear-gradient(135deg, ${BOARD_BACKGROUNDS[k].from}, ${BOARD_BACKGROUNDS[k].to})` }}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2" style={body}>
            <legend className="mb-2 text-sm text-neutral-700">Visibility</legend>
            <div className="flex rounded-lg border border-[#0B6477]/15 p-1">
              {(
                [
                  { key: "private", label: "Private", icon: Lock },
                  { key: "team", label: "Team", icon: Globe2 },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVisibility(key)}
                  aria-pressed={visibility === key}
                  className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors ${
                    visibility === key ? "bg-[#08313A] text-white" : "text-neutral-600 hover:bg-neutral-900/5"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="text-sm text-neutral-500" style={body}>
          {visibility === "team"
            ? "Everyone signed in can view this board. Only members you add can edit it."
            : "Only members you add can see this board."}
        </p>
        <div>
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#45DFB1] px-5 text-sm font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-50"
            style={body}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Create board
          </button>
        </div>
      </div>
    </motion.form>
  );
}
