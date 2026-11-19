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

describe("ReservationsInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMock.mockReturnValue({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) });
    mockUseAdminTenant.mockReturnValue({
      tenant: { id: "tenant-1", name: "The Golden Fork" },
    });

    fromMock.mockImplementation((table) => {
      if (table === "reservations") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: () => Promise.resolve({
                  data: [
                    { id: "r1", name: "Ava", email: "ava@test.com", phone: "123", date: "2026-09-28", time: "7:00 PM", guests: "2", status: "pending", occasion: "Birthday", notes: "Window table" },
                    { id: "r2", name: "Luis", email: "luis@test.com", phone: "456", date: "2026-09-29", time: "8:00 PM", guests: "4", status: "confirmed", occasion: null, notes: null },
                    { id: "r3", name: "Nina", email: "nina@test.com", phone: "789", date: "2026-09-30", time: "6:30 PM", guests: "3", status: "cancelled", occasion: null, notes: null },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
          update: (...args) => updateMock(...args),
          delete: () => Promise.resolve({ error: null }),
        };
      }

      return {};
    });
  });

  it("shows reservation summaries and lets staff filter by status", async () => {
    const { default: ReservationsInbox } = await import("./ReservationsInbox");

    render(<ReservationsInbox />);

    await waitFor(() => expect(screen.getByText(/summary/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pending/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmed/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelled/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirmed/i }));
    expect(screen.getByText(/^Luis$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Ava$/i)).not.toBeInTheDocument();
  });

  it("lets staff save recorded revenue for a reservation", async () => {
    const { default: ReservationsInbox } = await import("./ReservationsInbox");
    render(<ReservationsInbox />);

    const revenueInput = await screen.findByRole("spinbutton", { name: /recorded revenue for ava/i });
    fireEvent.change(revenueInput, { target: { value: "84.50" } });
    fireEvent.click(screen.getAllByRole("button", { name: /save revenue/i })[0]);

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ revenue_amount: 84.5 }));
  });
});

const TENANT_A = "3f1b7d2c-9a44-4f0e-8a1b-2c6d5e4f7a90";
const TENANT_B = "b5c2a9e8-1d63-4a77-9f02-6e8b3c1d5a47";

function reservation(id, name, status) {
  return {
    id,
    name,
    email: `${id}@test.com`,
    phone: "555 0100",
    date: "2026-09-28",
    time: "7:00 PM",
    guests: "2",
    status,
    occasion: null,
    notes: null,
  };
}

const RESERVATIONS_A = [reservation("a1", "Ava from A", "confirmed")];
const RESERVATIONS_B = [
  reservation("b1", "Bela from B", "confirmed"),
  reservation("b2", "Nino from B", "pending"),
];

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

describe("ReservationsInbox tenant switching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never lets a previous tenant's reservations overwrite the selected tenant", async () => {
    const harness = createDeferredQueryHarness();
    fromMock.mockImplementation(harness.from);
    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_A, name: "The Golden Fork" } });

    const { default: ReservationsInbox } = await import("./ReservationsInbox");
    const { rerender } = render(<ReservationsInbox />);

    fireEvent.click(screen.getByRole("button", { name: /^Confirmed \(0\)$/ }));

    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_B, name: "Ember & Oak" } });
    rerender(<ReservationsInbox />);

    await harness.settleAll(TENANT_B, () => ({ data: RESERVATIONS_B, error: null }));

    // The status filter resets with the tenant, so both rows of B are listed.
    expect(screen.getByText("Bela from B")).toBeInTheDocument();
    expect(screen.getByText("Nino from B")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();

    // The slow first load answers last and must not overwrite the current tenant.
    await harness.settleAll(TENANT_A, () => ({ data: RESERVATIONS_A, error: null }));

    expect(screen.getByText("Bela from B")).toBeInTheDocument();
    expect(screen.getByText("Nino from B")).toBeInTheDocument();
    expect(screen.queryByText("Ava from A")).not.toBeInTheDocument();
  });

  it("resets loading and clears the load error when another tenant is selected", async () => {
    const harness = createDeferredQueryHarness();
    fromMock.mockImplementation(harness.from);
    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_A, name: "The Golden Fork" } });

    const { default: ReservationsInbox } = await import("./ReservationsInbox");
    const { rerender } = render(<ReservationsInbox />);

    await harness.settleAll(TENANT_A, () => ({ data: null, error: { message: "boom" } }));
    expect(screen.getByRole("alert")).toHaveTextContent(/reservations could not be loaded/i);

    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_B, name: "Ember & Oak" } });
    rerender(<ReservationsInbox />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await harness.settleAll(TENANT_B, () => ({ data: RESERVATIONS_B, error: null }));

    expect(screen.getByText("Bela from B")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });
});
