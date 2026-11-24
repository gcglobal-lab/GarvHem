import { SignJWT, UnsecuredJWT } from "jose";
import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "@/lib/auth/jwt";
import { generatePassword, hashPassword, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { CONFIGURABLE_MANAGER_PERMISSIONS, PERMISSIONS, effectivePermissions } from "@/lib/auth/permissions";
import { REUSE_GRACE_MS, decideRefresh, hashToken, newOpaqueToken } from "@/lib/auth/session";
import { safeNext } from "@/lib/utils";
import { loginSchema } from "@/lib/validators/auth";

const claims = { sub: "user1", role: "EMPLOYEE", sid: "family1", ver: 3 } as const;

describe("access tokens", () => {
  it("round-trips its claims", async () => {
    expect(await verifyAccessToken(await signAccessToken(claims))).toEqual(claims);
  });
  it("expires after 15 minutes", async () => {
    const old = await signAccessToken(claims, undefined, Date.now() - 16 * 60_000);
    expect(await verifyAccessToken(old)).toBeNull();
    const fresh = await signAccessToken(claims, undefined, Date.now() - 14 * 60_000);
    expect(await verifyAccessToken(fresh)).not.toBeNull();
  });
  it("rejects tampering, other secrets, alg none and junk", async () => {
    const token = await signAccessToken(claims);
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...claims, role: "ADMIN" })).toString("base64url");
    expect(await verifyAccessToken(`${h}.${forged}.${s}`)).toBeNull();
    const other = await new SignJWT({ role: "ADMIN", sid: "x", ver: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user1")
      .setIssuer("garvhem")
      .setAudience("garvhem-portal")
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode("another-secret-another-secret-another"));
    expect(await verifyAccessToken(other)).toBeNull();
    const none = new UnsecuredJWT({ role: "ADMIN", sid: "x", ver: 0 }).setSubject("user1").encode();
    expect(await verifyAccessToken(none)).toBeNull();
    for (const bad of [undefined, null, "", "a.b.c"]) expect(await verifyAccessToken(bad)).toBeNull();
  });
});

describe("refresh decisions", () => {
  const now = new Date("2026-11-25T10:00:00Z");
  const live = { revokedAt: null, replacedById: null, expiresAt: new Date(now.getTime() + 1000) };
  it("rotates a live token and refuses an expired one", () => {
    expect(decideRefresh(live, now)).toBe("rotate");
    expect(decideRefresh({ ...live, expiresAt: now }, now)).toBe("expired");
  });
  it("allows a short grace window for parallel requests, then treats reuse as theft", () => {
    const rotated = { ...live, replacedById: "next" };
    expect(decideRefresh({ ...rotated, revokedAt: new Date(now.getTime() - REUSE_GRACE_MS + 1) }, now)).toBe(
      "grace",
    );
    expect(decideRefresh({ ...rotated, revokedAt: new Date(now.getTime() - REUSE_GRACE_MS - 1) }, now)).toBe(
      "reuse",
    );
  });
  it("treats a revoked, never rotated token as reuse", () => {
    expect(decideRefresh({ ...live, revokedAt: now }, now)).toBe("reuse");
  });
  it("creates 256-bit tokens and stores only their SHA-256", () => {
    const token = newOpaqueToken();
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});

describe("passwords", () => {
  it("hashes with argon2id", async () => {
    const h = await hashPassword("Granite!Otter91");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "Granite!Otter91")).toBe(true);
    expect(await verifyPassword(h, "granite!otter91")).toBe(false);
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
  it("enforces the policy", () => {
    expect(passwordProblems("Granite!Otter91")).toEqual([]);
    for (const weak of [
      "Short1!",
      "alllowercase1!",
      "ALLUPPERCASE1!",
      "NoNumbersHere!",
      "NoSymbols1234",
      "P@ssword1234",
      "Welcome@12345",
    ])
      expect(passwordProblems(weak), weak).not.toEqual([]);
    expect(passwordProblems("Abhishek!2026x", ["abhishek@garvhem.com"])).not.toEqual([]);
  });
  it("generates compliant temporary passwords", () => {
    for (let i = 0; i < 50; i++) expect(passwordProblems(generatePassword())).toEqual([]);
  });
});

describe("permissions", () => {
  it("matches the matrix", () => {
    const employee = effectivePermissions("EMPLOYEE");
    expect([...employee].every((p) => p.startsWith("own."))).toBe(true);
    const manager = effectivePermissions("MANAGER");
    for (const p of [
      "team.attendance.view",
      "leaves.approve",
      "tasks.create",
      "tasks.assign",
      "reports.viewAll",
    ] as const)
      expect(manager.has(p)).toBe(true);
    for (const p of [
      ...CONFIGURABLE_MANAGER_PERMISSIONS,
      "users.manage",
      "settings.manage",
      "audit.view",
    ] as const)
      expect(manager.has(p)).toBe(false);
    expect(effectivePermissions("ADMIN").size).toBe(PERMISSIONS.length);
  });
  it("grants managers only what is configurable", () => {
    const m = effectivePermissions("MANAGER", [
      "team.attendance.edit",
      "users.manage",
      "settings.manage",
      "nonsense",
    ]);
    expect(m.has("team.attendance.edit")).toBe(true);
    expect(m.has("users.manage")).toBe(false);
    expect(m.has("settings.manage")).toBe(false);
  });
  it("lets leads.manage imply leads.view, and never upgrades employees", () => {
    expect(effectivePermissions("MANAGER", ["leads.manage"]).has("leads.view")).toBe(true);
    expect(effectivePermissions("EMPLOYEE", ["leads.view"]).has("leads.view")).toBe(false);
  });
});

describe("safeNext", () => {
  it("keeps internal portal paths", () => {
    expect(safeNext("/portal/tasks?view=list")).toBe("/portal/tasks?view=list");
    expect(safeNext("/portal?_rsc=abc")).toBe("/portal");
  });
  it("refuses everything else", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/portal/../../etc",
      "javascript:alert(1)",
      "/login",
      "/portalx",
      "",
      null,
      "/portal\n/x",
      `/portal/${"a".repeat(600)}`,
    ])
      expect(safeNext(bad)).toBe("/portal");
  });
});

describe("login input", () => {
  it("normalises the email", () => {
    expect(loginSchema.parse({ email: "  HEMANT@Garvhem.com ", password: "x" }).email).toBe(
      "hemant@garvhem.com",
    );
  });
});
