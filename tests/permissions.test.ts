import { describe, expect, it } from "vitest";
import { canAccessAdmin, hasAnyRole, isAdmin, isModerator } from "@/lib/permissions/roles";

describe("RBAC", () => {
  it("visitantes e habitantes não acedem à administração", () => {
    expect(canAccessAdmin(["visitor"])).toBe(false);
    expect(canAccessAdmin(["visitor", "resident", "business_owner"])).toBe(false);
    expect(canAccessAdmin(null)).toBe(false);
  });
  it("moderadores acedem mas não são administradores", () => {
    expect(canAccessAdmin(["moderator"])).toBe(true);
    expect(isModerator(["moderator"])).toBe(true);
    expect(isAdmin(["moderator"])).toBe(false);
  });
  it("administradores têm todas as permissões de staff", () => {
    expect(isAdmin(["visitor", "admin"])).toBe(true);
    expect(isModerator(["admin"])).toBe(true);
  });
  it("suporta múltiplos papéis", () => {
    expect(hasAnyRole(["seller", "event_organizer"], ["event_organizer"])).toBe(true);
    expect(hasAnyRole(["seller"], ["business_owner", "admin"])).toBe(false);
  });
});
