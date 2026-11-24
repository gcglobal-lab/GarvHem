export const DIAL_CODES = [
  { code: "+1", label: "US / CA" },
  { code: "+44", label: "UK" },
  { code: "+61", label: "Australia" },
  { code: "+91", label: "India" },
  { code: "+353", label: "Ireland" },
  { code: "+64", label: "New Zealand" },
  { code: "+52", label: "Mexico" },
  { code: "+49", label: "Germany" },
  { code: "+33", label: "France" },
  { code: "+31", label: "Netherlands" },
  { code: "+34", label: "Spain" },
  { code: "+39", label: "Italy" },
  { code: "+41", label: "Switzerland" },
  { code: "+46", label: "Sweden" },
  { code: "+971", label: "UAE" },
  { code: "+966", label: "Saudi Arabia" },
  { code: "+65", label: "Singapore" },
  { code: "+852", label: "Hong Kong" },
  { code: "+81", label: "Japan" },
  { code: "+27", label: "South Africa" },
  { code: "+55", label: "Brazil" },
] as const;

/** Default dialling code for the countries in the form. */
export const DIAL_BY_COUNTRY: Record<string, string> = {
  USA: "+1",
  Canada: "+1",
  UK: "+44",
  Australia: "+61",
  India: "+91",
};
