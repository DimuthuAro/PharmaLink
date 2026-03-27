// main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./main.css";
import RouteList from "./RouteList.jsx";
import { AuthProvider } from "./auth/auth.jsx";
import {initTheme} from "./utils/theme.js";

initTheme();

const savedTheme = localStorage.getItem("pharmalink_dark_mode");
if (savedTheme === "true") document.documentElement.classList.add("dark");
else document.documentElement.classList.remove("dark");

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <StrictMode>
      <RouteList />
    </StrictMode>
  </AuthProvider>
);
