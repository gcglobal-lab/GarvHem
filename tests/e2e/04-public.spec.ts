import { expect, test } from "@playwright/test";
import { ADMIN, BASE_URL } from "./env";
import { ORIGIN, signIn, sql, watchErrors } from "./helpers";

const PAGES = [
  "/",
  "/services",
  "/dedicated-talent",
  "/how-it-works",
  "/industries",
  "/about",
  "/careers",
  "/contact",
  "/privacy",
  "/terms",
  "/login",
];

test("every public page works on a phone and a desktop, without errors or dead links", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  const links = new Set<string>();
  for (const path of PAGES)
    for (const width of [360, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const res = await page.goto(path);
      expect(res!.status(), path).toBe(200);
      await page.waitForLoadState("load");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${width}`).toBeLessThanOrEqual(0);
      const broken = await page.evaluate(() =>
        [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
      );
      expect(broken, path).toEqual([]);
      for (const h of await page
        .locator("a[href^='/']")
        .evaluateAll((a) => a.map((x) => x.getAttribute("href")!)))
        links.add(h.split("#")[0]!);
      expect(await page.locator("h1").count(), `${path} h1`).toBe(1);
      expect(await page.title()).toMatch(/GARVHEM/);
    }
  for (const l of links) if (l) expect((await page.request.get(l)).status(), l).toBeLessThan(400);
  expect(errors).toEqual([]);
});

test("seo files", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /portal");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`${BASE_URL}/dedicated-talent`);
  expect(sitemap).not.toContain("/portal");
  const og = await request.get("/opengraph-image");
  expect(og.headers()["content-type"]).toContain("image/png");
  const home = await (await request.get("/")).text();
  for (const t of ["Organization", "FAQPage"]) expect(home).toContain(`"@type":"${t}"`);
  expect((await request.get("/definitely-not-a-page")).status()).toBe(404);
});

test("the savings calculator reacts", async ({ page }) => {
  await page.goto("/dedicated-talent");
  await expect(
    page.getByText(/Estimates only, actual pricing depends on role and requirements/).first(),
  ).toBeVisible();
  const form = page.getByRole("form", { name: "Savings calculator" });
  const before = await form.innerText();
  await form.getByLabel("Role").selectOption({ label: "Developer" });
  await expect.poll(() => form.innerText()).not.toBe(before);
  await form.getByText("Canada").click();
  await expect(form.getByText("CA$", { exact: false }).first()).toBeVisible();
  await form.getByRole("button", { name: "One more" }).click();
  await expect(form.getByRole("slider")).toHaveValue("2");
  await expect(page.getByTestId("professionals").first()).toHaveText(/^[34]$/);
});

test("public lead form saves a lead that appears in Admin, Leads", async ({ browser, page }) => {
  await page.goto("/contact");
  await page.getByLabel("Full name").fill("Jordan Example");
  await page.getByLabel("Work email").fill("jordan@example.com");
  await page.getByLabel("Country", { exact: false }).first().selectOption("USA");
  await page.locator("form label", { hasText: /^Dedicated Talent$/ }).click();
  await expect(page.getByLabel("How many people")).toBeVisible();
  await page
    .getByLabel("Detailed requirement")
    .fill("We need two accountants who know QuickBooks, starting next month.");
  await page.getByRole("checkbox").last().click();
  await page.waitForTimeout(3500); // humans need longer than three seconds
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByRole("heading", { name: /Thank you/ })).toBeVisible();
  await expect(page.getByText(/within 24 hours/).first()).toBeVisible();

  const admin = await browser.newContext();
  await signIn(admin, ADMIN);
  const a = await admin.newPage();
  await a.goto("/portal/admin/leads");
  await expect(a.getByRole("link", { name: "Jordan Example" })).toBeVisible();
  await expect(a.getByText("New", { exact: true }).first()).toBeVisible();
  await expect(a.getByRole("link", { name: /^Leads/ })).toContainText("1");
  await a.getByRole("link", { name: "Jordan Example" }).click();
  await expect(a.getByText("two accountants who know QuickBooks")).toBeVisible();
  await a.getByLabel("Status").selectOption("CONTACTED");
  await expect(a.getByText("New to Contacted")).toBeVisible();
  await a.getByLabel("Add an internal note").fill("Called, very interested.");
  await a.getByRole("button", { name: "Add note" }).click();
  await expect(a.getByText("Called, very interested.").last()).toBeVisible();
  expect(await (await admin.request.get("/api/portal/admin/export/leads")).text()).toContain(
    "Jordan Example",
  );
});

test("spam protection: honeypot, speed check, validation and rate limit", async ({ request }) => {
  await sql(`DELETE FROM "RateLimit"`);
  const data = JSON.stringify({
    fullName: "Bot Test",
    email: "bot@example.com",
    country: "USA",
    services: ["Cloud Services"],
    requirement: "This is a long enough requirement text.",
    consent: true,
    sourcePage: "/contact",
  });
  const send = (over: Record<string, string> = {}) =>
    request.post("/api/leads", {
      headers: ORIGIN,
      multipart: { data, website: "", elapsed: "9000", ...over },
    });
  const count = async () => (await sql(`SELECT 1 FROM "Lead" WHERE email = 'bot@example.com'`)).length;
  await send({ website: "http://spam.example" });
  await send({ elapsed: "200" });
  expect(await count()).toBe(0);
  expect((await send({ data: "{}" })).status()).toBe(422);
  for (let i = 0; i < 5; i++) expect((await send()).status()).toBe(200);
  expect((await send()).status()).toBe(429);
  expect(await count()).toBe(5);
  await sql(`DELETE FROM "RateLimit"`);
});
