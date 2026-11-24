import { ArrowUpRight, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container, H2, Lead, Section, SlashMark } from "@/components/marketing/layout-parts";
import { PageHeader } from "@/components/marketing/PageHeader";
import { pageMeta } from "@/components/marketing/seo";
import { Button } from "@/components/ui/button";
import { positions } from "@/config/careers";
import { getPublicCompany } from "@/server/settings";

export const metadata: Metadata = pageMeta({
  title: "Careers",
  description:
    "Work from India with clients in the USA and Canada. See the roles GARVHEM hires for and send your CV.",
  path: "/careers",
});

const OFFER = [
  ["One client, one team", "You work with the same people long enough to do your best work."],
  ["A real employer", "Written contract, on-time salary, paid leave and statutory benefits."],
  ["Shifts you agree to", "Afternoon and evening hours are stated in the offer, not sprung on you."],
  ["Room to grow", "Direct exposure to international clients, tools and standards."],
];

export default async function CareersPage() {
  const company = await getPublicCompany();
  const email = company.careersEmail || company.email;
  const mail = (subject: string) =>
    `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      "Hello GARVHEM team,\n\nMy name:\nCity:\nYears of experience:\nNotice period:\n\nMy CV is attached.\n",
    )}`;

  return (
    <>
      <PageHeader
        title="Build your career in India, with clients across the world"
        intro="We hire people who are careful, curious and clear in writing. If that sounds like you, send your CV."
        crumbs={[{ name: "Careers", path: "/careers" }]}
        actions={
          <Button asChild variant="brand" size="lg">
            {email ? (
              <a href={mail("General application")}>
                <Mail aria-hidden />
                Send your CV
              </a>
            ) : (
              <Link href="/contact">Contact us</Link>
            )}
          </Button>
        }
      />

      <Section>
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28" data-reveal>
              <H2>Roles we hire for</H2>
              <Lead className="mt-5">
                We shortlist from these applications whenever a client role opens, and keep your CV on file
                only with your permission.
              </Lead>
            </div>
          </div>
          <div className="lg:col-span-8">
            {positions.length ? (
              positions.map((p) => (
                <article
                  key={p.title}
                  data-reveal
                  className="border-t border-border py-9 first:border-t-0 first:pt-0 lg:first:border-t lg:first:pt-9"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
                    <div className="min-w-0 flex-1 basis-80">
                      <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{p.title}</h3>
                      <p className="mt-2 text-sm text-muted">
                        {p.area} · {p.type} · {p.shift}
                      </p>
                      <p className="text-sm text-muted">{p.location}</p>
                    </div>
                    {email ? (
                      <Button asChild variant="outline">
                        <a href={mail(`Application: ${p.title}`)} aria-label={`Apply by email: ${p.title}`}>
                          Apply by email
                          <ArrowUpRight aria-hidden />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-5 max-w-2xl leading-relaxed">{p.summary}</p>
                  <ul className="mt-5 grid gap-x-8 gap-y-2.5 text-[15px] text-muted sm:grid-cols-2">
                    {p.requirements.map((r) => (
                      <li key={r} className="flex gap-3">
                        <SlashMark className="mt-1" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </article>
              ))
            ) : (
              <p className="rounded-3xl bg-canvas p-8 text-lg text-muted">
                No listed roles at the moment. General applications are always welcome.
              </p>
            )}
          </div>
        </Container>
      </Section>

      <Section tone="canvas">
        <Container>
          <H2 data-reveal>What you can expect</H2>
          <dl className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {OFFER.map(([t, d], i) => (
              <div key={t} data-reveal={String(i % 2)} className="border-t-2 border-foreground pt-5">
                <dt className="font-display text-xl font-semibold tracking-tight">{t}</dt>
                <dd className="mt-2 leading-relaxed text-muted">{d}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-14 max-w-2xl text-[15px] leading-relaxed text-muted">
            GARVHEM never asks candidates for money at any stage. If anyone does so in our name, please tell
            us
            {email ? (
              <>
                {" "}
                at{" "}
                <a href={`mailto:${email}`} className="font-medium text-accent underline underline-offset-4">
                  {email}
                </a>
              </>
            ) : null}
            .
          </p>
        </Container>
      </Section>
    </>
  );
}
