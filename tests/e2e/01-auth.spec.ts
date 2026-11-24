import { expect, test } from "@playwright/test";
import { ADMIN, EMPLOYEES, PASSWORD, SEEDED } from "./env";
import { ORIGIN, fillLogin, idOf, signIn, sql } from "./helpers";

test("login page: centered card, picture left, form right, no signup", async ({ page }) => {
  await page.goto("/login");
  const heading = await page.getByRole("heading", { name: "Welcome back" }).boundingBox();
  const tagline = await page.getByText("One place for your day").boundingBox();
  expect(tagline!.x).toBeLessThan(heading!.x);
  await expect(page.getByText("Contact your administrator to reset your password")).toBeVisible();
  await expect(page.getByText(/sign up|register|create account/i)).toHaveCount(0);
  for (const path of ["/signup", "/register"]) expect((await page.request.get(path)).status()).toBe(404);
  await page.getByLabel("Password", { exact: true }).fill("secret");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
});

test("protected pages redirect to login and come back", async ({ page }) => {
  await page.goto("/portal/leaves");
  await expect(page).toHaveURL(/\/login\?next=%2Fportal%2Fleaves/);
  await fillLogin(page, ADMIN, PASSWORD);
  await expect(page).toHaveURL(/\/portal\/leaves$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/portal$/);
});

test("next can only point inside the portal", async ({ page }) => {
  await page.goto("/login?next=https://example.com");
  await fillLogin(page, ADMIN, PASSWORD);
  await expect(page).toHaveURL(/localhost:\d+\/portal$/);
});

test("first login forces a password change", async ({ page }) => {
  await page.goto("/login");
  await fillLogin(page, "mohit@garvhem.com", SEEDED.employee);
  await expect(page).toHaveURL(/change-password/);
  await page.goto("/portal");
  await expect(page).toHaveURL(/change-password/);
  expect((await page.request.get("/api/portal/attendance/today")).status()).toBe(403);
  await page.getByLabel("Current password").fill(SEEDED.employee);
  await page.getByLabel("New password", { exact: true }).fill("P@ssword1234");
  await page.getByLabel("Confirm new password").fill("P@ssword1234");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("This password is too common.").first()).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm new password").fill(PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole("heading", { name: /Good .*, Mohit/ })).toBeVisible();
});

test("admin and all five employees can log in", async ({ browser }) => {
  for (const email of [ADMIN, ...EMPLOYEES]) {
    const context = await browser.newContext();
    await signIn(context, email);
    expect((await context.request.get("/portal")).status()).toBe(200);
    await context.close();
  }
});

test("session cookies are httpOnly and the refresh cookie is path-scoped", async ({ context }) => {
  await signIn(context, ADMIN);
  const cookies = await context.cookies(["http://localhost:3200/api/auth/refresh"]);
  const by = (n: string) => cookies.find((c) => c.name === n)!;
  for (const n of ["__Host-gv_at", "__Secure-gv_rt"]) {
    expect(by(n).httpOnly).toBe(true);
    expect(by(n).secure).toBe(true);
    expect(by(n).sameSite).toBe("Lax");
  }
  expect(by("__Secure-gv_rt").path).toBe("/api/auth");
});

test("an expired access token is refreshed silently", async ({ page, context }) => {
  await signIn(context, ADMIN);
  await context.clearCookies({ name: "__Host-gv_at" });
  await page.goto("/portal/tasks?view=list");
  await expect(page).toHaveURL(/\/portal\/tasks\?view=list$/);
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === "__Host-gv_at")).toBe(true);
});

test("a Server Action survives an expired access token", async ({ page, context }) => {
  await signIn(context, ADMIN);
  await page.goto("/portal/profile");
  await page.getByLabel("Phone").fill("+91 98765 43210");
  await context.clearCookies({ name: "__Host-gv_at" });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();
});

test("reusing a rotated refresh token revokes every session", async ({ browser }) => {
  const victim = await browser.newContext();
  const other = await browser.newContext();
  await signIn(victim, "rakshit@garvhem.com");
  await signIn(other, "rakshit@garvhem.com");
  const [old] = await victim
    .cookies("http://localhost:3200/api/auth/refresh")
    .then((c) => c.filter((x) => x.name === "__Secure-gv_rt"));
  expect((await victim.request.post("/api/auth/refresh", { headers: ORIGIN })).status()).toBe(200);
  // move the rotation outside the 15-second grace window
  await sql(
    `UPDATE "Session" SET "revokedAt" = (now() at time zone 'utc') - interval '5 minutes' WHERE "replacedById" IS NOT NULL`,
  );
  const thief = await browser.newContext();
  await thief.addCookies([old!]);
  expect((await thief.request.post("/api/auth/refresh", { headers: ORIGIN })).status()).toBe(401);
  for (const c of [victim, other]) {
    expect((await c.request.get("/api/portal/attendance/today")).status()).toBe(401);
    expect((await c.request.post("/api/auth/refresh", { headers: ORIGIN })).status()).toBe(401);
  }
  const audit = await sql(`SELECT 1 FROM "AuditLog" WHERE action = 'auth.refresh_reuse'`);
  expect(audit.length).toBe(1);
});

test("two parallel refreshes do not log the user out", async ({ context }) => {
  await signIn(context, ADMIN);
  const both = await Promise.all(
    [1, 2].map(() => context.request.post("/api/auth/refresh", { headers: ORIGIN })),
  );
  expect(both.map((r) => r.status())).toEqual([200, 200]);
  expect((await context.request.get("/api/portal/counts")).status()).toBe(200);
});

test("logout ends the session on the server", async ({ page, context }) => {
  await signIn(context, ADMIN);
  const saved = await context.cookies();
  await page.goto("/portal");
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await context.addCookies(saved); // a copied cookie must be useless now
  expect((await context.request.get("/api/portal/counts")).status()).toBe(401);
});

test("deactivation signs a person out at once", async ({ browser, context, page }) => {
  const employee = await browser.newContext();
  await signIn(employee, "pushpendra@garvhem.com");
  expect((await employee.request.get("/api/portal/attendance/today")).status()).toBe(200);
  await signIn(context, ADMIN);
  await page.goto(`/portal/admin/employees/${await idOf("pushpendra@garvhem.com")}`);
  await page.getByRole("button", { name: "Deactivate" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByText("Account deactivated")).toBeVisible();
  expect((await employee.request.get("/api/portal/attendance/today")).status()).toBe(401);
  const again = await employee.request.post("/api/auth/login", {
    headers: ORIGIN,
    data: { email: "pushpendra@garvhem.com", password: PASSWORD },
  });
  expect(again.status()).toBe(401);
  expect((await again.json()).error).toBe("Invalid email or password.");
  await page.getByRole("button", { name: "Reactivate" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByText("Account reactivated")).toBeVisible();
});

test("lockout is the same for real and unknown emails", async ({ browser }) => {
  const results: string[][] = [];
  for (const email of ["yuvraj@garvhem.com", "nobody@garvhem.com"]) {
    const c = await browser.newContext();
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await c.request.post("/api/auth/login", {
        headers: ORIGIN,
        data: { email, password: "Wrong!Password1" },
      });
      seen.push(`${r.status()} ${(await r.json()).error}`);
    }
    results.push(seen);
  }
  expect(results[0]).toEqual(results[1]);
  expect(results[0]![0]).toContain("Invalid email or password.");
  expect(results[0]![5]).toMatch(/^429 Too many failed attempts/);
  expect(
    (await sql(`SELECT 1 FROM "AuditLog" WHERE action = 'auth.lockout' AND "targetId" IS NOT NULL`)).length,
  ).toBe(1);
  await sql(`UPDATE "User" SET "lockedUntil" = NULL, "failedLoginCount" = 0`);
  await sql(`DELETE FROM "RateLimit"`);
});

test("admin creates a user, sees the password once, and it works", async ({ browser, context, page }) => {
  await signIn(context, ADMIN);
  await page.goto("/portal/admin/employees");
  await page.getByRole("button", { name: "Add employee" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("Test Manager");
  await dialog.getByLabel("Email").fill("manager@garvhem.com");
  await dialog.getByLabel("Role").selectOption("MANAGER");
  await dialog.getByRole("button", { name: "Create account" }).click();
  const temporary = (await page.getByTestId("temporary-password").textContent())!.trim();
  expect(temporary.length).toBeGreaterThanOrEqual(16);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("GRV-007")).toBeVisible();
  const other = await browser.newContext();
  const p = await other.newPage();
  await p.goto("/login");
  await fillLogin(p, "manager@garvhem.com", temporary);
  await expect(p).toHaveURL(/change-password/);
  const ledger = await sql(
    `SELECT 1 FROM "LeaveLedgerEntry" l JOIN "User" u ON u.id = l."userId" WHERE u.email = 'manager@garvhem.com'`,
  );
  expect(ledger.length).toBe(3);
});
