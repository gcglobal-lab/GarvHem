import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PortalProviders } from "@/components/portal/providers";
import { PortalShell } from "@/components/portal/shell";
import { Toaster } from "@/components/ui/toast";
import { requirePageUser } from "@/lib/auth/guards";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: { default: "Portal", template: "%s | GARVHEM Portal" },
  robots: { index: false, follow: false },
};

const ROLE_LABEL = { ADMIN: "Administrator", MANAGER: "Manager", EMPLOYEE: "Employee" } as const;

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const [{ company }, jar] = await Promise.all([getSettings(), cookies()]);
  return (
    <PortalProviders
      value={{
        userId: user.id,
        name: user.name,
        email: user.email,
        roleLabel: ROLE_LABEL[user.role],
        permissions: [...user.permissions],
        timezone: company.timezone,
      }}
    >
      <PortalShell initialCollapsed={jar.get("gv_nav")?.value === "1"}>{children}</PortalShell>
      <Toaster />
    </PortalProviders>
  );
}
