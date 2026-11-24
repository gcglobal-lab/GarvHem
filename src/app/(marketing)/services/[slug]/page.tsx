import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/marketing/CtaBand";
import { Faq } from "@/components/marketing/Faq";
import { SERVICE_ICONS } from "@/components/marketing/icons";
import { Container, H2, Lead, Section, SplitHeading } from "@/components/marketing/layout-parts";
import { PageHeader } from "@/components/marketing/PageHeader";
import { QuoteLink } from "@/components/marketing/quote/QuoteLink";
import { absolute, JsonLd, ORGANIZATION_ID, pageMeta } from "@/components/marketing/seo";
import { ServiceVisual } from "@/components/marketing/ServiceVisual";
import { Button } from "@/components/ui/button";
import { flagship, getService, services } from "@/config/services";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = getService((await params).slug);
  if (!service) notFound();
  return pageMeta({
    title: service.metaTitle,
    description: service.metaDescription,
    path: `/services/${service.slug}`,
  });
}

export default async function ServicePage({ params }: Props) {
  const service = getService((await params).slug);
  if (!service) notFound();
  const related = service.related.map((r) => services.find((s) => s.slug === r)!);

  return (
    <>
      <PageHeader
        title={service.headline}
        intro={service.intro}
        crumbs={[
          { name: "Services", path: "/services" },
          { name: service.name, path: `/services/${service.slug}` },
        ]}
        actions={
          <>
            <Button asChild variant="brand" size="lg">
              <QuoteLink service={service.leadService}>Get a quote</QuoteLink>
            </Button>
            <Button asChild variant="glass" size="lg">
              {service === flagship ? (
                <Link href="/dedicated-talent#calculator">Calculate savings</Link>
              ) : (
                <a href="#included">What is included</a>
              )}
            </Button>
          </>
        }
        aside={<ServiceVisual slug={service.slug} />}
      />

      <Section id="included">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28" data-reveal>
              <H2>What is included</H2>
              <p className="mt-5 leading-relaxed text-muted">
                Pick the parts you need. Anything not listed is worth asking about.
              </p>
            </div>
          </div>
          <dl className="lg:col-span-8">
            {service.scope.map((i) => (
              <div
                key={i.title}
                data-reveal
                className="grid gap-x-8 gap-y-1.5 border-t border-border py-7 last:border-b sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
              >
                <dt className="font-display text-xl font-semibold tracking-tight">{i.title}</dt>
                <dd className="text-[17px] leading-relaxed text-muted">{i.text}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      <Section tone="canvas">
        <Container>
          <SplitHeading title="How it runs, start to finish" className="mb-12" />
          <ol className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-5">
            {service.steps.map((s, i) => (
              <li key={s.title} data-reveal={String(i)} className="bg-surface p-6 lg:p-7">
                <span aria-hidden className="font-display text-sm font-semibold text-brand">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          <div data-reveal>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">A good fit when</h2>
            <ul className="mt-7 space-y-4">
              {service.fit.map((f) => (
                <li key={f} className="flex gap-3.5 text-[17px]">
                  <Check className="mt-1 size-5 shrink-0 text-brand" strokeWidth={2.5} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            {service.tools.length ? (
              <>
                <h3 className="mt-12 text-sm font-medium tracking-normal text-muted">Tools we use most</h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {service.tools.map((t) => (
                    <li
                      key={t}
                      className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <div data-reveal="1">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ways to work together</h2>
            <dl className="mt-7 space-y-3">
              {service.engagement.map((e) => (
                <div key={e.title} className="rounded-2xl bg-canvas p-6">
                  <dt className="font-display text-lg font-semibold tracking-tight">{e.title}</dt>
                  <dd className="mt-1.5 text-muted">{e.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </Section>

      <Section className="pt-0 sm:pt-0 lg:pt-0">
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Common questions</h2>
            <Lead className="mt-4 text-base sm:text-base">
              More answers are on the{" "}
              <Link href="/how-it-works" className="font-medium text-accent underline underline-offset-4">
                How it works
              </Link>{" "}
              page.
            </Lead>
          </div>
          <Faq items={service.faqs} className="lg:col-span-8" />
        </Container>
      </Section>

      <Section tone="canvas" className="py-16 sm:py-20 lg:py-24">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">Often combined with</h2>
          <ul className="mt-6 border-t border-border">
            {related.map((r) => {
              const Icon = SERVICE_ICONS[r.icon];
              return (
                <li key={r.slug} className="border-b border-border">
                  <Link href={`/services/${r.slug}`} className="group flex items-center gap-5 py-6">
                    <Icon
                      className="size-6 shrink-0 text-muted transition-colors group-hover:text-brand"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-6">
                      <span className="block font-display text-lg font-semibold tracking-tight sm:w-80 sm:shrink-0">
                        {r.name}
                      </span>
                      <span className="mt-1 block text-[15px] text-muted sm:mt-0">{r.summary}</span>
                    </span>
                    <ArrowRight
                      className="size-5 shrink-0 text-muted transition-[translate,color] duration-300 group-hover:translate-x-1.5 group-hover:text-brand"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </Section>

      <CtaBand service={service.leadService} />
      <JsonLd
        data={{
          "@type": "Service",
          name: service.name,
          serviceType: service.name,
          description: service.metaDescription,
          url: absolute(`/services/${service.slug}`),
          provider: { "@type": "Organization", "@id": ORGANIZATION_ID() },
          areaServed: [
            { "@type": "Country", name: "United States" },
            { "@type": "Country", name: "Canada" },
          ],
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: service.name,
            itemListElement: service.scope.map((s) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: s.title, description: s.text },
            })),
          },
        }}
      />
    </>
  );
}
