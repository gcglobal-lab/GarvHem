import { expect, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";
import { BASE_URL, PASSWORD, TEST_DB } from "./env";

export const ORIGIN = { Origin: BASE_URL };

export async function sql<T = Record<string, unknown>>(query: string, values: unknown[] = []): Promise<T[]> {
  const pg = new Client({ connectionString: TEST_DB });
  await pg.connect();
  try {
    return (await pg.query(query, values)).rows as T[];
  } finally {
    await pg.end();
  }
}

export const idOf = async (email: string) =>
  (await sql<{ id: string }>(`SELECT id FROM "User" WHERE email = $1`, [email]))[0]!.id;

/** Signs the whole browser context in through the real endpoint. */
export async function signIn(context: BrowserContext, email: string, password = PASSWORD) {
  const res = await context.request.post("/api/auth/login", { headers: ORIGIN, data: { email, password } });
  expect(res.status(), `login ${email}`).toBe(200);
}

export async function fillLogin(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();
}

/** Collects anything a user would see as broken. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

export const isoDay = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
};
