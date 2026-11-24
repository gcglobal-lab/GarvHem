import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-art";
import { ChangePasswordForm } from "@/components/auth/password-forms";
import { LogoutButton } from "@/components/portal/logout-button";
import { requirePageUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Change password", robots: { index: false, follow: false } };

export default async function ChangePasswordPage() {
  const user = await requirePageUser({ allowPasswordChange: true });
  return (
    <AuthCard>
      <h1 className="text-3xl font-semibold">
        {user.mustChangePassword ? "Set your password" : "Change password"}
      </h1>
      <p className="mt-2 mb-8 text-sm text-muted">
        {user.mustChangePassword
          ? `Welcome, ${user.name.split(" ")[0]}. Replace your temporary password before you continue.`
          : "Choose a new password. Other devices will be signed out."}
      </p>
      <ChangePasswordForm />
      <div className="mt-4 text-center">
        <LogoutButton variant="ghost" size="sm">
          Sign out instead
        </LogoutButton>
      </div>
    </AuthCard>
  );
}
