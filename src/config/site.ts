/** Static brand facts. Editable contact details live in Settings > Company (database). */
export const site = {
  name: "GARVHEM",
  founder: "Hemant Singh",
  tagline: "Your global team. Built in India.",
  description:
    "GARVHEM builds dedicated offshore teams and delivers web development, accounting, cloud and IT support for companies in the USA and Canada.",
  locale: "en_US",
} as const;

export const siteUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
