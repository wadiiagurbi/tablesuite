import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthContext } from "../context/AuthContext";
import RequireAuth from "./RequireAuth";

describe("RequireAuth", () => {
  it("redirects unauthenticated users to the login screen", () => {
    render(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route path="/login" element={<div>login page</div>} />
            <Route path="/admin" element={<RequireAuth><div>admin page</div></RequireAuth>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    render(
      <AuthContext.Provider value={{ user: { id: "123" }, loading: false }}>
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route path="/admin" element={<RequireAuth><div>admin page</div></RequireAuth>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText("admin page")).toBeInTheDocument();
  });
});
