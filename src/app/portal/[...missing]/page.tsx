import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guards";

/** Unknown portal URLs get the portal's own 404 inside the shell. */
export default async function MissingPage() {
  await requirePageUser();
  notFound();
}
