"use client";

import { domAnimation, LazyMotion, m, useReducedMotion } from "framer-motion";
import { Check, FileText, Paperclip, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch, type FieldPath, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import type { LeadServiceName } from "@/config/services";
import { cn, formatBytes } from "@/lib/utils";
import { BUDGETS, COUNTRIES, HEARD_FROM, LEAD_SERVICES } from "@/lib/validators/lead-options";
import type { LeadData, LeadInput } from "@/lib/validators/leads";
import { DIAL_BY_COUNTRY, DIAL_CODES } from "./dial-codes";
import { Turnstile, type TurnstileHandle } from "./Turnstile";

const MAX_FILE = 10 * 1024 * 1024;
const FILE_TYPES = ["pdf", "docx", "png", "jpg", "jpeg", "webp", "gif"];
const ACCEPT = FILE_TYPES.map((t) => `.${t}`).join(",");

type ApiResult =
  { ok: true } | { ok: false; error: string; code: string; fieldErrors?: Record<string, string> };
const FIELD_NAMES: FieldPath<LeadInput>[] = [
  "fullName",
  "email",
  "company",
  "country",
  "phone",
  "services",
  "rolesNeeded",
  "headcount",
  "budgetRange",
  "startDate",
  "requirement",
  "heardFrom",
  "consent",
];

// The validation library is fetched when somebody starts filling in the form, not with the page.
let validation: Promise<Resolver<LeadInput, unknown, LeadData>> | undefined;
const loadValidation = () =>
  (validation ??= Promise.all([import("@hookform/resolvers/zod"), import("@/lib/validators/leads")])
    .then(([{ zodResolver }, { leadSchema }]) => zodResolver(leadSchema))
    .catch((error: unknown) => {
      validation = undefined; // try again on the next interaction
      throw error;
    }));
const lazyResolver: Resolver<LeadInput, unknown, LeadData> = async (...args) =>
  (await loadValidation())(...args);

export type LeadFormProps = {
  service?: LeadServiceName;
  role?: string;
  turnstileSiteKey?: string;
  nonce?: string;
  /** Set in the dialog: shows a close button on the success screen. */
  onDone?: () => void;
};

export function LeadForm({ service, role, turnstileSiteKey, nonce, onDone }: LeadFormProps) {
  const pathname = usePathname();
  const started = useRef(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const [dial, setDial] = useState("+1");
  const [dialTouched, setDialTouched] = useState(false);
  const [number, setNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [failure, setFailure] = useState<string>();
  const [sentTo, setSentTo] = useState<{ name: string; email: string }>();

  useEffect(() => {
    started.current = performance.now();
  }, []);

  const form = useForm<LeadInput, unknown, LeadData>({
    resolver: lazyResolver,
    defaultValues: {
      fullName: "",
      email: "",
      company: "",
      phone: "",
      services: service ? [service] : [],
      rolesNeeded: role ?? "",
      headcount: "",
      budgetRange: "",
      startDate: "",
      requirement: "",
      heardFrom: "",
      sourcePage: pathname,
    },
  });
  const { register, control, handleSubmit, setValue, setError, formState } = form;
  const errors = formState.errors;
  const services = useWatch({ control, name: "services" });
  const requirement = useWatch({ control, name: "requirement" });
  const wantsTalent = services?.includes("Dedicated Talent") ?? false;
  const left = 20 - (requirement ?? "").trim().length;

  function updatePhone(code: string, value: string) {
    const digits = value.trim();
    setValue("phone", digits ? `${code} ${digits}` : "", { shouldValidate: formState.isSubmitted });
  }

  function pickFile(next: File | undefined) {
    setFileError(undefined);
    if (!next) return;
    const ext = next.name.toLowerCase().split(".").pop() ?? "";
    if (!FILE_TYPES.includes(ext)) setFileError("Use a PDF, DOCX or image file.");
    else if (next.size > MAX_FILE) setFileError("Maximum size is 10 MB.");
    else return setFile(next);
    clearFile();
  }
  function clearFile() {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit(data: LeadData) {
    setFailure(undefined);
    const body = new FormData();
    const talent = data.services.includes("Dedicated Talent");
    body.set(
      "data",
      JSON.stringify({
        ...data,
        rolesNeeded: talent ? data.rolesNeeded : null,
        headcount: talent ? data.headcount : null,
        sourcePage: pathname,
      }),
    );
    body.set("website", honeypot.current?.value ?? "");
    body.set("elapsed", String(Math.round(performance.now() - started.current)));
    const token = turnstile.current?.token();
    if (token) body.set("turnstile", token);
    if (file) body.set("attachment", file);

    let result: ApiResult;
    try {
      const res = await fetch("/api/leads", { method: "POST", body });
      result = (await res.json()) as ApiResult;
    } catch {
      result = {
        ok: false,
        code: "NETWORK",
        error: "We could not reach the server. Check your connection and try again.",
      };
    }
    if (result.ok) {
      setSentTo({ name: data.fullName.split(/\s+/)[0] ?? data.fullName, email: data.email });
      return;
    }
    turnstile.current?.reset();
    let focused = false;
    for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
      if (key === "attachment") setFileError(message);
      const name = FIELD_NAMES.find((n) => n === key.split(".")[0]);
      if (name) {
        setError(name, { type: "server", message }, { shouldFocus: !focused });
        focused = true;
      }
    }
    setFailure(result.error);
  }

  if (sentTo) return <Success name={sentTo.name} email={sentTo.email} onDone={onDone} />;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(submit)}
      onFocus={() => void loadValidation().catch(() => undefined)}
      className="relative space-y-5"
      aria-label="Enquiry"
    >
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" required error={errors.fullName?.message}>
          <Input {...register("fullName")} autoComplete="name" required className="h-11" />
        </Field>
        <Field label="Work email" required error={errors.email?.message}>
          <Input
            {...register("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            className="h-11"
          />
        </Field>
        <Field label="Company" error={errors.company?.message}>
          <Input {...register("company")} autoComplete="organization" className="h-11" />
        </Field>
        <Field label="Country" required error={errors.country?.message}>
          <Select
            className="[&_select]:h-11"
            required
            defaultValue=""
            {...register("country", {
              onChange: (e: { target: { value: string } }) => {
                const next = DIAL_BY_COUNTRY[e.target.value];
                if (next && !dialTouched) {
                  setDial(next);
                  updatePhone(next, number);
                }
              },
            })}
          >
            <option value="" disabled>
              Choose
            </option>
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Phone" hint="Optional" error={errors.phone?.message} className="sm:col-span-2">
          <div className="grid grid-cols-[8.5rem_1fr] gap-2">
            <Select
              id="lead-dial"
              aria-label="Dialling code"
              autoComplete="tel-country-code"
              className="[&_select]:h-11"
              value={dial}
              onChange={(e) => {
                setDial(e.target.value);
                setDialTouched(true);
                updatePhone(e.target.value, number);
              }}
            >
              {DIAL_CODES.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} {d.label}
                </option>
              ))}
            </Select>
            <Input
              type="tel"
              autoComplete="tel-national"
              inputMode="tel"
              className="h-11"
              value={number}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d ()-]/g, "").slice(0, 16);
                setNumber(value);
                updatePhone(dial, value);
              }}
            />
          </div>
        </Field>
      </div>

      <fieldset>
        <legend className="text-[13px] font-medium">
          What do you need?
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEAD_SERVICES.map((s) => (
            <label
              key={s}
              className="group inline-flex cursor-pointer items-center gap-2 rounded-full border border-input bg-surface px-3.5 py-2 text-[13px] font-medium transition-colors select-none hover:border-muted/60 has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
            >
              <input
                type="checkbox"
                value={s}
                className="sr-only"
                aria-describedby={errors.services ? "lead-services-error" : undefined}
                {...register("services")}
              />
              <Check className="hidden size-3.5 group-has-checked:block" strokeWidth={3} aria-hidden />
              {s}
            </label>
          ))}
        </div>
        {errors.services ? (
          <p id="lead-services-error" role="alert" className="mt-2 text-xs font-medium text-danger">
            {errors.services.message}
          </p>
        ) : null}
      </fieldset>

      {wantsTalent ? (
        <div className="grid animate-fade-in gap-5 rounded-2xl border border-border bg-surface-2/60 p-4 sm:grid-cols-[1fr_9rem]">
          <Field
            label="Role(s) needed"
            hint="For example: bookkeeper, React developer"
            error={errors.rolesNeeded?.message}
          >
            <Input {...register("rolesNeeded")} className="h-11" />
          </Field>
          <Field label="How many people" error={errors.headcount?.message}>
            <Input
              {...register("headcount")}
              type="number"
              min={1}
              max={500}
              inputMode="numeric"
              className="h-11"
            />
          </Field>
        </div>
      ) : null}

      <Field
        label="Detailed requirement"
        required
        error={errors.requirement?.message}
        hint={
          left > 0
            ? `Goals, tools, hours, deadlines. At least ${left} more characters.`
            : "Goals, tools, hours, deadlines."
        }
      >
        <Textarea {...register("requirement")} rows={5} maxLength={5000} required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Budget" error={errors.budgetRange?.message}>
          <Select {...register("budgetRange")} className="[&_select]:h-11">
            <option value="">Choose</option>
            {BUDGETS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </Field>
        <Field label="Preferred start" error={errors.startDate?.message}>
          <Input {...register("startDate")} type="date" className="h-11" />
        </Field>
        <Field label="How did you hear about us?" error={errors.heardFrom?.message}>
          <Select {...register("heardFrom")} className="[&_select]:h-11">
            <option value="">Choose</option>
            {HEARD_FROM.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <input
          ref={fileInput}
          id="lead-file"
          type="file"
          accept={ACCEPT}
          className="peer sr-only"
          aria-describedby="lead-file-note"
          aria-invalid={fileError ? true : undefined}
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring">
          <label
            htmlFor="lead-file"
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input px-4 text-[13px] font-medium hover:bg-surface-2"
          >
            <Paperclip className="size-4 text-muted" aria-hidden />
            Attach a file
          </label>
          {file ? (
            <span className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-xl bg-surface-2 py-1 pr-1 pl-3 text-[13px]">
              <FileText className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-muted">{formatBytes(file.size)}</span>
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${file.name}`} onClick={clearFile}>
                <X aria-hidden />
              </Button>
            </span>
          ) : null}
          <span
            id="lead-file-note"
            role={fileError ? "alert" : undefined}
            className={cn("text-xs", fileError ? "font-medium text-danger" : "text-muted")}
          >
            {fileError ?? (file ? "" : "Optional. PDF, DOCX or image, up to 10 MB.")}
          </span>
        </div>
      </div>

      <div>
        <Controller
          control={control}
          name="consent"
          render={({ field }) => (
            <CheckboxField
              ref={field.ref}
              checked={field.value === true}
              onCheckedChange={(v) => field.onChange(v === true ? true : undefined)}
              onBlur={field.onBlur}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? "lead-consent-error" : undefined}
              label={
                <>
                  I agree that GARVHEM may use these details to reply to my enquiry, as described in the{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="font-medium text-accent underline underline-offset-2"
                  >
                    privacy policy
                  </Link>
                  .
                </>
              }
            />
          )}
        />
        {errors.consent ? (
          <p id="lead-consent-error" role="alert" className="mt-1.5 ml-7 text-xs font-medium text-danger">
            {errors.consent.message}
          </p>
        ) : null}
      </div>

      {turnstileSiteKey ? <Turnstile ref={turnstile} siteKey={turnstileSiteKey} nonce={nonce} /> : null}

      {failure ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {failure}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button
          type="submit"
          variant="brand"
          size="lg"
          loading={formState.isSubmitting}
          className="w-full sm:w-auto"
        >
          Send enquiry
        </Button>
        <p className="text-[13px] text-muted">No obligation. No mailing lists.</p>
      </div>
    </form>
  );
}

function Success({ name, email, onDone }: { name: string; email: string; onDone?: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const draw = (delay: number, duration: number) =>
    reduced
      ? {}
      : {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { delay, duration, ease: "easeOut" as const },
        };
  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex flex-col items-center py-10 text-center" role="status">
        <svg viewBox="0 0 96 96" className="size-24 -rotate-90" fill="none" aria-hidden>
          <circle cx="48" cy="48" r="42" className="stroke-border" strokeWidth="3" />
          <m.circle
            cx="48"
            cy="48"
            r="42"
            className="stroke-brand"
            strokeWidth="3"
            strokeLinecap="round"
            {...draw(0, 0.7)}
          />
          <m.path
            d="M32 50 L44 62 L66 36"
            transform="rotate(90 48 48)"
            className="stroke-foreground"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...draw(0.45, 0.4)}
          />
        </svg>
        <m.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45 }}
        >
          <h2
            ref={heading}
            tabIndex={-1}
            className="mt-7 text-2xl font-semibold tracking-tight break-words outline-none sm:text-3xl"
          >
            Thank you, {name}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            We&apos;ll get back to you within 24 hours. Our reply goes to{" "}
            <span className="font-medium wrap-anywhere text-foreground">{email}</span>, so please check that
            inbox.
          </p>
          {onDone ? (
            <Button variant="outline" className="mt-7" onClick={onDone}>
              Close
            </Button>
          ) : (
            <Button asChild variant="outline" className="mt-7">
              <Link href="/how-it-works">See what happens next</Link>
            </Button>
          )}
        </m.div>
      </div>
    </LazyMotion>
  );
}
