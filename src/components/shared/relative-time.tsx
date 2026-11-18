"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatRelative } from "@/lib/utils";

/**
 * Mostra uma data relativa ("há 5 min") e atualiza periodicamente.
 * Renderiza a data absoluta no servidor para evitar divergências de hidratação.
 */
export function RelativeTime({ value, className }: { value: string; className?: string }) {
  const [label, setLabel] = useState<string>(() => formatDateTime(value));

  useEffect(() => {
    const update = () => setLabel(formatRelative(value));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [value]);

  return (
    <time dateTime={value} title={formatDateTime(value)} className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
