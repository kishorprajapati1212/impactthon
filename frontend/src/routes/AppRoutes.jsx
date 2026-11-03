import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../pages/Home/LandingPage";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import StudentDashboard from "../pages/Student/Dashboard";
import FacultyDashboard from "../pages/Faculty/Dashboard";
import AdminDashboard from "../pages/Admin/Dashboard";
import ProtectedRoute from "../components/Auth/ProtectedRoute";

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<ProtectedRoute allowedRole="admin"><Register /></ProtectedRoute>} />

    {/* Student */}
    <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />

    {/* Faculty */}
    <Route path="/faculty" element={<ProtectedRoute allowedRole="faculty"><FacultyDashboard /></ProtectedRoute>} />

    {/* Admin - main panel has everything built-in */}
    <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />

    {/* Admin - old standalone pages now live inside the console (bookmarks keep working) */}
    <Route path="/create-department" element={<Navigate to="/admin?section=departments&new=1" replace />} />
    <Route path="/create-subject" element={<Navigate to="/admin?section=subjects&new=1" replace />} />
    <Route path="/create-section" element={<Navigate to="/admin?section=classes&new=1" replace />} />
    <Route path="/assign-faculty" element={<Navigate to="/admin?section=teaching&new=1" replace />} />
    <Route path="/students" element={<Navigate to="/admin?section=students" replace />} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
