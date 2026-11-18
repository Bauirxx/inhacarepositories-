import Link from "next/link";
import { cn } from "@/lib/utils";

/** Símbolo: ilha estilizada sobre ondas, com um ponto de ligação (comunidade). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn("size-9", className)}>
      <rect width="48" height="48" rx="14" fill="#153E42" />
      <path d="M10 27c4-9 10-13 15-13 6 0 10 4 13 9-4-2-8-2-11 0-4 2-9 4-17 4z" fill="#E6B96A" />
      <circle cx="31" cy="15.5" r="3" fill="#F5F7F4" />
      <path d="M8 32c3 0 4.5-2 8-2s5 2 8 2 4.5-2 8-2 5 2 8 2" stroke="#20A6A0" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M12 37.5c2.5 0 3.8-1.6 6.5-1.6s4 1.6 6.5 1.6 3.8-1.6 6.5-1.6 4 1.6 5.5 1.6" stroke="#20A6A0" strokeOpacity=".6" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="INHACA CONNECT — início">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={cn("text-[15px] font-extrabold tracking-tight", light ? "text-white" : "text-ocean")}>
          INHACA
        </span>
        <span className={cn("text-[10px] font-bold tracking-[0.28em]", light ? "text-sand" : "text-turquoise")}>
          CONNECT
        </span>
      </span>
    </Link>
  );
}
