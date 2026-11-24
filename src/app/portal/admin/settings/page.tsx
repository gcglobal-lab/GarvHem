import type { Metadata } from "next";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { PageHeader } from "@/components/portal/page-header";
import {
  AttendanceSettingsForm,
  CompanyForm,
  ManagerSettings,
  ReportSettingsForm,
} from "@/components/portal/settings-forms";
import { Announcements, Holidays, LeaveTypes } from "@/components/portal/settings-lists";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkTabs } from "@/components/ui/tabs";
import { requirePagePermission } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { flatParams, type SearchParams } from "@/lib/page";
import { workDateOf, yearOf } from "@/lib/time";
import { listAnnouncements, listHolidays, managerPermissionStates } from "@/server/company";
import { listLeaveTypes } from "@/server/leaves";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Settings" };

const TABS = [
  ["company", "Company"],
  ["attendance", "Attendance"],
  ["reports", "Daily reports"],
  ["leave-types", "Leave types"],
  ["holidays", "Holidays"],
  ["managers", "Managers"],
  ["announcements", "Announcements"],
  ["system", "System"],
] as const;

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePagePermission("settings.manage");
  const p = await flatParams(searchParams);
  const tab = TABS.find(([k]) => k === p.tab)?.[0] ?? "company";
  const settings = await getSettings();
  const today = workDateOf(new Date(), settings.company.timezone);
  const year = /^20\d{2}$/.test(p.year ?? "") ? Number(p.year) : yearOf(today);

  return (
    <>
      <PageHeader title="Settings" description="Changes apply at once and are written to the audit log." />
      <LinkTabs
        label="Settings"
        className="mb-5"
        items={TABS.map(([k, label]) => ({
          href: `/portal/admin/settings?tab=${k}`,
          label,
          active: tab === k,
        }))}
      />
      {tab === "company" ? (
        <Card>
          <CardHeader title="Company profile" description="Used by the website footer and contact page." />
          <CardBody>
            <CompanyForm value={settings.company} />
          </CardBody>
        </Card>
      ) : null}
      {tab === "attendance" ? (
        <Card>
          <CardHeader title="Attendance rules" description="New rules apply to punches from now on." />
          <CardBody>
            <AttendanceSettingsForm value={settings.attendance} />
          </CardBody>
        </Card>
      ) : null}
      {tab === "reports" ? (
        <Card>
          <CardHeader title="Daily report rules" />
          <CardBody>
            <ReportSettingsForm value={settings.reports} />
          </CardBody>
        </Card>
      ) : null}
      {tab === "leave-types" ? (
        <Card>
          <CardHeader title="Leave types" description="Quota changes apply to the next yearly allocation." />
          <CardBody>
            <LeaveTypes types={await listLeaveTypes(true)} />
          </CardBody>
        </Card>
      ) : null}
      {tab === "holidays" ? (
        <Card>
          <CardHeader
            title={`Holidays, ${year}`}
            description="Festival dates are announced each year, so please check them."
            action={
              <LinkTabs
                label="Year"
                items={[yearOf(today) - 1, yearOf(today), yearOf(today) + 1].map((y) => ({
                  href: `/portal/admin/settings?tab=holidays&year=${y}`,
                  label: String(y),
                  active: y === year,
                }))}
              />
            }
          />
          <CardBody>
            <Holidays holidays={await listHolidays(year)} today={today} />
          </CardBody>
        </Card>
      ) : null}
      {tab === "managers" ? (
        <Card>
          <CardHeader
            title="Manager permissions"
            description="Every manager can view attendance, approve leave, assign tasks and read reports. These are extra."
          />
          <CardBody>
            <ManagerSettings
              permissions={await managerPermissionStates()}
              teamScope={settings.team.managerTeamScope}
            />
          </CardBody>
        </Card>
      ) : null}
      {tab === "announcements" ? (
        <Card>
          <CardHeader title="Announcements" />
          <CardBody>
            <Announcements items={await listAnnouncements()} />
          </CardBody>
        </Card>
      ) : null}
      {tab === "system" ? <SystemStatus /> : null}
    </>
  );
}

function SystemStatus() {
  const e = env();
  const rows: [string, boolean, string][] = [
    [
      "Email",
      e.EMAIL_PROVIDER !== "console",
      e.EMAIL_PROVIDER === "console"
        ? "Not configured. Emails are skipped, everything else works."
        : `Sending with ${e.EMAIL_PROVIDER === "smtp" ? "SMTP" : "Resend"}.`,
    ],
    [
      "Password reset by email",
      e.EMAIL_PROVIDER !== "console",
      e.EMAIL_PROVIDER === "console"
        ? "Off. Admins reset passwords from the employee page."
        : "On. Employees can ask for a one-time link.",
    ],
    [
      "File storage",
      true,
      e.STORAGE_PROVIDER === "supabase"
        ? "Private Supabase Storage bucket."
        : "Private folder on this server.",
    ],
    ["Rate limiting", true, e.UPSTASH_REDIS_REST_URL ? "Upstash Redis." : "Database."],
    [
      "Turnstile on the lead form",
      Boolean(e.TURNSTILE_SECRET_KEY),
      e.TURNSTILE_SECRET_KEY ? "On." : "Off. Honeypot, timing and rate limits still protect the form.",
    ],
  ];
  return (
    <Card>
      <CardHeader
        title="System status"
        description="Set with environment variables. Secrets are never shown here."
      />
      <CardBody>
        <ul className="divide-y divide-border">
          {rows.map(([name, on, text]) => (
            <li key={name} className="flex items-start gap-3 py-3">
              {on ? (
                <CheckCircle2 className="mt-0.5 size-5 text-success" aria-label="On" />
              ) : (
                <CircleDashed className="mt-0.5 size-5 text-muted" aria-label="Off" />
              )}
              <div>
                <p className="text-sm font-semibold">{name}</p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
