/**
 * npm run seed            company data: admin, employees, leave types, settings, holidays
 * npm run seed -- --demo  also 30 days of sample activity (refused in production)
 * Running it twice is safe: existing people, types and settings are left alone.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { generatePassword, hashPassword, passwordProblems } from "../src/lib/auth/password";
import { CONFIGURABLE_MANAGER_PERMISSIONS } from "../src/lib/auth/permissions";
import { pgOptions } from "../src/lib/db-url";
import { env } from "../src/lib/env";
import { toDbDate, workDateOf, yearOf } from "../src/lib/time";
import { buildSettings } from "../src/server/settings-schema";
import { seedDemo } from "./seed-demo";

const demo = process.argv.includes("--demo");
const db = new PrismaClient({ adapter: new PrismaPg(pgOptions(env())) });

const DOMAIN = process.env.SEED_EMAIL_DOMAIN || "garvhem.com";
const PEOPLE = [
  {
    key: "hemant",
    name: "Hemant Singh",
    role: "ADMIN",
    designation: "Founder & Owner",
    department: "Management",
  },
  {
    key: "abhishek",
    name: "Abhishek Chaudhary",
    role: "EMPLOYEE",
    designation: "Web Developer",
    department: "Development",
  },
  { key: "yuvraj", name: "Yuvraj", role: "EMPLOYEE", designation: "Accountant", department: "Accounting" },
  {
    key: "pushpendra",
    name: "Pushpendra",
    role: "EMPLOYEE",
    designation: "Cloud Engineer",
    department: "Cloud",
  },
  {
    key: "rakshit",
    name: "Rakshit",
    role: "EMPLOYEE",
    designation: "IT Support Specialist",
    department: "IT Support",
  },
  {
    key: "mohit",
    name: "Mohit",
    role: "EMPLOYEE",
    designation: "Operations Associate",
    department: "Operations",
  },
] as const;

const LEAVE_TYPES = [
  {
    name: "Casual",
    color: "#2F5BEA",
    isPaid: true,
    isUnlimited: false,
    yearlyQuota: 12,
    carryForward: false,
    maxCarryForward: 0,
  },
  {
    name: "Sick",
    color: "#E5484D",
    isPaid: true,
    isUnlimited: false,
    yearlyQuota: 6,
    carryForward: false,
    maxCarryForward: 0,
  },
  {
    name: "Earned",
    color: "#0E9F8E",
    isPaid: true,
    isUnlimited: false,
    yearlyQuota: 15,
    carryForward: true,
    maxCarryForward: 15,
  },
  {
    name: "Unpaid",
    color: "#B7791F",
    isPaid: false,
    isUnlimited: true,
    yearlyQuota: 0,
    carryForward: false,
    maxCarryForward: 0,
  },
];

/** Editable sample data. Lunar dates are announced each year, so check them in Settings > Holidays. */
const HOLIDAYS: Record<number, [string, string, boolean?][]> = {
  2026: [
    ["2026-01-01", "New Year's Day", true],
    ["2026-01-14", "Makar Sankranti", true],
    ["2026-01-26", "Republic Day"],
    ["2026-03-04", "Holi"],
    ["2026-03-21", "Eid al-Fitr"],
    ["2026-04-03", "Good Friday", true],
    ["2026-05-01", "Labour Day", true],
    ["2026-08-15", "Independence Day"],
    ["2026-08-28", "Raksha Bandhan", true],
    ["2026-09-04", "Janmashtami", true],
    ["2026-10-02", "Gandhi Jayanti"],
    ["2026-10-20", "Dussehra"],
    ["2026-11-08", "Diwali"],
    ["2026-11-24", "Guru Nanak Jayanti", true],
    ["2026-12-25", "Christmas Day"],
  ],
  2027: [
    ["2027-01-01", "New Year's Day", true],
    ["2027-01-14", "Makar Sankranti", true],
    ["2027-01-26", "Republic Day"],
    ["2027-03-22", "Holi"],
    ["2027-05-01", "Labour Day", true],
    ["2027-08-15", "Independence Day"],
    ["2027-10-02", "Gandhi Jayanti"],
    ["2027-10-09", "Dussehra"],
    ["2027-10-29", "Diwali"],
    ["2027-12-25", "Christmas Day"],
  ],
};

/** Fixed-date national holidays, for years without a table above. */
const fixedHolidays = (year: number): [string, string, boolean?][] => [
  [`${year}-01-26`, "Republic Day"],
  [`${year}-08-15`, "Independence Day"],
  [`${year}-10-02`, "Gandhi Jayanti"],
  [`${year}-12-25`, "Christmas Day"],
];

function initialPassword(fromEnv: string | undefined, label: string, context: string[]) {
  if (!fromEnv) return { password: generatePassword(), generated: true };
  const problems = passwordProblems(fromEnv, context);
  if (problems.length) throw new Error(`${label} is too weak: ${problems.join(" ")}`);
  return { password: fromEnv, generated: false };
}

async function main() {
  if (demo && process.env.NODE_ENV === "production")
    throw new Error("Demo data is never seeded in production.");
  if (demo && !["localhost", "127.0.0.1", "db"].includes(new URL(env().DATABASE_URL).hostname))
    throw new Error("Demo data is only allowed on a local database (DATABASE_URL points to a remote host).");

  for (const group of Object.entries(buildSettings([])))
    await db.setting.upsert({
      where: { key: group[0] },
      create: { key: group[0], value: group[1] },
      update: {},
    });
  for (const permission of CONFIGURABLE_MANAGER_PERMISSIONS)
    await db.managerPermission.upsert({
      where: { permission },
      create: { permission, enabled: false },
      update: {},
    });
  for (const [sortOrder, t] of LEAVE_TYPES.entries())
    await db.leaveType.upsert({ where: { name: t.name }, create: { ...t, sortOrder }, update: {} });

  const today = workDateOf(new Date(), buildSettings(await db.setting.findMany()).company.timezone);
  const year = yearOf(today);
  for (const [date, name, isOptional = false] of HOLIDAYS[year] ?? fixedHolidays(year))
    await db.holiday.upsert({
      where: { date: toDbDate(date) },
      create: { date: toDbDate(date), name, isOptional },
      update: {},
    });

  const types = await db.leaveType.findMany();
  const printed: { email: string; password: string }[] = [];
  let code = 0;
  for (const p of PEOPLE) {
    code++;
    const email = `${p.key}@${DOMAIN}`;
    if (await db.user.findUnique({ where: { email } })) continue;
    const isAdmin = p.role === "ADMIN";
    const { password, generated } = initialPassword(
      isAdmin ? process.env.SEED_ADMIN_PASSWORD : process.env.SEED_EMPLOYEE_PASSWORD,
      isAdmin ? "SEED_ADMIN_PASSWORD" : "SEED_EMPLOYEE_PASSWORD",
      [email],
    );
    const user = await db.user.create({
      data: {
        employeeCode: `GRV-${String(code).padStart(3, "0")}`,
        name: p.name,
        email,
        role: p.role,
        designation: p.designation,
        department: p.department,
        joiningDate: toDbDate(demo ? `${year}-01-01` : today),
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
    });
    await db.leaveLedgerEntry.createMany({
      data: types
        .filter((t) => !t.isUnlimited && Number(t.yearlyQuota) > 0)
        .map((t) => ({
          userId: user.id,
          leaveTypeId: t.id,
          year,
          delta: t.yearlyQuota,
          kind: "ALLOCATION" as const,
          reason: `Yearly allocation ${year}`,
        })),
    });
    if (generated) printed.push({ email, password });
  }

  if (demo) await seedDemo(db, today);

  console.info(`Seed complete (${await db.user.count()} users${demo ? ", demo data added" : ""}).`);
  if (printed.length) {
    console.info("\nTemporary passwords, shown only once. Everyone must change theirs at first login:\n");
    for (const p of printed) console.info(`  ${p.email.padEnd(32)} ${p.password}`);
    console.info("");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
