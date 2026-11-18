import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "Ver tudo",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs font-bold tracking-widest text-turquoise uppercase">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-extrabold text-ocean sm:text-3xl">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-turquoise hover:underline sm:inline-flex"
        >
          {linkLabel} <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

export function MobileSeeAll({ href, label = "Ver tudo" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mt-4 flex h-11 items-center justify-center gap-1 rounded-xl border bg-card text-sm font-semibold text-turquoise sm:hidden"
    >
      {label} <ArrowRight className="size-4" />
    </Link>
  );
}
