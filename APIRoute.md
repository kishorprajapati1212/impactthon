# API Documentation: University Attendance System

This document outlines the available API endpoints for the University Attendance Management System, categorized by user roles and system functionality.

---

## 1. Admin Endpoints
*Management of system administrators and high-level data.*

| Endpoint | Method | Auth | Description | Body / Params | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/admin/create` | `POST` | Public | **Initial Setup:** Used to register the first system administrator. | `{ name, email, password, mobileNumber }` | `{ message, token }` |
| `/admin/login` | `POST` | Public | **Authentication:** Validates admin credentials and returns a JWT for subsequent requests. | `{ email, password }` | `{ message, token }` |
| `/admins` | `GET` | Admin | **User List:** Fetches a list of all administrative profiles in the system. | None | `{ message, data: [] }` |
| `/admin/:id` | `GET` | Admin | **Profile Retrieval:** Fetches detailed information for a specific admin user by their ID. | `id` (Param) | `{ message, data: {} }` |
| `/admin/update/:id` | `PUT` | Admin | **Modification:** Updates existing administrator details (name, email, etc.). | `id` (Param), `{ name, email, mobileNumber }` | `{ message, data: {} }` |
| `/admin/delete/:id` | `DELETE` | Admin | **Cleanup:** Permanently removes an Admin profile and its linked User record using a database transaction. | `id` (Param) | `{ message }` |

---

## 2. Faculty Endpoints
*Management of teaching staff and their personal profiles.*

| Endpoint | Method | Auth | Description | Body / Params | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/faculty/create` | `POST` | Admin | **Onboarding:** Registers a new faculty member, creates their profile, and links them to a department. | `{ email, mobileNumber, password, employeeId, departmentID }` | `{ message, faculty: { id, employeeId, userId } }` |
| `/faculty/login` | `POST` | Public | **Authentication:** Verifies faculty credentials and provides a session token. | `{ email, password }` | `{ message, token }` |
| `/faculty/me` | `GET` | Faculty | **Self-Profile:** Allows the logged-in faculty member to view their own profile details. | None | `{ message, data: {} }` |
| `/faculty/:id` | `GET` | Admin | **Data View:** Allows admins to fetch details of a specific faculty member. | `id` (Param) | `{ message, data: {} }` |
| `/faculty/update/:id` | `PUT` | Admin | **Edit Profile:** Updates professional and personal info for faculty. | `id` (Param) | `{ message, data: {} }` |
| `/faculty/delete/:id` | `DELETE` | Admin | **Offboarding:** Removes faculty profile and associated authentication records safely. | `id` (Param) | `{ message }` |

---

## 3. Student Endpoints
*Management of student lifecycle, enrollment, and profiles.*

| Endpoint | Method | Auth | Description | Body / Params | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/student/create` | `POST` | Admin | **Registration:** Creates a new student record, including enrollment number and assigned section. | `{ email, password, mobileNumber, enrollmentNo, firstName, lastName, dob, sectionId, mentorFacultyId, academicYear }` | `{ message, token }` |
| `/student/login` | `POST` | Public | **Secure Login:** Authenticates a student and binds/verifies the device ID to prevent multi-device attendance fraud. | `{ email, password }` | `{ message, token, student: { ... } }` |
| `/student/me` | `GET` | Student | **Self-Profile:** Returns the logged-in student's enrollment and personal information. | None | `{ message, data: {} }` |
| `/students` | `GET` | Admin/ Faculty | **Directory:** Fetches all student records with optional filtering by academic year. | `?year=XXXX` (Query Filter) | `[{ _id, enrollmentNo, ... }]` |
| `/student/:id` | `GET` | Admin/ Faculty | **Record Search:** Retrieves specific student details by unique identifier. | `id` (Param) | `{ message, data: {} }` |
| `/student/update/:id` | `PUT` | Admin | **Updates:** Modifies student profile data or changes their section assignment. | `id` (Param) | `{ message, data: {} }` |
| `/student/delete/:id` | `DELETE` | Admin | **Removal:** Deletes student profile and system user credentials via transaction. | `id` (Param) | `{ message }` |

---

## 4. Academic & Subject Mapping
*Configuration of curriculum and class assignments.*

| Endpoint | Method | Auth | Description | Body / Params | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/subject/create` | `POST` | Admin | **Cataloging:** Adds a new academic subject with its unique code and semester details. | `{ subjectName, subjectCode, semester }` | `{ message, subject }` |
| `/faculty-subject-section` | `POST` | Admin | **Mapping:** Links a faculty member to a specific subject and section for an academic year. | `{ facultyId, subjectId, sectionId, academicYear }` | `{ message }` |

---

## 5. Lecture & Attendance Management
*Core operational endpoints for recording class presence.*

| Endpoint | Method | Auth | Description | Body / Params | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/lecture/start` | `POST` | Faculty/ Admin | **Initiate Session:** Starts a lecture, captures faculty GPS location, and generates a session QR token. | `{ facultySubjectSectionId, gpsLocation }` | `{ message, lecture }` |
| `/student/mark` | `POST` | Student | **Mark Presence:** Marks student as present if GPS location matches and token is valid. | `{ lectureSessionId, gpsLocation, source }` | `{ message }` |
| `/lecture/:lectureSessionId` | `GET` | Faculty/ Admin | **Real-time Tracker:** Provides live stats on how many students are present vs. absent during a session. | `lectureSessionId` (Param) | `{ totalStudents, presentCount, ... }` |
| `/lecture/end` | `POST` | Faculty/ Admin | **Finalize Session:** Ends the lecture, stops attendance marking, and generates an Excel report. | `{ lectureSessionId }` | `{ message, lecture, report }` |

---

## 6. Faculty Insights & Dashboards
*Aggregated reporting and statistics for teaching staff.*

| Endpoint | Method | Auth | Description | Body / Params | Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/faculty/assignments` | `GET` | Faculty/ Admin | **Schedule View:** Lists all subjects and sections assigned to the authenticated faculty member. | None | `{ count, assignments: [] }` |

On the way -----------------------------------

| `/faculty/dashboard-summary` | `GET` | Faculty | **Analytics:** Provides an aggregated overview of total lectures and student counts for a specific year. | `?academicYear=2025-26` | `{ success, count, data: [] }` |
| `/faculty/section-stats/:mappingId` | `GET` | Faculty | **Deep Dive:** Returns detailed attendance reports for a specific class, including year-to-date stats. | `mappingId` (Param) | `{ success, data: { stats: { ... } } }` |