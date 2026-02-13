import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/brandLogo.jsx";
import LoginImg from "../assets/Loginn.jpeg";
import { useAuth } from "../auth/auth.jsx";
import { authRequest } from "../utils/api.js";

import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

const LogIn = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Enter a valid email address";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 1) newErrors.password = "Password must be at least 6 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    if (errors.general) setErrors((p) => ({ ...p, general: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const data = await authRequest("/api/users/login", {
        method: "POST",
        body: { email: formData.email, password: formData.password },
      });

      // backend returns: { token, user: { id, fullName, email } }
      login({
        token: data.token,
        user: {
          id: data.user.id,
          name: data.user.fullName,
          email: data.user.email,
          role: "user",
          lastLogin: new Date().toISOString(),
        },
      });

      if (formData.rememberMe) {
        localStorage.setItem("pharmalink_remember", "true");
        localStorage.setItem("pharmalink_email", formData.email);
      } else {
        localStorage.removeItem("pharmalink_remember");
        localStorage.removeItem("pharmalink_email");
      }

      navigate("/dashboard");
    } catch (err) {
      setErrors({ general: err?.error || "Invalid email or password. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden grid lg:grid-cols-2 bg-slate-50">
      {/* LEFT */}
      <div className="hidden lg:flex relative h-screen">
        <img src={LoginImg} alt="Healthcare technology" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-tr from-slate-950/85 via-slate-900/55 to-slate-900/10" />
        <div className="absolute inset-0 backdrop-blur-[1px]" />

        <div className="relative z-10 p-10 flex flex-col justify-between h-full text-white">
          <div />
          <div className="max-w-xl">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
              Sign in to continue your clinical workflow.
            </h1>
            <p className="mt-4 text-base leading-7 text-white/80 max-w-lg">
              Centralize interaction checks, nutrition-aware guidance, brand comparison, and prescription validation.
            </p>
          </div>
          <p className="text-xs text-white/60">© {new Date().getFullYear()} PharmaLink — For academic/research use.</p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="h-screen overflow-hidden flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md max-h-[calc(100vh-48px)] overflow-auto">
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
              <div className="mx-auto mb-3 h-px w-11/12 bg-slate-200"></div>
              <h2 className="text-2xl font-extrabold text-slate-900">Welcome back</h2>
              <p className="text-sm text-slate-600 mt-1">Sign in to your account</p>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {errors.general && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Email address</label>
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
                <label className="block text-sm font-semibold text-slate-800 mb-2">Password</label>
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
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>

              {/* Remember */}
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
                <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-2xl py-3 text-sm font-semibold text-white shadow-sm transition ${
                  isLoading ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
                }`}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>

              <div className="pt-2">
                <Link
                  to="/register"
                  className="w-full inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
                >
                  Create new account
                </Link>
              </div>
            </form>
          </div>

          <div className="mt-4 text-center text-xs text-slate-500 lg:hidden">
            © {new Date().getFullYear()} PharmaLink.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogIn;
