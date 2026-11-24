import { testimonials } from "@/config/testimonials";
import { H2, Section, Container } from "./layout-parts";

/** Renders nothing until real quotes exist in src/config/testimonials.ts. */
export function Testimonials() {
  if (!testimonials.length) return null;
  return (
    <Section>
      <Container>
        <H2>What clients say</H2>
        <ul className="mt-12 grid gap-10 md:grid-cols-2">
          {testimonials.map((t) => (
            <li key={t.name + t.company}>
              <figure className="border-l-2 border-brand pl-6">
                <blockquote className="text-lg leading-relaxed">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm text-muted">
                  <span className="font-medium text-foreground">{t.name}</span>, {t.role}, {t.company}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
