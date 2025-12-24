import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo.jsx"
import LoginImg from "../assets/Loginn.jpeg"; 

import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const LogIn = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // ---------------- UI + FORM STATE ----------------
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // ✅ Demo accordion (collapsed by default to prevent overflow)
  const [showDemo, setShowDemo] = useState(false);

  // ---------------- DEMO USERS ----------------
  const demoUsers = useMemo(
    () => [
      {
        key: "doctor",
        role: "Doctor",
        email: "doctor@pharmalink.com",
        password: "pharma123",
      },
      {
        key: "admin",
        role: "Admin",
        email: "admin@pharmalink.com",
        password: "admin123",
      },
      {
        key: "pharmacist",
        role: "Pharmacist",
        email: "pharmacist@pharmalink.com",
        password: "pharma123",
      },
    ],
    []
  );

  // ---------------- EFFECTS ----------------
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const remembered = localStorage.getItem("pharmalink_remember");
    const rememberedEmail = localStorage.getItem("pharmalink_email");
    if (remembered === "true" && rememberedEmail) {
      setFormData((p) => ({ ...p, email: rememberedEmail, rememberMe: true }));
    }
  }, []);

  // ---------------- HELPERS ----------------
  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Enter a valid email address";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (errors.general) setErrors((prev) => ({ ...prev, general: "" }));
  };

  const fillDemoCredentials = (key) => {
    const u = demoUsers.find((x) => x.key === key);
    if (!u) return;
    setFormData((p) => ({ ...p, email: u.email, password: u.password }));
    setErrors({});
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLocked) {
      setErrors({ general: "Account temporarily locked. Try again in 30 seconds." });
      return;
    }
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 900)); // simulate delay

      const validCredentials = [
        { email: "doctor@pharmalink.com", password: "pharma123", role: "doctor", name: "Dr. Sarah Smith" },
        { email: "admin@pharmalink.com", password: "admin123", role: "admin", name: "Admin User" },
        { email: "pharmacist@pharmalink.com", password: "pharma123", role: "pharmacist", name: "John Pharmacist" },
      ];

      const found = validCredentials.find(
        (c) => c.email === formData.email && c.password === formData.password
      );

      if (!found) {
        setLoginAttempts((p) => p + 1);

        // lock after 3 total tries
        if (loginAttempts >= 2) {
          setIsLocked(true);
          setErrors({ general: "Too many failed attempts. Locked for 30 seconds." });
          setTimeout(() => setIsLocked(false), 30000);
        } else {
          setErrors({ general: "Invalid email or password. Please try again." });
        }
        return;
      }

      // Success
      login({
        id: Date.now(),
        name: found.name,
        email: found.email,
        role: found.role,
        avatar: null,
        lastLogin: new Date().toISOString(),
      });

      if (formData.rememberMe) {
        localStorage.setItem("pharmalink_remember", "true");
        localStorage.setItem("pharmalink_email", formData.email);
      } else {
        localStorage.removeItem("pharmalink_remember");
        localStorage.removeItem("pharmalink_email");
      }

      navigate("/dashboard");
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden grid lg:grid-cols-2 bg-slate-50">
      {/* LEFT (Image / Branding) */}
          <div className="hidden lg:flex relative h-screen">
        <img
          src={LoginImg}
          alt="Healthcare technology"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-tr from-slate-950/85 via-slate-900/55 to-slate-900/10" />
        <div className="absolute inset-0 backdrop-blur-[1px]" />

        <div className="relative z-10 p-10 flex flex-col justify-between h-full text-white">
          <div /> {/* keep top empty (logo moved right) */}

          <div className="max-w-xl">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
              Sign in to continue your clinical workflow.
            </h1>

            <p className="mt-4 text-base leading-7 text-white/80 max-w-lg">
              Centralize interaction checks, nutrition-aware guidance, brand comparison,
              and prescription validation in one secure workspace.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 max-w-lg">
              <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4">
                <p className="text-sm font-semibold">Built for speed</p>
                <p className="text-xs text-white/75 mt-1">
                  Predictable flows, faster decisions.
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4">
                <p className="text-sm font-semibold">Interaction-aware</p>
                <p className="text-xs text-white/75 mt-1">
                  Safer, evidence-informed checks.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} PharmaLink — For academic/research use.
          </p>
        </div>
      </div>
     {/* RIGHT (Form) */}
      <div className="h-screen overflow-hidden flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md max-h-[calc(100vh-48px)] overflow-auto">
          {/* Card */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <BrandLogo className="h-7 w-7" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheckIcon className="h-4 w-4" />
                Secure
              </span>
            </div>

            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 h-px w-95 bg-slate-200"></div>
              <h2 className="text-2xl font-extrabold text-slate-900">Welcome back</h2>
              <p className="text-sm text-slate-600 mt-1">Sign in to your account</p>
            </div>

            {/* Demo accordion */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowDemo((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800"
              >
                <span>Demo credentials</span>
                <ChevronDownIcon
                  className={`h-5 w-5 transition-transform ${showDemo ? "rotate-180" : ""}`}
                />
              </button>

              {showDemo && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-slate-500 mb-3">
                    Click one to auto-fill email + password.
                  </p>

                  <div className="space-y-2">
                    {demoUsers.map((u) => (
                      <button
                        key={u.key}
                        type="button"
                        onClick={() => fillDemoCredentials(u.key)}
                        className="w-full text-left rounded-xl border border-slate-200 bg-white px-3 py-3 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{u.role}</p>
                            <p className="text-xs text-slate-600">{u.email}</p>
                          </div>
                          <span className="text-xs text-slate-500">{u.password}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {/* General error */}
              {errors.general && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <EnvelopeIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="you@hospital.org"
                    className={`w-full rounded-2xl border px-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                    }`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Password
                </label>
                <div className="relative">
                  <LockClosedIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className={`w-full rounded-2xl border px-10 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.password ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Remember me
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || isLocked}
                className={`w-full rounded-2xl py-3 text-sm font-semibold text-white shadow-sm transition ${
                  isLoading || isLocked
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </span>
              </button>
              
              {/* Create account */}
              <div className="pt-2">
                  <Link
                  to="/register"
                  className="w-full inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
                >
                  Create new account
                </Link>
              </div>

              {/* Small footer inside card */}
              <p className="text-[11px] text-slate-500 text-center pt-1">
                By continuing, you agree to our{" "}
                <Link to="/terms" className="text-slate-700 hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-slate-700 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          </div>

          {/* Mobile brand footer */}
          <div className="mt-4 text-center text-xs text-slate-500 lg:hidden">
            © {new Date().getFullYear()} PharmaLink. Always consult a qualified healthcare professional.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogIn;
