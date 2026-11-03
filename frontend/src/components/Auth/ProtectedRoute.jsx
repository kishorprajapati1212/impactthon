import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

/** Private screens must never be indexed: set robots=noindex while mounted, restore on leave. */
export function useNoIndex(active = true) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return undefined;
    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    const previous = meta.getAttribute("content");
    meta.setAttribute("content", "noindex, nofollow");
    return () => {
      if (created) meta.remove();
      else meta.setAttribute("content", previous || "index, follow");
    };
  }, [active]);
}

const Guarded = ({ children }) => {
  useNoIndex(true);
  return children;
};

const ProtectedRoute = ({ children, allowedRole }) => {
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  const role = user.role?.toLowerCase();
  if (allowedRole && role !== allowedRole.toLowerCase()) return <Navigate to={`/${role}`} replace />;
  return <Guarded>{children}</Guarded>;
};
export default ProtectedRoute;
