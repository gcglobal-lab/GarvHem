"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { changePasswordAction, forgotPasswordAction, resetPasswordAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useAction } from "@/components/ui/use-action";
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validators/auth";
import { PasswordInput, PasswordRules } from "./password-input";

const NEW_PASSWORD = { newPassword: "", confirmPassword: "" };

export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const form = useForm<z.input<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", ...NEW_PASSWORD },
  });
  const value = useWatch({ control: form.control, name: "newPassword" });
  const { run, pending, fieldErrors } = useAction(changePasswordAction, {
    success: "Password changed. Other devices were signed out.",
    onSuccess: () => {
      form.reset();
      if (onDone) onDone();
      else window.location.assign("/portal");
    },
  });
  const { errors } = form.formState;
  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-5">
      <Field label="Current password" error={errors.currentPassword?.message ?? fieldErrors.currentPassword}>
        <PasswordInput autoComplete="current-password" {...form.register("currentPassword")} />
      </Field>
      <Field label="New password" error={errors.newPassword?.message ?? fieldErrors.newPassword}>
        <PasswordInput autoComplete="new-password" {...form.register("newPassword")} />
      </Field>
      <PasswordRules value={value} />
      <Field
        label="Confirm new password"
        error={errors.confirmPassword?.message ?? fieldErrors.confirmPassword}
      >
        <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
      </Field>
      <Button type="submit" variant="brand" className="w-full" size="lg" loading={pending}>
        Change password
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const form = useForm<z.input<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const { run, pending } = useAction(forgotPasswordAction, { onSuccess: () => setSent(true) });
  if (sent)
    return (
      <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
        If that address belongs to an active account, a reset link is on its way. It works once and expires in
        30 minutes.
      </p>
    );
  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-5">
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="username" className="h-11" {...form.register("email")} />
      </Field>
      <Button type="submit" variant="brand" size="lg" className="w-full" loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const form = useForm<z.input<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, ...NEW_PASSWORD },
  });
  const value = useWatch({ control: form.control, name: "newPassword" });
  const { run, pending, fieldErrors } = useAction(resetPasswordAction, { onSuccess: () => setDone(true) });
  const { errors } = form.formState;
  if (done)
    return (
      <div className="space-y-5">
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          Your password was changed. Every device was signed out.
        </p>
        <Button asChild variant="brand" size="lg" className="w-full">
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    );
  return (
    <form onSubmit={form.handleSubmit((v) => run(v))} noValidate className="space-y-5">
      <Field label="New password" error={errors.newPassword?.message ?? fieldErrors.newPassword}>
        <PasswordInput autoComplete="new-password" {...form.register("newPassword")} />
      </Field>
      <PasswordRules value={value} />
      <Field label="Confirm new password" error={errors.confirmPassword?.message}>
        <PasswordInput autoComplete="new-password" {...form.register("confirmPassword")} />
      </Field>
      <Button type="submit" variant="brand" size="lg" className="w-full" loading={pending}>
        Save new password
      </Button>
    </form>
  );
}
