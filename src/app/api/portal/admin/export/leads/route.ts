import { handler } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guards";
import { csvResponse, toCsv } from "@/lib/csv";
import { LEAD_STATUS_LABEL, leadFilterSchema } from "@/lib/validators/leads";
import { listLeads } from "@/server/leads";

export const GET = handler("export.leads", async (req) => {
  await requirePermission("leads.view");
  const filter = leadFilterSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const rows = await listLeads(filter, 5000);
  const csv = toCsv(
    [
      "Lead",
      "Received",
      "Status",
      "Name",
      "Email",
      "Phone",
      "Company",
      "Country",
      "Services",
      "Headcount",
      "Budget",
      "Owner",
      "Follow-up",
      "Source",
      "Requirement",
    ],
    rows.map((l) => [
      l.number,
      l.createdAt,
      LEAD_STATUS_LABEL[l.status],
      l.fullName,
      l.email,
      l.phone,
      l.company,
      l.country,
      l.services.join("; "),
      l.headcount,
      l.budgetRange,
      l.owner?.name,
      l.followUpDate,
      l.sourcePage,
      l.requirement,
    ]),
  );
  return csvResponse("leads.csv", csv);
});
