import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TenantLayout from "./TenantLayout";

// This project's vitest transform compiles JSX with the classic runtime, so the
// few component files that do not `import React` (NotFound, CtaBand — both
// out of scope for this change) need a global React to render under test.
// The production build uses the automatic runtime and is unaffected.
globalThis.React = React;

// jsdom ships no IntersectionObserver and Reveal (inside CtaBand) animates with
// `whileInView`, so a minimal always-intersecting stub is needed here.
globalThis.IntersectionObserver = class {
  constructor(callback) {
    this.callback = callback;
  }
  observe(element) {
    this.callback([{ isIntersecting: true, intersectionRatio: 1, target: element }], this);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};

const mockUseTenant = vi.fn();

vi.mock("../context/TenantContext", () => ({
  TenantProvider: ({ children }) => <>{children}</>,
  useTenant: () => mockUseTenant(),
}));

const TENANT = {
  id: "3f1b7d2c-9a44-4f0e-8a1b-2c6d5e4f7a90",
  name: "The Golden Fork",
  slug: "golden-fork",
  tagline: "Kitchen and cellar",
  description: "Seasonal plates in a converted townhouse.",
  address: "1 Main Street",
  phone: "555 0100",
  email: "hello@goldenfork.test",
  hours: { Tuesday: "5pm – 10pm" },
  social: {},
};

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/site/golden-fork"]}>
      <Routes>
        <Route path="/site/:slug" element={<TenantLayout />}>
          <Route index element={<p>Tenant page content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("TenantLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the shared NotFound page when the tenant could not be loaded", () => {
    mockUseTenant.mockReturnValue({ tenant: null, loading: false, error: new Error("Tenant not found") });

    renderLayout();

    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to start" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("navigation", { name: "Restaurant navigation" })).not.toBeInTheDocument();
    expect(screen.queryByText("Hungry already?")).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("renders the shared NotFound page when no tenant resolved", () => {
    mockUseTenant.mockReturnValue({ tenant: null, loading: false, error: null });

    renderLayout();

    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to start" })).toHaveAttribute("href", "/");
    expect(screen.queryByText("Tenant page content")).not.toBeInTheDocument();
  });

  it("renders the tenant shell around the routed page for a valid tenant", () => {
    mockUseTenant.mockReturnValue({ tenant: TENANT, loading: false, error: null });

    renderLayout();

    const nav = screen.getByRole("navigation", { name: "Restaurant navigation" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "The Golden Fork" })).toHaveAttribute("href", "/site/golden-fork");

    expect(screen.getByText("Tenant page content")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /hungry already/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a table" })).toHaveAttribute(
      "href",
      "/site/golden-fork/reservations"
    );

    expect(screen.getByRole("contentinfo")).toHaveTextContent("Site by TableSuite");
    expect(screen.queryByRole("heading", { name: /page not found/i })).not.toBeInTheDocument();
  });

  it("shows the loading skeleton while the tenant is still being resolved", () => {
    mockUseTenant.mockReturnValue({ tenant: null, loading: true, error: null });

    renderLayout();

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.queryByRole("heading", { name: /page not found/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Restaurant navigation" })).not.toBeInTheDocument();
  });
});
