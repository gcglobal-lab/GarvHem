"use client";

import { Check, ChevronDown } from "lucide-react";
import { Checkbox as CheckboxPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const FieldContext = createContext<{ id: string; describedBy?: string; invalid: boolean } | null>(null);

export const controlClass =
  "w-full rounded-xl border border-input bg-surface px-3.5 text-sm text-foreground shadow-[inset_0_1px_1px_rgb(0_0_0/0.02)] transition-[border-color,box-shadow] placeholder:text-muted/80 hover:border-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-danger/15";

/** Label + control + hint/error, wired for screen readers. Controls inside pick the ids up by themselves. */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <FieldContext.Provider
      value={{ id, describedBy: error || hint ? noteId : undefined, invalid: Boolean(error) }}
    >
      <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
        <label htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        {children}
        {error ? (
          <p id={noteId} className="text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={noteId} className="text-xs text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

function useField() {
  const f = useContext(FieldContext);
  return f ? { id: f.id, "aria-describedby": f.describedBy, "aria-invalid": f.invalid || undefined } : {};
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...useField()} className={cn(controlClass, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      {...useField()}
      className={cn(controlClass, "min-h-24 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

/** Native select: best on phones, and it submits inside plain GET filter forms. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select {...useField()} className={cn(controlClass, "h-10 appearance-none truncate pr-9")} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-[6px] border border-input bg-surface transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function CheckboxField({
  label,
  hint,
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root> & { label: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <Checkbox id={id} className="mt-0.5" {...props} />
      <label htmlFor={id} className="text-sm leading-snug">
        {label}
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </label>
    </div>
  );
}

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full bg-input transition-colors disabled:opacity-60 data-[state=checked]:bg-success",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
    </SwitchPrimitive.Root>
  );
}

export function SwitchField({
  label,
  hint,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root> & { label: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {hint ? <span className="mt-0.5 block text-xs font-normal text-muted">{hint}</span> : null}
      </label>
      <Switch id={id} {...props} />
    </div>
  );
}
