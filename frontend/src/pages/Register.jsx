import React, { useEffect, useMemo, useState } from "react";
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
  PhoneIcon,
  UserIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const Register = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    age: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    allowMarketing: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getStrength = useMemo(() => {
    const p = passwordStrength;
    if (p <= 1) return { label: "Weak", bar: "bg-red-500", text: "text-red-600", pct: 25 };
    if (p === 2) return { label: "Fair", bar: "bg-yellow-500", text: "text-yellow-700", pct: 45 };
    if (p === 3) return { label: "Good", bar: "bg-blue-500", text: "text-blue-600", pct: 70 };
    return { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600", pct: 100 };
  }, [passwordStrength]);

    const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";

    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Enter a valid email address";

    if (!formData.age) newErrors.age = "Age is required";
    else if (!/^\d+$/.test(String(formData.age)) || Number(formData.age) <= 0)
      newErrors.age = "Enter a valid age";

    if (!formData.phone) newErrors.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) newErrors.phone = "Enter a valid phone number";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";
    else if (passwordStrength < 3)
      newErrors.password = "Use uppercase, lowercase, numbers, and a symbol for a stronger password.";

    if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (!formData.acceptTerms) newErrors.acceptTerms = "Please accept Terms & Privacy Policy";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));

    if (name === "password") setPasswordStrength(calculatePasswordStrength(value));

    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    if (errors.general) setErrors((p) => ({ ...p, general: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      // Your backend register route expects: fullName,email,password
      await authRequest("/api/users/register", {
        method: "POST",
        body: {
          fullName,
          email: formData.email,
          password: formData.password,
          age: Number(formData.age),
          phone: formData.phone, // keep as string (better for leading 0 / +94)
        },
      });

      // Auto login after register
      const data = await authRequest("/api/users/login", {
        method: "POST",
        body: { email: formData.email, password: formData.password },
      });

      login({
        token: data.token,
        user: {
          id: data.user.id,
          name: data.user.fullName,
          email: data.user.email,
          phone: formData.phone,
          age: Number(formData.age),
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        },
      });

      navigate("/dashboard");
    } catch (err) {
      setErrors({ general: err?.error || "Registration failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  return (
    <div className="h-screen overflow-hidden grid lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex relative h-screen">
        <img src={LoginImg} alt="Healthcare technology" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-tr from-slate-950/85 via-slate-900/55 to-slate-900/10" />
        <div className="absolute inset-0 backdrop-blur-[1px]" />

        <div className="relative z-10 p-10 flex flex-col justify-between h-full text-white">
          <div />
          <div className="max-w-xl">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
              Create your PharmaLink account.
            </h1>
            <p className="mt-4 text-base leading-7 text-white/80 max-w-lg">
              Join a secure workspace for interaction checks, nutrition-aware guidance, and prescription validation.
            </p>
          </div>
          <p className="text-xs text-white/60">© {new Date().getFullYear()} PharmaLink — For academic/research use.</p>
        </div>
      </div>

      <div className="h-screen overflow-hidden flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md h-full overflow-y-auto pr-2">
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

            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 h-px w-11/12 bg-slate-200" />
              <h2 className="text-2xl font-extrabold text-slate-900">Create account</h2>
              <p className="text-sm text-slate-600 mt-1">Set up your PharmaLink profile</p>
            </div>

            {errors.general && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                <span>{errors.general}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">First name</label>
                  <div className="relative">
                    <UserIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="First name"
                      className={`w-full rounded-2xl border px-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.firstName ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                      }`}
                    />
                  </div>
                  {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Last name</label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last name"
                    className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.lastName ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                    }`}
                  />
                  {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
                </div>
              </div>

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

              {/* Age */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Age</label>
                <input
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="e.g. 24"
                  className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.age ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                  }`}
                />
                {errors.age && <p className="mt-1 text-xs text-red-600">{errors.age}</p>}
              </div>

              {/* Phone + Org */}
              <div className="grid grid-cols-1  gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Phone</label>
                  <div className="relative">
                    <PhoneIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+94 7X XXX XXXX"
                    className={`w-full rounded-2xl border px-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                    }`}
                  />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Password</label>
                  <div className="relative">
                    <LockClosedIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create password"
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

                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all ${getStrength.bar}`} style={{ width: `${getStrength.pct}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${getStrength.text}`}>{getStrength.label}</span>
                      </div>
                    </div>
                  )}

                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Confirm</label>
                  <div className="relative">
                    <LockClosedIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm password"
                      className={`w-full rounded-2xl border px-10 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.confirmPassword ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>

                  {formData.confirmPassword && (
                    <div className="mt-2 flex items-center gap-2">
                      {passwordMatch ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                          <span className="text-xs text-emerald-600 font-semibold">Match</span>
                        </>
                      ) : (
                        <>
                          <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
                          <span className="text-xs text-red-600 font-semibold">No match</span>
                        </>
                      )}
                    </div>
                  )}

                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-3">
                <div>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      name="acceptTerms"
                      type="checkbox"
                      checked={formData.acceptTerms}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      I agree to the{" "}
                      <Link to="/terms" className="font-semibold text-blue-600 hover:text-blue-700">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="font-semibold text-blue-600 hover:text-blue-700">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                  {errors.acceptTerms && <p className="mt-1 text-xs text-red-600">{errors.acceptTerms}</p>}
                </div>

                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    name="allowMarketing"
                    type="checkbox"
                    checked={formData.allowMarketing}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Send me product updates and healthcare insights (optional)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-2xl py-3 text-sm font-semibold text-white shadow-sm transition ${
                  isLoading ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
                }`}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                    Sign in
                  </Link>
                </p>
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

export default Register;
