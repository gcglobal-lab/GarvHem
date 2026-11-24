import type { ReactNode } from "react";
import { LEGAL_LAST_UPDATED } from "@/config/navigation";
import { Container, Section } from "./layout-parts";
import { PageHeader } from "./PageHeader";

export type LegalSection = { id: string; title: string; body: ReactNode };

export function LegalPage({
  title,
  intro,
  path,
  sections,
}: {
  title: string;
  intro: string;
  path: string;
  sections: LegalSection[];
}) {
  const updated = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${LEGAL_LAST_UPDATED}T00:00:00Z`),
  );
  return (
    <>
      <PageHeader compact title={title} intro={intro} crumbs={[{ name: title, path }]} />
      <Section className="py-14 sm:py-20 lg:py-24">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <nav aria-label="On this page" className="hidden lg:col-span-4 lg:block">
            <ol className="sticky top-28 space-y-2.5 text-[15px] text-muted">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="rounded hover:text-foreground hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="max-w-2xl lg:col-span-8">
            <p className="text-sm text-muted">
              Last updated <time dateTime={LEGAL_LAST_UPDATED}>{updated}</time>
            </p>
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="mt-10 scroll-mt-28">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{s.title}</h2>
                <div className="mt-4 space-y-4 leading-relaxed text-foreground/85 [&_a]:font-medium [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
