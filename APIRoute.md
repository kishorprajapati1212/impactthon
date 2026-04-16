### **Academic & Attendance Router Documentation**

---

#### **Admin Endpoints**
* **POST** `/admin/create`
    * **Does:** Creates the initial system administrator.
    * **Body:** `{ name, email, password, mobileNumber }`
    * **Sends:** `{ message, token }`
* **POST** `/admin/login`
    * **Does:** Authenticates an admin user.
    * **Body:** `{ email, password }`
    * **Sends:** `{ message, token }`

---

#### **Faculty Endpoints**
* **POST** `/faculty/create` (Auth: Admin)
    * **Does:** Registers a new faculty member and profile.
    * **Body:** `{ email, mobileNumber, password, employeeId, departmentID }`
    * **Sends:** `{ message, faculty: { id, employeeId, userId } }`
* **POST** `/faculty/login`
    * **Does:** Authenticates a faculty member.
    * **Body:** `{ email, password }`
    * **Sends:** `{ message, token }`

---

#### **Student Endpoints**
* **POST** `/student/create` (Auth: Admin)
    * **Does:** Registers a new student and profile.
    * **Body:** `{ email, password, mobileNumber, enrollmentNo, firstName, lastName, dob, sectionId, mentorFacultyId }`
    * **Sends:** `{ message, token }`
* **POST** `/student/login`
    * **Does:** Authenticates student and binds/verifies device ID.
    * **Body:** `{ email, password }`
    * **Sends:** `{ message, token, student: { enrollmentNo, firstName, lastName } }`

---

#### **Subject Endpoints**
* **POST** `/subject/create` (Auth: Admin)
    * **Does:** Creates a new academic subject.
    * **Body:** `{ subjectName, subjectCode, semester }`
    * **Sends:** `{ message, subject }`

---

#### **Attendance Endpoints**
* **POST** `/student/mark` (Auth: Student)
    * **Does:** Marks attendance for a specific lecture session.
    * **Body:** `{ lectureSessionId, gpsLocation, source }`
    * **Sends:** `{ message }`
* **GET** `/lecture/:lectureSessionId` (Auth: Faculty/Admin)
    * **Does:** Retrieves live attendance stats and present student list for a session.
    * **Params:** `lectureSessionId`
    * **Sends:** `{ lectureSessionId, totalStudents, presentCount, absentCount, presentStudents: [] }`

---

#### **Lecture Session Endpoints**
* **POST** `/lecture/start` (Auth: Faculty/Admin)
    * **Does:** Starts a new lecture session and generates a QR token.
    * **Body:** `{ facultySubjectSectionId, gpsLocation }`
    * **Sends:** `{ message, lecture }`
* **POST** `/lecture/end` (Auth: Faculty/Admin)
    * **Does:** Closes a session, calculates duration, and triggers excel updates.
    * **Body:** `{ lectureSessionId }`
    * **Sends:** `{ message, lecture, report }`

---

#### **Faculty Mapping Endpoints**
* **POST** `/faculty-subject-section` (Auth: Admin)
    * **Does:** Links a faculty member to a specific subject and section.
    * **Body:** `{ facultyId, subjectId, sectionId }`
    * **Sends:** `{ message }`
* **GET** `/faculty/assignments` (Auth: Faculty/Admin)
    * **Does:** Returns all subjects and sections assigned to the logged-in faculty.
    * **Sends:** `{ count, assignments: [{ _id, subjectName, sectionName, ... }] }`