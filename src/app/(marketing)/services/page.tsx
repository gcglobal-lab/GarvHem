import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/marketing/CtaBand";
import { SERVICE_ICONS } from "@/components/marketing/icons";
import { Container, Section, SlashMark } from "@/components/marketing/layout-parts";
import { PageHeader } from "@/components/marketing/PageHeader";
import { QuoteLink } from "@/components/marketing/quote/QuoteLink";
import { absolute, JsonLd, pageMeta } from "@/components/marketing/seo";
import { Button } from "@/components/ui/button";
import { services } from "@/config/services";
import { cn } from "@/lib/utils";

export const metadata: Metadata = pageMeta({
  title: "Services",
  description:
    "Dedicated offshore talent, web development, accounting, cloud, IT support and consulting for companies in the USA and Canada.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="Seven services. One team that answers for all of them."
        intro="Start with one person or one project. Add the rest when you need it, under the same agreement."
        crumbs={[{ name: "Services", path: "/services" }]}
        actions={
          <Button asChild variant="brand" size="lg">
            <QuoteLink>Get a quote</QuoteLink>
          </Button>
        }
      />
      <Section className="pt-8 sm:pt-12 lg:pt-16">
        <Container>
          <ul>
            {services.map((s) => {
              const Icon = SERVICE_ICONS[s.icon];
              return (
                <li key={s.slug} data-reveal className="border-b border-border last:border-0">
                  <div className="grid gap-x-10 gap-y-6 py-12 lg:grid-cols-12 lg:py-16">
                    <div className="lg:col-span-5">
                      <Icon className="size-8 text-brand" strokeWidth={1.75} aria-hidden />
                      <h2 className="mt-5 text-2xl leading-tight font-semibold tracking-[-0.025em] sm:text-3xl">
                        <Link
                          href={`/services/${s.slug}`}
                          className="rounded transition-colors hover:text-brand"
                        >
                          {s.name}
                        </Link>
                      </h2>
                      <p className="mt-3 max-w-md text-[17px] leading-relaxed text-muted">{s.summary}</p>
                      <Link
                        href={`/services/${s.slug}`}
                        className="group mt-6 inline-flex items-center gap-2 rounded font-medium text-accent"
                      >
                        <span className="underline-offset-4 group-hover:underline">
                          More about{" "}
                          {s.shortName === "Custom"
                            ? "custom work"
                            : s.shortName.replace(/^./, (c) =>
                                /^IT/.test(s.shortName) ? c : c.toLowerCase(),
                              )}
                        </span>
                        <ArrowRight
                          className="size-4 transition-transform group-hover:translate-x-1"
                          aria-hidden
                        />
                      </Link>
                    </div>
                    <ul className={cn("grid content-start gap-x-8 gap-y-5 sm:grid-cols-2 lg:col-span-7")}>
                      {s.scope.map((i) => (
                        <li key={i.title} className="flex gap-3.5">
                          <SlashMark className="mt-1.5" />
                          <span>
                            <span className="font-medium">{i.title}</span>
                            <span className="mt-0.5 block text-[15px] leading-relaxed text-muted">
                              {i.text}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </Container>
      </Section>
      <CtaBand
        title="Not sure which service fits? Describe the problem."
        text="We will suggest the simplest way to solve it, even if that is a smaller piece of work than you expected."
      />
      <JsonLd
        data={{
          "@type": "ItemList",
          itemListElement: services.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: s.name,
            url: absolute(`/services/${s.slug}`),
          })),
        }}
      />
    </>
  );
}
