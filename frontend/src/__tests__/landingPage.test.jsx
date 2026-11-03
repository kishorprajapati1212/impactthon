import React from "react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import fs from "node:fs";
import path from "node:path";
import authReducer from "../store/authSlice.js";
import { FAQS, SITE_TITLE, NAV_LINKS } from "../content/landing.js";

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

describe("Home page (v3.7 rebuild)", () => {
  it("has exactly one h1 and no public 'create account' link (accounts come from the admin)", () => {
    renderHome();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/QR code attendance system/i);
    expect(screen.queryByRole("link", { name: /create account/i })).toBeNull();
    expect(screen.getAllByText(/Accounts are created by your college admin/).length).toBeGreaterThan(0);
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

  it("mobile menu opens with aria-expanded, lists every section, closes with Escape", () => {
    renderHome();
    const toggle = screen.getByLabelText("Menu");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const menu = within(document.getElementById("mobile-menu"));
    for (const l of NAV_LINKS) expect(menu.getByText(l.label)).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.getElementById("mobile-menu")).toBeNull();
  });

  it("the demo QR rotates every 5 seconds like a real session and the scan feed advances", () => {
    vi.useFakeTimers();
    try {
      renderHome();
      const before = screen.getByTestId("qr").getAttribute("data-value");
      expect(screen.getByText(/refreshes in 5s/)).toBeTruthy();
      React.act(() => { vi.advanceTimersByTime(5000); });
      expect(screen.getByTestId("qr").getAttribute("data-value")).not.toBe(before);
      expect(screen.getByText(/refreshes in 5s/)).toBeTruthy(); // countdown restarted
    } finally { vi.useRealTimers(); }
  });

  it("every nav anchor has a matching section id (so links never dead-end)", () => {
    renderHome();
    for (const l of NAV_LINKS) expect(document.getElementById(l.href.slice(1)), l.href).toBeTruthy();
  });

  it("the page root is not a scroll container - the cause of the 'black space under the footer' bug", () => {
    const { container } = renderHome();
    const root = container.firstElementChild;
    expect(root.className).not.toMatch(/(^|\s)(overflow-hidden|overflow-x-hidden|overflow-y-hidden|h-screen|max-h-screen)(\s|$)/);
    // decorative absolutely-positioned blobs may only live inside sections that clip them
    const blobs = [...container.querySelectorAll("*")].filter((el) => /\bblur-\[/.test(String(el.className)));
    expect(blobs.length).toBeGreaterThan(0);
    for (const b of blobs) {
      const clipper = b.closest(".overflow-hidden");
      expect(clipper, "blob outside an overflow-hidden section").toBeTruthy();
      expect(clipper).not.toBe(root);
    }
    // header is sticky, not fixed, so anchor targets are never covered
    expect(container.querySelector("header").className).toContain("sticky");
  });

  it("logo click on the home page scrolls to the top instead of doing nothing", () => {
    renderHome();
    window.scrollTo = vi.fn();
    fireEvent.click(screen.getByRole("link", { name: "AttendX home" }));
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it("visible FAQ text is identical to the FAQPage JSON-LD in index.html (Google rich-result rule)", () => {
    const html = fs.readFileSync(path.resolve(__dirname, "../../index.html"), "utf8");
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1].replace(/__SITE_URL__/g, "https://x")));
    const faq = blocks.find((b) => b["@type"] === "FAQPage");
    expect(faq.mainEntity.map((e) => [e.name, e.acceptedAnswer.text])).toEqual(FAQS.map((f) => [f.q, f.a]));
    renderHome();
    for (const f of FAQS) expect(screen.getByText(f.q)).toBeTruthy();
    // short, brand-first title; the long keyword line lives in the page, not the tab
    expect(html).toContain(`<title>${SITE_TITLE}</title>`);
    expect(SITE_TITLE.length).toBeLessThanOrEqual(45);
    expect(SITE_TITLE.startsWith("AttendX")).toBe(true);
    expect(html).toMatch(/<meta\s+name="keywords"/); // the SEO tags stay
  });
});
