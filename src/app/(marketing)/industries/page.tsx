import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/marketing/CtaBand";
import { Container, Section, SlashMark } from "@/components/marketing/layout-parts";
import { PageHeader } from "@/components/marketing/PageHeader";
import { pageMeta } from "@/components/marketing/seo";
import { industries } from "@/config/industries";
import { getService } from "@/config/services";

export const metadata: Metadata = pageMeta({
  title: "Industries",
  description:
    "Offshore teams and services for SaaS, e-commerce, healthcare administration, finance, real estate, agencies and more in the USA and Canada.",
  path: "/industries",
});

export default function IndustriesPage() {
  return (
    <>
      <PageHeader
        title="The work changes by industry. The standard does not."
        intro="Tools, deadlines and rules differ from one sector to the next. This is the work we are set up to take on in each."
        crumbs={[{ name: "Industries", path: "/industries" }]}
      />
      <Section>
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <nav aria-label="Industries on this page" className="min-w-0 lg:col-span-3">
            <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:sticky lg:top-28 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0">
              {industries.map((i) => (
                <li key={i.slug} className="shrink-0">
                  <a
                    href={`#${i.slug}`}
                    className="block rounded-full border border-border px-4 py-2 text-sm whitespace-nowrap text-muted transition-colors hover:text-foreground lg:rounded-lg lg:border-0 lg:px-0 lg:text-[15px] lg:hover:text-brand"
                  >
                    {i.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-w-0 lg:col-span-9">
            {industries.map((i) => (
              <article
                key={i.slug}
                id={i.slug}
                data-reveal
                className="scroll-mt-28 border-b border-border py-14 first:pt-0 last:border-0 last:pb-0"
              >
                <h2 className="text-2xl font-semibold tracking-[-0.025em] sm:text-4xl">{i.name}</h2>
                <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-muted">{i.detail}</p>
                <ul className="mt-7 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {i.tasks.map((t) => (
                    <li key={t} className="flex gap-3.5">
                      <SlashMark className="mt-1.5" />
                      {t}
                    </li>
                  ))}
                </ul>
                <ul className="mt-8 flex flex-wrap gap-2">
                  {i.services.map((slug) => {
                    const s = getService(slug);
                    return s ? (
                      <li key={slug}>
                        <Link
                          href={`/services/${slug}`}
                          className="block rounded-full bg-canvas px-4 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-white"
                        >
                          {s.name}
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
              </article>
            ))}
          </div>
        </Container>
      </Section>
      <CtaBand
        title="Your industry is not on the list?"
        text="Tell us how your work runs today. If we have not done something like it, we will say so."
        service="Custom requirement"
        secondary={{ href: "/services", label: "All services" }}
      />
    </>
  );
}
