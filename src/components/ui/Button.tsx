import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "cta";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  children: ReactNode;
}

const variantClass: Record<Variant, string> = {
  cta: "bg-[var(--ts-cta-bg)] text-[var(--ts-cta-text)] border border-[var(--ts-cta-border)] shadow-[var(--ts-glow)] font-semibold tracking-[0.03em]",
  primary:
    "bg-[var(--ts-accent-soft)] border border-[var(--ts-accent-border)] text-[var(--ts-accent)]",
  secondary: "bg-[var(--ts-card)] border border-[var(--ts-border)] text-[var(--ts-text)]",
  ghost: "bg-transparent border border-transparent text-[var(--ts-muted)]",
  outline: "bg-transparent border border-[var(--ts-border)] text-[var(--ts-text)]",
};

export function Button({
  variant = "secondary",
  full,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--ts-button-radius)] px-4 py-3",
        "font-[family-name:var(--ts-font-heading)] text-sm tracking-[var(--ts-heading-tracking)]",
        "transition-all duration-200 active:scale-[0.98] disabled:opacity-40",
        variantClass[variant],
        full ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
