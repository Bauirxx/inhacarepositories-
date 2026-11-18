/** Gera um slug URL-safe a partir de texto com acentos. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Slug único com sufixo aleatório curto (evita colisões sem consultar a BD). */
export function uniqueSlug(text: string): string {
  const base = slugify(text) || "item";
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

/**
 * Normaliza um número de telefone moçambicano para formato internacional (sem "+").
 * Aceita "84 123 4567", "+258841234567", "258841234567".
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("258")) return digits;
  if (digits.length === 9 && /^8[2-7]/.test(digits)) return `258${digits}`;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const url = new URL(`https://wa.me/${normalized}`);
  if (text) url.searchParams.set("text", text);
  return url.toString();
}

export function telLink(phone: string | null | undefined): string | null {
  const normalized = normalizePhone(phone);
  return normalized ? `tel:+${normalized}` : null;
}

export function formatPhoneDisplay(phone: string | null | undefined): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return "";
  if (normalized.startsWith("258") && normalized.length === 12) {
    const local = normalized.slice(3);
    return `+258 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return `+${normalized}`;
}

/** Garante que um URL externo é http(s) (evita javascript: e data:). */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Garante que um caminho "next" de redirecionamento é interno. */
export function safeInternalPath(path: string | null | undefined, fallback = "/"): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) return fallback;
  return path;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
