import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../store/authSlice.js";

/* ── mocks ──────────────────────────────────────────────────────────── */
vi.mock("../components/UI/ThemeToggle.jsx", () => ({ default: () => <button type="button">theme</button> }));

const calls = { get: [], post: [], put: [], delete: [] };
const student = {
  _id: "st1", rollNumber: "CSE2026001", semester: 3, enrollmentYear: 2026, phone: "9876543210", parentPhone: "9123456789", isActive: true, lifecycleStatus: "STUDYING",
  userId: { _id: "u1", name: "Rahul Verma", email: "rahul@college.edu" },
  sectionId: { _id: "s1", name: "A", semester: 3, departmentId: { _id: "d1", code: "CSE", name: "Computer Science & Engineering" } },
  departmentId: { _id: "d1", code: "CSE", name: "Computer Science & Engineering" },
  mentorId: { _id: "f1", employeeId: "FAC001", userId: { name: "Dr. Priya Sharma" } },
};
const department = { _id: "d1", name: "Computer Science & Engineering", code: "CSE", description: "Software, systems and AI", isActive: true, counts: { sections: 1, subjects: 2, faculty: 1, students: 1 } };

const report = (url) => {
  if (url.includes("days=7")) return { period: { days: 7 }, rule: { good: 75, watch: 60, minLectures: 3 }, overall: { percentage: null, band: "none", present: 0, counted: 0, absent: 0, lectures: 0, previous: null, change: null }, weekly: [], classes: [], subjects: [], teachers: [], studentsAtRisk: [], totals: { studentsCounted: 0, studentsBelowGood: 0, classesBelowGood: 0 } };
  return {
    period: { days: 30, label: "last 30 days" }, rule: { good: 75, watch: 60, minLectures: 3 },
    overall: { percentage: 71, band: "watch", present: 142, counted: 200, absent: 58, lectures: 12, previous: { percentage: 78, lectures: 10 }, change: -7 },
    weekly: [{ weekStart: "2026-10-05", label: "Week of 5 Oct", percentage: 80, band: "good", lectures: 5, counted: 100 }, { weekStart: "2026-10-12", label: "Week of 12 Oct", percentage: 62, band: "watch", lectures: 7, counted: 100 }],
    classes: [{ id: "s1", label: "CSE · A", semester: 3, students: 40, lectures: 12, percentage: 71, band: "watch" }],
    subjects: [{ id: "su1", code: "CS201", name: "Data Structures", lectures: 12, percentage: 71, band: "watch" }],
    teachers: [{ id: "f1", name: "Dr. Priya Sharma", employeeId: "FAC001", lectures: 12, percentage: 71, band: "watch" }],
    studentsAtRisk: [{ id: "st1", name: "Rahul Verma", rollNumber: "CSE2026001", classLabel: "CSE · A", sectionId: "s1", mentor: "Dr. Priya Sharma", percentage: 42, band: "low", lectures: 12, present: 5 }],
    totals: { studentsCounted: 40, studentsBelowGood: 1, classesBelowGood: 1 },
  };
};

const routes = (url) => {
  if (url.startsWith("/students?mentor=none")) return { data: [], total: 2 };
  if (url.startsWith("/students?section=none")) return { data: [], total: 0 };
  if (url.startsWith("/students")) return { data: [student], total: 1, page: 1, pages: 1, limit: 50 };
  if (url.startsWith("/departments")) return { data: [department] };
  if (url.startsWith("/faculty")) return { data: [{ _id: "f1", employeeId: "FAC001", isActive: true, userId: { name: "Dr. Priya Sharma", email: "p@c.edu" } }], total: 1 };
  if (url.startsWith("/sections")) return { data: [student.sectionId] };
  if (url.startsWith("/subjects")) return { data: [{ _id: "su1", subjectName: "Data Structures", subjectCode: "CS201", semester: 3, credits: 4, isActive: true, teacherCount: 1 }] };
  if (url.startsWith("/assignments")) return { data: [] };
  if (url.startsWith("/admin/active-lectures")) return { data: [{ id: "l1", topic: "Trees & Graphs", faculty: "Dr. Priya Sharma", subject: "Data Structures", subjectCode: "CS201", section: "A", startTime: new Date().toISOString(), elapsedMin: 12, presentCount: 23 }] };
  if (url.startsWith("/api/device/admin/pending")) return { data: [] };
  if (url.startsWith("/api/audit")) return { data: [] };
  if (url.startsWith("/api/report/admin/attendance-summary")) return { data: report(url) };
  if (url.startsWith("/api/leave/mentor/mentees/")) return { data: { student: { mentorHistory: [] }, summary: { totalLectures: 10, present: 8, absent: 2, percentage: 80 }, subjectBreakdown: [], recent: [], leaves: [] } };
  return { data: [] };
};

vi.mock("../utils/api.js", () => ({
  __esModule: true,
  clearApiCache: vi.fn(),
  default: {
    get: vi.fn(async (url) => { calls.get.push(url); return { data: { success: true, ...routes(url) } }; }),
    post: vi.fn(async (url, body) => { calls.post.push([url, body]); return { data: { success: true, message: "ok" } }; }),
    put: vi.fn(async (url, body) => { calls.put.push([url, body]); return { data: { success: true } }; }),
    delete: vi.fn(async (url) => { calls.delete.push(url); if (url.endsWith("/permanent")) { const e = new Error("in use"); e.response = { status: 409, data: { success: false, code: "IN_USE", message: "This department still has 1 student. Deactivate it instead." } }; throw e; } return { data: { success: true } }; }),
  },
}));

const { default: AdminConsole } = await import("../admin/AdminConsole.jsx");

function renderAt(url) {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { isAuthenticated: true, user: { name: "Admin User", email: "admin@college.edu", role: "ADMIN" }, token: "t" } } });
  return render(<Provider store={store}><MemoryRouter initialEntries={[url]}><AdminConsole /></MemoryRouter></Provider>);
}

beforeEach(() => { Object.values(calls).forEach((a) => a.splice(0)); window.scrollTo = () => {}; });

describe("Admin console — shell", () => {
  it("renders the sidebar groups in plain language and the dashboard by default", async () => {
    renderAt("/admin");
    const nav = screen.getByLabelText("Admin sections");
    for (const label of ["Dashboard", "Departments", "Subjects", "Classes", "Who teaches what", "Faculty", "Students", "Lectures running now", "Login approvals", "Attendance report", "Teaching & mentor map"]) {
      expect(within(nav).getByText(label)).toBeTruthy();
    }
    expect(screen.queryByText(/Trends & analytics/)).toBeNull();
    // the dashboard is a plain to-do list: sentence + one button, no KPI tiles / greeting
    expect(await screen.findByText("What to do")).toBeTruthy();
    expect(screen.getByText("2 students have no mentor.")).toBeTruthy();
    expect(screen.getByText(/Their leave requests and new-device logins cannot be approved/)).toBeTruthy();
    expect(screen.queryByText(/Needs your attention|College setup|Good morning|Good afternoon|Good evening/)).toBeNull();
    // right now + attendance summary in sentences
    expect(screen.getByText(/1 lecture is/)).toBeTruthy();
    expect(screen.getByText("71%")).toBeTruthy();
    expect(screen.getByText(/1 class is below 75%/)).toBeTruthy();
    expect(screen.getByText(/Nothing yet\. Every add, edit and delete will be listed here/)).toBeTruthy();
  });

  it("a to-do button deep-links to the Students page with the matching filter pre-set", async () => {
    renderAt("/admin");
    await screen.findByText("2 students have no mentor.");
    fireEvent.click(screen.getByRole("button", { name: "Show them" }));
    await screen.findByLabelText("Mentor");
    await waitFor(() => expect(calls.get.some((u) => /^\/students\?.*mentor=none/.test(u) && /page=1/.test(u))).toBe(true));
    expect(screen.getByLabelText("Mentor")).toHaveValue("none");
    // the page selector must not leak into the query (that bug emptied the Students page)
    expect(calls.get.some((u) => /^\/students\?.*section=students/.test(u))).toBe(false);
  });

  it("old ?section=analytics links open the new Attendance report", async () => {
    renderAt("/admin?section=analytics");
    expect(await screen.findByRole("heading", { name: "Attendance report" })).toBeTruthy();
  });

  it("REGRESSION: ?section=students is the page selector, never sent to the API as the class filter", async () => {
    renderAt("/admin?section=students");
    await screen.findAllByText("Rahul Verma");
    const studentCalls = calls.get.filter((u) => u.startsWith("/students"));
    expect(studentCalls.length).toBeGreaterThan(0);
    expect(studentCalls.some((u) => /section=students/.test(u))).toBe(false);
  });

  it("the class deep-link travels as ?class= and is read back into the Class filter", async () => {
    renderAt("/admin?section=students&class=none");
    await screen.findByLabelText("Class");
    await waitFor(() => expect(calls.get.some((u) => /^\/students\?.*section=none/.test(u))).toBe(true));
    expect(screen.getByLabelText("Class")).toHaveValue("none");
  });

  it("switches sections through the sidebar and the URL", async () => {
    renderAt("/admin?section=live");
    expect((await screen.findAllByText("Trees & Graphs")).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /End lecture/ }).length).toBeGreaterThan(0);
    fireEvent.click(within(screen.getByLabelText("Admin sections")).getByText("Departments"));
    expect((await screen.findAllByText("Software, systems and AI")).length).toBeGreaterThan(0);
  });
});

describe("Admin console — Students table", () => {
  it("shows the student's phone numbers, class, mentor and full-size labelled action buttons", async () => {
    renderAt("/admin?section=students");
    expect((await screen.findAllByText("Rahul Verma")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("98765 43210").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Parent: 91234 56789/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dr. Priya Sharma").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CSE · A").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^Edit$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /^Delete$/ }).length).toBeGreaterThan(0);
    // secondary actions live behind "More" so the row stays compact
    fireEvent.click(screen.getAllByRole("button", { name: /More actions for Rahul Verma/ })[0]);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /View details/ })).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: /Student status/ })).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: /Deactivate/ })).toBeTruthy();
    // list call used the paginated, populated students endpoint
    expect(calls.get.some((u) => /^\/students\?.*page=1/.test(u) && /limit=50/.test(u))).toBe(true);
  });

  it("Edit opens a form pre-filled from the record (incl. phone) and saves through PUT /student/:id", async () => {
    renderAt("/admin?section=students");
    await screen.findAllByText("Rahul Verma");
    fireEvent.click(screen.getAllByRole("button", { name: /^Edit$/ })[0]);
    const form = await screen.findByRole("dialog");
    expect(within(form).getByDisplayValue("Rahul Verma")).toBeTruthy();
    expect(within(form).getByDisplayValue("9876543210")).toBeTruthy();
    expect(within(form).getByDisplayValue("9123456789")).toBeTruthy();
    expect(within(form).queryByLabelText(/Temporary password/)).toBeNull(); // create-only
    fireEvent.change(within(form).getByDisplayValue("9876543210"), { target: { value: "9000000000" } });
    fireEvent.click(within(form).getByRole("button", { name: /Save changes/ }));
    await waitFor(() => expect(calls.put.length).toBe(1));
    const [url, body] = calls.put[0];
    expect(url).toBe("/student/st1");
    expect(body.phone).toBe("9000000000");
    expect(body.password).toBeUndefined();
    expect(body.rollNumber).toBe("CSE2026001");
  });

  it("Student status drawer posts to /student/:id/lifecycle without deleting anything", async () => {
    renderAt("/admin?section=students");
    await screen.findAllByText("Rahul Verma");
    fireEvent.click(screen.getAllByRole("button", { name: /More actions for Rahul Verma/ })[0]);
    fireEvent.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: /Student status/ }));
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByText(/Nothing is deleted/)).toBeTruthy();
    fireEvent.change(within(dlg).getByLabelText(/New status/), { target: { value: "COMPLETED" } });
    fireEvent.click(within(dlg).getByRole("button", { name: /Save status/ }));
    await waitFor(() => expect(calls.post.length).toBe(1));
    expect(calls.post[0][0]).toBe("/student/st1/lifecycle");
    expect(calls.post[0][1].status).toBe("COMPLETED");
  });

  it("?new=1 opens the create form with the password field", async () => {
    renderAt("/admin?section=students&new=1");
    const form = await screen.findByRole("dialog");
    expect(within(form).getAllByText(/Add student/i).length).toBeGreaterThan(0);
    expect(within(form).getByLabelText(/Temporary password/)).toBeTruthy();
  });
});

describe("Admin console — delete safety", () => {
  it("Delete asks for confirmation and shows the server's friendly refusal when the record is in use", async () => {
    renderAt("/admin?section=departments");
    expect((await screen.findAllByText("Software, systems and AI")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: /^Delete$/ })[0]);
    const dlg = await screen.findByRole("alertdialog");
    expect(within(dlg).getByText(/Permanently delete this department/)).toBeTruthy();
    fireEvent.click(within(dlg).getByRole("button", { name: /Delete forever/ }));
    expect(await within(dlg).findByRole("alert")).toHaveTextContent(/still has 1 student/);
    expect(calls.delete[0]).toBe("/department/d1/permanent");
  });

  it("Deactivate is reversible: calls DELETE /department/:id, never /permanent", async () => {
    renderAt("/admin?section=departments");
    await screen.findAllByText("Software, systems and AI");
    fireEvent.click(screen.getAllByRole("button", { name: /More actions for Computer Science/ })[0]);
    fireEvent.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: /Deactivate/ }));
    const dlg = await screen.findByRole("alertdialog");
    fireEvent.click(within(dlg).getByRole("button", { name: /^Deactivate$/ }));
    await waitFor(() => expect(calls.delete.length).toBe(1));
    expect(calls.delete[0]).toBe("/department/d1");
  });
});

describe("Admin console — record detail", () => {
  it("clicking a student row opens the detail drawer with attendance from the mentee-detail endpoint", async () => {
    renderAt("/admin?section=students");
    fireEvent.click((await screen.findAllByText("Rahul Verma"))[0]);
    const dlg = await screen.findByRole("dialog");
    expect(await within(dlg).findByText("80%")).toBeTruthy();
    expect(calls.get.some((u) => u.startsWith("/api/leave/mentor/mentees/st1/detail"))).toBe(true);
    expect(calls.get.some((u) => u.startsWith("/api/audit/STUDENT/st1"))).toBe(true);
  });
});

describe("Admin console — Attendance report", () => {
  it("explains the rule, shows one overall number and lowest-first tables with lectures counted", async () => {
    renderAt("/admin?section=attendance-report");
    expect((await screen.findAllByText("71%")).length).toBeGreaterThan(1); // overall + per class/subject/teacher
    expect(screen.getByText(/75% and above is good/)).toBeTruthy();
    expect(screen.getByText("142")).toBeTruthy(); // present
    expect(screen.getByText(/down 7 points/)).toBeTruthy();
    expect(screen.getByText("Week of 12 Oct")).toBeTruthy();
    expect(screen.getByText("Students below 75%")).toBeTruthy();
    expect(screen.getAllByText("Rahul Verma").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5 of 12").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dr. Priya Sharma").length).toBeGreaterThan(0);
    expect(calls.get.some((u) => u === "/api/report/admin/attendance-summary?days=30")).toBe(true);
  });

  it("period buttons re-query the server and an empty period says so in plain words", async () => {
    renderAt("/admin?section=attendance-report");
    await screen.findAllByText("71%");
    fireEvent.click(screen.getByRole("tab", { name: "Last 7 days" }));
    expect(await screen.findByText(/No lectures in the last 7 days/)).toBeTruthy();
    expect(calls.get.some((u) => u === "/api/report/admin/attendance-summary?days=7")).toBe(true);
  });

  it("'Open' on a student below 75% jumps to the Students page searched by roll number", async () => {
    renderAt("/admin?section=attendance-report");
    await screen.findAllByText("71%");
    fireEvent.click(screen.getAllByRole("button", { name: /^Open$/ })[0]);
    await screen.findAllByText("Rahul Verma");
    expect(calls.get.some((u) => /^\/students\?.*search=CSE2026001/.test(u))).toBe(true);
  });
});
