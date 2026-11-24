"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { CheckboxField, Field, Input } from "@/components/ui/form";
import { loginSchema } from "@/lib/validators/auth";
import { PasswordInput } from "./password-input";

type Values = z.input<typeof loginSchema>;

export function LoginForm({
  next,
  notice,
  emailReset,
}: {
  next: string;
  notice?: string;
  emailReset: boolean;
}) {
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const form = useForm<Values, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await res.json()) as { ok: boolean; error?: string; mustChangePassword?: boolean };
      if (body.ok) {
        setLeaving(true);
        // A full navigation so the portal starts with the new cookies.
        window.location.assign(body.mustChangePassword ? "/change-password" : next);
        return;
      }
      setError(body.error ?? "Invalid email or password.");
      form.resetField("password");
      form.setFocus("password");
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  });

  const { errors, isSubmitting } = form.formState;
  return (
    <>
      <h1 className="text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Sign in to the GARVHEM portal.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        {error || notice ? (
          <div
            role="alert"
            className={
              error
                ? "rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
                : "rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent"
            }
          >
            {error || notice}
          </div>
        ) : null}
        <Field label="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="you@garvhem.com"
            className="h-11"
            {...form.register("email")}
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput autoComplete="current-password" className="h-11" {...form.register("password")} />
        </Field>
        <Controller
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <CheckboxField
              label="Remember me for 30 days"
              checked={field.value ?? false}
              onCheckedChange={(v) => field.onChange(v === true)}
            />
          )}
        />
        <Button type="submit" variant="brand" size="lg" className="w-full" loading={isSubmitting || leaving}>
          Login
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        <span className="font-medium text-foreground">Forgot password?</span>{" "}
        {emailReset ? (
          <Link href="/forgot-password" className="text-accent underline underline-offset-4">
            Get a reset link
          </Link>
        ) : (
          "Contact your administrator to reset your password."
        )}
      </p>
    </>
  );
}
