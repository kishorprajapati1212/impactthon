import { Routes, Route } from "react-router-dom";
import LandingPage from "../pages/Home/LandingPage";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import StudentDashboard from "../pages/Student/Dashboard";
import FacultyDashboard from "../pages/Faculty/Dashboard";
import AdminDashboard from "../pages/Admin/Dashboard";
import CreateSubject from "../pages/Admin/CreateSubject";
import CreateDepartment from "../pages/Admin/CreateDepartment";
import CreateSection from "../pages/Admin/CreateSection";
import AssignFaculty from "../pages/Admin/AssignFaculty";
import AllStudents from "../pages/Admin/AllStudents";
import ProtectedRoute from "../components/Auth/ProtectedRoute";

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
    <Route path="/faculty" element={<ProtectedRoute allowedRole="faculty"><FacultyDashboard /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
    <Route path="/create-subject" element={<ProtectedRoute allowedRole="admin"><CreateSubject /></ProtectedRoute>} />
    <Route path="/create-department" element={<ProtectedRoute allowedRole="admin"><CreateDepartment /></ProtectedRoute>} />
    <Route path="/create-section" element={<ProtectedRoute allowedRole="admin"><CreateSection /></ProtectedRoute>} />
    <Route path="/assign-faculty" element={<ProtectedRoute allowedRole="admin"><AssignFaculty /></ProtectedRoute>} />
    <Route path="/students" element={<ProtectedRoute allowedRole="admin"><AllStudents /></ProtectedRoute>} />
    <Route path="*" element={<LandingPage />} />
  </Routes>
);
export default AppRoutes;
