import { services } from "@/config/services";
import { Container } from "../layout-parts";

/** Honest numbers only: they describe the offer, not a track record. */
export function StatsStrip() {
  return (
    <section aria-label="GARVHEM in numbers" className="border-b border-border">
      <Container>
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          <Stat label="dedicated professionals for the estimated cost of one local hire">
            <span data-count>3</span>–<span data-count>4</span>
          </Stat>
          <Stat label="or less to get a reply to every enquiry">
            <span data-count>24</span>
            <Unit>h</Unit>
          </Stat>
          <Stat label="services under one agreement and one invoice">
            <span data-count>{services.length}</span>
          </Stat>
          <Stat label="daily report from every dedicated professional, every working day">
            <span data-count>1</span>
          </Stat>
        </dl>
      </Container>
    </section>
  );
}

const Unit = ({ children }: { children: string }) => (
  <span className="ml-0.5 text-[0.6em] text-brand">{children}</span>
);

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col-reverse justify-end gap-2 py-9 pr-6 not-first:pl-7 max-lg:odd:pl-0 sm:py-12 lg:not-first:pl-10 lg:not-first:before:absolute lg:not-first:before:top-9 lg:not-first:before:bottom-9 lg:not-first:before:left-2 lg:not-first:before:w-px lg:not-first:before:-skew-x-[14deg] lg:not-first:before:bg-border lg:not-first:before:content-[''] max-lg:[&:nth-child(n+3)]:border-t max-lg:[&:nth-child(n+3)]:border-border">
      <dt className="max-w-52 text-sm leading-snug text-muted">{label}</dt>
      <dd className="font-display text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">{children}</dd>
      <span
        aria-hidden
        className="absolute top-9 bottom-9 left-2 w-px -skew-x-[14deg] bg-border max-lg:hidden [div:first-child>&]:hidden"
      />
    </div>
  );
}
