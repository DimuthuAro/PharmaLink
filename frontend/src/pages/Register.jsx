import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/brandLogo2.jsx";
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
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

/* ─── styles ─────────────────────────────────────────────────────────────── */
const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --brand:       #2f2971;
    --brand-mid:   #3d378f;
    --brand-light: #4e48a8;
    --brand-pale:  #eeedf8;
    --brand-ghost: #f6f5fc;
    --ink:         #0e0c2a;
    --ink-2:       #3a3860;
    --ink-3:       #7370a0;
    --divider:     #d9d7ee;
    --white:       #ffffff;
    --font-body:   ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --error:       #c0392b;
    --error-bg:    #fdf3f2;
    --error-border:#f5c6c2;
  }

  html, body { height: 100%; font-family: var(--font-body); -webkit-font-smoothing: antialiased; }

  /* ── LAYOUT ── */
  .reg-root {
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: 100vh;
    overflow: hidden;
    background: var(--white);
  }
  @media (max-width: 900px) {
    .reg-root { grid-template-columns: 1fr; }
    .reg-left  { display: none !important; }
  }

  /* ── LEFT PANEL ── */
  .reg-left {
    position: relative;
    overflow: hidden;
  }
  .reg-left-img {
    position: absolute;
    inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    filter: saturate(0.55) brightness(0.62);
    transform: scale(1.04);
    transition: transform 20s ease;
  }
  .reg-left:hover .reg-left-img { transform: scale(1.07); }

  .reg-left-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(160deg, rgba(47,41,113,0.82) 0%, rgba(47,41,113,0.45) 55%, rgba(14,12,42,0.15) 100%);
  }

  .reg-left-deco { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .deco-circle { position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,0.07); }
  .deco-c1 { width: 520px; height: 520px; top: -120px; left: -120px; }
  .deco-c2 { width: 360px; height: 360px; bottom: -80px; right: -80px; }
  .deco-c3 { width: 200px; height: 200px; bottom: 180px; left: 40px; border-color: rgba(255,255,255,0.05); }

  .reg-left-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }

  .reg-left-content {
    position: relative; z-index: 10;
    height: 100%;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 40px 44px;
  }

  .left-brand { display: flex; align-items: center; gap: 10px; }
  .left-brand-name { font-size: 1.3rem; font-weight: 700; color: #fff; letter-spacing: -0.01em; }

  .left-hero-label {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 0.68rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;
    color: rgba(255,255,255,0.7);
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14);
    border-radius: 999px; padding: 5px 14px; margin-bottom: 22px;
  }
  .left-hero-label-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: rgba(255,255,255,0.6);
    animation: pulse 2.4s infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

  .left-hero-h {
    font-size: clamp(1.9rem, 2.8vw, 2.8rem); font-weight: 800;
    color: #fff; line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 16px;
  }
  .left-hero-p {
    font-size: 0.9rem; color: rgba(255,255,255,0.68); line-height: 1.7; max-width: 380px;
  }

  .left-steps { display: flex; flex-direction: column; gap: 12px; margin-top: 36px; }
  .step-chip {
    display: inline-flex; align-items: center; gap: 12px;
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 10px 16px;
    color: rgba(255,255,255,0.82); font-size: 0.8rem; font-weight: 500;
    width: fit-content;
  }
  .step-num {
    width: 24px; height: 24px; border-radius: 7px;
    background: rgba(255,255,255,0.12);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.72rem; font-weight: 700; color: rgba(255,255,255,0.9);
    flex-shrink: 0;
  }

  .left-footer { font-size: 0.7rem; color: rgba(255,255,255,0.38); letter-spacing: 0.02em; }

  /* ── RIGHT PANEL ── */
  .reg-right {
    height: 100vh;
    overflow-y: auto;
    display: flex; align-items: flex-start; justify-content: center;
    background: var(--white);
    padding: 28px 24px 40px;
    position: relative;
  }
  .reg-right::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% -10%, rgba(47,41,113,0.05) 0%, transparent 70%),
      radial-gradient(ellipse 50% 40% at 100% 100%, rgba(47,41,113,0.04) 0%, transparent 60%);
    pointer-events: none;
  }

  .reg-box { position: relative; z-index: 1; width: 100%; max-width: 420px; }

  /* brand row */
  .reg-box-brand {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 24px;
  }
  .reg-box-brand-left { display: flex; align-items: center; gap: 10px; }
  .reg-box-brand-name { font-size: 1.15rem; font-weight: 700; color: var(--brand); letter-spacing: -0.01em; }
  .secure-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 0.67rem; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
    padding: 5px 12px; border-radius: 999px;
    background: var(--brand-ghost); color: var(--brand); border: 1px solid var(--divider);
  }

  /* card */
  .reg-card {
    background: var(--white);
    border: 1px solid var(--divider);
    border-radius: 24px;
    padding: 30px 32px 28px;
    box-shadow:
      0 2px 6px rgba(47,41,113,0.04),
      0 12px 40px rgba(47,41,113,0.08),
      0 40px 80px rgba(47,41,113,0.04);
    position: relative; overflow: hidden;
  }
  .reg-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--brand), var(--brand-light), var(--brand-mid));
  }

  .card-heading { text-align: center; margin-bottom: 24px; }
  .card-heading h2 { font-size: 1.75rem; font-weight: 800; color: var(--ink); letter-spacing: -0.025em; line-height: 1.15; }
  .card-heading h2 span { color: var(--brand); }
  .card-heading p { font-size: 0.84rem; color: var(--ink-3); margin-top: 5px; }

  /* section label */
  .field-section {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--ink-3); margin-bottom: 10px; margin-top: 18px;
    display: flex; align-items: center; gap: 8px;
  }
  .field-section::after { content: ''; flex: 1; height: 1px; background: var(--divider); }

  /* ── FORM ── */
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-group { margin-bottom: 14px; }
  .form-label {
    display: block; font-size: 0.76rem; font-weight: 600;
    color: var(--ink-2); margin-bottom: 6px; letter-spacing: 0.01em;
  }
  .input-wrap { position: relative; }
  .input-icon-l {
    position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
    width: 16px; height: 16px; color: var(--ink-3); pointer-events: none;
  }
  .input-icon-r {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: var(--ink-3);
    display: flex; align-items: center; padding: 2px; transition: color 0.15s;
  }
  .input-icon-r:hover { color: var(--brand); }

  .form-input {
    width: 100%; border-radius: 11px;
    border: 1.5px solid var(--divider);
    background: var(--brand-ghost);
    padding: 11px 13px 11px 38px;
    font-size: 0.855rem; font-family: var(--font-body);
    color: var(--ink); outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .form-input.no-icon { padding-left: 13px; }
  .form-input.has-right { padding-right: 40px; }
  .form-input::placeholder { color: var(--ink-3); }
  .form-input:focus {
    border-color: var(--brand); background: var(--white);
    box-shadow: 0 0 0 3px rgba(47,41,113,0.1);
  }
  .form-input.is-error { border-color: var(--error); background: var(--error-bg); }

  .form-error { font-size: 0.7rem; color: var(--error); margin-top: 4px; }

  /* general error */
  .alert-error {
    display: flex; align-items: flex-start; gap: 10px;
    border-radius: 11px; border: 1px solid var(--error-border);
    background: var(--error-bg); padding: 11px 13px;
    font-size: 0.82rem; color: var(--error); margin-bottom: 16px;
  }
  .alert-error svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }

  /* password strength */
  .strength-bar-track {
    flex: 1; height: 5px; border-radius: 999px;
    background: var(--divider); overflow: hidden;
  }
  .strength-bar-fill { height: 100%; border-radius: 999px; transition: width 0.3s, background 0.3s; }

  /* match indicator */
  .match-row { display: flex; align-items: center; gap: 5px; margin-top: 5px; }
  .match-row svg { width: 14px; height: 14px; flex-shrink: 0; }
  .match-row span { font-size: 0.7rem; font-weight: 600; }

  /* checkbox */
  .check-label {
    display: flex; align-items: flex-start; gap: 9px;
    font-size: 0.8rem; color: var(--ink-2); cursor: pointer; user-select: none;
    line-height: 1.5;
  }
  .check-label input[type="checkbox"] {
    width: 15px; height: 15px; border-radius: 4px;
    accent-color: var(--brand); cursor: pointer; margin-top: 2px; flex-shrink: 0;
  }
  .check-label a { color: var(--brand); font-weight: 600; text-decoration: none; }
  .check-label a:hover { opacity: 0.75; }

  /* submit */
  .btn-submit {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
    border-radius: 11px; border: none;
    padding: 13px 20px; font-size: 0.9rem; font-weight: 600;
    font-family: var(--font-body); color: var(--white);
    background: var(--brand); cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 16px rgba(47,41,113,0.25);
    letter-spacing: 0.01em; position: relative; overflow: hidden;
  }
  .btn-submit::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%);
    pointer-events: none;
  }
  .btn-submit:hover:not(:disabled) {
    background: var(--brand-light);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(47,41,113,0.3);
  }
  .btn-submit:active:not(:disabled) { transform: scale(0.98); }
  .btn-submit:disabled { background: var(--ink-3); cursor: not-allowed; box-shadow: none; }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .signin-row {
    text-align: center; margin-top: 16px;
    font-size: 0.8rem; color: var(--ink-3);
  }
  .signin-row a { color: var(--brand); font-weight: 600; text-decoration: none; }
  .signin-row a:hover { opacity: 0.75; }

  .reg-disclaimer {
    text-align: center; font-size: 0.67rem; color: var(--ink-3);
    margin-top: 16px; line-height: 1.6;
  }
`;

const Register = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", age: "",
    phone: "", password: "", confirmPassword: "",
    acceptTerms: false, allowMarketing: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => { if (isAuthenticated) navigate("/dashboard"); }, [isAuthenticated, navigate]);

  const calculatePasswordStrength = (password) => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };

  const getStrength = useMemo(() => {
    const p = passwordStrength;
    if (p <= 1) return { label: "Weak",   color: "#c0392b", pct: 20 };
    if (p === 2) return { label: "Fair",   color: "#d97706", pct: 45 };
    if (p === 3) return { label: "Good",   color: "#2563eb", pct: 70 };
    return             { label: "Strong", color: "#059669", pct: 100 };
  }, [passwordStrength]);

  const validateForm = () => {
    const e = {};
    if (!formData.firstName.trim()) e.firstName = "First name is required";
    if (!formData.lastName.trim())  e.lastName  = "Last name is required";
    if (!formData.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Enter a valid email address";
    if (!formData.age) e.age = "Age is required";
    else if (!/^\d+$/.test(String(formData.age)) || Number(formData.age) <= 0) e.age = "Enter a valid age";
    if (!formData.phone) e.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) e.phone = "Enter a valid phone number";
    if (!formData.password) e.password = "Password is required";
    else if (formData.password.length < 8) e.password = "Password must be at least 8 characters";
    else if (passwordStrength < 3) e.password = "Use uppercase, lowercase, numbers, and a symbol.";
    if (!formData.confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (formData.password !== formData.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!formData.acceptTerms) e.acceptTerms = "Please accept Terms & Privacy Policy";
    setErrors(e);
    return Object.keys(e).length === 0;
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
      await authRequest("/api/users/register", {
        method: "POST",
        body: { fullName, email: formData.email, password: formData.password, age: Number(formData.age), phone: formData.phone },
      });
      const data = await authRequest("/api/users/login", {
        method: "POST",
        body: { email: formData.email, password: formData.password },
      });
      login({
        token: data.token,
        user: { id: data.user.id, name: data.user.fullName, email: data.user.email, phone: formData.phone, age: Number(formData.age), createdAt: new Date().toISOString(), lastLogin: new Date().toISOString() },
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
    <>
      <style>{css}</style>
      <div className="reg-root">

        {/* ── LEFT PANEL ── */}
        <div className="reg-left">
          <img src={LoginImg} alt="" className="reg-left-img" />
          <div className="reg-left-overlay" />
          <div className="reg-left-deco">
            <div className="deco-circle deco-c1" />
            <div className="deco-circle deco-c2" />
            <div className="deco-circle deco-c3" />
          </div>
          <div className="reg-left-grid" />

          <div className="reg-left-content">
            <div className="left-brand">
              <BrandLogo className="h-8 w-8" />
              
            </div>

            <div>
              <h1 className="left-hero-h">
                Create your PharmaLink account.
              </h1>
              <p className="left-hero-p">
                Join a secure workspace for interaction checks, nutrition-aware guidance, brand comparison, and AI prescription validation.
              </p>

              <div className="left-steps">
                {[
                  { n: "01", label: "Fill in your personal details" },
                  { n: "02", label: "Set a strong, secure password" },
                  { n: "03", label: "Access your clinical dashboard" },
                ].map(({ n, label }) => (
                  <div className="step-chip" key={n}>
                    <span className="step-num">{n}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <p className="left-footer">© {new Date().getFullYear()} PharmaLink — For academic/research use only.</p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="reg-right">
          <div className="reg-box">



            {/* card */}
            <div className="reg-card">
              <div className="card-heading">
                <h2>Create <span>account</span></h2>
                <p>Set up your PharmaLink profile</p>
              </div>

              {errors.general && (
                <div className="alert-error">
                  <ExclamationCircleIcon />
                  <span>{errors.general}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>

                {/* Personal */}
                <div className="field-section">Personal info</div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First name</label>
                    <div className="input-wrap">
                      <UserIcon className="input-icon-l" />
                      <input
                        name="firstName" value={formData.firstName}
                        onChange={handleInputChange} placeholder="First name"
                        className={`form-input${errors.firstName ? " is-error" : ""}`}
                      />
                    </div>
                    {errors.firstName && <p className="form-error">{errors.firstName}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Last name</label>
                    <div className="input-wrap">
                      <UserIcon className="input-icon-l" />
                      <input
                        name="lastName" value={formData.lastName}
                        onChange={handleInputChange} placeholder="Last name"
                        className={`form-input${errors.lastName ? " is-error" : ""}`}
                      />
                    </div>
                    {errors.lastName && <p className="form-error">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <div className="input-wrap">
                    <EnvelopeIcon className="input-icon-l" />
                    <input
                      name="email" type="email" autoComplete="email"
                      value={formData.email} onChange={handleInputChange}
                      placeholder="you@hospital.org"
                      className={`form-input${errors.email ? " is-error" : ""}`}
                    />
                  </div>
                  {errors.email && <p className="form-error">{errors.email}</p>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input
                      name="age" value={formData.age}
                      onChange={handleInputChange} placeholder="e.g. 24"
                      className={`form-input no-icon${errors.age ? " is-error" : ""}`}
                    />
                    {errors.age && <p className="form-error">{errors.age}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <div className="input-wrap">
                      <PhoneIcon className="input-icon-l" />
                      <input
                        name="phone" value={formData.phone}
                        onChange={handleInputChange} placeholder="+94 7X XXX XXXX"
                        className={`form-input${errors.phone ? " is-error" : ""}`}
                      />
                    </div>
                    {errors.phone && <p className="form-error">{errors.phone}</p>}
                  </div>
                </div>

                {/* Security */}
                <div className="field-section">Security</div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="input-wrap">
                      <LockClosedIcon className="input-icon-l" />
                      <input
                        name="password" type={showPassword ? "text" : "password"}
                        value={formData.password} onChange={handleInputChange}
                        placeholder="Create password"
                        className={`form-input has-right${errors.password ? " is-error" : ""}`}
                      />
                      <button type="button" className="input-icon-r"
                        onClick={() => setShowPassword(s => !s)} aria-label="Toggle password">
                        {showPassword
                          ? <EyeSlashIcon style={{ width: 16, height: 16 }} />
                          : <EyeIcon style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                    {formData.password && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <div className="strength-bar-track">
                          <div className="strength-bar-fill"
                            style={{ width: `${getStrength.pct}%`, background: getStrength.color }} />
                        </div>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: getStrength.color, whiteSpace: "nowrap" }}>
                          {getStrength.label}
                        </span>
                      </div>
                    )}
                    {errors.password && <p className="form-error">{errors.password}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm</label>
                    <div className="input-wrap">
                      <LockClosedIcon className="input-icon-l" />
                      <input
                        name="confirmPassword" type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword} onChange={handleInputChange}
                        placeholder="Confirm password"
                        className={`form-input has-right${errors.confirmPassword ? " is-error" : ""}`}
                      />
                      <button type="button" className="input-icon-r"
                        onClick={() => setShowConfirmPassword(s => !s)} aria-label="Toggle confirm">
                        {showConfirmPassword
                          ? <EyeSlashIcon style={{ width: 16, height: 16 }} />
                          : <EyeIcon style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                    {formData.confirmPassword && (
                      <div className="match-row">
                        {passwordMatch
                          ? <><CheckCircleIcon style={{ color: "#059669" }} /><span style={{ color: "#059669" }}>Match</span></>
                          : <><ExclamationCircleIcon style={{ color: "#c0392b" }} /><span style={{ color: "#c0392b" }}>No match</span></>}
                      </div>
                    )}
                    {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                  </div>
                </div>

                {/* Terms */}
                <div className="field-section">Agreement</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  <div>
                    <label className="check-label">
                      <input name="acceptTerms" type="checkbox"
                        checked={formData.acceptTerms} onChange={handleInputChange} />
                      I agree to the{" "}
                      <Link to="/terms">Terms</Link>{" "}and{" "}
                      <Link to="/privacy">Privacy Policy</Link>.
                    </label>
                    {errors.acceptTerms && <p className="form-error" style={{ marginTop: 4, marginLeft: 24 }}>{errors.acceptTerms}</p>}
                  </div>
                  <label className="check-label">
                    <input name="allowMarketing" type="checkbox"
                      checked={formData.allowMarketing} onChange={handleInputChange} />
                    Send me product updates and healthcare insights (optional)
                  </label>
                </div>

                {/* Submit */}
                <button type="submit" disabled={isLoading} className="btn-submit">
                  {isLoading
                    ? <><span className="spinner" /> Creating account...</>
                    : <>Create account <ArrowRightIcon style={{ width: 17, height: 17 }} /></>}
                </button>

                <p className="signin-row">
                  Already have an account?{" "}
                  <Link to="/login">Sign in</Link>
                </p>
              </form>
            </div>

            <p className="reg-disclaimer">
              Always consult a qualified healthcare professional.
            </p>
          </div>
        </div>

      </div>
    </>
  );
};

export default Register;