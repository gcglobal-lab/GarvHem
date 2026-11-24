"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { revokeOtherSessionsAction, revokeSessionAction, updateProfileAction } from "@/actions/account";
import { ChangePasswordForm } from "@/components/auth/password-forms";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { useAction } from "@/components/ui/use-action";

export function PhoneForm({ phone }: { phone: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(phone ?? "");
  const { run, pending, fieldErrors } = useAction(updateProfileAction, {
    success: "Profile updated.",
    onSuccess: () => router.refresh(),
  });
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void run({ phone: value });
      }}
    >
      <Field label="Phone" error={fieldErrors.phone} className="min-w-52 flex-1">
        <Input type="tel" autoComplete="tel" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <Button type="submit" variant="outline" loading={pending} disabled={value === (phone ?? "")}>
        Save
      </Button>
    </form>
  );
}

export function ProfilePasswordForm() {
  const router = useRouter();
  return <ChangePasswordForm onDone={() => router.refresh()} />;
}

export function RevokeSession({ familyId }: { familyId: string }) {
  const router = useRouter();
  const { run } = useAction(revokeSessionAction, {
    success: "Device signed out.",
    onSuccess: () => router.refresh(),
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          Sign out
        </Button>
      }
      title="Sign out this device?"
      description="It will need to log in again."
      confirmLabel="Sign out"
      onConfirm={() => run({ familyId })}
    />
  );
}

export function RevokeOthers() {
  const router = useRouter();
  const { run } = useAction(revokeOtherSessionsAction, {
    success: "All other devices were signed out.",
    onSuccess: () => router.refresh(),
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          Sign out other devices
        </Button>
      }
      title="Sign out all other devices?"
      description="Only this device stays signed in."
      confirmLabel="Sign out others"
      onConfirm={() => run({})}
    />
  );
}
