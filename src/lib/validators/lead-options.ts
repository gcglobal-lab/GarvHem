/** Choices for leads. Kept apart from the zod schema so pages can use them without loading zod. */
export const COUNTRIES = ["USA", "Canada", "UK", "Australia", "India", "Other"] as const;
export const LEAD_SERVICES = [
  "Website & Web App Development",
  "Accounting & Bookkeeping",
  "Cloud Services",
  "Computer Operations & IT Support",
  "IT / Computer Consulting",
  "Dedicated Talent",
  "Custom requirement",
] as const;
export const BUDGETS = [
  "Under $1,000 / month",
  "$1,000 to $3,000 / month",
  "$3,000 to $7,500 / month",
  "$7,500 to $15,000 / month",
  "Over $15,000 / month",
  "One-off project",
  "Not sure yet",
] as const;
export const HEARD_FROM = [
  "Google search",
  "LinkedIn",
  "Referral",
  "Social media",
  "Event",
  "Other",
] as const;
export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"] as const;
export type LeadStatusName = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABEL: Record<LeadStatusName, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal sent",
  WON: "Won",
  LOST: "Lost",
};
