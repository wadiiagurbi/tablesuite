import React from "react";
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockUseAdminTenant = vi.fn();
const fromMock = vi.fn();
const updateMock = vi.fn();

vi.mock("../../context/AdminTenantContext", () => ({
  useAdminTenant: () => mockUseAdminTenant(),
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: (...args) => fromMock(...args),
  },
}));

describe("MenuManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMock.mockReturnValue({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) });
    mockUseAdminTenant.mockReturnValue({
      tenant: { id: "tenant-1", name: "The Golden Fork" },
    });

    fromMock.mockImplementation((table) => {
      if (table === "menu_categories") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({
                  data: [
                    {
                      id: "cat-1",
                      name: "Mains",
                      sort_order: 1,
                      menu_items: [
                        { id: "item-1", name: "Truffle pasta", description: "Fresh pasta", price: 32, is_available: true, is_featured: true, sort_order: 1 },
                        { id: "item-2", name: "Herb chicken", description: "Roasted chicken", price: 28, is_available: true, is_featured: false, sort_order: 2 },
                      ],
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
          delete: () => Promise.resolve({ error: null }),
          update: () => Promise.resolve({ error: null }),
        };
      }

      if (table === "menu_items") {
        return { update: (...args) => updateMock(...args) };
      }

      return {};
    });
  });

  it("shows the editorial workflow for featured dishes", async () => {
    const { default: MenuManager } = await import("./MenuManager");

    render(<MenuManager />);

    await waitFor(() => expect(screen.getByText(/editorial workflow/i)).toBeInTheDocument());
    expect(screen.getByText(/featured dishes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark unfeatured/i })).toBeInTheDocument();
  });

  it("bulk-features selected dishes", async () => {
    const { default: MenuManager } = await import("./MenuManager");
    render(<MenuManager />);

    fireEvent.click(await screen.findByRole("checkbox", { name: /select herb chicken/i }));
    fireEvent.click(screen.getByRole("button", { name: "Feature selected" }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ is_featured: true }));
  });
});

const TENANT_A = "3f1b7d2c-9a44-4f0e-8a1b-2c6d5e4f7a90";
const TENANT_B = "b5c2a9e8-1d63-4a77-9f02-6e8b3c1d5a47";

const CATEGORY_A = {
  id: "cat-a",
  name: "Starters from A",
  sort_order: 1,
  menu_items: [
    { id: "item-a", name: "Soup from A", description: "From tenant A", price: 12, is_available: true, is_featured: false, sort_order: 1 },
  ],
};

const CATEGORY_B = {
  id: "cat-b",
  name: "Mains from B",
  sort_order: 1,
  menu_items: [
    { id: "item-b", name: "Steak from B", description: "From tenant B", price: 34, is_available: true, is_featured: true, sort_order: 1 },
  ],
};

function createDeferredQueryHarness() {
  const records = [];
  const from = vi.fn(() => {
    const record = { tenantId: null, settled: false, resolve: null };
    const promise = new Promise((resolve) => {
      record.resolve = (value) => {
        record.settled = true;
        resolve(value);
      };
    });
    const query = {
      select: () => query,
      eq: (column, value) => {
        if (column === "tenant_id") record.tenantId = value;
        return query;
      },
      order: () => query,
      range: () => query,
      then: (onFulfilled, onRejected) => promise.then(onFulfilled, onRejected),
    };
    records.push(record);
    return query;
  });

  const settleAll = async (tenantId, buildPayload) => {
    await act(async () => {
      for (const record of records) {
        if (record.tenantId === tenantId && !record.settled) record.resolve(buildPayload());
      }
    });
  };

  return { from, records, settleAll };
}

describe("MenuManager tenant switching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never lets a previous tenant's menu overwrite the selected tenant", async () => {
    const harness = createDeferredQueryHarness();
    fromMock.mockImplementation(harness.from);
    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_A, name: "The Golden Fork" } });

    const { default: MenuManager } = await import("./MenuManager");
    const { rerender } = render(<MenuManager />);

    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_B, name: "Ember & Oak" } });
    rerender(<MenuManager />);

    await harness.settleAll(TENANT_B, () => ({ data: [CATEGORY_B], error: null }));

    expect(screen.getByText("Mains from B")).toBeInTheDocument();
    expect(screen.getByText(/Steak from B/)).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();

    // The slow first load answers last and must not overwrite the current tenant.
    await harness.settleAll(TENANT_A, () => ({ data: [CATEGORY_A], error: null }));

    expect(screen.getByText("Mains from B")).toBeInTheDocument();
    expect(screen.queryByText("Starters from A")).not.toBeInTheDocument();
    expect(screen.queryByText(/Soup from A/)).not.toBeInTheDocument();
  });

  it("resets loading and clears the load error when another tenant is selected", async () => {
    const harness = createDeferredQueryHarness();
    fromMock.mockImplementation(harness.from);
    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_A, name: "The Golden Fork" } });

    const { default: MenuManager } = await import("./MenuManager");
    const { rerender } = render(<MenuManager />);

    await harness.settleAll(TENANT_A, () => ({ data: null, error: { message: "boom" } }));
    expect(screen.getByRole("alert")).toHaveTextContent(/menu could not be loaded/i);

    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_B, name: "Ember & Oak" } });
    rerender(<MenuManager />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await harness.settleAll(TENANT_B, () => ({ data: [CATEGORY_B], error: null }));

    expect(screen.getByText("Mains from B")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });
});
