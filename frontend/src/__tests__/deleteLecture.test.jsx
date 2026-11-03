import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * Deleting a lecture (Phase 18) - the dialog must never let anyone delete
 * blindly: it shows the server's numbers, requires an acknowledgement, and
 * respects the server's policy answer.
 */
const calls = { get: [], delete: [] };
let preview;
vi.mock("../utils/api.js", () => ({
  default: {
    get: vi.fn(async (url) => { calls.get.push(url); return { data: { success: true, data: preview } }; }),
    delete: vi.fn(async (url) => { calls.delete.push(url); return { data: { success: true, message: "Lecture deleted. 8 attendance marks removed (5 present). Every percentage and report now excludes it.", data: { marksRemoved: 8 } } }; }),
  },
  clearApiCache: vi.fn(),
}));
vi.mock("../utils/notify.js", () => ({ default: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import DeleteLectureDialog from "../components/UI/DeleteLectureDialog.jsx";
import { NAV_ITEMS, findNav, filtersFromParams } from "../admin/nav.js";

const lecture = { id: "l1", topic: "REST APIs with Express", subjectCode: "CE501", classLabel: "CE · A · 2024", faculty: "Sahil", status: "COMPLETED", startTime: "2026-11-01T09:00:00.000Z" };

beforeEach(() => { calls.get.length = 0; calls.delete.length = 0; });

describe("DeleteLectureDialog", () => {
  it("shows what will be removed and only enables Delete after the acknowledgement; then calls DELETE /lecture/:id", async () => {
    preview = { lecture, marks: { total: 8, present: 5, notPresent: 3 }, leaveApplications: 1, notifications: 9, allowed: true, reason: null };
    const onDeleted = vi.fn();
    render(<DeleteLectureDialog open lectureId="l1" onClose={() => {}} onDeleted={onDeleted} />);
    await waitFor(() => expect(screen.getByText(/What will happen/)).toBeInTheDocument());
    expect(calls.get).toEqual(["/lecture/l1/delete-preview"]);
    expect(screen.getByText(/8 attendance marks will be removed: 5 present, 3 absent\/leave/)).toBeInTheDocument();
    expect(screen.getByText(/1 leave application will stop referring/)).toBeInTheDocument();
    expect(screen.getByText(/9 parent notification records/)).toBeInTheDocument();
    expect(screen.getAllByText(/cannot be undone/i).length).toBeGreaterThan(0);

    const del = screen.getByRole("button", { name: /Delete lecture and 8 marks/ });
    expect(del).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(del).toBeEnabled();
    fireEvent.click(del);
    await waitFor(() => expect(calls.delete).toEqual(["/lecture/l1"]));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith({ marksRemoved: 8 }));
  });

  it("explains the policy and keeps Delete disabled when the server refuses (teacher, finished lecture with presence)", async () => {
    preview = { lecture, marks: { total: 8, present: 5, notPresent: 3 }, leaveApplications: 0, notifications: 0, allowed: false, reason: "This lecture already has 5 students marked present. Ask an admin to delete it.", code: "DELETE_NEEDS_ADMIN" };
    render(<DeleteLectureDialog open lectureId="l1" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Ask an admin to delete it/)).toBeInTheDocument());
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByRole("button", { name: /Delete lecture/ })).toBeDisabled();
  });

  it("tells the truth about an empty running lecture (nothing but the lecture goes away)", async () => {
    preview = { lecture: { ...lecture, status: "ACTIVE" }, marks: { total: 0, present: 0, notPresent: 0 }, leaveApplications: 0, notifications: 0, allowed: true, reason: null };
    render(<DeleteLectureDialog open lectureId="l1" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Nobody has been marked present yet/)).toBeInTheDocument());
    expect(screen.getByText(/will see “lecture not found”/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Delete lecture$/ })).toBeDisabled();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<DeleteLectureDialog open={false} lectureId="l1" onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    expect(calls.get).toEqual([]);
  });
});

describe("admin navigation - Lectures page", () => {
  it("has a 'Lectures' page under Happening now that accepts deep-link filters without touching ?section=", () => {
    const item = NAV_ITEMS.find((i) => i.section === "lectures");
    expect(item).toBeTruthy();
    expect(item.label).toBe("Lectures");
    expect(findNav("lectures").section).toBe("lectures");
    const params = new URLSearchParams("section=lectures&faculty=f1&class=s1&status=ACTIVE&q=x");
    expect(filtersFromParams(params, item.filterKeys)).toEqual({ faculty: "f1", section: "s1", status: "ACTIVE" });
  });
});
