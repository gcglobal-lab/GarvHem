import { randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { COMMON_PASSWORDS } from "./common-passwords";

// argon2id (algorithm 2) with OWASP-recommended parameters
const OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => hash(password, OPTIONS);

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password); // constant-time inside argon2
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;
/** Spends the same time as a real check so unknown emails cannot be told apart. */
export async function verifyDummy(password: string) {
  dummy ??= hashPassword("timing-equaliser");
  await verifyPassword(await dummy, password);
}

const LEET: Record<string, string> = {
  "@": "a",
  "4": "a",
  "0": "o",
  "1": "i",
  "3": "e",
  $: "s",
  "5": "s",
  "7": "t",
};

/** The password as typed, without symbols, without trailing digits, and with l33t spelling undone. */
function commonForms(password: string): string[] {
  const lower = password.toLowerCase();
  const stem = lower.replace(/[^a-z]+$/, "");
  return [lower, stem].flatMap((v) => {
    const flat = v.replace(/[^a-z0-9]/g, "");
    const plain = [...v]
      .map((c) => LEET[c] ?? c)
      .join("")
      .replace(/[^a-z0-9]/g, "");
    return [v, flat, flat.replace(/\d+$/, ""), plain];
  });
}

export function passwordProblems(password: string, context: string[] = []): string[] {
  const problems: string[] = [];
  if (password.length < 10) problems.push("Use at least 10 characters.");
  if (password.length > 128) problems.push("Use at most 128 characters.");
  if (!/[a-z]/.test(password)) problems.push("Add a lowercase letter.");
  if (!/[A-Z]/.test(password)) problems.push("Add an uppercase letter.");
  if (!/\d/.test(password)) problems.push("Add a number.");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("Add a symbol.");
  const flat = password.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (commonForms(password).some((f) => COMMON_PASSWORDS.has(f)))
    problems.push("This password is too common.");
  for (const c of context) {
    const part = c.toLowerCase().split("@")[0] ?? "";
    if (part.length >= 4 && flat.includes(part.replace(/[^a-z0-9]/g, ""))) {
      problems.push("Do not use your name or email in the password.");
      break;
    }
  }
  return problems;
}

const SETS = ["abcdefghijkmnpqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ", "23456789", "!@#$%&*+?"] as const;

export function generatePassword(length = 16): string {
  const all = SETS.join("");
  const chars: string[] = SETS.map((s) => s[randomInt(s.length)]!);
  while (chars.length < length) chars.push(all[randomInt(all.length)]!);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}
