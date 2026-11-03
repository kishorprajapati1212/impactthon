/**
 * Admin dashboard route — renders the Admin console (src/admin/AdminConsole.jsx).
 * All admin screens live under /admin?section=… so every view is deep-linkable.
 */
import AdminConsole from "../../admin/AdminConsole.jsx";

export default function AdminDashboard() {
  return <AdminConsole />;
}
