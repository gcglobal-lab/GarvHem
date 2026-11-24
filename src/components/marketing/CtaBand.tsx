import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { LeadServiceName } from "@/config/services";
import { Container } from "./layout-parts";
import { QuoteLink } from "./quote/QuoteLink";
import { Slashes } from "./Slashes";

export function CtaBand({
  title = "Tell us what you need. You will hear back within 24 hours.",
  text = "A short brief is enough. We reply with honest next steps, a realistic timeline and a written quote.",
  service,
  secondary = { href: "/how-it-works", label: "How it works" },
}: {
  title?: ReactNode;
  text?: string;
  service?: LeadServiceName;
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="dark relative overflow-hidden bg-ink-950 text-white">
      <Slashes variant="band" />
      <Container className="relative py-24 sm:py-32 lg:py-40">
        <div className="max-w-3xl" data-reveal>
          <h2 className="text-[clamp(2.1rem,4.6vw,4rem)] leading-[1.06] font-semibold tracking-[-0.035em]">
            {title}
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">{text}</p>
          <div className="mt-10 flex flex-col gap-3 min-[480px]:flex-row">
            <Button asChild variant="brand" size="lg" className="h-13 px-7">
              <QuoteLink service={service}>
                Get a Free Consultation
                <ArrowRight aria-hidden />
              </QuoteLink>
            </Button>
            <Button asChild variant="glass" size="lg" className="h-13 px-7">
              <Link href={secondary.href}>{secondary.label}</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
