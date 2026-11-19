import React, { useEffect } from "react";
import "@testing-library/jest-dom/vitest";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantProvider, useTenant } from "./TenantContext";

const mockUseParams = vi.fn();
const fromMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useParams: () => mockUseParams(),
}));

vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

// The latest context value is published from an effect rather than during
// render, so the probe stays a pure read for the assertions below.
const contextProbe = { current: null };

function Probe() {
  const ctx = useTenant();
  useEffect(() => {
    contextProbe.current = ctx;
  }, [ctx]);
  return null;
}

function mockSingleResult(result) {
  fromMock.mockImplementation(() => {
    const query = {
      select: () => query,
      eq: () => query,
      single: () => Promise.resolve(result),
    };
    return query;
  });
}

function renderProvider() {
  return render(
    <TenantProvider>
      <Probe />
    </TenantProvider>
  );
}

const GOLDEN_FORK = {
  id: "3f1b7d2c-9a44-4f0e-8a1b-2c6d5e4f7a90",
  name: "The Golden Fork",
  slug: "golden-fork",
  status: "active",
};

describe("TenantProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextProbe.current = null;

    mockUseParams.mockReturnValue({ slug: "golden-fork" });
  });

  it("exposes the tenant when the row matches the requested slug and is active", async () => {
    mockSingleResult({ data: GOLDEN_FORK, error: null });

    renderProvider();

    await waitFor(() => expect(contextProbe.current?.loading).toBe(false));
    expect(contextProbe.current.tenant).toEqual(GOLDEN_FORK);
    expect(contextProbe.current.error).toBeNull();
  });

  it("rejects a row whose slug is not the requested slug", async () => {
    mockSingleResult({
      data: { ...GOLDEN_FORK, slug: "some-other-restaurant" },
      error: null,
    });

    renderProvider();

    await waitFor(() => expect(contextProbe.current?.loading).toBe(false));
    expect(contextProbe.current.tenant).toBeNull();
    expect(contextProbe.current.error.message).toBe("Tenant not found");
  });

  it("rejects a row whose status is not active", async () => {
    mockSingleResult({ data: { ...GOLDEN_FORK, status: "suspended" }, error: null });

    renderProvider();

    await waitFor(() => expect(contextProbe.current?.loading).toBe(false));
    expect(contextProbe.current.tenant).toBeNull();
    expect(contextProbe.current.error.message).toBe("Tenant not found");
  });

  it("rejects a missing row", async () => {
    mockSingleResult({ data: null, error: { message: "No rows found" } });

    renderProvider();

    await waitFor(() => expect(contextProbe.current?.loading).toBe(false));
    expect(contextProbe.current.tenant).toBeNull();
    expect(contextProbe.current.error.message).toBe("No rows found");
  });
});
