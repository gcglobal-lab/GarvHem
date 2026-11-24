import { expect, test } from "@playwright/test";
import { hashPassword } from "../../src/lib/auth/password";
import { ADMIN, CRON_SECRET, PASSWORD } from "./env";
import { ORIGIN, idOf, signIn, sql } from "./helpers";

const ADMIN_PAGES = [
  "",
  "/attendance",
  "/leaves",
  "/tasks",
  "/reports",
  "/leads",
  "/employees",
  "/settings",
  "/audit",
];
const ADMIN_APIS = ["board", "export/attendance", "export/leads", "export/reports"];

test.beforeAll(async () => {
  await sql(
    `UPDATE "User" SET "passwordHash" = $1, "mustChangePassword" = false WHERE email = 'manager@garvhem.com'`,
    [await hashPassword(PASSWORD)],
  );
});

test("employees get 403 on every admin page and API", async ({ context }) => {
  await signIn(context, "abhishek@garvhem.com");
  for (const p of ADMIN_PAGES) expect((await context.request.get(`/portal/admin${p}`)).status(), p).toBe(403);
  for (const p of ADMIN_APIS)
    expect((await context.request.get(`/api/portal/admin/${p}`)).status(), p).toBe(403);
  const yuvraj = await idOf("yuvraj@garvhem.com");
  expect((await context.request.get(`/portal/admin/employees/${yuvraj}`)).status()).toBe(403);
  expect((await context.request.get(`/portal/admin/attendance/${yuvraj}/2026-11-24`)).status()).toBe(403);
});

test("anonymous API calls get 401", async ({ request }) => {
  for (const p of ["counts", "notifications", "attendance/today", "admin/board", "search?q=abc"])
    expect((await request.get(`/api/portal/${p}`)).status(), p).toBe(401);
});

test("changing ids never reveals someone else's data", async ({ context }) => {
  const yuvraj = await idOf("yuvraj@garvhem.com");
  const [report] = await sql<{ id: string }>(
    `INSERT INTO "DailyReport" (id, "userId", "workDate", summary, "updatedAt") VALUES ('reportother1', $1, '2026-01-05', 'private summary text', now()) RETURNING id`,
    [yuvraj],
  );
  const [task] = await sql<{ id: string }>(
    `INSERT INTO "Task" (id, title, "updatedAt") VALUES ('taskother1', 'Private task', now()) RETURNING id`,
  );
  await sql(`INSERT INTO "TaskAssignee" ("taskId", "userId") VALUES ($1, $2)`, [task!.id, yuvraj]);
  await sql(
    `INSERT INTO "Attachment" (id, "storageKey", filename, "mimeType", size, "taskId") VALUES ('attother1', 'tasks/x.png', 'x.png', 'image/png', 1, $1)`,
    [task!.id],
  );
  await signIn(context, "abhishek@garvhem.com");
  for (const path of [`/portal/reports/${report!.id}`, `/portal/tasks/${task!.id}`]) {
    const res = await context.request.get(path);
    expect(await res.text()).not.toMatch(/private summary text|Private task/);
  }
  expect((await context.request.get(`/api/portal/tasks/${task!.id}/feed`)).status()).toBe(404);
  expect((await context.request.get(`/api/portal/attachments/attother1`)).status()).toBe(404);
  const del = await context.request.delete(`/api/portal/attachments/attother1`, { headers: ORIGIN });
  expect(del.status()).toBe(404);
  expect(await (await context.request.get("/api/portal/search?q=Private")).json()).toEqual([]);
});

test("cross-origin writes are blocked", async ({ context }) => {
  const evil = { Origin: "https://evil.example" };
  expect(
    (
      await context.request.post("/api/auth/login", {
        headers: evil,
        data: { email: ADMIN, password: PASSWORD },
      })
    ).status(),
  ).toBe(403);
  expect(
    (await context.request.post("/api/leads", { headers: evil, multipart: { data: "{}" } })).status(),
  ).toBe(403);
  await signIn(context, ADMIN);
  expect(
    (await context.request.post("/api/portal/notifications", { headers: evil, data: {} })).status(),
  ).toBe(403);
  expect((await context.request.post("/api/auth/logout", { headers: evil })).status()).toBe(403);
});

test("security headers are strict and scripts need a nonce", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(h["content-security-policy"]).not.toContain("unsafe-eval");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["referrer-policy"]).toBeTruthy();
  expect(h["permissions-policy"]).toContain("camera=()");
  expect(h["x-powered-by"]).toBeUndefined();
  const html = await res.text();
  for (const tag of html.match(/<script\b[^>]*>/g) ?? []) expect(tag).toContain("nonce=");
});

test("the cron endpoint needs its secret and closes forgotten days", async ({ request }) => {
  expect((await request.get("/api/cron/daily")).status()).toBe(401);
  expect(
    (await request.get("/api/cron/daily", { headers: { Authorization: "Bearer wrong" } })).status(),
  ).toBe(401);
  const user = await idOf("rakshit@garvhem.com");
  await sql(
    `INSERT INTO "AttendanceDay" (id, "userId", "workDate", "isOpen", "firstIn", "updatedAt") VALUES ('opendayx1', $1, '2026-01-06', true, '2026-01-06T04:00:00Z', now())`,
    [user],
  );
  await sql(
    `INSERT INTO "AttendanceEvent" (id, "attendanceDayId", type, at) VALUES ('openevx1', 'opendayx1', 'PUNCH_IN', '2026-01-06T04:00:00Z'), ('openevx2', 'opendayx1', 'LUNCH_START', '2026-01-06T07:30:00Z')`,
  );
  const res = await request.get("/api/cron/daily", { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
  expect((await res.json()).attendanceClosed).toBe(1);
  const [day] = await sql<Record<string, unknown>>(
    `SELECT "isOpen", "autoClosed", "needsReview", "netMinutes" FROM "AttendanceDay" WHERE id = 'opendayx1'`,
  );
  expect(day).toMatchObject({ isOpen: false, autoClosed: true, needsReview: true });
});

test("manager permissions are enforced on the server and follow the toggles", async ({
  browser,
  context,
  page,
}) => {
  const manager = await browser.newContext();
  await signIn(manager, "manager@garvhem.com");
  const status = async (path: string) => (await manager.request.get(path)).status();
  for (const p of [
    "/portal/admin",
    "/portal/admin/attendance",
    "/portal/admin/leaves",
    "/portal/admin/tasks",
    "/portal/admin/reports",
  ])
    expect(await status(p), p).toBe(200);
  for (const p of [
    "/portal/admin/leads",
    "/portal/admin/employees",
    "/portal/admin/settings",
    "/portal/admin/audit",
  ])
    expect(await status(p), p).toBe(403);
  expect(await status("/api/portal/admin/export/leads")).toBe(403);

  // team scope: Abhishek is not in this manager's team until assigned
  const abhishek = await idOf("abhishek@garvhem.com");
  expect((await (await manager.request.get("/api/portal/admin/board")).json()).length).toBe(0);
  await sql(`UPDATE "User" SET "managerId" = $1 WHERE id = $2`, [
    await idOf("manager@garvhem.com"),
    abhishek,
  ]);
  const board = (await (await manager.request.get("/api/portal/admin/board")).json()) as { name: string }[];
  expect(board.map((b) => b.name)).toEqual(["Abhishek Chaudhary"]);

  await signIn(context, ADMIN);
  await page.goto("/portal/admin/settings?tab=managers");
  await page.getByRole("switch", { name: /View leads/ }).click();
  await expect(page.getByText("Manager permission updated.")).toBeVisible();
  expect(await status("/portal/admin/leads")).toBe(200);
  await page.getByRole("switch", { name: /View leads/ }).click();
  await expect(page.getByRole("switch", { name: /View leads/ })).not.toBeChecked();
  await expect.poll(() => status("/portal/admin/leads")).toBe(403);
});

test("managers cannot touch admins or other teams' work", async ({ browser }) => {
  const managerId = await idOf("manager@garvhem.com");
  const manager = await browser.newContext();
  await signIn(manager, "manager@garvhem.com");
  const names = async () =>
    ((await (await manager.request.get("/api/portal/admin/board")).json()) as { name: string }[]).map(
      (b) => b.name,
    );
  // even if an admin record still points at the manager, it stays out of their scope
  await sql(`UPDATE "User" SET "managerId" = $1 WHERE email = $2`, [managerId, ADMIN]);
  expect(await names()).toEqual(["Abhishek Chaudhary"]);
  const admin = await idOf(ADMIN);
  expect(await (await manager.request.get(`/portal/admin/employees/${admin}`)).text()).not.toContain(ADMIN);
  await sql(`UPDATE "User" SET "managerId" = NULL WHERE email = $1`, [ADMIN]);

  // a task shared with someone outside the team can be opened but not edited or deleted
  await sql(
    `INSERT INTO "Task" (id, title, "createdById", "updatedAt") VALUES ('sharedtask1', 'Shared task', $1, now())`,
    [admin],
  );
  for (const email of ["abhishek@garvhem.com", "yuvraj@garvhem.com"])
    await sql(`INSERT INTO "TaskAssignee" ("taskId", "userId") VALUES ('sharedtask1', $1)`, [
      await idOf(email),
    ]);
  const page = await manager.newPage();
  await page.goto("/portal/tasks/sharedtask1");
  await expect(page.getByRole("heading", { name: "Shared task" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
});
