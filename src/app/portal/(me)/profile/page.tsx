import type { Metadata } from "next";
import { MonitorSmartphone } from "lucide-react";
import { PageHeader } from "@/components/portal/page-header";
import {
  PhoneForm,
  ProfilePasswordForm,
  RevokeOthers,
  RevokeSession,
} from "@/components/portal/profile-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { requirePageUser } from "@/lib/auth/guards";
import { formatDateTime, formatISODate, timeAgo } from "@/lib/time";
import { describeUserAgent } from "@/lib/user-agent";
import { getSettings } from "@/server/settings";
import { getUser, ownSessions } from "@/server/users";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requirePageUser();
  const [{ company, attendance }, me, sessions] = await Promise.all([
    getSettings(),
    getUser(user.id),
    ownSessions(user.id, user.sessionId),
  ]);
  const facts: [string, string][] = [
    ["Employee ID", me.employeeCode],
    ["Email", me.email],
    ["Designation", me.designation ?? "-"],
    ["Department", me.department ?? "-"],
    ["Manager", me.manager?.name ?? "-"],
    ["Joining date", formatISODate(me.joiningDate)],
    ["Shift", `${me.shiftStart ?? attendance.shiftStart} to ${me.shiftEnd ?? attendance.shiftEnd}`],
  ];
  return (
    <>
      <PageHeader title="Profile" description="Your details, password and signed-in devices." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="self-start">
          <CardBody className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={me.name} className="size-16 text-xl" />
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold">{me.name}</p>
                <p className="text-sm text-muted">{me.designation}</p>
              </div>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <PhoneForm key={me.phone} phone={me.phone} />
            <p className="text-xs text-muted">Other details are managed by your administrator.</p>
          </CardBody>
        </Card>

        <Card id="password" className="scroll-mt-24 self-start">
          <CardHeader
            title="Change password"
            description="Other devices are signed out when you change it."
          />
          <CardBody>
            <ProfilePasswordForm />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Active sessions" action={sessions.length > 1 ? <RevokeOthers /> : null} />
          <CardBody>
            <ul className="divide-y divide-border">
              {sessions.map((s) => (
                <li key={s.familyId} className="flex flex-wrap items-center gap-4 py-3">
                  <MonitorSmartphone className="size-5 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {describeUserAgent(s.userAgent)}{" "}
                      {s.current ? <Badge tone="success">This device</Badge> : null}
                    </p>
                    <p className="text-xs text-muted">
                      IP {s.ip ?? "unknown"}, signed in {formatDateTime(s.createdAt, company.timezone)}, last
                      active {timeAgo(s.lastUsedAt)}
                    </p>
                  </div>
                  {s.current ? null : <RevokeSession familyId={s.familyId} />}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
