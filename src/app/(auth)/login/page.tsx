import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-art";
import { LoginForm } from "@/components/auth/login-form";
import { isEmailConfigured } from "@/lib/env";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Employee login",
  description: "Sign in to the GARVHEM employee portal.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ next?: string | string[]; reason?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next, reason } = await searchParams;
  return (
    <div className="w-full max-w-[1000px]">
      <AuthCard>
        <LoginForm
          next={safeNext(typeof next === "string" ? next : null)}
          notice={reason === "expired" ? "Your session has ended. Please sign in again." : undefined}
          emailReset={isEmailConfigured()}
        />
      </AuthCard>
      <p className="mt-6 text-center text-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-muted hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Back to the website
        </Link>
      </p>
    </div>
  );
}
