import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Footer } from "@/components/marketing/Footer";
import { MotionRoot } from "@/components/marketing/MotionRoot";
import { Navbar } from "@/components/marketing/nav/Navbar";
import { QuoteProvider } from "@/components/marketing/quote/QuoteProvider";
import { absolute, JsonLd, ORGANIZATION_ID } from "@/components/marketing/seo";
import { serviceMenu } from "@/config/services";
import { site } from "@/config/site";
import { env } from "@/lib/env";
import { getPublicCompany } from "@/server/settings";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const [h, company] = await Promise.all([headers(), getPublicCompany()]);
  const sameAs = [company.linkedin, company.x, company.instagram, company.facebook].filter(Boolean);
  return (
    <QuoteProvider turnstileSiteKey={env().TURNSTILE_SITE_KEY} nonce={h.get("x-nonce") ?? undefined}>
      <a
        href="#main"
        className="fixed top-3 left-3 z-60 -translate-y-24 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-lift focus:translate-y-0"
      >
        Skip to content
      </a>
      <Navbar services={serviceMenu} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
      <MotionRoot />
      <JsonLd
        data={{
          "@type": "Organization",
          "@id": ORGANIZATION_ID(),
          name: company.name || site.name,
          url: absolute("/"),
          logo: absolute("/media/images/brand/icon-512.png"),
          description: site.description,
          founder: { "@type": "Person", name: site.founder },
          ...(company.email ? { email: company.email } : {}),
          ...(company.phone ? { telephone: company.phone } : {}),
          areaServed: ["US", "CA"],
          ...(sameAs.length ? { sameAs } : {}),
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "sales",
            url: absolute("/contact"),
            availableLanguage: "English",
            ...(company.email ? { email: company.email } : {}),
          },
        }}
      />
    </QuoteProvider>
  );
}
