import React from "react";
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAdminTenant = vi.fn();
const fromMock = vi.fn();
const updateMock = vi.fn();

vi.mock("../../context/AdminTenantContext", () => ({
  useAdminTenant: () => mockUseAdminTenant(),
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: (...args) => fromMock(...args),
    storage: { from: () => ({ remove: vi.fn() }) },
  },
}));

describe("GalleryManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminTenant.mockReturnValue({ tenant: { id: "tenant-1", name: "The Golden Fork" } });
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({
            data: [{ id: "image-1", tenant_id: "tenant-1", public_url: "/dish.jpg", storage_path: "tenant-1/dish.jpg", caption: "Pasta", sort_order: 0, is_published: true }],
            error: null,
          }),
        }),
      }),
      update: (...args) => updateMock(...args),
    }));
    updateMock.mockReturnValue({
      eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });
  });

  it("bulk unpublishes selected photos", async () => {
    const { default: GalleryManager } = await import("./GalleryManager");
    render(<GalleryManager />);

    fireEvent.click(await screen.findByRole("checkbox", { name: /select photo pasta/i }));
    fireEvent.click(screen.getByRole("button", { name: /unpublish selected/i }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ is_published: false }));
  });
});

const TENANT_A = "3f1b7d2c-9a44-4f0e-8a1b-2c6d5e4f7a90";
const TENANT_B = "b5c2a9e8-1d63-4a77-9f02-6e8b3c1d5a47";

const IMAGE_A = { id: "image-a", tenant_id: TENANT_A, public_url: "/a.jpg", storage_path: "tenant-a/a.jpg", caption: "Photo from A", sort_order: 0, is_published: true };
const IMAGE_B = { id: "image-b", tenant_id: TENANT_B, public_url: "/b.jpg", storage_path: "tenant-b/b.jpg", caption: "Photo from B", sort_order: 0, is_published: true };

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

describe("GalleryManager tenant switching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never lets a previous tenant's photos overwrite the selected tenant", async () => {
    const harness = createDeferredQueryHarness();
    fromMock.mockImplementation(harness.from);
    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_A, name: "The Golden Fork" } });

    const { default: GalleryManager } = await import("./GalleryManager");
    const { rerender } = render(<GalleryManager />);

    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_B, name: "Ember & Oak" } });
    rerender(<GalleryManager />);

    await harness.settleAll(TENANT_B, () => ({ data: [IMAGE_B], error: null }));

    expect(screen.getByAltText("Photo from B")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();

    // The slow first load answers last and must not overwrite the current tenant.
    await harness.settleAll(TENANT_A, () => ({ data: [IMAGE_A], error: null }));

    expect(screen.getByAltText("Photo from B")).toBeInTheDocument();
    expect(screen.queryByAltText("Photo from A")).not.toBeInTheDocument();
  });

  it("resets loading and clears the load error when another tenant is selected", async () => {
    const harness = createDeferredQueryHarness();
    fromMock.mockImplementation(harness.from);
    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_A, name: "The Golden Fork" } });

    const { default: GalleryManager } = await import("./GalleryManager");
    const { rerender } = render(<GalleryManager />);

    await harness.settleAll(TENANT_A, () => ({ data: null, error: { message: "boom" } }));
    expect(screen.getByRole("alert")).toHaveTextContent(/photos could not be loaded/i);

    mockUseAdminTenant.mockReturnValue({ tenant: { id: TENANT_B, name: "Ember & Oak" } });
    rerender(<GalleryManager />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await harness.settleAll(TENANT_B, () => ({ data: [IMAGE_B], error: null }));

    expect(screen.getByAltText("Photo from B")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });
});