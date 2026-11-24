import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SavingsCalculator } from "@/components/marketing/calculator/SavingsCalculator";
import { CtaBand } from "@/components/marketing/CtaBand";
import { Faq } from "@/components/marketing/Faq";
import { FounderNote } from "@/components/marketing/FounderNote";
import { Hero } from "@/components/marketing/home/Hero";
import { IndustriesList } from "@/components/marketing/home/IndustriesList";
import { ProcessVideo } from "@/components/marketing/home/ProcessVideo";
import { ServicesBento } from "@/components/marketing/home/ServicesBento";
import { StatsStrip } from "@/components/marketing/home/StatsStrip";
import { TechMarquee } from "@/components/marketing/home/TechMarquee";
import { Timeline } from "@/components/marketing/home/Timeline";
import { WhyGarvhem } from "@/components/marketing/home/WhyGarvhem";
import { Container, H2, Lead, Section, SplitHeading } from "@/components/marketing/layout-parts";
import { JsonLd, pageMeta } from "@/components/marketing/seo";
import { Slashes } from "@/components/marketing/Slashes";
import { Testimonials } from "@/components/marketing/Testimonials";
import { Button } from "@/components/ui/button";
import { faqs } from "@/config/faq";
import { site } from "@/config/site";

export const metadata: Metadata = pageMeta({
  title: `${site.name} | Dedicated offshore teams from India for the USA and Canada`,
  description: site.description,
  path: "/",
  absoluteTitle: true,
});

const INCLUDED = [
  "Recruiting, skills tests and interviews",
  "HR, payroll and benefits in India",
  "Laptop, internet and workspace",
  "Attendance and a daily task report",
  "Replacement if the fit is wrong",
];

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsStrip />

      <Section id="services">
        <Container>
          <SplitHeading title="One partner for the work behind your business" className="mb-12 lg:mb-16">
            Hire people, hand over a process or start a project. Everything runs through one contract and one
            contact.
          </SplitHeading>
          <ServicesBento />
        </Container>
      </Section>

      <Section tone="canvas" id="savings">
        <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5" data-reveal>
            <H2>One local salary can pay for a team of three or four</H2>
            <Lead className="mt-5">
              A single hire in the USA or Canada carries salary, taxes, benefits, equipment and recruiting
              fees. We hire skilled people in India to your exact requirements, for a fraction of that, and
              look after everything around the job.
            </Lead>
            <ul className="mt-8 space-y-3.5">
              {INCLUDED.map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-brand" strokeWidth={2.5} aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <Button asChild variant="primary" size="lg" className="mt-9">
              <Link href="/dedicated-talent">
                How Dedicated Talent works
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="lg:col-span-7" data-reveal="1">
            <SavingsCalculator variant="mini" />
          </div>
        </Container>
      </Section>

      <Section tone="ink">
        <Slashes variant="quiet" />
        <Container className="relative">
          <SplitHeading title="From your brief to daily reports in five steps" className="mb-14 lg:mb-20">
            You spend about an hour in total before day one. We do the rest.
          </SplitHeading>
          <Timeline />
        </Container>
      </Section>

      <Section>
        <Container>
          <WhyGarvhem />
        </Container>
      </Section>

      <Section tone="canvas">
        <Container>
          <SplitHeading title="Built around how your industry works" className="mb-12">
            The tools and deadlines differ from one sector to the next. We hire and train for yours.
          </SplitHeading>
          <IndustriesList />
        </Container>
      </Section>

      <Section className="pb-12 sm:pb-16 lg:pb-20">
        <Container>
          <div className="mb-10 max-w-2xl" data-reveal>
            <H2>See how we work</H2>
          </div>
          <div data-reveal="1">
            <ProcessVideo />
          </div>
        </Container>
      </Section>

      <section aria-label="Technologies we work with" className="pb-20 sm:pb-28">
        <TechMarquee />
      </section>

      <Testimonials />

      <Section tone="canvas">
        <Container>
          <FounderNote />
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <H2>Questions clients ask first</H2>
              <p className="mt-5 text-muted">
                Something else on your mind?{" "}
                <Link href="/contact" className="font-medium text-accent underline underline-offset-4">
                  Ask us directly
                </Link>
                .
              </p>
            </div>
          </div>
          <Faq items={faqs} className="lg:col-span-8" />
        </Container>
      </Section>

      <CtaBand />
      <JsonLd
        data={{
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }}
      />
    </>
  );
}
