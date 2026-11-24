import { Contact, Eye, FileText, Lock, Scaling, ScanSearch } from "lucide-react";
import { DailyReportMock } from "../DailyReportMock";
import { H2, Lead } from "../layout-parts";

const FEATURES = [
  {
    icon: Lock,
    title: "Security from day one",
    text: "NDA first, then managed devices, named logins, multi-factor sign-in and the least access needed.",
  },
  {
    icon: Eye,
    title: "Nothing hidden",
    text: "You know who is on your work, what they did and what you pay. No shared or rotating staff.",
  },
  {
    icon: FileText,
    title: "Daily reports",
    text: "Tasks, hours and blockers in your inbox every working day, before your morning starts.",
  },
  {
    icon: ScanSearch,
    title: "Vetting that filters",
    text: "Practical tests, spoken and written English, reference checks and a structured interview.",
  },
  {
    icon: Scaling,
    title: "Flexible scaling",
    text: "Start with one person. Add or reduce with notice, month to month, with no long lock-in.",
  },
  {
    icon: Contact,
    title: "One point of contact",
    text: "A single GARVHEM manager answers for people, performance, invoices and replacements.",
  },
];

export function WhyGarvhem() {
  return (
    <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-7">
        <div data-reveal>
          <H2>You always know what your team did today</H2>
          <Lead className="mt-5 max-w-xl">
            Offshore work fails when it is invisible. Ours is written down, every day, by the person who did
            it.
          </Lead>
        </div>
        <dl className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <div key={title} data-reveal={String(i % 2)} className="border-t border-border pt-5">
              <dt className="flex items-center gap-3 font-display text-[17px] font-semibold tracking-tight">
                <Icon className="size-5 text-accent" strokeWidth={1.9} aria-hidden />
                {title}
              </dt>
              <dd className="mt-2.5 text-[15px] leading-relaxed text-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-28" data-reveal="1">
          <DailyReportMock />
        </div>
      </div>
    </div>
  );
}
