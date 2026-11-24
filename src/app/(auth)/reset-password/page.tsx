import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-art";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer", // the token is in the URL
};

type Props = { searchParams: Promise<{ token?: string | string[] }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) redirect("/login");
  return (
    <AuthCard>
      <h1 className="mb-8 text-3xl font-semibold">Choose a new password</h1>
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
