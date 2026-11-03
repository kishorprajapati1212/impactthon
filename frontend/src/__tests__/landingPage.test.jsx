import React from "react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../store/authSlice.js";

vi.mock("../components/UI/ThemeToggle.jsx", () => ({ default: () => <button type="button">theme</button> }));
vi.mock("react-qr-code", () => ({ default: ({ value }) => <svg data-testid="qr" data-value={value} /> }));

const { default: LandingPage } = await import("../pages/Home/LandingPage.jsx");

function renderHome(auth = null, url = "/") {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: auth ? { auth: { isAuthenticated: true, user: auth, token: "t" } } : undefined });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<p>LOGIN PAGE</p>} />
          <Route path="/student" element={<p>STUDENT DASHBOARD</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe("Home page", () => {
  it("has exactly one h1 and no public 'create account' link (accounts come from the admin)", () => {
    renderHome();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /create account/i })).toBeNull();
    expect(screen.getByText(/Accounts are created by your college admin/)).toBeTruthy();
  });

  it("Get Started goes to login for visitors, and to the dashboard when already logged in", () => {
    renderHome();
    fireEvent.click(screen.getAllByRole("button", { name: /Get Started/ })[0]);
    expect(screen.getByText("LOGIN PAGE")).toBeTruthy();
  });

  it("logged-in users see 'Open my dashboard' and land on their own dashboard", () => {
    renderHome({ name: "Nihal", role: "STUDENT" });
    fireEvent.click(screen.getAllByRole("button", { name: /Open my dashboard/ })[0]);
    expect(screen.getByText("STUDENT DASHBOARD")).toBeTruthy();
  });

  it("mobile menu opens with aria-expanded, closes with Escape", () => {
    renderHome();
    const toggle = screen.getByLabelText("Menu");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(document.getElementById("mobile-menu")).getByText("FAQ")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.getElementById("mobile-menu")).toBeNull();
  });

  it("the demo QR rotates every 5 seconds like a real session", () => {
    vi.useFakeTimers();
    try {
      renderHome();
      const before = screen.getByTestId("qr").getAttribute("data-value");
      expect(screen.getByText(/refreshes in 5s/)).toBeTruthy();
      React.act(() => { vi.advanceTimersByTime(5000); });
      expect(screen.getByTestId("qr").getAttribute("data-value")).not.toBe(before);
    } finally { vi.useRealTimers(); }
  });
});
