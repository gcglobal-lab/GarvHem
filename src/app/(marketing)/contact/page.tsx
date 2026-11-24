import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Container, Section } from "@/components/marketing/layout-parts";
import { PageHeader } from "@/components/marketing/PageHeader";
import { LeadForm } from "@/components/marketing/quote/LeadForm";
import { pageMeta } from "@/components/marketing/seo";
import { getService } from "@/config/services";
import { env } from "@/lib/env";
import { LEAD_SERVICES } from "@/lib/validators/leads";
import { getPublicCompany } from "@/server/settings";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description:
    "Tell GARVHEM what you need and get a reply within 24 hours. Free consultation for companies in the USA and Canada.",
  path: "/contact",
});

const NEXT = [
  ["We read it", "A person, not a bot, reads your enquiry and replies within 24 hours."],
  ["We talk", "A 30 minute call in your time zone, if one is useful."],
  ["You get a plan", "Scope, people, timeline and price in writing. No obligation."],
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [query, company, h] = await Promise.all([searchParams, getPublicCompany(), headers()]);
  const raw = typeof query.service === "string" ? query.service.slice(0, 80) : "";
  const service = LEAD_SERVICES.find((s) => s === raw) ?? getService(raw)?.leadService;
  const role = typeof query.role === "string" ? query.role.slice(0, 100) : undefined;
  const details = [
    company.email && { icon: Mail, label: "Email", value: company.email, href: `mailto:${company.email}` },
    company.phone && {
      icon: Phone,
      label: "Phone",
      value: company.phone,
      href: `tel:${company.phone.replace(/[^\d+]/g, "")}`,
    },
    company.address && { icon: MapPin, label: "Based in", value: company.address },
    company.hours && { icon: Clock, label: "Hours", value: company.hours },
  ].filter((d) => typeof d === "object");

  return (
    <>
      <PageHeader
        compact
        title="Tell us what you need"
        intro="A few sentences are enough to start. We reply within 24 hours."
        crumbs={[{ name: "Contact", path: "/contact" }]}
      />
      <Section className="py-12 sm:py-16 lg:py-20">
        <Container className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div id="enquiry" className="scroll-mt-28 lg:col-span-8">
            <h2 className="sr-only">Enquiry form</h2>
            <LeadForm
              key={`${service}-${role}`}
              service={service}
              role={role}
              turnstileSiteKey={env().TURNSTILE_SITE_KEY}
              nonce={h.get("x-nonce") ?? undefined}
            />
          </div>
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <h2 className="text-xl font-semibold tracking-tight">What happens next</h2>
              <ol className="mt-6 space-y-6">
                {NEXT.map(([t, d], i) => (
                  <li key={t} className="grid grid-cols-[2rem_1fr] gap-x-3">
                    <span aria-hidden className="font-display text-xl font-semibold text-brand">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-medium">{t}</span>
                      <span className="mt-1 block text-[15px] leading-relaxed text-muted">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {details.length ? (
                <dl className="mt-10 space-y-5 border-t border-border pt-8">
                  {details.map(({ icon: Icon, label, value, href }) => (
                    <div key={label} className="relative pl-9">
                      <dt className="text-[13px] text-muted">
                        <Icon className="absolute top-0.5 left-0 size-5" strokeWidth={1.75} aria-hidden />
                        {label}
                      </dt>
                      <dd className="mt-0.5 font-medium break-words whitespace-pre-line">
                        {href ? (
                          <a href={href} className="rounded underline-offset-4 hover:underline">
                            {value}
                          </a>
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </aside>
        </Container>
      </Section>
    </>
  );
}
