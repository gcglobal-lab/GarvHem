import { Calculator, Clock, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "../layout-parts";
import { QuoteLink } from "../quote/QuoteLink";
import { HeroVideo } from "./HeroVideo";
import styles from "./hero.module.css";

const BADGES = [
  { icon: ShieldCheck, label: "NDA-protected" },
  { icon: Clock, label: "US/Canada time-zone overlap" },
  { icon: UserCheck, label: "Dedicated professionals" },
];

export function Hero() {
  return (
    <section className="dark relative isolate flex min-h-[min(100svh,64rem)] flex-col overflow-hidden bg-ink-950 text-white">
      <HeroVideo />
      <Container className="relative flex flex-1 flex-col justify-center pt-32 pb-10 sm:pt-36">
        <h1
          className={`${styles.rise} text-[clamp(2.55rem,5.7vw,5.25rem)] leading-[1.02] font-semibold tracking-[-0.04em]`}
        >
          <span className="sm:block">Your Global Team.</span>{" "}
          <span className="sm:block">Built in India.</span>{" "}
          <span className="sm:block">Delivered to the World.</span>
        </h1>
        <p className={`${styles.rise2} mt-7 max-w-xl text-[17px] leading-relaxed text-white/85 sm:text-xl`}>
          Dedicated professionals, web development, accounting, cloud and IT support for companies in the USA
          and Canada. Cut costs by up to an estimated 60–70% compared with hiring locally.
        </p>
        <div className={`${styles.rise2} mt-9 flex flex-col gap-3 min-[480px]:flex-row`}>
          <Button asChild variant="brand" size="lg" className="h-13 px-7">
            <QuoteLink>Get a Quote</QuoteLink>
          </Button>
          <Button asChild variant="glass" size="lg" className="h-13 px-7">
            <Link href="/dedicated-talent#calculator">
              <Calculator aria-hidden />
              Calculate Savings
            </Link>
          </Button>
        </div>
      </Container>
      <Container className="relative pb-8 sm:pb-10">
        <ul className="flex flex-wrap gap-x-8 gap-y-3 pr-14 text-sm text-white/85">
          {BADGES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2.5">
              <Icon className="size-[18px] text-white/70" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
