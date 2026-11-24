import type { Metadata } from "next";
import { CtaBand } from "@/components/marketing/CtaBand";
import { DailyReportMock } from "@/components/marketing/DailyReportMock";
import { Faq } from "@/components/marketing/Faq";
import { ProcessVideo } from "@/components/marketing/home/ProcessVideo";
import { Container, H2, Lead, Section, SplitHeading } from "@/components/marketing/layout-parts";
import { PageHeader } from "@/components/marketing/PageHeader";
import { PROCESS } from "@/components/marketing/process-steps";
import { QuoteLink } from "@/components/marketing/quote/QuoteLink";
import { pageMeta } from "@/components/marketing/seo";
import { TimezoneBand } from "@/components/marketing/TimezoneBand";
import { Button } from "@/components/ui/button";
import { faqs } from "@/config/faq";

export const metadata: Metadata = pageMeta({
  title: "How it works",
  description:
    "Share requirements, approve a shortlist, start with a dedicated professional and receive daily reports. How GARVHEM works, step by step.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        title="You decide who joins. We make sure they deliver."
        intro="Five steps, no jargon. Here is what each one asks from you and what we do in return."
        crumbs={[{ name: "How it works", path: "/how-it-works" }]}
        actions={
          <Button asChild variant="brand" size="lg">
            <QuoteLink>Start with step one</QuoteLink>
          </Button>
        }
      />

      <Section>
        <Container>
          <ol>
            {PROCESS.map((s, i) => (
              <li
                key={s.title}
                data-reveal
                className="grid gap-x-10 gap-y-6 border-t border-border py-10 first:border-t-0 first:pt-0 lg:grid-cols-12 lg:py-14"
              >
                <span
                  aria-hidden
                  className="font-display text-7xl leading-none font-semibold tracking-[-0.06em] text-brand lg:col-span-2 lg:text-8xl"
                >
                  {i + 1}
                </span>
                <div className="lg:col-span-5">
                  <h2 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                    {s.title}
                  </h2>
                  <p className="mt-3 max-w-md text-[17px] leading-relaxed text-muted">{s.text}</p>
                </div>
                <dl className="grid content-start gap-5 rounded-2xl bg-canvas p-6 sm:grid-cols-2 lg:col-span-5">
                  <div>
                    <dt className="text-[13px] text-muted">We need from you</dt>
                    <dd className="mt-1 font-medium">{s.you}</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-muted">You get from us</dt>
                    <dd className="mt-1 font-medium">{s.us}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tone="canvas">
        <Container>
          <SplitHeading title="The same story in 24 seconds" className="mb-10" />
          <div data-reveal="1">
            <ProcessVideo />
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="grid items-center gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-6" data-reveal>
            <H2>What lands in your inbox each day</H2>
            <Lead className="mt-5">
              A short, readable report: what was finished, how long it took, what is stuck and what happens
              tomorrow. If something waits on you, it says so.
            </Lead>
            <p className="mt-5 leading-relaxed text-muted">
              Your GARVHEM manager reads the same report. If hours or quality slip, we act before you have to
              ask.
            </p>
          </div>
          <div className="lg:col-span-6" data-reveal="1">
            <DailyReportMock />
          </div>
        </Container>
      </Section>

      <Section tone="canvas">
        <Container>
          <SplitHeading title="Shared hours with your office" className="mb-12">
            Choose the shift that gives you the overlap you need.
          </SplitHeading>
          <div data-reveal="1">
            <TimezoneBand />
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <H2 className="lg:col-span-4">Details people ask about</H2>
          <Faq items={faqs} className="lg:col-span-8" />
        </Container>
      </Section>

      <CtaBand secondary={{ href: "/dedicated-talent", label: "Dedicated Talent" }} />
    </>
  );
}
