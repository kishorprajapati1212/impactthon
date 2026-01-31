import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import errorHandler from "./middleware/errorHandler.js";
import connectDB from "./config/db.js";
import admin from "./routes/auth/admin.routes.js";
import faculty from "./routes/auth/faculty.routes.js";
import student from "./routes/auth/student.routes.js";
import subject from "./routes/academics/subject.routes.js";
import Department from "./models/Academics/Department.js";
import createFacultySubjectSection from "./routes/mapping/facultySubjectSection.routes.js"
import lectureSession from "./routes/lecture/lectureSession.routes.js"
import Attendance from "./routes/attendance/attendance.routes.js";

// import myCache from "./config/catch.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

await connectDB();

// app.get("/", async()=>{
//   const cacheKey = "all_departments";

//   try {
//     // Check internal memory first
//     const cachedData = myCache.get(cacheKey);
    
//     if (cachedData) {
//       console.log("Serving from Node-Cache");
//       // return res.status(200).json(cachedData); // No JSON.parse needed for node-cache
//     }

//     // Fetch from MongoDB
//     const departments = await Department.find();
//     console.log("Serving from MongoDB");
//     // Save to internal memory
//     myCache.set(cacheKey, departments);

//     // res.status(200).json(departments);
//   } catch (error) {
//     // res.status(500).json({ message: "Error", error });
//   }
// })

app.use(admin);
app.use(faculty);
app.use(student);
app.use(subject);
app.use(createFacultySubjectSection);
app.use(lectureSession);
app.use(Attendance)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async() => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  
});
