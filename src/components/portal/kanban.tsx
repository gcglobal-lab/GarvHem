"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Drag and drop board used by tasks and leads. Works with mouse, touch and keyboard
 * (focus the handle, press space, use the arrow keys). The caller persists the move.
 */
export type KanbanItem = { id: string; status: string };
type Column = { key: string; label: string; dot: string };

type Props<T extends KanbanItem> = {
  columns: readonly Column[];
  items: T[];
  label: string;
  canDrag: boolean;
  renderCard: (item: T) => ReactNode;
  itemName: (item: T) => string;
  /** Resolves false when the server refused, so the card snaps back. */
  onMove: (item: T, status: string, beforeId: string | null) => Promise<boolean>;
};

export function Kanban<T extends KanbanItem>({
  columns,
  items,
  label,
  canDrag,
  renderCard,
  itemName,
  onMove,
}: Props<T>) {
  const dndId = useId();
  const [local, setLocal] = useState(items);
  const [source, setSource] = useState(items);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Adopt fresh server data whenever it changes and nothing is being dragged.
  if (source !== items && !activeId) {
    setSource(items);
    setLocal(items);
  }
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const active = local.find((i) => i.id === activeId);
  const columnOf = (id: string) =>
    columns.find((c) => c.key === id)?.key ?? local.find((i) => i.id === id)?.status;

  function moveLocal(id: string, overId: string): T[] {
    const item = local.find((i) => i.id === id);
    const target = columnOf(overId);
    if (!item || !target || id === overId) return local;
    const overIsColumn = columns.some((c) => c.key === overId);
    const from = local.indexOf(item);
    const rest = local.filter((i) => i.id !== id);
    const moved = { ...item, status: target };
    if (overIsColumn) {
      if (item.status === target) return local;
      return [...rest, moved];
    }
    const overIndex = local.findIndex((i) => i.id === overId);
    const sameColumn = item.status === target;
    const at = rest.findIndex((i) => i.id === overId) + (sameColumn && from < overIndex ? 1 : 0);
    return [...rest.slice(0, at), moved, ...rest.slice(at)];
  }

  function onDragOver({ active: a, over }: DragOverEvent) {
    if (!over) return;
    if (columnOf(String(a.id)) !== columnOf(String(over.id)))
      setLocal(moveLocal(String(a.id), String(over.id)));
  }

  async function onDragEnd({ active: a, over }: DragEndEvent) {
    const id = String(a.id);
    const next = over ? moveLocal(id, String(over.id)) : items;
    setActiveId(null);
    setLocal(next);
    const before = items.find((i) => i.id === id);
    const after = next.find((i) => i.id === id);
    if (!before || !after) return;
    const column = next.filter((i) => i.status === after.status);
    const beforeId = column[column.findIndex((i) => i.id === id) + 1]?.id ?? null;
    const oldColumn = items.filter((i) => i.status === before.status);
    const oldBefore = oldColumn[oldColumn.findIndex((i) => i.id === id) + 1]?.id ?? null;
    if (before.status === after.status && beforeId === oldBefore) return;
    if (!(await onMove(before, after.status, beforeId))) setLocal(items);
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragOver={onDragOver}
      onDragEnd={(e) => void onDragEnd(e)}
      onDragCancel={() => {
        setActiveId(null);
        setLocal(items);
      }}
    >
      <div
        className="-mx-4 flex snap-x scrollbar-thin gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0"
        role="group"
        aria-label={label}
      >
        {columns.map((c) => {
          const list = local.filter((i) => i.status === c.key);
          return (
            <ColumnView key={c.key} column={c} ids={list.map((i) => i.id)}>
              {list.map((i) => (
                <Card key={i.id} id={i.id} name={itemName(i)} canDrag={canDrag}>
                  {renderCard(i)}
                </Card>
              ))}
            </ColumnView>
          );
        })}
      </div>
      <DragOverlay>
        {active ? (
          <div className="rotate-1 rounded-xl border border-input bg-surface p-3.5 shadow-lift">
            {renderCard(active)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ColumnView({ column, ids, children }: { column: Column; ids: string[]; children: ReactNode[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <section
      aria-label={`${column.label}, ${ids.length}`}
      data-column={column.key}
      className="flex w-[17.5rem] shrink-0 snap-start flex-col rounded-2xl bg-surface-2/70 p-2.5 lg:w-auto lg:min-w-60 lg:flex-1"
    >
      <h2 className="flex items-center gap-2 px-1.5 pt-1 pb-3 text-[13px] font-semibold tracking-normal">
        <span className="size-2 rounded-full" style={{ background: column.dot }} aria-hidden />
        {column.label}
        <span className="tabular ml-auto text-xs font-medium text-muted">{ids.length}</span>
      </h2>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={cn(
            "min-h-32 flex-1 space-y-2.5 rounded-xl transition-colors",
            isOver && "bg-accent-soft/50",
          )}
        >
          {children}
          {ids.length === 0 ? (
            <li className="grid h-24 place-items-center rounded-xl border border-dashed border-input text-xs text-muted">
              Nothing here
            </li>
          ) : null}
        </ul>
      </SortableContext>
    </section>
  );
}

function Card({
  id,
  name,
  canDrag,
  children,
}: {
  id: string;
  name: string;
  canDrag: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      disabled: !canDrag,
    });
  return (
    <li
      ref={setNodeRef}
      data-card={id}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group relative rounded-xl border border-border bg-surface p-3.5 shadow-sm transition-shadow hover:shadow-soft",
        isDragging && "opacity-40",
      )}
    >
      {canDrag ? (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Move ${name}`}
          className="absolute -top-1 left-1/2 z-10 grid h-6 w-12 -translate-x-1/2 touch-none place-items-center text-muted opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <GripVertical className="size-3.5 rotate-90" aria-hidden />
        </button>
      ) : null}
      {children}
    </li>
  );
}
