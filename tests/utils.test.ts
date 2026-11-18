import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatPhoneDisplay,
  initials,
  islandLocalToIso,
  isoToIslandLocal,
  normalizePhone,
  safeExternalUrl,
  safeInternalPath,
  slugify,
  truncate,
  uniqueSlug,
  whatsappLink,
  formatTime,
} from "@/lib/utils";

describe("slugify", () => {
  it("remove acentos e caracteres especiais", () => {
    expect(slugify("Restaurante Mar & Sol — Inhaca!")).toBe("restaurante-mar-sol-inhaca");
    expect(slugify("Ação Comunitária")).toBe("acao-comunitaria");
  });
  it("gera slugs únicos com sufixo", () => {
    const a = uniqueSlug("Festa da Ilha");
    const b = uniqueSlug("Festa da Ilha");
    expect(a).toMatch(/^festa-da-ilha-[a-z0-9]{1,5}$/);
    expect(a).not.toBe(b);
  });
});

describe("telefones moçambicanos", () => {
  it("normaliza números locais e internacionais", () => {
    expect(normalizePhone("84 123 4567")).toBe("258841234567");
    expect(normalizePhone("+258 84 123 4567")).toBe("258841234567");
    expect(normalizePhone("00258841234567")).toBe("258841234567");
    expect(normalizePhone("")).toBeNull();
  });
  it("gera ligações de WhatsApp e formato de apresentação", () => {
    expect(whatsappLink("84 123 4567", "Olá")).toBe("https://wa.me/258841234567?text=Ol%C3%A1");
    expect(formatPhoneDisplay("841234567")).toBe("+258 84 123 4567");
  });
});

describe("segurança de URLs", () => {
  it("só aceita http(s) em ligações externas", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,x")).toBeNull();
    expect(safeExternalUrl("exemplo.co.mz")).toBe("https://exemplo.co.mz/");
    expect(safeExternalUrl("https://inhaca.org/a")).toBe("https://inhaca.org/a");
  });
  it("impede redirecionamentos abertos", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("//evil.com")).toBe("/");
    expect(safeInternalPath("https://evil.com")).toBe("/");
    expect(safeInternalPath("/x?u=https://evil.com")).toBe("/");
    expect(safeInternalPath(null, "/feed")).toBe("/feed");
  });
});

describe("fuso horário da ilha (UTC+2)", () => {
  it("converte hora local da ilha para UTC e de volta", () => {
    expect(islandLocalToIso("2026-12-24T20:00")).toBe("2026-12-24T18:00:00.000Z");
    expect(isoToIslandLocal("2026-12-24T18:00:00.000Z")).toBe("2026-12-24T20:00");
  });
  it("formata horas na hora da ilha", () => {
    expect(formatTime("2026-12-24T18:00:00.000Z")).toBe("20:00");
  });
});

describe("formatação", () => {
  it("formata preços e iniciais", () => {
    expect(formatMoney(null)).toBe("Sob consulta");
    expect(formatMoney(1500)).toContain("1");
    expect(initials("Maria da Graça Machel")).toBe("MM");
    expect(initials("Inhaca")).toBe("IN");
  });
  it("trunca texto sem cortar palavras", () => {
    expect(truncate("uma frase bastante longa para cortar", 12)).toBe("uma frase…");
  });
});
