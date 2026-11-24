import { requirePagePermission } from "@/lib/auth/guards";

/** Checked in a layout, above any loading state, so a refusal is a real HTTP 403. */
export default async function SectionLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission("leaves.approve");
  return children;
}
