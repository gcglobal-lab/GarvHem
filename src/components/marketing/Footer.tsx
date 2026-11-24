import { Mail, MapPin, Clock, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { companyNav, legalNav, LOGIN_HREF } from "@/config/navigation";
import { services } from "@/config/services";
import { site } from "@/config/site";
import { getPublicCompany } from "@/server/settings";
import { Container } from "./layout-parts";
import { SOCIAL_ICONS } from "./social-icons";

const linkClass = "rounded text-white/70 transition-colors hover:text-white";

export async function Footer() {
  const company = await getPublicCompany();
  const social = (["linkedin", "x", "instagram", "facebook"] as const).filter((k) => company[k]);
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: company.timezone }).format(
    new Date(),
  );

  return (
    <footer className="dark bg-ink-950 text-white">
      <Container className="grid gap-12 border-t border-white/10 pt-16 pb-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
        <div className="sm:col-span-2 lg:col-span-4">
          <Link href="/" aria-label="GARVHEM home" className="inline-block rounded-lg">
            <Logo tone="chrome" markClassName="h-11" wordClassName="h-4" />
          </Link>
          <p className="mt-6 max-w-xs leading-relaxed text-white/70">
            {site.tagline} Technology and business services for companies in the USA and Canada.
          </p>
          {social.length ? (
            <ul className="mt-6 flex gap-2">
              {social.map((k) => {
                const { label, path } = SOCIAL_ICONS[k];
                return (
                  <li key={k}>
                    <a
                      href={company[k]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} (opens in a new tab)`}
                      className="grid size-10 place-items-center rounded-xl border border-white/15 text-white/80 transition-colors hover:border-white/40 hover:text-white"
                    >
                      <svg viewBox="0 0 24 24" className="size-4.5" fill="currentColor" aria-hidden>
                        <path d={path} />
                      </svg>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <nav aria-label="Footer services" className="lg:col-span-3">
          <h2 className="text-sm font-semibold tracking-normal">Services</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className={linkClass}>
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer pages" className="lg:col-span-2">
          <h2 className="text-sm font-semibold tracking-normal">Company</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {companyNav.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className={linkClass}>
                  {i.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={LOGIN_HREF} prefetch={false} className={linkClass}>
                Employee Login
              </Link>
            </li>
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <h2 className="text-sm font-semibold tracking-normal">Contact</h2>
          <ul className="mt-5 space-y-3.5 text-sm text-white/70">
            {company.email ? (
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-white/50" aria-hidden />
                <a href={`mailto:${company.email}`} className={`${linkClass} break-all`}>
                  {company.email}
                </a>
              </li>
            ) : null}
            {company.phone ? (
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-white/50" aria-hidden />
                <a href={`tel:${company.phone.replace(/[^\d+]/g, "")}`} className={linkClass}>
                  {company.phone}
                </a>
              </li>
            ) : null}
            {company.address ? (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-white/50" aria-hidden />
                <span className="whitespace-pre-line">{company.address}</span>
              </li>
            ) : null}
            {company.hours ? (
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-white/50" aria-hidden />
                <span>{company.hours}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </Container>
      <Container className="flex flex-col gap-4 border-t border-white/10 py-7 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {site.name}. All rights reserved.
        </p>
        <ul className="flex gap-6">
          {legalNav.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className={linkClass}>
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  );
}
