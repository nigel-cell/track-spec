interface BrandLogoProps {
  make: string;
  code?: string | null;
  url?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "filter";
  className?: string;
}

/** Outer box — image scales inside with padding so wide/tall logos aren't clipped */
const BOX: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  xs: "h-5 w-5 p-0.5",
  sm: "h-7 w-7 p-1",
  md: "h-9 w-9 p-1",
  lg: "h-14 w-14 p-1.5",
  filter: "h-11 w-11 p-1.5",
};

export function BrandLogo({ make, code, url, size = "sm", className = "" }: BrandLogoProps) {
  const box = BOX[size];
  const src = url ?? (code ? `/garage/logos/${code}.webp` : null);

  if (!src) {
    return (
      <span
        className={[
          "inline-flex shrink-0 items-center justify-center rounded bg-[var(--ts-border)] text-[10px] font-bold uppercase text-[var(--ts-muted)]",
          box,
          className,
        ].join(" ")}
        title={make}
      >
        {make.slice(0, 2)}
      </span>
    );
  }

  return (
    <span
      className={["inline-flex shrink-0 items-center justify-center overflow-visible", box, className].join(" ")}
      title={make}
    >
      <img
        src={src}
        alt={make}
        className="block max-h-full max-w-full object-contain object-center"
        loading="lazy"
        draggable={false}
      />
    </span>
  );
}
