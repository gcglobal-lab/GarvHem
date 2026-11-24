/**
 * Savings calculator data and maths. Nothing else on the site holds rates.
 *
 * The figures are ILLUSTRATIVE: rounded planning numbers, not quotes or survey results.
 *   localSalary    typical annual base salary for one local hire
 *   garvhemMonthly all-in monthly price for one dedicated professional
 * Canadian rows are in CAD, US rows are in USD. Edit them here and every page follows.
 */
export const PRICING_DISCLAIMER = "Estimates only, actual pricing depends on role and requirements.";

export const PRICING_COUNTRIES = {
  USA: { label: "United States", currency: "USD", locale: "en-US", onCost: 1.28 },
  Canada: { label: "Canada", currency: "CAD", locale: "en-CA", onCost: 1.25 },
} as const;
export type PricingCountry = keyof typeof PRICING_COUNTRIES;

/** What `onCost` adds on top of salary. */
export const ON_COST_NOTE =
  "Local cost is salary plus an allowance for payroll taxes, benefits, equipment and recruiting. The GARVHEM cost is all-inclusive.";

type Rate = { localSalary: number; garvhemMonthly: number };

export const PRICING_ROLES = {
  Developer: {
    USA: { localSalary: 110_000, garvhemMonthly: 3_050 },
    Canada: { localSalary: 116_000, garvhemMonthly: 3_950 },
  },
  Accountant: {
    USA: { localSalary: 76_000, garvhemMonthly: 2_150 },
    Canada: { localSalary: 80_000, garvhemMonthly: 2_750 },
  },
  "Cloud Engineer": {
    USA: { localSalary: 128_000, garvhemMonthly: 3_600 },
    Canada: { localSalary: 130_000, garvhemMonthly: 4_450 },
  },
  "IT Support": {
    USA: { localSalary: 60_000, garvhemMonthly: 1_700 },
    Canada: { localSalary: 66_000, garvhemMonthly: 2_200 },
  },
  "Data Entry": {
    USA: { localSalary: 42_000, garvhemMonthly: 1_150 },
    Canada: { localSalary: 48_000, garvhemMonthly: 1_500 },
  },
  "Virtual Assistant": {
    USA: { localSalary: 48_000, garvhemMonthly: 1_280 },
    Canada: { localSalary: 54_000, garvhemMonthly: 1_680 },
  },
  Custom: {
    USA: { localSalary: 82_000, garvhemMonthly: 2_450 },
    Canada: { localSalary: 94_000, garvhemMonthly: 3_150 },
  },
} as const satisfies Record<string, Record<PricingCountry, Rate>>;
export type PricingRole = keyof typeof PRICING_ROLES;

export const PRICING_ROLE_NAMES = Object.keys(PRICING_ROLES) as PricingRole[];
export const PRICING_COUNTRY_NAMES = Object.keys(PRICING_COUNTRIES) as PricingCountry[];
export const MAX_HEADCOUNT = 50;

export type SavingsInput = { role: PricingRole; country: PricingCountry; headcount: number };
export type SavingsEstimate = {
  currency: "USD" | "CAD";
  locale: "en-US" | "en-CA";
  headcount: number;
  /** Fully loaded annual cost of one local hire */
  localPerHire: number;
  /** All-in annual cost of one dedicated professional */
  garvhemPerHire: number;
  localTotal: number;
  garvhemTotal: number;
  savings: number;
  /** 0 to 100, whole number */
  savingsPercent: number;
  /** Dedicated professionals per local hire, one decimal, rounded down */
  ratio: number;
  /** Whole professionals you could hire for the price of one local employee */
  professionalsForOne: number;
};

/** Pure: no formatting, no clock, no I/O. */
export function estimateSavings({ role, country, headcount }: SavingsInput): SavingsEstimate {
  const { currency, locale, onCost } = PRICING_COUNTRIES[country];
  const rate = PRICING_ROLES[role][country];
  const people = Math.min(MAX_HEADCOUNT, Math.max(1, Math.floor(Number.isFinite(headcount) ? headcount : 1)));
  const localPerHire = Math.round(rate.localSalary * onCost);
  const garvhemPerHire = rate.garvhemMonthly * 12;
  const localTotal = localPerHire * people;
  const garvhemTotal = garvhemPerHire * people;
  const savings = localTotal - garvhemTotal;
  return {
    currency,
    locale,
    headcount: people,
    localPerHire,
    garvhemPerHire,
    localTotal,
    garvhemTotal,
    savings,
    savingsPercent: Math.round((savings / localTotal) * 100),
    ratio: Math.floor((localPerHire / garvhemPerHire) * 10) / 10,
    professionalsForOne: Math.floor(localPerHire / garvhemPerHire),
  };
}

/** Whole units in the local convention; CAD always reads as "CA$" so it cannot be taken for USD. */
export function formatMoney(amount: number, country: PricingCountry): string {
  const { currency, locale } = PRICING_COUNTRIES[country];
  const text = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
  return currency === "CAD" ? text.replace(/^\$/, "CA$") : text;
}
