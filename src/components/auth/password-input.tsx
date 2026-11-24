"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, ...props }: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

const RULES: [string, (p: string) => boolean][] = [
  ["10+ characters", (p) => p.length >= 10],
  ["Uppercase", (p) => /[A-Z]/.test(p)],
  ["Lowercase", (p) => /[a-z]/.test(p)],
  ["Number", (p) => /\d/.test(p)],
  ["Symbol", (p) => /[^A-Za-z0-9]/.test(p)],
];

export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Password rules">
      {RULES.map(([label, ok]) => {
        const met = ok(value);
        return (
          <li
            key={label}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              met ? "bg-success-soft text-success" : "bg-surface-2 text-muted",
            )}
          >
            <span aria-hidden>{met ? "✓ " : ""}</span>
            {label}
            <span className="sr-only">{met ? " (met)" : " (not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
