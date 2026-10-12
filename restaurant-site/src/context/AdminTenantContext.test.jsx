import React from "react";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminTenantProvider, useAdminTenant } from "./AdminTenantContext";

const GOLDEN_FORK_ID = "3f1b7d2c-9a44-4f0e-8a1b-2c6d5e4f7a90";
const EMBER_OAK_ID = "b5c2a9e8-1d63-4a77-9f02-6e8b3c1d5a47";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

const mockUseAuth = vi.fn();
const fromMock = vi.fn();

vi.mock("./AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

function Probe() {
  const { tenant, tenantId, setTenantId } = useAdminTenant();
  return (
    <div>
      <p data-testid="selected-tenant">{tenant?.name ?? "none"}</p>
      <p data-testid="selected-id">{String(tenantId)}</p>
      <button type="button" onClick={() => setTenantId(EMBER_OAK_ID)}>Select Ember and Oak</button>
      <button type="button" onClick={() => setTenantId(UNKNOWN_ID)}>Select unknown restaurant</button>
      <button type="button" onClick={() => setTenantId(null)}>Select null</button>
      <button type="button" onClick={() => setTenantId(undefined)}>Select undefined</button>
    </div>
  );
}

function mockAccessRows(rows) {
  fromMock.mockImplementation(() => {
    const query = {
      select: () => query,
      eq: () => query,
      then: (resolve, reject) => Promise.resolve({ data: rows, error: null }).then(resolve, reject),
    };
    return query;
  });
}

const ACCESS_ROWS = [
  {
    tenant_id: GOLDEN_FORK_ID,
    role: "owner",
    tenants: { id: GOLDEN_FORK_ID, name: "The Golden Fork", slug: "golden-fork" },
  },
  {
    tenant_id: EMBER_OAK_ID,
    role: "staff",
    tenants: { id: EMBER_OAK_ID, name: "Ember & Oak", slug: "ember-oak" },
  },
];

function renderProvider() {
  return render(
    <AdminTenantProvider>
      <Probe />
    </AdminTenantProvider>
  );
}

describe("AdminTenantProvider tenant selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });
    mockAccessRows(ACCESS_ROWS);
  });

  it("selects the tenant when the selected id is the identical UUID", async () => {
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("selected-tenant")).toHaveTextContent("The Golden Fork")
    );
    expect(screen.getByTestId("selected-id")).toHaveTextContent(GOLDEN_FORK_ID);

    fireEvent.click(screen.getByRole("button", { name: "Select Ember and Oak" }));

    expect(screen.getByTestId("selected-id")).toHaveTextContent(EMBER_OAK_ID);
    expect(screen.getByTestId("selected-tenant")).toHaveTextContent("Ember & Oak");
  });

  it("selects no tenant when the selected id is a UUID the user cannot access", async () => {
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("selected-tenant")).toHaveTextContent("The Golden Fork")
    );

    fireEvent.click(screen.getByRole("button", { name: "Select unknown restaurant" }));

    expect(screen.getByTestId("selected-id")).toHaveTextContent(UNKNOWN_ID);
    expect(screen.getByTestId("selected-tenant")).toHaveTextContent("none");
  });

  it("selects no tenant when the selected id is null", async () => {
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("selected-tenant")).toHaveTextContent("The Golden Fork")
    );

    fireEvent.click(screen.getByRole("button", { name: "Select null" }));

    expect(screen.getByTestId("selected-id")).toHaveTextContent("null");
    expect(screen.getByTestId("selected-tenant")).toHaveTextContent("none");
  });

  it("selects no tenant when the selected id is undefined", async () => {
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("selected-tenant")).toHaveTextContent("The Golden Fork")
    );

    fireEvent.click(screen.getByRole("button", { name: "Select undefined" }));

    expect(screen.getByTestId("selected-id")).toHaveTextContent("undefined");
    expect(screen.getByTestId("selected-tenant")).toHaveTextContent("none");
  });

  it("never resolves a null selection to a tenant row that has no id", async () => {
    mockAccessRows([
      { tenant_id: null, role: "owner", tenants: { id: null, name: "Ghost Kitchen" } },
    ]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId("selected-id")).toHaveTextContent("null"));
    expect(screen.getByTestId("selected-tenant")).toHaveTextContent("none");
  });
});
