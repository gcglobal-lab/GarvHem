import { expect, test } from "@playwright/test";
import { ADMIN } from "./env";
import { idOf, isoDay, signIn, sql, watchErrors } from "./helpers";

test("punch in, lunch, report, punch out; admin sees it", async ({ browser, page, context }) => {
  const errors = watchErrors(page);
  await signIn(context, "abhishek@garvhem.com");
  await page.goto("/portal");
  const card = page.locator("section", { has: page.getByTestId("work-timer") });
  await expect(page.getByTestId("presence")).toHaveText("Not punched in");
  await expect(card.getByRole("button", { name: "Start Lunch" })).toBeDisabled();
  await card.getByRole("button", { name: "Punch In" }).click();
  await expect(page.getByTestId("presence")).toHaveText("Working");
  await expect(page.getByTestId("work-timer")).not.toHaveText("00:00:00");

  await card.getByRole("button", { name: "Start Lunch" }).click();
  await expect(page.getByTestId("presence")).toHaveText("On lunch");
  await expect(page.getByTestId("lunch-remaining")).toHaveText(/00:59:\d\d remaining of 60 min/);
  await card.getByRole("button", { name: "End Lunch" }).click();
  await expect(page.getByTestId("presence")).toHaveText("Working");

  await card.getByRole("button", { name: "Punch Out" }).click();
  const prompt = page.getByRole("dialog", { name: "Submit your daily report first" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole("link", { name: "Write the report" }).click();
  await page
    .getByLabel(/What did you get done today/)
    .fill("Finished the checkout page and tested it on phones.");
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByLabel("Details").fill("Checkout page");
  await page.getByLabel("Hours").fill("3.5");
  await page.getByRole("button", { name: "Submit and punch out" }).click();
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByTestId("presence")).toHaveText("Punched out");
  await expect(page.getByText("Daily report: Submitted")).toBeVisible();
  expect(errors).toEqual([]);

  const admin = await browser.newContext();
  await signIn(admin, ADMIN);
  const p = await admin.newPage();
  await p.goto("/portal/admin/attendance");
  await expect(p.getByRole("link", { name: /Abhishek Chaudhary/ }).first()).toContainText("Punched out");
  await p.goto(`/portal/admin/attendance/${await idOf("abhishek@garvhem.com")}/${isoDay()}`);
  for (const e of ["Punch in", "Lunch start", "Lunch end", "Punch out"])
    await expect(p.getByText(e, { exact: false }).first()).toBeVisible();
  const csv = await (await admin.request.get("/api/portal/admin/export/attendance")).text();
  expect(csv).toContain("Punch in,Punch out,Lunch (min)");
  expect(csv).toContain("Abhishek Chaudhary");
  await p.goto("/portal/admin/reports");
  await expect(p.getByText("Finished the checkout page")).toBeVisible();
  await expect(p.getByText("Missing", { exact: true }).first()).toBeVisible();
  await p.getByText("Finished the checkout page").click();
  await p.getByLabel("Add feedback").fill("Great work, thank you.");
  await p.getByRole("button", { name: "Send" }).click();
  await expect(p.getByText("Great work, thank you.")).toBeVisible();
  await page.goto("/portal");
  await page.getByRole("button", { name: /Notifications, \d+ unread/ }).click();
  await expect(page.getByText(/Hemant Singh commented on the/)).toBeVisible();
});

test("punch rules: no double punch, lunch overrun flagged, auto end of lunch", async ({ context }) => {
  await signIn(context, "yuvraj@garvhem.com");
  const page = await context.newPage();
  await page.goto("/portal");
  await page.getByRole("button", { name: "Punch In", exact: true }).click();
  await expect(page.getByTestId("presence")).toHaveText("Working");
  // a second tab that still shows the old state must not be able to punch in twice
  const user = await idOf("yuvraj@garvhem.com");
  await sql(
    `UPDATE "AttendanceEvent" SET at = at - interval '3 hours' WHERE "attendanceDayId" IN (SELECT id FROM "AttendanceDay" WHERE "userId" = $1)`,
    [user],
  );
  await page.reload();
  await page.getByRole("button", { name: "Start Lunch" }).click();
  await expect(page.getByTestId("presence")).toHaveText("On lunch");
  await sql(
    `UPDATE "AttendanceEvent" SET at = at - interval '75 minutes' WHERE type = 'LUNCH_START' AND "attendanceDayId" IN (SELECT id FROM "AttendanceDay" WHERE "userId" = $1)`,
    [user],
  );
  await page.reload();
  await expect(page.getByTestId("lunch-remaining")).toHaveText(/00:15:\d\d over 60 min/);
  await page.getByRole("button", { name: "Punch Out", exact: true }).click();
  await page.getByRole("button", { name: "Punch out anyway" }).click();
  await expect(page.getByTestId("presence")).toHaveText("Punched out");
  const events = await sql<{ type: string }>(
    `SELECT type FROM "AttendanceEvent" WHERE "attendanceDayId" IN (SELECT id FROM "AttendanceDay" WHERE "userId" = $1) ORDER BY at`,
    [user],
  );
  expect(events.map((e) => e.type)).toEqual(["PUNCH_IN", "LUNCH_START", "LUNCH_END", "PUNCH_OUT"]);
  const [day] = await sql<{ lunchOverrun: boolean; lunchOverrunMinutes: number }>(
    `SELECT "lunchOverrun", "lunchOverrunMinutes" FROM "AttendanceDay" WHERE "userId" = $1`,
    [user],
  );
  expect(day).toMatchObject({ lunchOverrun: true, lunchOverrunMinutes: 15 });
});

test("admin corrects attendance with a mandatory reason", async ({ page, context }) => {
  await signIn(context, ADMIN);
  const user = await idOf("yuvraj@garvhem.com");
  const day = isoDay(-1);
  await page.goto(`/portal/admin/attendance/${user}/${day}`);
  await page.getByRole("button", { name: "Correct times" }).click();
  await page.getByLabel("Event 1 time").fill(`${day}T09:00`);
  await page.getByLabel("Event 2 time").fill(`${day}T18:00`);
  await page.getByLabel("Reason").fill("Forgot");
  await page.getByLabel("Reason").fill("Forgot to punch, confirmed by phone");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(page.getByText("Attendance corrected.")).toBeVisible();
  await expect(page.getByText("9h", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Forgot to punch, confirmed by phone")).toBeVisible();
  const [log] = await sql<{ after: { reason: string } }>(
    `SELECT after FROM "AuditLog" WHERE action = 'attendance.correct'`,
  );
  expect(log!.after.reason).toContain("confirmed by phone");
});

test("leave: apply, approve, balance and attendance update, cancel reverses, adjust", async ({
  browser,
  page,
  context,
}) => {
  await signIn(context, "abhishek@garvhem.com");
  await page.goto("/portal/leaves");
  const from = isoDay(5);
  await page.getByRole("button", { name: "Apply for leave" }).click();
  await page.getByLabel("Leave type").selectOption({ index: 0 });
  await page.getByLabel("To", { exact: false }).last().fill(isoDay(6));
  await page.getByLabel("From").fill(from);
  await page.getByLabel("To", { exact: false }).last().fill(isoDay(6));
  await expect(page.getByText("2 working days will be requested.")).toBeVisible();
  await page.getByLabel("Reason").fill("Family event");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Request sent for 2 days.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Casual: 10 of 12 days left" })).toBeVisible();

  // overlapping request is refused
  await page.getByRole("button", { name: "Apply for leave" }).click();
  await page.getByLabel("From").fill(from);
  await page.getByLabel("Reason").fill("Again");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText(/This overlaps your pending leave/)).toBeVisible();
  await page.keyboard.press("Escape");

  const admin = await browser.newContext();
  await signIn(admin, ADMIN);
  const a = await admin.newPage();
  await a.goto("/portal/admin/leaves");
  await expect(a.getByText("Family event")).toBeVisible();
  await a.getByRole("button", { name: "Approve" }).click();
  await a.getByRole("button", { name: "Approve leave" }).click();
  await expect(a.getByText("Leave approved.")).toBeVisible();

  const user = await idOf("abhishek@garvhem.com");
  const marked = await sql(`SELECT 1 FROM "AttendanceDay" WHERE "userId" = $1 AND status = 'ON_LEAVE'`, [
    user,
  ]);
  expect(marked.length).toBe(2);
  await page.reload();
  await expect(page.getByText("Approved").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "Casual: 10 of 12 days left" })).toBeVisible();
  await expect(page.getByText("Deduction", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel leave" }).click();
  await expect(page.getByText("Leave cancelled and days returned.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Casual: 12 of 12 days left" })).toBeVisible();
  expect(
    (await sql(`SELECT 1 FROM "AttendanceDay" WHERE "userId" = $1 AND status = 'ON_LEAVE'`, [user])).length,
  ).toBe(0);

  await a.goto("/portal/admin/leaves?view=balances");
  await a.getByRole("button", { name: "Adjust balance" }).click();
  await a.getByLabel("Employee").selectOption({ label: "Abhishek Chaudhary" });
  await a.getByRole("button", { name: "Subtract" }).click();
  await a.getByLabel("Days").fill("1.5");
  await a.getByLabel("Reason").fill("Correction for last month");
  await a.getByRole("button", { name: "Save adjustment" }).click();
  await expect(a.getByText(/10\.5 days available now/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("img", { name: "Casual: 10.5 of 10.5 days left" })).toBeVisible();
});

test("leave cannot exceed the balance", async ({ page, context }) => {
  await signIn(context, "yuvraj@garvhem.com");
  await page.goto("/portal/leaves");
  await page.getByRole("button", { name: "Apply for leave" }).click();
  await page.getByLabel("Leave type").selectOption({ label: "Sick (6 left)" });
  await page.getByLabel("From").fill(isoDay(1));
  await page.getByLabel("To", { exact: false }).last().fill(isoDay(9));
  await expect(page.getByText(/9 working days requested, only 6 available/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send request" })).toBeDisabled();
});

test("tasks: admin creates and assigns, employee comments and moves, admin is notified", async ({
  browser,
  page,
  context,
}) => {
  await signIn(context, ADMIN);
  await page.goto("/portal/tasks");
  await page.getByRole("button", { name: "New task" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Prepare the launch checklist");
  await dialog
    .getByLabel(/Description/)
    .fill("**Important** <img src=x onerror=alert(1)> [bad](javascript:alert(1))");
  await dialog.getByLabel("Abhishek Chaudhary").click();
  await dialog.getByLabel("Priority").selectOption("HIGH");
  await dialog.getByLabel("Labels").fill("Website");
  await dialog.getByLabel("Labels").press("Enter");
  await dialog.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByRole("heading", { name: "Prepare the launch checklist" })).toBeVisible();
  await expect(page.locator("strong", { hasText: "Important" })).toBeVisible();
  expect(await page.locator("img[src='x']").count()).toBe(0);
  expect(await page.locator("a[href^='javascript']").count()).toBe(0);
  const url = new URL(page.url()).pathname;

  const employee = await browser.newContext();
  await signIn(employee, "abhishek@garvhem.com");
  const e = await employee.newPage();
  await e.goto(url);
  await expect(e.getByRole("button", { name: "Edit" })).toHaveCount(0);
  await expect(e.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await e.getByLabel("Write a comment").fill("@Hemant Singh the draft is ready");
  await e.getByRole("button", { name: "Comment" }).click();
  await expect(e.getByText("the draft is ready")).toBeVisible();
  await e.getByLabel("Status").selectOption("IN_PROGRESS");
  await expect(e.getByText("Status updated.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("the draft is ready")).toBeVisible();
  await expect(page.getByText("moved this from To do to In progress")).toBeVisible();
  await page.getByRole("button", { name: /Notifications, \d+ unread/ }).click();
  await expect(page.getByText(/Abhishek Chaudhary mentioned you/)).toBeVisible();
});

test("kanban drag and drop persists", async ({ page, context }) => {
  await signIn(context, "abhishek@garvhem.com");
  await page.goto("/portal/tasks");
  const handle = page.getByRole("button", { name: "Move Prepare the launch checklist" });
  const target = page.locator("[data-column='IN_REVIEW']");
  await expect(handle).toBeVisible();
  const a = (await handle.boundingBox())!;
  const b = (await target.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 60, a.y + 30, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, b.y + 110, { steps: 15 });
  await page.mouse.up();
  await expect(target.getByText("Prepare the launch checklist")).toBeVisible();
  await expect
    .poll(
      async () =>
        (
          await sql<{ status: string }>(
            `SELECT status FROM "Task" WHERE title = 'Prepare the launch checklist'`,
          )
        )[0]!.status,
    )
    .toBe("IN_REVIEW");
  await page.reload();
  await expect(target.getByText("Prepare the launch checklist")).toBeVisible();
});

test("attachments are private and validated", async ({ browser, page, context }) => {
  await signIn(context, "abhishek@garvhem.com");
  const [task] = await sql<{ id: string }>(
    `SELECT id FROM "Task" WHERE title = 'Prepare the launch checklist'`,
  );
  await page.goto(`/portal/tasks/${task!.id}`);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.getByLabel("Choose a file").setInputFiles({
    name: "evil.png",
    mimeType: "image/png",
    buffer: Buffer.from("<script>alert(1)</script>...."),
  });
  await expect(page.getByText(/That file type is not allowed/)).toBeVisible();
  await page
    .getByLabel("Choose a file")
    .setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("link", { name: "Download proof.png" })).toBeVisible();
  const href = (await page.getByRole("link", { name: "Download proof.png" }).getAttribute("href"))!;
  const own = await context.request.get(href);
  expect(own.status()).toBe(200);
  expect(own.headers()["content-disposition"]).toContain("attachment");
  const other = await browser.newContext();
  await signIn(other, "rakshit@garvhem.com");
  expect((await other.request.get(href)).status()).toBe(404);
  const anon = await browser.newContext();
  expect((await anon.request.get(href)).status()).toBe(401);
});
