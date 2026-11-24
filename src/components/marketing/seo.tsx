import type { Metadata } from "next";
import { headers } from "next/headers";
import { media } from "@/config/media";
import { site, siteUrl } from "@/config/site";

export function pageMeta({
  title,
  description,
  path,
  absoluteTitle,
}: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
}): Metadata {
  const full = absoluteTitle ? title : `${title} | ${site.name}`;
  const image = {
    url: media.og ?? "/opengraph-image",
    width: 1200,
    height: 630,
    alt: `${site.name}. ${site.tagline}`,
  };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: site.locale,
      url: path,
      title: full,
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: full, description, images: [image.url] },
  };
}

/** Structured data. "<" is escaped so content can never close the script tag. */
export async function JsonLd({ data }: { data: Record<string, unknown> }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export const absolute = (path: string) => `${siteUrl()}${path}`;
export const ORGANIZATION_ID = () => absolute("/#organization");

export function breadcrumbData(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((i, n) => ({
      "@type": "ListItem",
      position: n + 1,
      name: i.name,
      item: absolute(i.path),
    })),
  };
}
