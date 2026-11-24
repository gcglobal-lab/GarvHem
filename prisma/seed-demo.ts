/** Realistic sample activity for local development only. Deterministic, so screenshots are stable. */
import type { PrismaClient } from "../src/generated/prisma/client";
import { addDaysISO, eachISODate, instantAt, toDbDate, weekdayOf, yearOf } from "../src/lib/time";
import { computeDay, type AttEvent } from "../src/server/attendance-math";
import { isWorkingDay } from "../src/server/leave-math";
import { buildSettings } from "../src/server/settings-schema";

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const TASKS = [
  ["Rebuild the client landing page", "Website", "IN_PROGRESS", "HIGH", 3],
  ["Reconcile October bank statements", "Accounting", "IN_REVIEW", "MEDIUM", 1],
  ["Move staging to a smaller instance size", "Cloud", "TODO", "MEDIUM", 5],
  ["Set up laptop and VPN for new joiner", "IT Support", "DONE", "LOW", -4],
  ["Clean up duplicate customer records", "Database", "IN_PROGRESS", "URGENT", -1],
  ["Write the monthly cost report", "Cloud", "TODO", "HIGH", 2],
  ["Fix checkout form validation on mobile", "Website", "TODO", "URGENT", 1],
  ["Prepare vendor payment run", "Accounting", "TODO", "MEDIUM", 4],
  ["Document the backup restore steps", "IT Support", "IN_REVIEW", "LOW", 6],
  ["Enter and verify September invoices", "Accounting", "DONE", "MEDIUM", -6],
  ["Add analytics events to the pricing page", "Website", "DONE", "MEDIUM", -2],
  ["Review access rights on shared drives", "IT Support", "IN_PROGRESS", "HIGH", -2],
] as const;

const LEADS = [
  ["Sample Lead One", "lead.one@example.com", "Example Retail Co", "USA", ["Dedicated Talent"], "NEW", 1],
  [
    "Sample Lead Two",
    "lead.two@example.com",
    "Example Health Admin",
    "Canada",
    ["Accounting & Bookkeeping"],
    "CONTACTED",
    6,
  ],
  [
    "Sample Lead Three",
    "lead.three@example.com",
    null,
    "USA",
    ["Website & Web App Development"],
    "QUALIFIED",
    12,
  ],
  [
    "Sample Lead Four",
    "lead.four@example.com",
    "Example Realty",
    "Canada",
    ["Dedicated Talent", "Cloud Services"],
    "PROPOSAL_SENT",
    20,
  ],
  [
    "Sample Lead Five",
    "lead.five@example.com",
    "Example Agency",
    "UK",
    ["Website & Web App Development"],
    "WON",
    33,
  ],
  ["Sample Lead Six", "lead.six@example.com", "Example SaaS", "Australia", ["Cloud Services"], "LOST", 41],
  ["Sample Lead Seven", "lead.seven@example.com", "Example Finance", "USA", ["Custom requirement"], "NEW", 2],
] as const;

const WORK = [
  "Finished the assigned items and tested them before handing over for review.",
  "Worked through the queue, replied to the client questions and updated the tracker.",
  "Completed the main task and started preparing the next one. Notes are in the task comments.",
  "Fixed the issues raised yesterday and verified the results with sample data.",
];

export async function seedDemo(db: PrismaClient, today: string) {
  if (await db.task.count()) {
    console.info("Demo data already present, skipping.");
    return;
  }
  const settings = buildSettings(await db.setting.findMany());
  const { attendance, company } = settings;
  const tz = company.timezone;
  const rules = { tz, ...attendance };
  const from = addDaysISO(today, -30);
  const holidays = await db.holiday.findMany({ where: { isOptional: false } });
  const cal = {
    workWeekDays: attendance.workWeekDays,
    holidays: new Set(holidays.map((h) => h.date.toISOString().slice(0, 10))),
  };
  const employees = await db.user.findMany({ where: { role: "EMPLOYEE" }, orderBy: { employeeCode: "asc" } });
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const casual = await db.leaveType.findUniqueOrThrow({ where: { name: "Casual" } });
  const sick = await db.leaveType.findUniqueOrThrow({ where: { name: "Sick" } });
  const random = rng(20261);
  const between = (a: number, b: number) => a + Math.floor(random() * (b - a + 1));

  // Two approved leaves (with ledger and attendance), one pending, one rejected.
  const working = eachISODate(from, addDaysISO(today, -3)).filter((d) => isWorkingDay(d, cal));
  const leaveDates = [
    { user: employees[1], date: working[6], type: sick },
    { user: employees[3], date: working[12], type: casual },
  ];
  const onLeave = new Set<string>();
  for (const l of leaveDates) {
    if (!l.user || !l.date) continue;
    onLeave.add(`${l.user.id}:${l.date}`);
    const request = await db.leaveRequest.create({
      data: {
        userId: l.user.id,
        leaveTypeId: l.type.id,
        fromDate: toDbDate(l.date),
        toDate: toDbDate(l.date),
        days: 1,
        reason: "Personal appointment",
        status: "APPROVED",
        approverId: admin.id,
        decidedAt: new Date(),
      },
    });
    await db.leaveLedgerEntry.create({
      data: {
        userId: l.user.id,
        leaveTypeId: l.type.id,
        year: yearOf(l.date),
        delta: -1,
        kind: "DEDUCTION",
        reason: `Leave ${l.date}`,
        actorId: admin.id,
        relatedRequestId: request.id,
      },
    });
    await db.attendanceDay.create({
      data: { userId: l.user.id, workDate: toDbDate(l.date), status: "ON_LEAVE", leaveRequestId: request.id },
    });
  }
  const nextMonday = addDaysISO(today, 8 - (weekdayOf(today) || 7));
  if (employees[0])
    await db.leaveRequest.create({
      data: {
        userId: employees[0].id,
        leaveTypeId: casual.id,
        fromDate: toDbDate(nextMonday),
        toDate: toDbDate(addDaysISO(nextMonday, 1)),
        days: 2,
        reason: "Family function out of town",
      },
    });

  for (const e of employees)
    for (const date of eachISODate(from, addDaysISO(today, -1))) {
      if (!isWorkingDay(date, cal) || onLeave.has(`${e.id}:${date}`) || random() < 0.03) continue;
      const t = (h: number, m: number) =>
        new Date(instantAt(date, "00:00", tz).getTime() + (h * 60 + m) * 60_000);
      const inMin = random() < 0.14 ? between(20, 55) : between(-12, 13);
      const lunchLen = random() < 0.12 ? between(64, 85) : between(38, 59);
      const lunchStart = between(0, 50);
      const events: AttEvent[] = [
        { type: "PUNCH_IN", at: t(9, 30 + inMin) },
        { type: "LUNCH_START", at: t(13, lunchStart) },
        { type: "LUNCH_END", at: t(13, lunchStart + lunchLen) },
        { type: "PUNCH_OUT", at: t(18, between(25, 75)) },
      ];
      const r = computeDay(events, { workDate: date, isWorkingDay: true, rules, now: new Date() });
      await db.attendanceDay.create({
        data: {
          userId: e.id,
          workDate: toDbDate(date),
          ...r,
          events: { create: events.map((ev) => ({ ...ev, ip: "demo", userAgent: "demo" })) },
        },
      });
      if (random() < 0.9)
        await db.dailyReport.create({
          data: {
            userId: e.id,
            workDate: toDbDate(date),
            summary: WORK[between(0, WORK.length - 1)]!,
            items: [{ taskId: null, text: "Assigned work", hours: between(5, 8) }],
            tomorrowPlan: "Continue with the next items on the board.",
            createdAt: t(18, 10),
          },
        });
    }

  for (const [i, [title, label, status, priority, due]] of TASKS.entries()) {
    const who = employees[i % employees.length]!;
    const task = await db.task.create({
      data: {
        title,
        description: `Please complete **${title.toLowerCase()}** and leave a short note here when it is ready.\n\n- Check the result\n- Update the status`,
        status,
        priority,
        labels: [label],
        dueDate: toDbDate(addDaysISO(today, due)),
        position: i * 1024,
        createdById: admin.id,
        completedAt: status === "DONE" ? new Date() : null,
        assignees: { create: [{ userId: who.id }] },
        checklist: {
          create: [
            { text: "Do the work", done: status === "DONE" },
            { text: "Review", position: 1 },
          ],
        },
        activities: { create: { actorId: admin.id, kind: "created", message: "created this task" } },
      },
    });
    if (i % 2 === 0)
      await db.taskComment.createMany({
        data: [
          { taskId: task.id, authorId: admin.id, body: `@${who.name} please share an update when you can.` },
          { taskId: task.id, authorId: who.id, body: "On it. I will post the result here today." },
        ],
      });
  }

  for (const [fullName, email, companyName, country, services, status, daysAgo] of LEADS) {
    const createdAt = new Date(Date.now() - daysAgo * 86_400_000);
    await db.lead.create({
      data: {
        fullName,
        email,
        company: companyName,
        country,
        services: [...services],
        status,
        requirement:
          "Sample enquiry used to fill the development dashboard. We would like to discuss scope and pricing.",
        budgetRange: "$1,000 to $3,000 / month",
        sourcePage: "/contact",
        consentAt: createdAt,
        createdAt,
        history: {
          create: [
            { toStatus: "NEW", createdAt },
            ...(status === "NEW"
              ? []
              : [{ fromStatus: "NEW" as const, toStatus: status, actorId: admin.id }]),
          ],
        },
      },
    });
  }

  await db.announcement.create({
    data: {
      title: "Welcome to the GARVHEM portal",
      body: "Punch in when you start, log your lunch, and submit a short report before you leave. Thank you!",
      pinned: true,
      authorId: admin.id,
    },
  });
}
