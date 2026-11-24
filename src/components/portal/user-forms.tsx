"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  createUserAction,
  logoutEverywhereAction,
  resetUserPasswordAction,
  setUserActiveAction,
  updateUserAction,
} from "@/actions/users";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { useAction } from "@/components/ui/use-action";
import { createUserSchema, updateUserSchema } from "@/lib/validators/users";
import type { LeaveTypeRow } from "@/server/leaves";
import type { UserRow } from "@/server/users";

type Manager = { id: string; name: string };
type Options = { managers: Manager[]; departments: string[]; shift: { start: string; end: string } };
type CreateIn = z.input<typeof createUserSchema>;
type CreateOut = z.output<typeof createUserSchema>;
type UpdateIn = z.input<typeof updateUserSchema>;
type UpdateOut = z.output<typeof updateUserSchema>;
type Secret = { name: string; email: string; temporaryPassword: string };

/** Shows a temporary password exactly once. */
function SecretPanel({ secret, onDone }: { secret: Secret; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Share this with {secret.name} in a secure way. It is shown only now and must be changed at the first
        login.
      </p>
      <dl className="rounded-xl bg-surface-2 p-4 text-sm">
        <dt className="text-xs text-muted">Email</dt>
        <dd className="mb-3 font-medium break-all">{secret.email}</dd>
        <dt className="text-xs text-muted">Temporary password</dt>
        <dd className="flex items-center justify-between gap-3">
          <code className="text-base font-semibold break-all" data-testid="temporary-password">
            {secret.temporaryPassword}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(secret.temporaryPassword);
                setCopied(true);
              } catch {
                toast.error("Could not copy. Select the password and copy it by hand.");
              }
            }}
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
          </Button>
        </dd>
      </dl>
      <DialogFooter>
        <Button onClick={onDone}>Done</Button>
      </DialogFooter>
    </div>
  );
}

const ROLE_OPTIONS = (
  <>
    <option value="EMPLOYEE">Employee</option>
    <option value="MANAGER">Manager</option>
    <option value="ADMIN">Admin</option>
  </>
);

const blank = {
  name: "",
  email: "",
  phone: "",
  role: "EMPLOYEE" as const,
  designation: "",
  department: "",
  managerId: "",
  joiningDate: "",
  shiftStart: "",
  shiftEnd: "",
};

export function CreateUserButton({
  leaveTypes,
  today,
  suggestedCode,
  ...options
}: Options & { leaveTypes: LeaveTypeRow[]; today: string; suggestedCode: string }) {
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState<Secret | null>(null);
  const close = () => {
    setOpen(false);
    setSecret(null);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? setOpen(true) : close())}
      size="lg"
      trigger={
        <Button variant="brand">
          <Plus aria-hidden /> Add employee
        </Button>
      }
      title={secret ? "Account created" : "Add employee"}
      description={secret ? undefined : "A strong temporary password is generated for the first login."}
    >
      {secret ? (
        <SecretPanel secret={secret} onDone={close} />
      ) : (
        <CreateForm
          leaveTypes={leaveTypes}
          today={today}
          suggestedCode={suggestedCode}
          onCreated={setSecret}
          {...options}
        />
      )}
    </Dialog>
  );
}

function CreateForm({
  leaveTypes,
  today,
  suggestedCode,
  onCreated,
  ...options
}: Options & {
  leaveTypes: LeaveTypeRow[];
  today: string;
  suggestedCode: string;
  onCreated: (s: Secret) => void;
}) {
  const router = useRouter();
  const quotas = leaveTypes.filter((t) => !t.isUnlimited);
  const form = useForm<CreateIn, unknown, CreateOut>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      ...blank,
      joiningDate: today,
      employeeCode: "",
      allocations: quotas.map((t) => ({ leaveTypeId: t.id, days: t.yearlyQuota })),
    },
  });
  const { run, pending, fieldErrors } = useAction(createUserAction, {
    success: (d) => `${d.name} was added.`,
    onSuccess: (d) => {
      onCreated(d);
      router.refresh();
    },
  });
  const e = form.formState.errors;
  const r = form.register;
  const err = (k: keyof CreateIn & string) =>
    (e[k as keyof typeof e]?.message as string | undefined) ?? fieldErrors[k];
  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={err("name")}>
          <Input {...r("name")} />
        </Field>
        <Field label="Email" required error={err("email")}>
          <Input type="email" autoComplete="off" {...r("email")} />
        </Field>
        <Field label="Phone" error={err("phone")}>
          <Input type="tel" {...r("phone")} />
        </Field>
        <Field label="Employee ID" hint={`Leave empty for ${suggestedCode}.`} error={err("employeeCode")}>
          <Input placeholder={suggestedCode} {...r("employeeCode")} />
        </Field>
        <Field label="Role" error={err("role")}>
          <Select {...r("role")}>{ROLE_OPTIONS}</Select>
        </Field>
        <Field label="Designation" error={err("designation")}>
          <Input {...r("designation")} />
        </Field>
        <Field label="Department" error={err("department")}>
          <Input list="departments" {...r("department")} />
        </Field>
        <Field label="Manager" error={err("managerId")}>
          <Select {...r("managerId")}>
            <option value="">No manager</option>
            {options.managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Joining date" error={err("joiningDate")}>
          <Input type="date" {...r("joiningDate")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shift start" hint={`Default ${options.shift.start}`} error={err("shiftStart")}>
            <Input type="time" {...r("shiftStart")} />
          </Field>
          <Field label="Shift end" hint={`Default ${options.shift.end}`} error={err("shiftEnd")}>
            <Input type="time" {...r("shiftEnd")} />
          </Field>
        </div>
      </div>
      {quotas.length ? (
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium">Leave allocation for this year (days)</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quotas.map((t, i) => (
              <Field key={t.id} label={t.name} error={e.allocations?.[i]?.days?.message}>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  step={0.5}
                  {...r(`allocations.${i}.days`, { valueAsNumber: true })}
                />
              </Field>
            ))}
          </div>
        </fieldset>
      ) : null}
      <Departments list={options.departments} />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="brand" loading={pending}>
          Create account
        </Button>
      </DialogFooter>
    </form>
  );
}

const Departments = ({ list }: { list: string[] }) => (
  <datalist id="departments">
    {list.map((d) => (
      <option key={d} value={d} />
    ))}
  </datalist>
);

export function EditUserButton({
  user,
  isSelf,
  trigger,
  ...options
}: Options & { user: UserRow; isSelf: boolean; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen} size="lg" trigger={trigger} title={`Edit ${user.name}`}>
      <EditForm user={user} isSelf={isSelf} {...options} onDone={() => setOpen(false)} />
    </Dialog>
  );
}

function EditForm({
  user,
  isSelf,
  onDone,
  ...options
}: Options & { user: UserRow; isSelf: boolean; onDone: () => void }) {
  const router = useRouter();
  const form = useForm<UpdateIn, unknown, UpdateOut>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
      designation: user.designation ?? "",
      department: user.department ?? "",
      managerId: user.managerId ?? "",
      joiningDate: user.joiningDate ?? "",
      shiftStart: user.shiftStart ?? "",
      shiftEnd: user.shiftEnd ?? "",
    },
  });
  const { run, pending, fieldErrors } = useAction(updateUserAction, {
    success: "Changes saved.",
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });
  const e = form.formState.errors;
  const r = form.register;
  const err = (k: keyof UpdateIn & string) =>
    (e[k as keyof typeof e]?.message as string | undefined) ?? fieldErrors[k];
  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={err("name")}>
          <Input {...r("name")} />
        </Field>
        <Field label="Email" required error={err("email")}>
          <Input type="email" autoComplete="off" {...r("email")} />
        </Field>
        <Field label="Phone" error={err("phone")}>
          <Input type="tel" {...r("phone")} />
        </Field>
        <Field
          label="Role"
          error={err("role")}
          hint={isSelf ? "You cannot change your own role." : "Changing it signs the person out."}
        >
          <Select
            {...r("role")}
            className={isSelf ? "pointer-events-none opacity-60" : undefined}
            tabIndex={isSelf ? -1 : undefined}
          >
            {ROLE_OPTIONS}
          </Select>
        </Field>
        <Field label="Designation" error={err("designation")}>
          <Input {...r("designation")} />
        </Field>
        <Field label="Department" error={err("department")}>
          <Input list="departments" {...r("department")} />
        </Field>
        <Field label="Manager" error={err("managerId")}>
          <Select {...r("managerId")}>
            <option value="">No manager</option>
            {options.managers
              .filter((m) => m.id !== user.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Joining date" error={err("joiningDate")}>
          <Input type="date" {...r("joiningDate")} />
        </Field>
        <Field label="Shift start" hint={`Empty uses ${options.shift.start}`} error={err("shiftStart")}>
          <Input type="time" {...r("shiftStart")} />
        </Field>
        <Field label="Shift end" hint={`Empty uses ${options.shift.end}`} error={err("shiftEnd")}>
          <Input type="time" {...r("shiftEnd")} />
        </Field>
      </div>
      <Departments list={options.departments} />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="brand" loading={pending}>
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}

export function UserSecurityActions({ user }: { user: Pick<UserRow, "id" | "name" | "isActive"> }) {
  const router = useRouter();
  const [secret, setSecret] = useState<Secret | null>(null);
  const refresh = () => router.refresh();
  const reset = useAction(resetUserPasswordAction, { onSuccess: setSecret });
  const logout = useAction(logoutEverywhereAction, {
    success: "Signed out of all devices.",
    onSuccess: refresh,
  });
  const active = useAction(setUserActiveAction, {
    success: user.isActive ? "Account deactivated. All sessions ended." : "Account reactivated.",
    onSuccess: refresh,
  });
  return (
    <>
      <ConfirmDialog
        trigger={<Button variant="outline">Reset password</Button>}
        title={`Reset ${user.name}'s password?`}
        description="A new temporary password is generated and all their sessions end."
        confirmLabel="Reset password"
        tone="primary"
        onConfirm={() => reset.run({ id: user.id })}
      />
      <ConfirmDialog
        trigger={<Button variant="outline">Log out of all devices</Button>}
        title={`Sign ${user.name} out everywhere?`}
        description="Every device has to log in again."
        confirmLabel="Sign out"
        tone="primary"
        onConfirm={() => logout.run({ id: user.id })}
      />
      <ConfirmDialog
        trigger={
          user.isActive ? (
            <Button variant="danger">Deactivate</Button>
          ) : (
            <Button variant="success">Reactivate</Button>
          )
        }
        title={user.isActive ? `Deactivate ${user.name}?` : `Reactivate ${user.name}?`}
        description={
          user.isActive
            ? "They are signed out at once and cannot log in. Their records are kept."
            : "They will be able to log in again."
        }
        confirmLabel={user.isActive ? "Deactivate" : "Reactivate"}
        tone={user.isActive ? "danger" : "primary"}
        onConfirm={() => active.run({ id: user.id, isActive: !user.isActive })}
      />
      <Dialog
        open={secret !== null}
        onOpenChange={(o) => !o && setSecret(null)}
        title="New temporary password"
      >
        {secret ? (
          <SecretPanel
            secret={secret}
            onDone={() => {
              setSecret(null);
              refresh();
            }}
          />
        ) : null}
      </Dialog>
    </>
  );
}
