// The board canvas: lists side by side, cards stacked in each list, both
// reorderable with dnd-kit. While a card is dragged its list membership is
// tracked locally (dragCols) so it can hop between lists; on drop the parent
// gets one move (card id, list, new fractional pos) and updates
// optimistically. Lists reorder the same way.
import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Eye,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  TextQuote,
} from "lucide-react";
import { body, display } from "../../lib/fonts";
import {
  LABEL_COLORS,
  byPos,
  dueState,
  positionAt,
  statusInfo,
  type KanbanCard,
  type KanbanLabel,
  type KanbanList,
  type KanbanPerson,
} from "../../lib/kanban";
import type { CardBadge } from "../../lib/kanban-data";
import { Avatar, Composer, InlineEdit } from "./parts";

export type Move = { pos: number; rebalance: boolean };

type Props = {
  lists: KanbanList[];
  cards: KanbanCard[];
  labelsByCard: Map<string, KanbanLabel[]>;
  membersByCard: Map<string, KanbanPerson[]>;
  editable: boolean;
  onMoveCard: (id: string, listId: string, move: Move) => void;
  onMoveList: (id: string, move: Move) => void;
  onCreateCard: (listId: string, title: string) => void;
  onCreateList: (name: string) => void;
  onRenameList: (id: string, name: string) => void;
  onArchiveList: (id: string) => void;
  onArchiveCard: (id: string) => void;
  onOpenCard?: (card: KanbanCard) => void;
  badges?: Record<string, CardBadge>;
  // When a filter is active: only these cards show, and dragging is locked so
  // positions are never computed against hidden neighbours.
  visibleIds?: Set<string> | null;
  covers?: Record<string, string>; // card id -> signed cover image URL
  watched?: Set<string> | null; // cards the signed-in user watches
};

type Cols = Record<string, string[]>;

function containerOf(cols: Cols, id: UniqueIdentifier): string | undefined {
  const key = String(id);
  if (key in cols) return key;
  return Object.keys(cols).find((k) => cols[k].includes(key));
}

export default function BoardCanvas(props: Props) {
  const { lists, cards, editable, onMoveCard, onMoveList, visibleIds } = props;
  const dnd = editable && !visibleIds;
  const sortedLists = useMemo(() => [...lists].sort(byPos), [lists]);
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const baseCols = useMemo(() => {
    const cols: Cols = {};
    for (const l of sortedLists) cols[l.id] = [];
    for (const c of [...cards].sort(byPos))
      if (!visibleIds || visibleIds.has(c.id)) cols[c.list_id]?.push(c.id);
    return cols;
  }, [sortedLists, cards, visibleIds]);

  const [dragCols, setDragCols] = useState<Cols | null>(null);
  const [active, setActive] = useState<{
    type: "card" | "list";
    id: string;
  } | null>(null);
  const lastDragEnd = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  useBoardPan(scrollRef);
  // Stable id keeps dnd-kit's aria-describedby identical on server and client.
  const dndId = useId();
  const cols = dragCols ?? baseCols;
  const listIds = sortedLists.map((l) => l.id);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Long-press on touch so the board still scrolls with a swipe.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
    // Space picks up and drops; Enter is left free to open a card.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Enter"],
      },
    }),
  );

  // Lists only collide with lists. Cards prefer the cards of the list under
  // the pointer, then that list itself (empty list or below the last card).
  const collision: CollisionDetection = (args) => {
    const type = args.active.data.current?.type;
    if (type === "list") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (c) => c.data.current?.type === "list",
        ),
      });
    }
    const hits = pointerWithin(args);
    const listHit = hits.find((h) => String(h.id) in cols);
    if (listHit) {
      const inList = args.droppableContainers.filter(
        (c) =>
          c.data.current?.type === "card" &&
          cols[String(listHit.id)]?.includes(String(c.id)),
      );
      if (inList.length) {
        const near = closestCorners({ ...args, droppableContainers: inList });
        if (near.length) return near;
      }
      return [listHit];
    }
    return closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (c) => c.data.current?.type === "card",
      ),
    });
  };

  const onDragStart = ({ active: a }: DragStartEvent) => {
    const type = a.data.current?.type as "card" | "list";
    setActive({ type, id: String(a.id) });
    if (type === "card") setDragCols(baseCols);
  };

  const onDragOver = ({ active: a, over }: DragOverEvent) => {
    if (!over || a.data.current?.type !== "card") return;
    setDragCols((prev) => {
      const c = prev ?? baseCols;
      const from = containerOf(c, a.id);
      const to = containerOf(c, over.id);
      if (!from || !to || from === to) return prev;
      const id = String(a.id);
      const target = c[to].filter((x) => x !== id);
      let index = target.indexOf(String(over.id));
      if (index < 0) {
        index = target.length;
      } else {
        const rect = a.rect.current.translated;
        if (rect && rect.top > over.rect.top + over.rect.height / 2) index += 1;
      }
      target.splice(index, 0, id);
      return { ...c, [from]: c[from].filter((x) => x !== id), [to]: target };
    });
  };

  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    lastDragEnd.current = Date.now();
    const type = a.data.current?.type;
    const id = String(a.id);
    const c = dragCols ?? baseCols;
    setActive(null);
    setDragCols(null);
    if (!over) return;

    if (type === "list") {
      const from = listIds.indexOf(id);
      const to = listIds.indexOf(String(over.id));
      if (from < 0 || to < 0 || from === to) return;
      const order = arrayMove(listIds, from, to);
      const index = order.indexOf(id);
      const siblings = order
        .filter((x) => x !== id)
        .map((x) => listById.get(x)!);
      onMoveList(id, positionAt(siblings, index));
      return;
    }

    const card = cardById.get(id);
    const listId = containerOf(c, id);
    if (!card || !listId) return;
    let items = c[listId];
    if (containerOf(c, over.id) === listId) {
      const from = items.indexOf(id);
      const to = items.indexOf(String(over.id));
      if (to >= 0 && from !== to) items = arrayMove(items, from, to);
    }
    const index = items.indexOf(id);
    if (listId === card.list_id && baseCols[listId].indexOf(id) === index)
      return;
    const siblings = items.filter((x) => x !== id).map((x) => cardById.get(x)!);
    onMoveCard(id, listId, positionAt(siblings, index));
  };

  // A click right after a drop is the tail of the drag, not an "open card".
  const openCard = (card: KanbanCard) => {
    if (Date.now() - lastDragEnd.current < 250) return;
    props.onOpenCard?.(card);
  };

  const activeCard =
    active?.type === "card" ? cardById.get(active.id) : undefined;
  const activeList =
    active?.type === "list" ? listById.get(active.id) : undefined;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={collision}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActive(null);
        setDragCols(null);
      }}
    >
      <div
        ref={scrollRef}
        className="kanban-scroll flex h-full items-start gap-3 overflow-x-auto px-4 pb-6 pt-4 md:px-6"
      >
        <SortableContext
          items={listIds}
          strategy={horizontalListSortingStrategy}
          disabled={!dnd}
        >
          {sortedLists.map((list) => (
            <ListColumn
              key={list.id}
              list={list}
              cardIds={cols[list.id] ?? []}
              cardById={cardById}
              {...props}
              dnd={dnd}
              onOpenCard={openCard}
            />
          ))}
        </SortableContext>
        {editable && <AddList onCreate={props.onCreateList} />}
      </div>
      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {activeCard ? (
          <div className="w-[256px] rotate-[2deg] cursor-grabbing">
            <CardFace
              card={activeCard}
              labels={props.labelsByCard.get(activeCard.id) ?? []}
              members={props.membersByCard.get(activeCard.id) ?? []}
              badge={props.badges?.[activeCard.id]}
              coverUrl={props.covers?.[activeCard.id]}
              lifted
            />
          </div>
        ) : activeList ? (
          <div className="w-[272px] rotate-[1.5deg] rounded-2xl bg-[#F3F7F6] p-3 shadow-2xl">
            <p
              className="px-1 text-sm font-semibold text-neutral-800"
              style={display}
            >
              {activeList.name}
            </p>
            <p className="mt-1 px-1 text-xs text-neutral-500" style={body}>
              {(cols[activeList.id] ?? []).length} cards
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ListColumn({
  list,
  cardIds,
  cardById,
  labelsByCard,
  membersByCard,
  editable,
  onCreateCard,
  onRenameList,
  onArchiveList,
  onArchiveCard,
  onOpenCard,
  badges,
  covers,
  watched,
  dnd,
}: Props & {
  list: KanbanList;
  cardIds: string[];
  cardById: Map<string, KanbanCard>;
  onOpenCard: (c: KanbanCard) => void;
  dnd: boolean;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: { type: "list" },
    disabled: !dnd,
  });
  const [composing, setComposing] = useState(false);
  const [menu, setMenu] = useState(false);
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      aria-label={`List ${list.name}`}
      className={`flex max-h-full w-[272px] shrink-0 flex-col rounded-2xl bg-[#F3F7F6] shadow-[0_10px_30px_-24px_rgba(8,49,58,0.6)] ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <header
        className={`relative flex items-center gap-2 px-3 pb-1 pt-3 ${dnd ? "cursor-grab active:cursor-grabbing" : ""}`}
        {...attributes}
        {...listeners}
        aria-roledescription={dnd ? "sortable list" : undefined}
      >
        <InlineEdit
          value={list.name}
          label="List name"
          disabled={!editable}
          onSave={(name) => onRenameList(list.id, name)}
          className="flex-1 px-1 py-1 text-sm font-semibold tracking-[-0.01em] text-neutral-800"
          inputClassName="h-8 flex-1 text-sm font-semibold"
        />
        <span className="text-xs tabular-nums text-neutral-400" style={body}>
          {cardIds.length}
        </span>
        {editable && (
          <div
            className="relative"
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-label={`More actions on ${list.name}`}
              aria-expanded={menu}
              className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-900/5 hover:text-neutral-800"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menu && (
              <div
                className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-[#0B6477]/10 bg-white p-1.5 shadow-xl"
                onMouseLeave={() => setMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    setComposing(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-[#F3F7F6]"
                  style={body}
                >
                  <Plus className="h-4 w-4" />
                  Add card
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    onArchiveList(list.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 hover:bg-[#F3F7F6]"
                  style={body}
                >
                  <Archive className="h-4 w-4" />
                  Archive list
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="kanban-scroll kanban-list-scroll min-h-[8px] flex-1 overflow-y-auto px-2 pb-1 pt-1">
        <SortableContext
          items={cardIds}
          strategy={verticalListSortingStrategy}
          disabled={!dnd}
        >
          <ol className="flex flex-col gap-2">
            {cardIds.map((id) => {
              const card = cardById.get(id);
              if (!card) return null;
              return (
                <SortableCard
                  key={id}
                  card={card}
                  labels={labelsByCard.get(id) ?? []}
                  members={membersByCard.get(id) ?? []}
                  badge={badges?.[id]}
                  coverUrl={covers?.[id]}
                  watching={!!watched?.has(id)}
                  editable={editable}
                  dnd={dnd}
                  onArchive={() => onArchiveCard(id)}
                  onOpen={() => onOpenCard(card)}
                />
              );
            })}
          </ol>
        </SortableContext>
      </div>

      {editable && (
        <div className="px-2 pb-2 pt-1">
          <Composer
            open={composing}
            onOpenChange={setComposing}
            onSubmit={(title) => onCreateCard(list.id, title)}
            placeholder="Enter a title for this card"
            submitLabel="Add card"
            multiline
            trigger={
              <button
                type="button"
                onClick={() => setComposing(true)}
                aria-label={`Add a card in ${list.name}`}
                className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-900/5 hover:text-neutral-900"
                style={body}
              >
                <Plus className="h-4 w-4" />
                Add a card
              </button>
            }
          />
        </div>
      )}
    </section>
  );
}

const SortableCard = memo(function SortableCard({
  card,
  labels,
  members,
  badge,
  coverUrl,
  watching,
  editable,
  dnd,
  onArchive,
  onOpen,
}: {
  card: KanbanCard;
  labels: KanbanLabel[];
  members: KanbanPerson[];
  badge?: CardBadge;
  coverUrl?: string;
  watching?: boolean;
  editable: boolean;
  dnd: boolean;
  onArchive: () => void;
  onOpen: () => void;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card" },
    disabled: !dnd,
  });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className="group relative">
      {isDragging ? (
        // Placeholder where the card will land.
        <div className="rounded-xl border-2 border-dashed border-[#14919B]/40 bg-[#14919B]/10">
          <div className="invisible">
            <CardFace
              card={card}
              labels={labels}
              members={members}
              badge={badge}
              coverUrl={coverUrl}
              watching={watching}
            />
          </div>
        </div>
      ) : (
        <div
          {...attributes}
          {...listeners}
          onClick={onOpen}
          onKeyDown={(e) => {
            if (e.key === "Enter") onOpen();
            else listeners?.onKeyDown?.(e);
          }}
          aria-label={`Card ${card.title}`}
          data-card-id={card.id}
          className={`block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#14919B] ${dnd ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
        >
          <CardFace
            card={card}
            labels={labels}
            members={members}
            badge={badge}
            coverUrl={coverUrl}
            watching={watching}
          />
        </div>
      )}
      {editable && !isDragging && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
          }}
          aria-label={`Archive ${card.title}`}
          title="Archive"
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-neutral-500 opacity-0 shadow-sm transition-opacity hover:text-neutral-900 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Archive className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
});

const DUE_STYLE = {
  complete: "bg-[#45DFB1]/25 text-[#0B5E47]",
  overdue: "bg-[#E25555]/12 text-[#B42323]",
  soon: "bg-[#F2B84B]/25 text-[#7A5200]",
  later: "bg-neutral-900/5 text-neutral-600",
} as const;

function formatDue(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

export function CardFace({
  card,
  labels,
  members,
  badge,
  coverUrl,
  watching = false,
  lifted = false,
}: {
  card: KanbanCard;
  labels: KanbanLabel[];
  members: KanbanPerson[];
  badge?: CardBadge;
  coverUrl?: string;
  watching?: boolean;
  lifted?: boolean;
}) {
  const status = statusInfo(card.status);
  const due = dueState(card);
  const checks = badge && badge.checkItems > 0 ? badge : null;
  const comments = badge?.comments ?? 0;
  const files = badge?.attachments ?? 0;
  const coverColor = card.cover_color
    ? (LABEL_COLORS[card.cover_color] ?? null)
    : null;
  return (
    <div
      className={`overflow-hidden rounded-xl border border-[#0B6477]/8 bg-white ${
        lifted
          ? "shadow-2xl"
          : "shadow-[0_1px_2px_rgba(8,49,58,0.12)] transition-shadow hover:shadow-md"
      }`}
    >
      {coverUrl ? (
        <CoverImage src={coverUrl} />
      ) : card.cover_attachment_id ? (
        // The signed URL is still on its way: hold the cover's space.
        <div className="aspect-video animate-pulse bg-[#E6EFED]" aria-hidden="true" />
      ) : (
        coverColor && (
          <div
            className="h-8"
            style={{ background: coverColor.hex }}
            aria-hidden="true"
          />
        )
      )}
      <div className="px-3 py-2.5">
        {labels.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {labels.map((l) => {
              const c = LABEL_COLORS[l.color] ?? LABEL_COLORS.slate;
              return l.name ? (
                <span
                  key={l.id}
                  className="rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none"
                  style={{ background: c.hex, color: c.ink, ...body }}
                >
                  {l.name}
                </span>
              ) : (
                <span
                  key={l.id}
                  className="h-2 w-10 rounded-full"
                  style={{ background: c.hex }}
                  title={c.name}
                />
              );
            })}
          </div>
        )}
        <p
          className="break-words pr-6 text-sm leading-snug text-neutral-800"
          style={body}
        >
          {card.title}
        </p>
        {(due ||
          status ||
          watching ||
          card.description ||
          checks ||
          comments > 0 ||
          files > 0 ||
          members.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {due && card.due_at && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${DUE_STYLE[due]}`}
                style={body}
              >
                {due === "complete" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <CalendarClock className="h-3 w-3" />
                )}
                {formatDue(card.due_at)}
              </span>
            )}
            {status && (
              <span
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                style={{ background: status.bg, color: status.ink, ...body }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.dot }} />
                {status.label}
              </span>
            )}
            {watching && (
              <Eye className="h-3.5 w-3.5 text-neutral-400" aria-label="You are watching this card" />
            )}
            {card.description && (
              <TextQuote
                className="h-3.5 w-3.5 text-neutral-400"
                aria-label="Has description"
              />
            )}
            {comments > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-neutral-500"
                style={body}
                title="Comments"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {comments}
              </span>
            )}
            {files > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-neutral-500"
                style={body}
                title="Attachments"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {files}
              </span>
            )}
            {checks && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                  checks.checkDone === checks.checkItems
                    ? "bg-[#45DFB1]/25 text-[#0B5E47]"
                    : "text-neutral-500"
                }`}
                style={body}
                title="Checklist items"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                {checks.checkDone}/{checks.checkItems}
              </span>
            )}
            {members.length > 0 && (
              <span className="ml-auto flex -space-x-1.5">
                {members.slice(0, 4).map((m) => (
                  <Avatar key={m.user_id} person={m} size={22} />
                ))}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AddList({ onCreate }: { onCreate: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-[272px] shrink-0">
      <Composer
        open={open}
        onOpenChange={setOpen}
        onSubmit={onCreate}
        placeholder="Enter list name"
        submitLabel="Add list"
        className="rounded-2xl bg-[#F3F7F6] p-2"
        trigger={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-12 w-full items-center gap-2 rounded-2xl bg-white/20 px-4 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/30"
            style={body}
          >
            <Plus className="h-4 w-4" />
            Add another list
          </button>
        }
      />
    </div>
  );
}

// Card-front cover: the whole image at its own aspect ratio (posters and
// banners keep their text), capped in height, on a tinted panel. Until it
// loads, a 16:9 placeholder keeps the card from jumping.
function CoverImage({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative bg-[#E6EFED] ${loaded ? "" : "aspect-video animate-pulse"}`}>
      <img
        src={src}
        alt=""
        loading="lazy"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={
          loaded
            ? "mx-auto block max-h-64 w-full object-contain"
            : "absolute inset-0 h-full w-full object-contain opacity-0"
        }
      />
    </div>
  );
}

// Mouse navigation for the board, the way Trello's canvas behaves:
//  - the wheel scrolls the board sideways, except over a list whose cards can
//    scroll, which keeps its own vertical scroll (Shift+wheel and trackpad
//    side swipes keep working natively);
//  - pressing on empty board space (background, gaps, empty list area) and
//    dragging pans the board. Cards, list headers (drag handles), buttons and
//    fields keep their own behaviour, so drag and drop is unaffected.
const NO_PAN = "[data-card-id], header, button, a, input, textarea, select, label, [role='dialog'], [contenteditable='true']";

function useBoardPan(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.shiftKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const list = (e.target as HTMLElement).closest<HTMLElement>(".kanban-list-scroll");
      if (list && list.scrollHeight > list.clientHeight + 1) return;
      if (el.scrollWidth <= el.clientWidth) return;
      const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      el.scrollLeft += step;
      e.preventDefault();
    };

    let startX = 0;
    let startLeft = 0;
    let pointer: number | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.pointerType !== "mouse") return;
      if ((e.target as HTMLElement).closest(NO_PAN)) return;
      pointer = e.pointerId;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    };
    const onMove = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      el.scrollLeft = startLeft - (e.clientX - startX);
    };
    const onUp = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.style.cursor = "";
      el.style.userSelect = "";
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [ref]);
}
