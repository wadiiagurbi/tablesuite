import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMenu } from "./useMenu";

const fromMock = vi.fn();

vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: (...args) => fromMock(...args) },
}));

const TENANT_A = "3f1b7d2c-9a44-4f0e-8a1b-2c6d5e4f7a90";
const TENANT_B = "b5c2a9e8-1d63-4a77-9f02-6e8b3c1d5a47";

const CATEGORY_A = {
  id: "cat-a",
  name: "Starters from A",
  sort_order: 1,
  menu_items: [{ id: "item-a", name: "Soup from A", is_available: true }],
};

const CATEGORY_B = {
  id: "cat-b",
  name: "Mains from B",
  sort_order: 1,
  menu_items: [{ id: "item-b", name: "Steak from B", is_available: true }],
};

function abortError() {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

function createQueryHarness() {
  const queries = [];
  const from = vi.fn(() => {
    const record = {
      tenantId: null,
      signal: null,
      settled: false,
      resolve: null,
      reject: null,
    };
    const promise = new Promise((resolve, reject) => {
      record.resolve = (payload) => {
        record.settled = true;
        resolve({ data: payload, error: null });
      };
      record.reject = (error) => {
        record.settled = true;
        reject(error);
      };
    });
    const query = {
      select: () => query,
      eq: (column, value) => {
        if (column === "tenant_id") record.tenantId = value;
        return query;
      },
      order: () => query,
      abortSignal: (signal) => {
        record.signal = signal;
        return query;
      },
      then: (onFulfilled, onRejected) => promise.then(onFulfilled, onRejected),
    };
    queries.push(record);
    return query;
  });
  return { from, queries };
}

function renderUseMenu(initialProps) {
  return renderHook(({ tenantId }) => useMenu(tenantId), { initialProps });
}

describe("useMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes an AbortSignal to the query and aborts it when the tenant changes", () => {
    const harness = createQueryHarness();
    fromMock.mockImplementation(harness.from);
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    const { rerender, unmount } = renderUseMenu({ tenantId: TENANT_A });

    expect(harness.queries).toHaveLength(1);
    expect(harness.queries[0].tenantId).toBe(TENANT_A);
    expect(harness.queries[0].signal).toBeInstanceOf(AbortSignal);
    expect(harness.queries[0].signal.aborted).toBe(false);
    expect(abortSpy).not.toHaveBeenCalled();

    rerender({ tenantId: TENANT_B });

    expect(harness.queries).toHaveLength(2);
    expect(harness.queries[1].tenantId).toBe(TENANT_B);
    expect(abortSpy).toHaveBeenCalledTimes(1);
    expect(harness.queries[0].signal.aborted).toBe(true);
    expect(harness.queries[1].signal.aborted).toBe(false);

    unmount();

    expect(abortSpy).toHaveBeenCalledTimes(2);
    expect(harness.queries[1].signal.aborted).toBe(true);
  });

  it("keeps only the latest tenant's menu when an earlier response arrives late", async () => {
    const harness = createQueryHarness();
    fromMock.mockImplementation(harness.from);

    const { result, rerender } = renderUseMenu({ tenantId: TENANT_A });
    rerender({ tenantId: TENANT_B });

    await act(async () => harness.queries[1].resolve([CATEGORY_B]));

    expect(result.current.categories.map((category) => category.name)).toEqual(["Mains from B"]);
    expect(result.current.categories[0].items).toHaveLength(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    await act(async () => harness.queries[0].resolve([CATEGORY_A]));

    expect(result.current.categories.map((category) => category.name)).toEqual(["Mains from B"]);
    expect(result.current.error).toBeNull();
  });

  it("ignores an aborted rejection without surfacing an error", async () => {
    const harness = createQueryHarness();
    fromMock.mockImplementation(harness.from);
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    const { result, rerender } = renderUseMenu({ tenantId: TENANT_A });
    rerender({ tenantId: TENANT_B });

    await act(async () => {
      harness.queries[0].reject(abortError());
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(unhandled).not.toHaveBeenCalled();
    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);

    await act(async () => harness.queries[1].resolve([CATEGORY_B]));

    expect(result.current.categories.map((category) => category.name)).toEqual(["Mains from B"]);
    expect(result.current.loading).toBe(false);

    process.off("unhandledRejection", unhandled);
  });

  it("still reports a real load failure for the current tenant", async () => {
    const harness = createQueryHarness();
    fromMock.mockImplementation(harness.from);

    const { result } = renderUseMenu({ tenantId: TENANT_A });

    await act(async () => harness.queries[0].reject(new Error("network down")));

    expect(result.current.error).toBe(
      "The menu could not be loaded. Please check your connection and try again."
    );
    expect(result.current.loading).toBe(false);
  });

  it("skips the query entirely when no tenant is selected", () => {
    const harness = createQueryHarness();
    fromMock.mockImplementation(harness.from);

    const { result } = renderUseMenu({ tenantId: null });

    expect(harness.queries).toHaveLength(0);
    expect(result.current.categories).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
