import React from "react";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Navbar from "./Navbar";

const mockUseTenant = vi.fn();

vi.mock("../context/TenantContext", () => ({
  useTenant: () => mockUseTenant(),
}));

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
}

describe("Navbar", () => {
  it("keeps the restaurant name as home and emphasizes one reservation action", () => {
    mockUseTenant.mockReturnValue({ tenant: { slug: "golden-fork", name: "The Golden Fork" } });

    render(
      <MemoryRouter initialEntries={["/site/golden-fork/menu"]}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "The Golden Fork" })).toHaveAttribute("href", "/site/golden-fork");
    expect(screen.getByRole("link", { name: "Menu" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Reserve" })).toHaveAttribute("href", "/site/golden-fork/reservations");
    expect(screen.queryByRole("link", { name: "Reservations" })).not.toBeInTheDocument();
  });

  it("opens the mobile menu and closes it after choosing a destination", () => {
    mockUseTenant.mockReturnValue({ tenant: { slug: "golden-fork", name: "The Golden Fork" } });

    render(
      <MemoryRouter initialEntries={["/site/golden-fork"]}>
        <Navbar />
        <CurrentPath />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("link", { name: "Reserve a table" }));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/site/golden-fork/reservations");
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  });
});