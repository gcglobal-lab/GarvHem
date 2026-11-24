import {
  Check,
  Cloud,
  Database,
  FileText,
  Globe,
  MonitorCheck,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { media } from "@/config/media";
import type { ServiceSlug } from "@/config/services";
import { cn } from "@/lib/utils";
import { DailyReportMock } from "./DailyReportMock";
import { MediaFrame } from "./MediaFrame";
import { Slashes } from "./Slashes";

/** Drawn product visuals, one per service. A photo in media.services replaces them. */
export function ServiceVisual({ slug }: { slug: ServiceSlug }) {
  return (
    <MediaFrame asset={media.services[slug]} sizes="(min-width: 1024px) 520px, 100vw" className="aspect-4/3">
      {VISUALS[slug]}
    </MediaFrame>
  );
}

function Panel({
  label,
  title,
  meta,
  children,
}: {
  label: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="rounded-3xl border border-white/12 bg-ink-900/85 text-white shadow-lift backdrop-blur">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4.5">
        <p className="font-display text-[15px] font-semibold tracking-tight">{title}</p>
        {meta ? <span className="text-[13px] text-white/65">{meta}</span> : null}
      </div>
      <div className="p-6">{children}</div>
      <figcaption className="border-t border-white/10 px-6 py-3 text-xs text-white/60">{label}</figcaption>
    </figure>
  );
}

const Web = () => (
  <figure className="overflow-hidden rounded-3xl border border-white/12 bg-white text-ink shadow-lift">
    <div className="flex items-center gap-2 border-b border-ink/10 bg-ink/4 px-4 py-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-2.5 rounded-full bg-ink/15" />
      ))}
      <span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-ink/60">
        staging.yourcompany.com
      </span>
    </div>
    <div className="grid grid-cols-[1.2fr_1fr] gap-5 p-6" aria-hidden>
      <div>
        <div className="h-4 w-11/12 rounded bg-ink" />
        <div className="mt-2 h-4 w-3/4 rounded bg-ink" />
        <div className="mt-4 space-y-1.5">
          <div className="h-2 rounded bg-ink/12" />
          <div className="h-2 w-10/12 rounded bg-ink/12" />
          <div className="h-2 w-8/12 rounded bg-ink/12" />
        </div>
        <div className="mt-5 flex gap-2">
          <div className="h-8 w-24 rounded-lg bg-red-600" />
          <div className="h-8 w-20 rounded-lg border border-ink/20" />
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-ink-900">
        <Slashes />
      </div>
    </div>
    <dl className="grid grid-cols-3 border-t border-ink/10 text-center">
      {[
        ["Load (LCP)", "1.4 s"],
        ["Accessibility", "AA"],
        ["Open issues", "2"],
      ].map(([k, v]) => (
        <div key={k} className="flex flex-col-reverse py-4 not-first:border-l not-first:border-ink/10">
          <dt className="text-xs text-ink/65">{k}</dt>
          <dd className="font-display text-xl font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
    <figcaption className="border-t border-ink/10 px-5 py-3 text-xs text-ink/65">
      Illustration: a weekly demo on your staging link.
    </figcaption>
  </figure>
);

const Accounting = () => (
  <Panel title="Bank reconciliation" meta="October" label="Illustration with sample data.">
    <ul className="space-y-3 text-[15px]">
      {[
        ["Operating account", "214 matched", true],
        ["Business card", "96 matched", true],
        ["Payment processor", "31 payouts matched", true],
        ["Line of credit", "1 item to confirm", false],
      ].map(([name, note, ok]) => (
        <li key={String(name)} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full",
              ok ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
            )}
          >
            {ok ? (
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            ) : (
              <span className="text-sm font-bold">1</span>
            )}
          </span>
          <span className="flex-1">{name}</span>
          <span className="text-[13px] text-white/65">{note}</span>
        </li>
      ))}
    </ul>
    <div className="mt-5 flex items-center justify-between rounded-xl border border-white/12 px-4 py-3 text-[15px]">
      <span className="text-white/70">Month-end close</span>
      <span className="font-medium">Business day 5</span>
    </div>
  </Panel>
);

const CloudVisual = () => (
  <Panel title="Production" meta="All checks passing" label="Illustration of a managed environment.">
    <div className="grid grid-cols-3 gap-3 text-center text-[13px]">
      {[
        [Globe, "CDN"],
        [Cloud, "Load balancer"],
        [ShieldCheck, "Firewall"],
        [Server, "App A"],
        [Server, "App B"],
        [Database, "Database"],
      ].map(([Icon, label], i) => {
        const I = Icon as typeof Globe;
        return (
          <div key={i} className="rounded-xl border border-white/12 bg-white/5 px-2 py-4">
            <I className="mx-auto size-5 text-accent" aria-hidden />
            <span className="mt-2 block text-white/85">{String(label)}</span>
          </div>
        );
      })}
    </div>
    <div className="mt-5">
      <div className="flex justify-between text-[13px] text-white/70">
        <span>Monthly spend after right-sizing</span>
        <span>Six months</span>
      </div>
      <div className="mt-3 flex h-20 items-end gap-2" aria-hidden>
        {[96, 92, 78, 66, 61, 58].map((h, i) => (
          <span
            key={i}
            className={cn("flex-1 rounded-t-md", i > 1 ? "bg-accent" : "bg-white/25")}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  </Panel>
);

const Support = () => (
  <Panel title="Help desk" meta="Today" label="Illustration with sample data.">
    <ul className="divide-y divide-white/10 text-[15px]">
      {[
        ["New starter: laptop and accounts", "Done", "success"],
        ["Shared mailbox permissions", "Done", "success"],
        ["Printer offline, front desk", "In progress", "accent"],
        ["312 supplier records to enter", "64%", "accent"],
      ].map(([t, s, tone]) => (
        <li key={t} className="flex items-center gap-3 py-3.5 first:pt-0">
          <MonitorCheck className="size-5 shrink-0 text-white/55" aria-hidden />
          <span className="flex-1">{t}</span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              tone === "success" ? "bg-success-soft text-success" : "bg-accent-soft text-accent",
            )}
          >
            {s}
          </span>
        </li>
      ))}
    </ul>
    <p className="border-t border-white/10 pt-4 text-[13px] text-white/65">
      Each ticket has an owner, a target time and a log.
    </p>
  </Panel>
);

const Consulting = () => (
  <Panel title="Findings, ranked" meta="Impact" label="Illustration of an audit summary.">
    <ul className="space-y-4 text-[15px]">
      {[
        ["No tested backup of the file server", 95],
        ["14 unused software licenses", 70],
        ["Shared admin password", 64],
        ["Manual re-entry of orders", 48],
      ].map(([t, v], i) => (
        <li key={String(t)}>
          <div className="flex justify-between gap-4">
            <span>{t}</span>
            <span className="text-[13px] text-white/65">
              {i === 0 ? "Fix first" : i < 3 ? "This month" : "Plan"}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10">
            <div
              className={cn("h-full rounded-full", i === 0 ? "bg-signal" : "bg-accent")}
              style={{ width: `${v}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  </Panel>
);

const Custom = () => (
  <Panel title="Your brief" label="Illustration of an enquiry and our answer.">
    <p className="rounded-2xl rounded-bl-md bg-white/8 p-4 text-[15px] leading-relaxed">
      We have 1,800 paper drawings to rename, index and upload, and nobody to do it. Can you help?
    </p>
    <div className="mt-4 rounded-2xl rounded-br-md bg-brand p-4 text-[15px] leading-relaxed">
      Yes. Two people, about three weeks, with a 50 drawing trial first so you can check the quality.
    </div>
    <ul className="mt-5 space-y-2.5 text-[13px] text-white/75">
      <li className="flex items-center gap-2.5">
        <FileText className="size-4 text-accent" aria-hidden /> Written scope and price
      </li>
      <li className="flex items-center gap-2.5">
        <Users className="size-4 text-accent" aria-hidden /> Named people, one contact
      </li>
    </ul>
  </Panel>
);

const VISUALS: Record<ServiceSlug, ReactNode> = {
  "dedicated-offshore-talent": <DailyReportMock compact className="border-white/12" />,
  "web-development": <Web />,
  "accounting-bookkeeping": <Accounting />,
  "cloud-services": <CloudVisual />,
  "it-support": <Support />,
  "it-consulting": <Consulting />,
  "custom-requirements": <Custom />,
};
