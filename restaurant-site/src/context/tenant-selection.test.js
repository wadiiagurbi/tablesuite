import { describe, expect, it } from "vitest";

function pickTenant(tenants, tenantId) {
  return tenants.find((tenant) => String(tenant.id) === String(tenantId)) ?? null;
}

describe("tenant selection", () => {
  it("prefers the currently selected tenant id when it matches a tenant", () => {
    const tenants = [
      { id: 1, name: "The Golden Fork" },
      { id: 2, name: "Ember & Oak" },
    ];

    expect(pickTenant(tenants, "2")).toEqual(tenants[1]);
  });

  it("falls back to null when no tenant matches the current selection", () => {
    const tenants = [{ id: 1, name: "The Golden Fork" }];

    expect(pickTenant(tenants, "missing")).toBeNull();
  });
});
