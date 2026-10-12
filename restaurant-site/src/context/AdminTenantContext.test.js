import { describe, expect, it } from "vitest";
import { normalizeTenantAccess } from "./AdminTenantContext";

describe("tenant access normalization", () => {
  it("keeps only rows that actually authorize access", () => {
    const rows = [
      { role: "owner", tenants: { id: "tenant-1", name: "The Golden Fork" } },
      { role: "guest", tenants: { id: "tenant-2", name: "Not Allowed" } },
      { role: "staff", tenants: { id: "tenant-3", name: "Ember & Oak" } },
      { role: null, tenants: { id: "tenant-4", name: "Missing role" } },
    ];

    expect(normalizeTenantAccess(rows)).toEqual([
      { id: "tenant-1", name: "The Golden Fork" },
      { id: "tenant-3", name: "Ember & Oak" },
    ]);
  });

  it("ignores rows without tenant data", () => {
    expect(normalizeTenantAccess([{ role: "owner" }, { role: "staff", tenants: null }])).toEqual([]);
  });
});
