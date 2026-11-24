import type { Metadata } from "next";
import { CtaBand } from "@/components/marketing/CtaBand";
import { FounderNote } from "@/components/marketing/FounderNote";
import { Container, H2, Section, SplitHeading } from "@/components/marketing/layout-parts";
import { PageHeader } from "@/components/marketing/PageHeader";
import { pageMeta } from "@/components/marketing/seo";
import { Slashes } from "@/components/marketing/Slashes";
import { site } from "@/config/site";

export const metadata: Metadata = pageMeta({
  title: "About",
  description:
    "GARVHEM is a technology and business services company based in India, founded by Hemant Singh to give US and Canadian companies reliable teams.",
  path: "/about",
});

const VALUES = [
  {
    title: "Say it straight",
    text: "Real timelines, real prices and a clear no when we are not the right choice.",
  },
  {
    title: "Show the work",
    text: "If it is not written down, it did not happen. Reports, hours and documents are yours to see.",
  },
  {
    title: "Protect what is shared",
    text: "Client data, employee data and ideas are treated as if they were our own.",
  },
  {
    title: "Be good to people",
    text: "Fair pay, reasonable shifts and steady careers keep good professionals on your team.",
  },
  { title: "Finish", text: "A task is done when you can use it, not when we have stopped typing." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="A new company with an old-fashioned idea: do what you said you would do"
        intro="GARVHEM is a technology and business services company based in India. We build dedicated teams and deliver projects for companies in the USA and Canada."
        crumbs={[{ name: "About", path: "/about" }]}
      />

      <Section>
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <H2 className="lg:col-span-5" data-reveal>
            Why GARVHEM exists
          </H2>
          <div
            className="space-y-6 text-[17px] leading-relaxed text-muted sm:text-lg lg:col-span-7"
            data-reveal="1"
          >
            <p>
              Many companies in North America cannot find the people they need at a cost they can carry.
              Offshore work looks like the answer, until a client meets an anonymous team, a vague invoice and
              silence between status calls.
            </p>
            <p>
              India has the people. What is often missing is the part around them: careful hiring, an employer
              who looks after staff, secure systems, and a report every day that shows what was done.
            </p>
            <p className="text-foreground">
              That part is our job. Clients get named professionals they chose themselves, in hours that suit
              them, at a price that is clear from the start.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="ink">
        <Slashes variant="header" />
        <Container className="relative">
          <div className="max-w-4xl" data-reveal>
            <h2 className="text-lg font-medium tracking-normal text-white/70">Our mission</h2>
            <p className="mt-5 font-display text-[clamp(1.8rem,4vw,3.4rem)] leading-[1.14] font-semibold tracking-[-0.03em] text-balance">
              Give every growing company access to a team it can trust, and give skilled people in India work
              worth staying for.
            </p>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SplitHeading title="How we behave" className="mb-12">
            Five habits we hire for, and hold ourselves to.
          </SplitHeading>
          <dl>
            {VALUES.map((v) => (
              <div
                key={v.title}
                data-reveal
                className="grid gap-x-10 gap-y-2 border-t border-border py-8 last:border-b lg:grid-cols-12"
              >
                <dt className="font-display text-2xl font-semibold tracking-tight lg:col-span-5 lg:text-3xl">
                  {v.title}
                </dt>
                <dd className="text-[17px] leading-relaxed text-muted lg:col-span-7">{v.text}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      <Section tone="canvas">
        <Container>
          <h2 className="sr-only">A note from {site.founder}</h2>
          <FounderNote />
        </Container>
      </Section>

      <Section>
        <Container>
          <SplitHeading title="Where we work" className="mb-12" />
          <dl className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-3">
            {[
              ["Our people", "India", "Recruiting, HR, payroll and delivery are run from India."],
              [
                "Our clients",
                "USA and Canada",
                "Shifts, currencies and paperwork are set up for North America.",
              ],
              [
                "Coming later",
                "UK and Australia",
                "Enquiries are welcome now. We will tell you what we can support today.",
              ],
            ].map(([k, v, t]) => (
              <div key={k} className="bg-surface p-8">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="mt-2">
                  <span className="block font-display text-2xl font-semibold tracking-tight">{v}</span>
                  <span className="mt-3 block leading-relaxed text-muted">{t}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      <CtaBand secondary={{ href: "/careers", label: "Work with us" }} />
    </>
  );
}
