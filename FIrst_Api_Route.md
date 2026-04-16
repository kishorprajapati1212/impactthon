### **System API Documentation (Updated)**

---

#### **1. Authentication & Admin**
* **POST** `/admin/create`
    * **Does:** Creates the initial system administrator.
    * **Body:** `{ name, email, password, mobileNumber }`
    * **Sends:** `{ message, token }`
* **POST** `/admin/login`
    * **Does:** Authenticates an admin user.
    * **Body:** `{ email, password }`
    * **Sends:** `{ message, token }`

---

#### **2. Faculty Management**
* **POST** `/faculty/create` (Auth: Admin)
    * **Does:** Registers a new faculty member and profile.
    * **Body:** `{ email, mobileNumber, password, employeeId, departmentID }`
    * **Sends:** `{ message, faculty: { id, employeeId, userId } }`
* **POST** `/faculty/login`
    * **Does:** Authenticates a faculty member.
    * **Body:** `{ email, password }`
    * **Sends:** `{ message, token }`
* **GET** `/faculty` (Auth: Any)
    * **Does:** Lists all faculty with basic user details.
    * **Sends:** `{ message, data: [...] }`
* **GET** `/faculty/me` (Auth: Any)
    * **Does:** Returns the logged-in faculty's full profile and department.
    * **Sends:** `{ message, data: { ... } }`

---

#### **3. Student Management**
* **POST** `/student/create` (Auth: Admin)
    * **Does:** Registers a new student and profile.
    * **Body:** `{ email, password, mobileNumber, enrollmentNo, firstName, lastName, dob, sectionId, mentorFacultyId }`
    * **Sends:** `{ message, token }`
* **POST** `/student/login`
    * **Does:** Authenticates student and binds/verifies device ID.
    * **Body:** `{ email, password }`
    * **Sends:** `{ message, token, student: { enrollmentNo, firstName, lastName } }`
* **GET** `/students` (Auth: Admin/Faculty)
    * **Does:** Lists all students with enrollment and name details.
    * **Sends:** `[ { _id, enrollmentNo, firstName, lastName, ... } ]`

---

#### **4. Academics (Metadata)**
* **POST** `/subject/create` (Auth: Admin)
    * **Does:** Creates a new academic subject.
    * **Body:** `{ subjectName, subjectCode, semester }`
    * **Sends:** `{ message, subject }`
* **GET** `/subjects` (Auth: Any)
    * **Does:** Fetches all available subjects.
    * **Sends:** `{ message, data: [...] }`
* **GET** `/sections` (Auth: Any)
    * **Does:** Fetches all available sections.
    * **Sends:** `{ message, data: [...] }`
* **GET** `/departments` (Auth: Any)
    * **Does:** Fetches all available departments.
    * **Sends:** `{ message, data: [...] }`

---

#### **5. Faculty Assignments & Sessions**
* **POST** `/faculty-subject-section` (Auth: Admin)
    * **Does:** Maps a faculty to a subject and section.
    * **Body:** `{ facultyId, subjectId, sectionId }`
* **GET** `/faculty/assignments` (Auth: Admin/Faculty)
    * **Does:** Returns mappings (Subject/Section) for the logged-in faculty.
* **POST** `/lecture/start` (Auth: Faculty/Admin)
    * **Does:** Starts a session and generates a QR token.
    * **Body:** `{ facultySubjectSectionId, gpsLocation }`
* **POST** `/lecture/end` (Auth: Faculty/Admin)
    * **Does:** Ends session and triggers attendance report/excel sync.
    * **Body:** `{ lectureSessionId }`

---

#### **6. Attendance**
* **POST** `/student/mark` (Auth: Student)
    * **Does:** Marks attendance for an active session.
    * **Body:** `{ lectureSessionId, gpsLocation, source }`
* **GET** `/lecture/:lectureSessionId` (Auth: Faculty/Admin)
    * **Does:** Returns live count and list of present students.