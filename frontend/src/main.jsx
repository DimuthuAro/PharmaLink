import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./main.css";
import RouteList from "./RouteList.jsx";
import { AuthProvider } from "./auth/auth.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <AuthProvider>
      <StrictMode>
        <RouteList />
      </StrictMode>
    </AuthProvider>
  </ThemeProvider>
);
