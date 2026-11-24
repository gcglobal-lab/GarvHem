import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-150 select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-sm hover:opacity-90",
        brand:
          "bg-brand text-brand-foreground shadow-[0_10px_24px_-12px_rgb(217_11_28/0.75)] hover:bg-brand-strong",
        outline: "border border-input bg-surface text-foreground hover:bg-surface-2",
        ghost: "text-foreground hover:bg-surface-2",
        subtle: "bg-surface-2 text-foreground hover:bg-border",
        danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white dark:hover:text-ink",
        success: "bg-success text-white hover:opacity-90 dark:text-ink",
        /** For dark marketing sections */
        glass:
          "border border-white/20 bg-white/8 text-white backdrop-blur hover:border-white/35 hover:bg-white/15",
        link: "h-auto! rounded-sm px-0! text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-3.5",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-[15px] [&_svg]:size-[18px]",
        icon: "size-10 [&_svg]:size-[18px]",
        "icon-sm": "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild,
  loading,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild)
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  return (
    <button
      type={type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
