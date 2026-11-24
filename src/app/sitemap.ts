import type { MetadataRoute } from "next";
import { LEGAL_LAST_UPDATED } from "@/config/navigation";
import { services } from "@/config/services";
import { siteUrl } from "@/config/site";

const PAGES: [path: string, priority: number][] = [
  ["/", 1],
  ["/services", 0.9],
  ["/dedicated-talent", 0.9],
  ["/how-it-works", 0.8],
  ["/industries", 0.7],
  ["/about", 0.6],
  ["/contact", 0.8],
  ["/careers", 0.5],
  ["/privacy", 0.2],
  ["/terms", 0.2],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [...PAGES, ...services.map((s): [string, number] => [`/services/${s.slug}`, 0.8])].map(
    ([path, priority]) => ({
      url: `${base}${path === "/" ? "" : path}`,
      lastModified: LEGAL_LAST_UPDATED,
      changeFrequency: "monthly",
      priority,
    }),
  );
}
