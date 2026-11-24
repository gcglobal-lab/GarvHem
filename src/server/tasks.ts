import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import type { ActionContext } from "@/lib/action";
import type { CurrentUser } from "@/lib/auth/guards";
import { db, lock, type Tx } from "@/lib/db";
import { forbiddenError, invalid, notFound } from "@/lib/errors";
import { formatISODate, fromDbDate, toDbDate, workDateOf } from "@/lib/time";
import type { z } from "zod";
import type {
  TaskFilter,
  TaskStatusName,
  commentSchema,
  moveTaskSchema,
  taskSchema,
} from "@/lib/validators/tasks";
import { findMentions } from "./mentions";
import { notify } from "./notifications";
import { isCompanyWide, teamOrSelfWhere, teamWhere } from "./scope";
import { getSettings } from "./settings";

export const STATUS_LABEL: Record<TaskStatusName, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
};

/* ── Access rules ─────────────────────────────────────────────────────────── */

/** Employees: tasks assigned to them. Managers: also their team's and the ones they created. Admins: all. */
export async function visibleTasks(user: CurrentUser): Promise<Prisma.TaskWhereInput> {
  if (isCompanyWide(user)) return { deletedAt: null };
  const own: Prisma.TaskWhereInput[] = [{ assignees: { some: { userId: user.id } } }];
  if (user.permissions.has("tasks.create"))
    own.push({ createdById: user.id }, { assignees: { some: { user: await teamWhere(user) } } });
  return { deletedAt: null, OR: own };
}

async function getVisible(user: CurrentUser, id: string) {
  const task = await db.task.findFirst({
    where: { AND: [{ id }, await visibleTasks(user)] },
    include: { assignees: true },
  });
  if (!task) throw notFound("Task");
  return task;
}

/** Details may be edited by people who can create tasks: their own tasks, or tasks fully inside their team. */
async function canEditTask(
  user: CurrentUser,
  task: { createdById: string | null; assignees: { userId: string }[] },
): Promise<boolean> {
  if (!user.permissions.has("tasks.create")) return false;
  if (isCompanyWide(user) || task.createdById === user.id) return true;
  const ids = task.assignees.map((a) => a.userId);
  if (!ids.length) return false;
  return (
    (await db.user.count({ where: { AND: [{ id: { in: ids } }, await teamOrSelfWhere(user)] } })) ===
    ids.length
  );
}

async function getEditable(user: CurrentUser, id: string) {
  const task = await getVisible(user, id);
  if (!(await canEditTask(user, task))) throw forbiddenError();
  return task;
}

/** The uploader, or someone who may edit the task. */
export async function canDeleteTaskFile(user: CurrentUser, taskId: string, uploadedById: string | null) {
  const task = await getVisible(user, taskId);
  return uploadedById === user.id || canEditTask(user, task);
}

async function assertAssignable(user: CurrentUser, ids: string[]) {
  if (!ids.length) return;
  if (!user.permissions.has("tasks.assign")) throw forbiddenError();
  const allowed = await db.user.count({
    where: { AND: [{ id: { in: ids }, isActive: true }, await teamOrSelfWhere(user)] },
  });
  if (allowed !== new Set(ids).size) throw invalid("You can only assign active people in your team.");
}

/** Assignees and the creator, as long as they can still open the task. */
async function followers(t: { createdById: string | null; assignees: { userId: string }[] }, except: string) {
  const allowed = new Set((await participants(t)).map((p) => p.id));
  return [...t.assignees.map((a) => a.userId), t.createdById ?? ""].filter(
    (id) => id !== except && allowed.has(id),
  );
}

const href = (id: string) => `/portal/tasks/${id}`;

/* ── Reads ────────────────────────────────────────────────────────────────── */

const cardInclude = {
  assignees: { include: { user: { select: { id: true, name: true } } } },
  checklist: { orderBy: { position: "asc" } },
  _count: { select: { comments: true, attachments: true } },
} as const satisfies Prisma.TaskInclude;

async function todayISO() {
  const { company } = await getSettings();
  return workDateOf(new Date(), company.timezone);
}

const toCard = (t: Prisma.TaskGetPayload<{ include: typeof cardInclude }>, today: string) => ({
  id: t.id,
  number: t.number,
  title: t.title,
  status: t.status,
  priority: t.priority,
  dueDate: t.dueDate ? fromDbDate(t.dueDate) : null,
  overdue: Boolean(t.dueDate && t.status !== "DONE" && fromDbDate(t.dueDate) < today),
  labels: t.labels,
  client: t.client,
  position: t.position,
  assignees: t.assignees.map((a) => a.user),
  comments: t._count.comments,
  attachments: t._count.attachments,
  checklistDone: t.checklist.filter((c) => c.done).length,
  checklistTotal: t.checklist.length,
  updatedAt: t.updatedAt.toISOString(),
});
export type TaskCard = ReturnType<typeof toCard>;

export async function listTasks(
  user: CurrentUser,
  f: Partial<TaskFilter> = {},
  take = 500,
): Promise<TaskCard[]> {
  const today = await todayISO();
  const and: Prisma.TaskWhereInput[] = [await visibleTasks(user)];
  if (f.q) {
    const n = Number(f.q.replace(/^#/, ""));
    and.push({
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { description: { contains: f.q, mode: "insensitive" } },
        { client: { contains: f.q, mode: "insensitive" } },
        { labels: { has: f.q } },
        ...(Number.isInteger(n) && n > 0 && n < 2_000_000_000 ? [{ number: n }] : []),
      ],
    });
  }
  if (f.assignee) and.push({ assignees: { some: { userId: f.assignee } } });
  if (f.status) and.push({ status: f.status });
  if (f.priority) and.push({ priority: f.priority });
  if (f.label) and.push({ labels: { has: f.label } });
  if (f.overdue) and.push({ status: { not: "DONE" }, dueDate: { lt: toDbDate(today) } });
  const rows = await db.task.findMany({
    where: { AND: and },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    take,
    include: cardInclude,
  });
  return rows.map((t) => toCard(t, today));
}

export async function taskLabels(user: CurrentUser): Promise<string[]> {
  const rows = await db.task.findMany({
    where: await visibleTasks(user),
    select: { labels: true },
    take: 1000,
  });
  return [...new Set(rows.flatMap((r) => r.labels))].sort((a, b) => a.localeCompare(b));
}

/** People the user may put on a task. */
export async function assignableUsers(user: CurrentUser) {
  if (!user.permissions.has("tasks.assign")) return [];
  return db.user.findMany({
    where: { AND: [{ isActive: true }, await teamOrSelfWhere(user)] },
    orderBy: { name: "asc" },
    select: { id: true, name: true, designation: true },
  });
}

/** People who may be mentioned on a task: those who can already open it. */
async function participants(task: { createdById: string | null; assignees: { userId: string }[] }) {
  const ids = task.assignees.map((a) => a.userId);
  return db.user.findMany({
    where: {
      isActive: true,
      OR: [
        { id: { in: ids } },
        { id: task.createdById ?? "", role: { not: "EMPLOYEE" } }, // creators keep access only while they manage
        { role: "ADMIN" },
        { role: "MANAGER", reports: { some: { id: { in: ids } } } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function taskDetail(user: CurrentUser, id: string) {
  const visible = await getVisible(user, id);
  const canEdit = await canEditTask(user, visible);
  const [t, people, today] = await Promise.all([
    db.task.findUniqueOrThrow({
      where: { id },
      include: {
        ...cardInclude,
        createdBy: { select: { id: true, name: true } },
        attachments: { orderBy: { createdAt: "asc" }, include: { uploadedBy: { select: { name: true } } } },
      },
    }),
    participants(visible),
    todayISO(),
  ]);
  return {
    ...toCard(t, today),
    description: t.description,
    createdBy: t.createdBy,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt?.toISOString() ?? null,
    checklist: t.checklist.map((c) => ({ id: c.id, text: c.text, done: c.done })),
    attachmentList: t.attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      size: a.size,
      by: a.uploadedBy?.name ?? "Unknown",
      canDelete: canEdit || a.uploadedById === user.id,
    })),
    people,
    canEdit,
  };
}
export type TaskDetail = Awaited<ReturnType<typeof taskDetail>>;

export type FeedItem = {
  id: string;
  kind: "comment" | "activity";
  author: { id: string; name: string } | null;
  body: string;
  createdAt: string;
};

export async function taskFeed(user: CurrentUser, id: string): Promise<FeedItem[]> {
  await getVisible(user, id);
  const who = { select: { id: true, name: true } } as const;
  const newest = { createdAt: "desc" } as const;
  const [comments, activities] = await Promise.all([
    db.taskComment.findMany({ where: { taskId: id }, include: { author: who }, orderBy: newest, take: 300 }),
    db.taskActivity.findMany({ where: { taskId: id }, include: { actor: who }, orderBy: newest, take: 300 }),
  ]);
  const items: FeedItem[] = [
    ...comments.map((c) => ({
      id: c.id,
      kind: "comment" as const,
      author: c.author,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
    ...activities.map((a) => ({
      id: a.id,
      kind: "activity" as const,
      author: a.actor,
      body: a.message,
      createdAt: a.createdAt.toISOString(),
    })),
  ];
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/* ── Writes ───────────────────────────────────────────────────────────────── */

const log = (tx: Tx, taskId: string, actorId: string, kind: string, message: string) =>
  tx.taskActivity.create({ data: { taskId, actorId, kind, message } });

const details = (input: z.output<typeof taskSchema>) => ({
  title: input.title,
  description: input.description,
  priority: input.priority,
  dueDate: input.dueDate ? toDbDate(input.dueDate) : null,
  labels: [...new Set(input.labels)],
  client: input.client,
});

export async function createTask(input: z.output<typeof taskSchema>, ctx: ActionContext) {
  const { user } = ctx;
  const assigneeIds = [...new Set(input.assigneeIds)];
  await assertAssignable(user, assigneeIds);
  return db.$transaction(async (tx) => {
    const first = await tx.task.findFirst({
      where: { status: "TODO", deletedAt: null },
      orderBy: { position: "asc" },
      select: { position: true },
    });
    const task = await tx.task.create({
      data: {
        ...details(input),
        createdById: user.id,
        position: (first?.position ?? 0) - 1024,
        assignees: { create: assigneeIds.map((userId) => ({ userId })) },
        checklist: {
          create: input.checklist.map((c, position) => ({ text: c.text, done: c.done, position })),
        },
      },
    });
    await log(tx, task.id, user.id, "created", "created this task");
    await notify(
      assigneeIds.filter((id) => id !== user.id),
      {
        kind: "task.assigned",
        title: `New task: ${task.title}`,
        body: `Assigned by ${user.name}`,
        href: href(task.id),
      },
      tx,
    );
    return { id: task.id };
  });
}

async function syncChecklist(tx: Tx, taskId: string, items: z.output<typeof taskSchema>["checklist"]) {
  const current = await tx.taskChecklistItem.findMany({ where: { taskId }, select: { id: true } });
  const known = new Set(current.map((c) => c.id));
  const kept = items.flatMap((c) => (c.id && known.has(c.id) ? [c.id] : []));
  await tx.taskChecklistItem.deleteMany({ where: { taskId, id: { notIn: kept } } });
  for (const [position, c] of items.entries()) {
    const row = { text: c.text, done: c.done, position };
    if (c.id && known.has(c.id)) await tx.taskChecklistItem.update({ where: { id: c.id }, data: row });
    else await tx.taskChecklistItem.create({ data: { ...row, taskId } });
  }
}

export async function updateTask(id: string, input: z.output<typeof taskSchema>, ctx: ActionContext) {
  const { user } = ctx;
  const data = details(input);
  const assigneeIds = [...new Set(input.assigneeIds)];
  const before = await getEditable(user, id);
  const oldIds = before.assignees.map((a) => a.userId);
  const added = assigneeIds.filter((a) => !oldIds.includes(a));
  const removed = oldIds.filter((a) => !assigneeIds.includes(a));
  await assertAssignable(user, added);
  if (removed.length) {
    if (!user.permissions.has("tasks.assign")) throw forbiddenError();
    const inScope = await db.user.count({
      where: { AND: [{ id: { in: removed } }, await teamOrSelfWhere(user)] },
    });
    if (inScope !== removed.length) throw invalid("You can only remove people in your team.");
  }

  await db.$transaction(async (tx) => {
    await lock(tx, `task:${id}`);
    await tx.task.update({ where: { id }, data });
    if (removed.length) await tx.taskAssignee.deleteMany({ where: { taskId: id, userId: { in: removed } } });
    if (added.length)
      await tx.taskAssignee.createMany({
        data: added.map((userId) => ({ taskId: id, userId })),
        skipDuplicates: true,
      });
    await syncChecklist(tx, id, input.checklist);

    const note = (kind: string, message: string) => log(tx, id, user.id, kind, message);
    if (before.title !== data.title) await note("title", `renamed this task to "${data.title}"`);
    if (before.description !== data.description) await note("description", "updated the description");
    if (before.priority !== data.priority)
      await note(
        "priority",
        `changed priority from ${before.priority.toLowerCase()} to ${data.priority.toLowerCase()}`,
      );

    const oldDue = before.dueDate ? fromDbDate(before.dueDate) : null;
    if (oldDue !== input.dueDate) {
      const message = input.dueDate
        ? `changed the due date to ${formatISODate(input.dueDate)}`
        : "removed the due date";
      await note("due", message);
      await notify(
        oldIds.filter((u) => u !== user.id && !removed.includes(u)),
        {
          kind: "task.due",
          title: `Due date changed: ${data.title}`,
          body: `${user.name} ${message}`,
          href: href(id),
        },
        tx,
      );
    }
    if (added.length || removed.length) {
      const names = await tx.user.findMany({
        where: { id: { in: [...added, ...removed] } },
        select: { id: true, name: true },
      });
      const list = (ids: string[]) =>
        names
          .filter((n) => ids.includes(n.id))
          .map((n) => n.name)
          .join(", ");
      if (added.length) await note("assigned", `assigned ${list(added)}`);
      if (removed.length) await note("unassigned", `removed ${list(removed)}`);
      await notify(
        added.filter((u) => u !== user.id),
        {
          kind: "task.assigned",
          title: `New task: ${data.title}`,
          body: `Assigned by ${user.name}`,
          href: href(id),
        },
        tx,
      );
    }
  });
  return { id };
}

/** Changes status and order. Assignees may move their own tasks; editing details stays with managers. */
export async function moveTask(input: z.output<typeof moveTaskSchema>, ctx: ActionContext) {
  const { user } = ctx;
  const task = await getVisible(user, input.id);
  await db.$transaction(async (tx) => {
    await lock(tx, "task:board");
    const column = await tx.task.findMany({
      where: { status: input.status, deletedAt: null, NOT: { id: input.id } },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      select: { id: true, position: true },
    });
    const index = input.beforeId ? column.findIndex((c) => c.id === input.beforeId) : -1;
    const at = index === -1 ? column.length : index;
    const prev = column[at - 1]?.position;
    const next = column[at]?.position;
    let position = 0;
    if (prev !== undefined && next !== undefined) {
      position = (prev + next) / 2;
      if (next - prev < 1e-6) {
        // No room left between neighbours: renumber the column once.
        const status = input.status;
        await tx.$executeRaw`
          UPDATE "Task" AS t SET "position" = r.n * 1024 FROM (
            SELECT "id", ROW_NUMBER() OVER (ORDER BY "position" ASC, "createdAt" DESC) AS n FROM "Task"
            WHERE "status" = ${status}::"TaskStatus" AND "deletedAt" IS NULL AND "id" <> ${input.id}
          ) AS r WHERE t."id" = r."id"`;
        position = at * 1024 + 512;
      }
    } else if (prev !== undefined) position = prev + 1024;
    else if (next !== undefined) position = next - 1024;

    await tx.task.update({
      where: { id: input.id },
      data: {
        status: input.status,
        position,
        completedAt: input.status === "DONE" ? (task.completedAt ?? new Date()) : null,
      },
    });
    if (task.status !== input.status) {
      const message = `moved this from ${STATUS_LABEL[task.status]} to ${STATUS_LABEL[input.status]}`;
      await log(tx, task.id, user.id, "status", message);
      await notify(
        await followers(task, user.id),
        {
          kind: "task.status",
          title: `${task.title}: ${STATUS_LABEL[input.status]}`,
          body: `${user.name} ${message}`,
          href: href(task.id),
        },
        tx,
      );
    }
  });
}

export async function addComment(input: z.output<typeof commentSchema>, ctx: ActionContext) {
  const { user } = ctx;
  const task = await getVisible(user, input.taskId);
  const mentioned = findMentions(input.body, await participants(task)).filter((id) => id !== user.id);
  const preview = input.body.slice(0, 140);
  const listeners = (await followers(task, user.id)).filter((id) => !mentioned.includes(id));
  await db.$transaction(async (tx) => {
    await tx.taskComment.create({
      data: { taskId: task.id, authorId: user.id, body: input.body, mentions: mentioned },
    });
    await notify(
      mentioned,
      {
        kind: "task.mention",
        title: `${user.name} mentioned you in "${task.title}"`,
        body: preview,
        href: href(task.id),
      },
      tx,
    );
    await notify(
      listeners,
      {
        kind: "task.comment",
        title: `${user.name} commented on "${task.title}"`,
        body: preview,
        href: href(task.id),
      },
      tx,
    );
  });
}

export async function toggleChecklist(
  input: { taskId: string; itemId: string; done: boolean },
  ctx: ActionContext,
) {
  await getVisible(ctx.user, input.taskId);
  const { count } = await db.taskChecklistItem.updateMany({
    where: { id: input.itemId, taskId: input.taskId },
    data: { done: input.done },
  });
  if (!count) throw notFound("Checklist item");
}

export async function deleteTask(id: string, ctx: ActionContext) {
  const task = await getEditable(ctx.user, id);
  await db.$transaction(async (tx) => {
    await tx.task.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(
      {
        action: "task.delete",
        actorId: ctx.user.id,
        targetType: "Task",
        targetId: id,
        before: { title: task.title, status: task.status, number: task.number },
        meta: ctx.meta,
      },
      tx,
    );
  });
}

export const assertTaskVisible = getVisible;

export async function logAttachment(taskId: string, actorId: string, filename: string) {
  await db.taskActivity.create({
    data: { taskId, actorId, kind: "attachment", message: `attached ${filename}` },
  });
}

/** Open work per person, for the workload chart. */
export async function workload(user: CurrentUser) {
  const people = await db.user.findMany({
    where: { AND: [await teamWhere(user), { isActive: true }] },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      taskAssignments: {
        where: { task: { deletedAt: null, status: { not: "DONE" } } },
        select: { task: { select: { status: true, dueDate: true } } },
      },
    },
  });
  const today = await todayISO();
  return people.map((p) => {
    const tasks = p.taskAssignments.map((a) => a.task);
    const n = (s: TaskStatusName) => tasks.filter((t) => t.status === s).length;
    return {
      id: p.id,
      name: p.name,
      todo: n("TODO"),
      inProgress: n("IN_PROGRESS"),
      inReview: n("IN_REVIEW"),
      overdue: tasks.filter((t) => t.dueDate && fromDbDate(t.dueDate) < today).length,
    };
  });
}

export async function userTaskSummary(userId: string, take = 5) {
  const where = { deletedAt: null, assignees: { some: { userId } } };
  const [groups, next, today] = await Promise.all([
    db.task.groupBy({ by: ["status"], where, _count: true }),
    db.task.findMany({
      where: { ...where, status: { not: "DONE" } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take,
      include: cardInclude,
    }),
    todayISO(),
  ]);
  const count = (s: TaskStatusName) => groups.find((g) => g.status === s)?._count ?? 0;
  return {
    counts: {
      TODO: count("TODO"),
      IN_PROGRESS: count("IN_PROGRESS"),
      IN_REVIEW: count("IN_REVIEW"),
      DONE: count("DONE"),
    },
    next: next.map((t) => toCard(t, today)),
  };
}
