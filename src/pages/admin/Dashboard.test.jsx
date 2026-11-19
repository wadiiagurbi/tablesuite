import React from "react";
import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAdminTenant = vi.fn();
const fromMock = vi.fn();

vi.mock("../../context/AdminTenantContext", () => ({
  useAdminTenant: () => mockUseAdminTenant(),
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

describe("Dashboard", () => {
  beforeEach(() => {
    fromMock.mockImplementation(() => {
      const query = {
        select: () => query,
        eq: () => query,
        gte: () => query,
        lte: () => query,
        then: (resolve) => Promise.resolve({ count: 0, data: [], error: null }).then(resolve),
      };
      return query;
    });
  });

  it("shows quick actions for keeping the restaurant running smoothly", async () => {
    mockUseAdminTenant.mockReturnValue({
      tenant: { id: "tenant-1", name: "The Golden Fork", slug: "golden-fork" },
    });

    const { default: Dashboard } = await import("./Dashboard");

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Quick actions")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add a menu item/i })).toHaveAttribute("href", "/admin/menu");
    expect(screen.getByRole("link", { name: /view reservations/i })).toHaveAttribute("href", "/admin/reservations");
    await waitFor(() => expect(screen.getAllByText("0").length).toBeGreaterThan(1));
  });

  it("shows reservation analytics so restaurant owners can see the pace of bookings", async () => {
    mockUseAdminTenant.mockReturnValue({
      tenant: { id: "tenant-1", name: "The Golden Fork", slug: "golden-fork" },
    });

    const { default: Dashboard } = await import("./Dashboard");

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/reservation analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/confirmed bookings/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("0").length).toBeGreaterThan(1));
  });

  it("offers selectable booking and recorded revenue chart ranges", async () => {
    mockUseAdminTenant.mockReturnValue({
      tenant: { id: "tenant-1", name: "The Golden Fork", slug: "golden-fork" },
    });

    const { default: Dashboard } = await import("./Dashboard");

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: /bookings per day/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /recorded revenue per day/i })).toBeInTheDocument();
    expect(screen.getByText(/not imported from a payment provider/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("0").length).toBeGreaterThan(1));
  });
});

const TENANT_A = "3f1b7d2c-9a44-4f0e-8a1b-2c6d5e4f7a90";
const TENANT_B = "b5c2a9e8-1d63-4a77-9f02-6e8b3c1d5a47";

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
      gte: () => query,
      lte: () => query,
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

function tileValue(label) {
  return screen.getByText(label).previousElementSibling?.textContent;
}

describe("Dashboard tenant switching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never lets a previous tenant's numbers overwrite the selected tenant", async () => {
    const harness = createDeferredQueryHarness();
    fromMock.mockImplementation(harness.from);
    mockUseAdminTenant.mockReturnValue({
      tenant: { id: TENANT_A, name: "The Golden Fork", slug: "golden-fork" },
    });

    const { default: Dashboard } = await import("./Dashboard");
    const { rerender } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    mockUseAdminTenant.mockReturnValue({
      tenant: { id: TENANT_B, name: "Ember & Oak", slug: "ember-oak" },
    });
    rerender(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Ember & Oak" })).toBeInTheDocument();

    await harness.settleAll(TENANT_B, () => ({ count: 3, data: [], error: null }));
    expect(tileValue("Menu items")).toBe("3");
    expect(tileValue("Gallery photos")).toBe("3");

    // The slow first load answers last and must not overwrite the current tenant.
    await harness.settleAll(TENANT_A, () => ({ count: 9, data: [], error: null }));

    expect(tileValue("Menu items")).toBe("3");
    expect(screen.getByRole("heading", { name: "Ember & Oak" })).toBeInTheDocument();
  });

  it("clears the previous tenant's load error when another tenant is selected", async () => {
    const harness = createDeferredQueryHarness();
    fromMock.mockImplementation(harness.from);
    mockUseAdminTenant.mockReturnValue({
      tenant: { id: TENANT_A, name: "The Golden Fork", slug: "golden-fork" },
    });

    const { default: Dashboard } = await import("./Dashboard");
    const { rerender } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await harness.settleAll(TENANT_A, () => ({ count: 0, data: [], error: { message: "boom" } }));
    expect(screen.getByRole("alert")).toHaveTextContent(/dashboard numbers could not be loaded/i);

    mockUseAdminTenant.mockReturnValue({
      tenant: { id: TENANT_B, name: "Ember & Oak", slug: "ember-oak" },
    });
    rerender(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(tileValue("Menu items")).toBe("…");

    await harness.settleAll(TENANT_B, () => ({ count: 4, data: [], error: null }));

    expect(tileValue("Menu items")).toBe("4");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
