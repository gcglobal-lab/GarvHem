import {
  Banknote,
  CalendarCheck,
  FileText,
  Laptop,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SavingsCalculator } from "@/components/marketing/calculator/SavingsCalculator";
import { ComparisonTable } from "@/components/marketing/ComparisonTable";
import { CtaBand } from "@/components/marketing/CtaBand";
import { DailyReportMock } from "@/components/marketing/DailyReportMock";
import { Faq } from "@/components/marketing/Faq";
import { Timeline } from "@/components/marketing/home/Timeline";
import { Container, H2, Lead, Section, SplitHeading } from "@/components/marketing/layout-parts";
import { PageHeader } from "@/components/marketing/PageHeader";
import { QuoteLink } from "@/components/marketing/quote/QuoteLink";
import { absolute, JsonLd, ORGANIZATION_ID, pageMeta } from "@/components/marketing/seo";
import { Slashes } from "@/components/marketing/Slashes";
import { TimezoneBand } from "@/components/marketing/TimezoneBand";
import { Button } from "@/components/ui/button";
import { faqs } from "@/config/faq";
import { flagship } from "@/config/services";

export const metadata: Metadata = pageMeta({
  title: "Dedicated Talent: offshore staff from India",
  description:
    "For the cost of one local hire, get 3 to 4 dedicated professionals in India. Compare costs with the savings calculator for the USA and Canada.",
  path: "/dedicated-talent",
});

const HANDLED = [
  {
    icon: SearchCheck,
    title: "Recruiting and vetting",
    text: "We search to your brief, test skills and English, check references and interview.",
  },
  {
    icon: Users,
    title: "HR",
    text: "Contracts, leave, performance follow-up and everything an employer must do in India.",
  },
  {
    icon: Banknote,
    title: "Payroll",
    text: "Salaries, statutory contributions and benefits. You receive one monthly invoice.",
  },
  {
    icon: Laptop,
    title: "Equipment",
    text: "Managed laptop, internet, workspace and the software access the role needs.",
  },
  {
    icon: CalendarCheck,
    title: "Attendance",
    text: "Working hours are recorded every day, with leave planned and covered.",
  },
  {
    icon: FileText,
    title: "Daily reporting",
    text: "Work done, time spent, blockers and the plan for the next day, in writing.",
  },
];

const ROLES: { group: string; roles: string[] }[] = [
  {
    group: "Engineering",
    roles: [
      "Front-end developer",
      "Back-end developer",
      "Full-stack developer",
      "Mobile developer",
      "QA tester",
      "WordPress and Shopify developer",
    ],
  },
  {
    group: "Cloud and IT",
    roles: [
      "Cloud engineer",
      "DevOps engineer",
      "System administrator",
      "IT support specialist",
      "Network administrator",
    ],
  },
  {
    group: "Finance",
    roles: [
      "Bookkeeper",
      "Staff accountant",
      "AP and AR specialist",
      "Payroll assistant",
      "Financial analyst",
    ],
  },
  {
    group: "Operations",
    roles: [
      "Virtual assistant",
      "Data entry specialist",
      "Back-office executive",
      "Customer support",
      "Project coordinator",
    ],
  },
];

export default function DedicatedTalentPage() {
  return (
    <>
      <PageHeader
        title="For the cost of one local hire, build a team of three or four"
        intro="Skilled, English-fluent professionals in India, hired to your exact requirements and working only for you. GARVHEM is the employer. You are the boss."
        crumbs={[{ name: "Dedicated Talent", path: "/dedicated-talent" }]}
        actions={
          <>
            <Button asChild variant="brand" size="lg">
              <QuoteLink service="Dedicated Talent">Hire your first professional</QuoteLink>
            </Button>
            <Button asChild variant="glass" size="lg">
              <a href="#calculator">Calculate savings</a>
            </Button>
          </>
        }
      />

      <Section id="calculator" tone="canvas">
        <Container>
          <SplitHeading title="What would it cost you?" className="mb-10">
            Choose a role, where you hire today and how many people you need.
          </SplitHeading>
          <SavingsCalculator variant="full" />
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28" data-reveal>
              <H2>You direct the work. We carry the rest.</H2>
              <Lead className="mt-5">
                The person joins your meetings, your chat and your tools. Everything an employer has to do
                stays with us.
              </Lead>
            </div>
          </div>
          <dl className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:col-span-8">
            {HANDLED.map(({ icon: Icon, title, text }, i) => (
              <div key={title} data-reveal={String(i % 2)}>
                <dt className="font-display text-lg font-semibold tracking-tight">
                  <Icon className="mb-4 size-7 text-brand" strokeWidth={1.6} aria-hidden />
                  {title}
                </dt>
                <dd className="mt-2 leading-relaxed text-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      <Section tone="canvas">
        <Container>
          <SplitHeading title="Local hire and GARVHEM, side by side" className="mb-12" />
          <div data-reveal>
            <ComparisonTable />
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SplitHeading title="They work while you work" className="mb-12">
            India is on the other side of the clock, so we plan shifts around your day. Pick one to see the
            overlap.
          </SplitHeading>
          <div data-reveal="1">
            <TimezoneBand />
          </div>
        </Container>
      </Section>

      <Section tone="ink">
        <Slashes variant="quiet" />
        <Container className="relative">
          <SplitHeading title="Five steps to your first working day" className="mb-14 lg:mb-20">
            You meet every finalist before you decide.
          </SplitHeading>
          <Timeline />
        </Container>
      </Section>

      <Section>
        <Container className="grid items-center gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5" data-reveal>
            <DailyReportMock />
          </div>
          <div className="lg:col-span-7" data-reveal="1">
            <H2>Trust, in writing</H2>
            <dl className="mt-10 space-y-8">
              <Pledge icon={ShieldCheck} title="NDA and data security">
                You sign an NDA with us, and each professional signs confidentiality terms. Work happens on
                managed devices, inside your accounts, with access you can remove at any time. Intellectual
                property is yours.
              </Pledge>
              <Pledge icon={CalendarCheck} title="No long-term lock-in">
                After a short initial period, agreements run month to month. Grow the team, reduce it or stop,
                with notice.
              </Pledge>
              <Pledge icon={RefreshCw} title="Replacement guarantee">
                If someone is not the right fit, we find a replacement with no new recruiting fee, and handle
                the handover.
              </Pledge>
              <Pledge icon={FileText} title="Daily task reports">
                The report is written by the person who did the work and checked by their GARVHEM manager.
              </Pledge>
            </dl>
          </div>
        </Container>
      </Section>

      <Section tone="canvas">
        <Container>
          <SplitHeading title="Roles we hire for" className="mb-12">
            If the role is not here, we will tell you honestly whether we can find it.
          </SplitHeading>
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((g, i) => (
              <div key={g.group} data-reveal={String(i)} className="border-t-2 border-foreground pt-5">
                <h3 className="font-display text-lg font-semibold tracking-tight">{g.group}</h3>
                <ul className="mt-4 space-y-2.5 text-muted">
                  {g.roles.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Button asChild variant="primary" size="lg" className="mt-12">
            <QuoteLink service="Dedicated Talent">Ask for a role</QuoteLink>
          </Button>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <H2>Before you decide</H2>
            <p className="mt-5 text-muted">
              Still unsure?{" "}
              <Link
                href="/contact?service=Dedicated%20Talent"
                className="font-medium text-accent underline underline-offset-4"
              >
                Talk to us
              </Link>
              .
            </p>
          </div>
          <Faq items={[...flagship.faqs, ...faqs]} className="lg:col-span-8" />
        </Container>
      </Section>

      <CtaBand
        title="Describe the person you need. We will go and find them."
        text="For most roles we aim to send a first shortlist within 5 to 7 business days."
        service="Dedicated Talent"
      />
      <JsonLd
        data={{
          "@type": "Service",
          name: "Dedicated Offshore Talent",
          serviceType: "Staff augmentation",
          description: flagship.metaDescription,
          url: absolute("/dedicated-talent"),
          provider: { "@type": "Organization", "@id": ORGANIZATION_ID() },
          areaServed: [
            { "@type": "Country", name: "United States" },
            { "@type": "Country", name: "Canada" },
          ],
        }}
      />
    </>
  );
}

function Pledge({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Users;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-13">
      <dt className="font-display text-lg font-semibold tracking-tight">
        <Icon className="absolute top-0.5 left-0 size-6 text-accent" strokeWidth={1.75} aria-hidden />
        {title}
      </dt>
      <dd className="mt-1.5 leading-relaxed text-muted">{children}</dd>
    </div>
  );
}
