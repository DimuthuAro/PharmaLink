import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { protected_routes, unprotected_routes } from "./routes/Routes.jsx";
import { useAuth } from "./auth/auth.jsx";

export default function RouteList() {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {unprotected_routes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}

        {protected_routes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}

        {/* fallback */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
