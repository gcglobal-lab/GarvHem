"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import {
  saveAttendanceSettingsAction,
  saveCompanyAction,
  saveReportSettingsAction,
  saveTeamSettingsAction,
  setManagerPermissionAction,
} from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, SwitchField, Textarea } from "@/components/ui/form";
import { useAction } from "@/components/ui/use-action";
import { PERMISSION_LABELS, type ConfigurablePermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import {
  attendanceSettingsSchema,
  companySchema,
  reportSettingsSchema,
  type Settings,
} from "@/server/settings-schema";

const COMMON_TZ = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Australia/Sydney",
  "UTC",
];

export function CompanyForm({ value }: { value: Settings["company"] }) {
  const router = useRouter();
  const form = useForm<z.input<typeof companySchema>, unknown, z.output<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: value,
  });
  const { run, pending, fieldErrors } = useAction(saveCompanyAction, {
    success: "Company details saved.",
    onSuccess: () => router.refresh(),
  });
  const e = form.formState.errors;
  const r = form.register;
  const err = (k: keyof typeof value) => e[k]?.message ?? fieldErrors[k];
  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" required error={err("name")}>
          <Input {...r("name")} />
        </Field>
        <Field label="Contact email" error={err("email")}>
          <Input type="email" {...r("email")} />
        </Field>
        <Field label="Careers email" error={err("careersEmail")}>
          <Input type="email" {...r("careersEmail")} />
        </Field>
        <Field label="Phone" error={err("phone")}>
          <Input type="tel" {...r("phone")} />
        </Field>
        <Field label="Working hours" error={err("hours")}>
          <Input {...r("hours")} />
        </Field>
        <Field label="Timezone" error={err("timezone")} hint="Work dates, shifts and cutoffs use this.">
          <Select {...r("timezone")}>
            {[...new Set([value.timezone, ...COMMON_TZ])].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Address" error={err("address")} className="sm:col-span-2">
          <Textarea className="min-h-16" {...r("address")} />
        </Field>
        <Field label="LinkedIn" error={err("linkedin")}>
          <Input placeholder="https://" {...r("linkedin")} />
        </Field>
        <Field label="X" error={err("x")}>
          <Input placeholder="https://" {...r("x")} />
        </Field>
        <Field label="Instagram" error={err("instagram")}>
          <Input placeholder="https://" {...r("instagram")} />
        </Field>
        <Field label="Facebook" error={err("facebook")}>
          <Input placeholder="https://" {...r("facebook")} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="brand" loading={pending}>
          Save company
        </Button>
      </div>
    </form>
  );
}

const DAYS = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [0, "Sun"],
] as const;

export function AttendanceSettingsForm({ value }: { value: Settings["attendance"] }) {
  const router = useRouter();
  const form = useForm<
    z.input<typeof attendanceSettingsSchema>,
    unknown,
    z.output<typeof attendanceSettingsSchema>
  >({
    resolver: zodResolver(attendanceSettingsSchema),
    defaultValues: value,
  });
  const { run, pending } = useAction(saveAttendanceSettingsAction, {
    success: "Attendance rules saved.",
    onSuccess: () => router.refresh(),
  });
  const e = form.formState.errors;
  const r = form.register;
  const num = { valueAsNumber: true } as const;
  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-5">
      <Controller
        control={form.control}
        name="workWeekDays"
        render={({ field }) => {
          const days = field.value ?? [];
          return (
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium">Work week</legend>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(([n, label]) => {
                  const on = days.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={on}
                      onClick={() => field.onChange(on ? days.filter((d) => d !== n) : [...days, n])}
                      className={cn(
                        "h-10 w-14 rounded-xl border text-sm font-medium",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input text-muted hover:bg-surface-2",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {e.workWeekDays ? (
                <p className="mt-1 text-xs font-medium text-danger" role="alert">
                  {e.workWeekDays.message}
                </p>
              ) : null}
            </fieldset>
          );
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Shift start" error={e.shiftStart?.message}>
          <Input type="time" {...r("shiftStart")} />
        </Field>
        <Field label="Shift end" error={e.shiftEnd?.message} hint="Earlier than the start means overnight.">
          <Input type="time" {...r("shiftEnd")} />
        </Field>
        <Field label="Grace period (min)" error={e.graceMinutes?.message}>
          <Input type="number" min={0} {...r("graceMinutes", num)} />
        </Field>
        <Field
          label="Half-day threshold (min)"
          error={e.halfDayThresholdMinutes?.message}
          hint="Fewer net minutes than this is a half day."
        >
          <Input type="number" min={0} {...r("halfDayThresholdMinutes", num)} />
        </Field>
        <Field label="Lunch allowance (min)" error={e.lunchAllowanceMinutes?.message}>
          <Input type="number" min={0} {...r("lunchAllowanceMinutes", num)} />
        </Field>
        <Field
          label="Auto-close cutoff"
          error={e.autoCloseCutoff?.message}
          hint="Early times mean the next morning."
        >
          <Input type="time" {...r("autoCloseCutoff")} />
        </Field>
        <Field label="Auto-close records" hint="Which punch-out time is written.">
          <Select {...r("autoCloseAt")}>
            <option value="SHIFT_END">The end of the shift</option>
            <option value="CUTOFF">The cutoff time</option>
          </Select>
        </Field>
      </div>
      <div className="space-y-4">
        <Controller
          control={form.control}
          name="allowLunchSplit"
          render={({ field }) => (
            <SwitchField
              label="Allow lunch to be split"
              hint="Several breaks may add up to the allowance."
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="allowMultipleSessions"
          render={({ field }) => (
            <SwitchField
              label="Allow several punch in/out sessions a day"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="brand" loading={pending}>
          Save attendance rules
        </Button>
      </div>
    </form>
  );
}

export function ReportSettingsForm({ value }: { value: Settings["reports"] }) {
  const router = useRouter();
  const form = useForm<z.input<typeof reportSettingsSchema>, unknown, z.output<typeof reportSettingsSchema>>({
    resolver: zodResolver(reportSettingsSchema),
    defaultValues: value,
  });
  const { run, pending } = useAction(saveReportSettingsAction, {
    success: "Report rules saved.",
    onSuccess: () => router.refresh(),
  });
  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Editable until"
          error={form.formState.errors.editCutoff?.message}
          hint="Times before noon mean the next day. 00:00 is midnight."
        >
          <Input type="time" {...form.register("editCutoff")} />
        </Field>
        <Field
          label="At punch-out, a missing report is"
          hint="Required blocks the punch-out until it is written."
        >
          <Select {...form.register("onPunchOut")}>
            <option value="required">Required</option>
            <option value="reminder">A reminder</option>
            <option value="off">Ignored</option>
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="brand" loading={pending}>
          Save report rules
        </Button>
      </div>
    </form>
  );
}

export function ManagerSettings({
  permissions,
  teamScope,
}: {
  permissions: { permission: ConfigurablePermission; enabled: boolean }[];
  teamScope: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(() =>
    Object.fromEntries(permissions.map((p) => [p.permission, p.enabled])),
  );
  const [scope, setScope] = useState(teamScope);
  const toggle = useAction(setManagerPermissionAction, {
    success: "Manager permission updated.",
    onSuccess: () => router.refresh(),
  });
  const team = useAction(saveTeamSettingsAction, {
    success: "Team scope updated.",
    onSuccess: () => router.refresh(),
  });
  return (
    <div className="space-y-5">
      <SwitchField
        label="Managers see only their own team"
        hint="When off, managers see every employee."
        checked={scope}
        disabled={team.pending}
        onCheckedChange={async (v) => {
          setScope(v);
          if (!(await team.run({ managerTeamScope: v })).ok) setScope(!v);
        }}
      />
      <hr />
      {permissions.map(({ permission }) => (
        <SwitchField
          key={permission}
          label={PERMISSION_LABELS[permission].label}
          hint={PERMISSION_LABELS[permission].hint}
          checked={state[permission] ?? false}
          disabled={toggle.pending}
          onCheckedChange={async (v) => {
            setState((s) => ({ ...s, [permission]: v }));
            if (!(await toggle.run({ permission, enabled: v })).ok)
              setState((s) => ({ ...s, [permission]: !v }));
          }}
        />
      ))}
    </div>
  );
}
