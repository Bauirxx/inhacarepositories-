import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validations/auth";
import { businessSchema } from "@/lib/validations/business";
import { postSchema } from "@/lib/validations/post";
import { eventSchema } from "@/lib/validations/event";
import { productSchema } from "@/lib/validations/product";
import { messageSchema, reportSchema } from "@/lib/validations/community";

const uuid = "3f5a2c1e-8b7d-4e6f-9a0b-1c2d3e4f5a6b";

describe("registo", () => {
  const base = {
    full_name: "Ana Mabunda",
    username: "ana_m",
    email: "ana@example.com",
    password: "segura123",
    confirm_password: "segura123",
    is_resident: true,
    accept_terms: true,
  };
  it("aceita dados válidos", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });
  it("rejeita palavras-passe fracas ou diferentes", () => {
    expect(registerSchema.safeParse({ ...base, password: "abcdefgh", confirm_password: "abcdefgh" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, confirm_password: "outra123" }).success).toBe(false);
  });
  it("exige aceitação dos termos e username válido", () => {
    expect(registerSchema.safeParse({ ...base, accept_terms: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, username: "Ana M!" }).success).toBe(false);
  });
});

describe("estabelecimento", () => {
  it("valida coordenadas e categoria", () => {
    const ok = businessSchema.safeParse({ name: "Casa do Mar", category_id: uuid, latitude: -26.0, longitude: 32.92 });
    expect(ok.success).toBe(true);
    expect(businessSchema.safeParse({ name: "X", category_id: uuid }).success).toBe(false);
    expect(businessSchema.safeParse({ name: "Casa", category_id: uuid, latitude: 120 }).success).toBe(false);
  });
  it("limita a galeria a 12 imagens", () => {
    const gallery = Array.from({ length: 13 }, (_, i) => `https://x.supabase.co/img${i}.webp`);
    expect(businessSchema.safeParse({ name: "Casa", category_id: uuid, gallery }).success).toBe(false);
  });
});

describe("publicações", () => {
  it("exige texto ou media", () => {
    expect(postSchema.safeParse({ content: "" }).success).toBe(false);
    expect(postSchema.safeParse({ content: "Olá ilha" }).success).toBe(true);
    expect(postSchema.safeParse({ content: "", media: [{ url: "https://x.supabase.co/a.webp", type: "image" }] }).success).toBe(true);
  });
});

describe("eventos", () => {
  it("rejeita fim antes do início", () => {
    expect(eventSchema.safeParse({ title: "Festa", starts_at: "2026-12-24T20:00", ends_at: "2026-12-24T18:00" }).success).toBe(false);
    expect(eventSchema.safeParse({ title: "Festa", starts_at: "2026-12-24T20:00", ends_at: "2026-12-25T02:00" }).success).toBe(true);
  });
});

describe("produtos", () => {
  it("não aceita preço negativo", () => {
    expect(productSchema.safeParse({ title: "Peixe", category_id: uuid, price: -5 }).success).toBe(false);
    expect(productSchema.safeParse({ title: "Peixe", category_id: uuid, price: 250 }).success).toBe(true);
  });
});

describe("comunidade", () => {
  it("mensagem precisa de conteúdo ou imagem", () => {
    expect(messageSchema.safeParse({ conversation_id: uuid, content: "" }).success).toBe(false);
    expect(messageSchema.safeParse({ conversation_id: uuid, content: "Bom dia" }).success).toBe(true);
    expect(messageSchema.safeParse({ conversation_id: uuid, image_url: `${uuid}/foto.webp` }).success).toBe(true);
  });
  it("denúncia só aceita alvos e motivos conhecidos", () => {
    expect(reportSchema.safeParse({ target_type: "post", target_id: uuid, reason: "spam" }).success).toBe(true);
    expect(reportSchema.safeParse({ target_type: "users", target_id: uuid, reason: "spam" }).success).toBe(false);
    expect(reportSchema.safeParse({ target_type: "post", target_id: "1; drop table", reason: "spam" }).success).toBe(false);
  });
});
