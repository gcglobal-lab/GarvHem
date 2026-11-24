import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-art";
import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { isEmailConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  if (!isEmailConfigured()) redirect("/login");
  return (
    <AuthCard>
      <h1 className="text-3xl font-semibold">Reset your password</h1>
      <p className="mt-2 mb-8 text-sm text-muted">
        Enter your work email and we will send you a one-time link.
      </p>
      <ForgotPasswordForm />
      <Link href="/login" className="mt-6 text-sm text-accent underline underline-offset-4">
        Back to login
      </Link>
    </AuthCard>
  );
}
