import React, { useEffect, useState } from "react";
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
  ShieldCheckIcon,
  ExclamationCircleIcon,
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
    --font-display: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-body:    ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --error:       #c0392b;
    --error-bg:    #fdf3f2;
    --error-border:#f5c6c2;
  }

  html, body { height: 100%; font-family: var(--font-body); -webkit-font-smoothing: antialiased; }

  /* ── LAYOUT ── */
  .login-root {
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: 100vh;
    overflow: hidden;
    background: var(--white);
  }
  @media (max-width: 900px) {
    .login-root { grid-template-columns: 1fr; }
    .login-left  { display: none !important; }
  }

  /* ── LEFT PANEL ── */
  .login-left {
    position: relative;
    overflow: hidden;
  }
  .login-left-img {
    position: absolute;
    inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    filter: saturate(0.55) brightness(0.62);
    transform: scale(1.04);
    transition: transform 20s ease;
  }
  .login-left:hover .login-left-img { transform: scale(1.07); }

  /* gradient overlay */
  .login-left-overlay {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(160deg, rgba(47,41,113,0.82) 0%, rgba(47,41,113,0.45) 55%, rgba(14,12,42,0.15) 100%);
  }

  /* decorative circles */
  .login-left-deco {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .deco-circle {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.07);
  }
  .deco-c1 { width: 520px; height: 520px; top: -120px; left: -120px; }
  .deco-c2 { width: 360px; height: 360px; bottom: -80px; right: -80px; }
  .deco-c3 { width: 200px; height: 200px; bottom: 180px; left: 40px; border-color: rgba(255,255,255,0.05); }

  /* grid texture */
  .login-left-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }

  .login-left-content {
    position: relative;
    z-index: 10;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 40px 44px;
  }

  .left-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .left-brand-name {
    font-size: 1.3rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.01em;
  }

  .left-hero {}
  .left-hero-label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.7);
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 999px;
    padding: 5px 14px;
    margin-bottom: 22px;
  }
  .left-hero-label-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.6);
    animation: pulse 2.4s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .left-hero-h {
    font-size: clamp(1.9rem, 2.8vw, 2.8rem);
    font-weight: 800;
    color: #fff;
    line-height: 1.15;
    letter-spacing: -0.02em;
    margin-bottom: 16px;
  }
  .left-hero-h em { font-style: normal; font-weight: 800; opacity: 0.85; }
  .left-hero-p {
    font-size: 0.9rem;
    color: rgba(255,255,255,0.68);
    line-height: 1.7;
    max-width: 380px;
  }

  /* feature chips */
  .left-features {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 36px;
  }
  .feat-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 10px 16px;
    color: rgba(255,255,255,0.82);
    font-size: 0.8rem;
    font-weight: 500;
    width: fit-content;
  }
  .feat-chip-icon {
    width: 28px; height: 28px;
    border-radius: 8px;
    background: rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .feat-chip-icon svg { width: 15px; height: 15px; color: rgba(255,255,255,0.85); }

  .left-footer {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.38);
    letter-spacing: 0.02em;
  }

  /* ── RIGHT PANEL ── */
  .login-right {
    height: 100vh;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--white);
    padding: 32px 24px;
    position: relative;
  }

  /* subtle bg texture */
  .login-right::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% -10%, rgba(47,41,113,0.05) 0%, transparent 70%),
      radial-gradient(ellipse 50% 40% at 100% 100%, rgba(47,41,113,0.04) 0%, transparent 60%);
    pointer-events: none;
  }

  .login-box {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 420px;
  }

  /* top brand row (mobile) */
  .login-box-brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
  }
  .login-box-brand-left { display: flex; align-items: center; gap: 10px; }
  .login-box-brand-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--brand);
    letter-spacing: -0.01em;
  }
  .secure-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.67rem;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 5px 12px;
    border-radius: 999px;
    background: var(--brand-ghost);
    color: var(--brand);
    border: 1px solid var(--divider);
  }
  .secure-badge svg { width: 13px; height: 13px; }

  /* card */
  .login-card {
    background: var(--white);
    border: 1px solid var(--divider);
    border-radius: 24px;
    padding: 36px 36px 32px;
    box-shadow:
      0 2px 6px rgba(47,41,113,0.04),
      0 12px 40px rgba(47,41,113,0.08),
      0 40px 80px rgba(47,41,113,0.04);
    position: relative;
    overflow: hidden;
  }
  /* top accent line */
  .login-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--brand), var(--brand-light), var(--brand-mid));
  }

  .card-heading { text-align: center; margin-bottom: 28px; }
  .card-heading h2 {
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--ink);
    letter-spacing: -0.025em;
    line-height: 1.15;
  }
  .card-heading h2 em { font-style: normal; color: var(--brand); font-weight: 800; }
  .card-heading p {
    font-size: 0.85rem;
    color: var(--ink-3);
    margin-top: 6px;
  }

  /* ── FORM ── */
  .form-group { margin-bottom: 18px; }
  .form-label {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink-2);
    margin-bottom: 7px;
    letter-spacing: 0.01em;
  }
  .input-wrap { position: relative; }
  .input-icon-l {
    position: absolute;
    left: 14px; top: 50%; transform: translateY(-50%);
    width: 17px; height: 17px;
    color: var(--ink-3);
    pointer-events: none;
    flex-shrink: 0;
  }
  .input-icon-r {
    position: absolute;
    right: 13px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: var(--ink-3);
    display: flex; align-items: center;
    padding: 2px;
    transition: color 0.15s;
  }
  .input-icon-r:hover { color: var(--brand); }
  .input-icon-r svg { width: 17px; height: 17px; }

  .form-input {
    width: 100%;
    border-radius: 12px;
    border: 1.5px solid var(--divider);
    background: var(--brand-ghost);
    padding: 12px 14px 12px 40px;
    font-size: 0.875rem;
    font-family: var(--font-body);
    color: var(--ink);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .form-input::placeholder { color: var(--ink-3); }
  .form-input:focus {
    border-color: var(--brand);
    background: var(--white);
    box-shadow: 0 0 0 3px rgba(47,41,113,0.1);
  }
  .form-input.is-error {
    border-color: var(--error);
    background: var(--error-bg);
  }
  .form-input.has-right { padding-right: 42px; }
  .form-error {
    font-size: 0.72rem;
    color: var(--error);
    margin-top: 5px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* general error */
  .alert-error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border-radius: 12px;
    border: 1px solid var(--error-border);
    background: var(--error-bg);
    padding: 12px 14px;
    font-size: 0.82rem;
    color: var(--error);
    margin-bottom: 20px;
  }
  .alert-error svg { width: 17px; height: 17px; flex-shrink: 0; margin-top: 1px; }

  /* remember / forgot row */
  .row-remember {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 22px;
  }
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    color: var(--ink-2);
    cursor: pointer;
    user-select: none;
  }
  .checkbox-label input[type="checkbox"] {
    width: 16px; height: 16px;
    border-radius: 5px;
    accent-color: var(--brand);
    cursor: pointer;
  }
  .forgot-link {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--brand);
    text-decoration: none;
    transition: opacity 0.15s;
  }
  .forgot-link:hover { opacity: 0.75; }

  /* submit btn */
  .btn-submit {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    border: none;
    padding: 13px 20px;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: var(--font-body);
    color: var(--white);
    background: var(--brand);
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 16px rgba(47,41,113,0.25);
    letter-spacing: 0.01em;
    position: relative;
    overflow: hidden;
  }
  .btn-submit::after {
    content: '';
    position: absolute;
    inset: 0;
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
  .btn-submit svg { width: 17px; height: 17px; }

  /* spinner */
  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* divider */
  .or-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 18px 0;
    font-size: 0.72rem;
    color: var(--ink-3);
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .or-divider::before, .or-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--divider);
  }

  /* register btn */
  .btn-register {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    border: 1.5px solid var(--divider);
    padding: 12px 20px;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: var(--font-body);
    color: var(--brand);
    background: var(--brand-ghost);
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
  }
  .btn-register:hover {
    background: var(--brand-pale);
    border-color: var(--brand);
    transform: translateY(-1px);
  }

  /* bottom disclaimer */
  .login-disclaimer {
    text-align: center;
    font-size: 0.68rem;
    color: var(--ink-3);
    margin-top: 20px;
    line-height: 1.6;
  }
  .login-disclaimer a { color: var(--brand); text-decoration: none; }
`;

const LogIn = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => { if (isAuthenticated) navigate("/dashboard"); }, [isAuthenticated, navigate]);

  useEffect(() => {
    const remembered = localStorage.getItem("pharmalink_remember");
    const rememberedEmail = localStorage.getItem("pharmalink_email");
    if (remembered === "true" && rememberedEmail)
      setFormData((p) => ({ ...p, email: rememberedEmail, rememberMe: true }));
  }, []);

  const validateForm = () => {
    const e = {};
    if (!formData.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Enter a valid email address";
    if (!formData.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
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
      login({
        token: data.token,
        user: { id: data.user.id, name: data.user.fullName, email: data.user.email, role: "user", lastLogin: new Date().toISOString() },
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
    <>
      <style>{css}</style>
      <div className="login-root">

        {/* ── LEFT PANEL ── */}
        <div className="login-left">
          <img src={LoginImg} alt="" className="login-left-img" />
          <div className="login-left-overlay" />
          <div className="login-left-deco">
            <div className="deco-circle deco-c1" />
            <div className="deco-circle deco-c2" />
            <div className="deco-circle deco-c3" />
          </div>
          <div className="login-left-grid" />

          <div className="login-left-content">
            {/* brand */}
            <div className="left-brand">
              <BrandLogo className="h-8 w-8" />
            </div>

            {/* hero text */}
            <div className="left-hero">
              <h1 className="left-hero-h">
                Sign in to continue your <em>clinical workflow.</em>
              </h1>
              <p className="left-hero-p">
                Centralize interaction checks, nutrition-aware guidance, brand comparison, and prescription validation — all in one secure workspace.
              </p>

              {/* feature chips */}
              <div className="left-features">
                {[
                  { label: "Drug interaction & allergy detection", icon: <ShieldCheckIcon /> },
                  { label: "Health Advisory Center", icon: <EnvelopeIcon /> },
                  { label: "AI-powered prescription validation", icon: <LockClosedIcon /> },
                  { label: "Cross-brand comparison & nutrition advisory", icon: <EnvelopeIcon /> },
                ].map(({ label, icon }) => (
                  <div className="feat-chip" key={label}>
                    <div className="feat-chip-icon">{icon}</div>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <p className="left-footer">© {new Date().getFullYear()} PharmaLink — For academic/research use only.</p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="login-right">
          <div className="login-box">

            {/* brand row */}
            <div className="login-box-brand">
              <div className="login-box-brand-left">

                <span className="login-box-brand-name">PharmaLink</span>
              </div>
              <div className="secure-badge">
                <ShieldCheckIcon style={{ width: 13, height: 13 }} />
                Secure login
              </div>
            </div>

            {/* card */}
            <div className="login-card">
              <div className="card-heading">
                <h2>Welcome <em>back</em></h2>
                <p>Sign in to access your account</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>

                {/* general error */}
                {errors.general && (
                  <div className="alert-error">
                    <ExclamationCircleIcon />
                    <span>{errors.general}</span>
                  </div>
                )}

                {/* email */}
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <div className="input-wrap">
                    <EnvelopeIcon className="input-icon-l" />
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@hospital.org"
                      className={`form-input${errors.email ? " is-error" : ""}`}
                    />
                  </div>
                  {errors.email && <p className="form-error">{errors.email}</p>}
                </div>

                {/* password */}
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-wrap">
                    <LockClosedIcon className="input-icon-l" />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className={`form-input has-right${errors.password ? " is-error" : ""}`}
                    />
                    <button
                      type="button"
                      className="input-icon-r"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword
                        ? <EyeSlashIcon style={{ width: 17, height: 17 }} />
                        : <EyeIcon style={{ width: 17, height: 17 }} />}
                    </button>
                  </div>
                  {errors.password && <p className="form-error">{errors.password}</p>}
                </div>

                {/* remember / forgot */}
                <div className="row-remember">
                  <label className="checkbox-label">
                    <input
                      name="rememberMe"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                    />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
                </div>

                {/* submit */}
                <button type="submit" disabled={isLoading} className="btn-submit">
                  {isLoading
                    ? <><span className="spinner" /> Signing in...</>
                    : <>Sign in <ArrowRightIcon style={{ width: 17, height: 17 }} /></>}
                </button>

                <div className="or-divider">or</div>

                {/* register */}
                <Link to="/register" className="btn-register">
                  Create a new account
                </Link>
              </form>
            </div>

            <p className="login-disclaimer">
              By signing in, you agree to PharmaLink's{" "}
              <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.<br />
              Always consult a qualified healthcare professional.
            </p>
          </div>
        </div>

      </div>
    </>
  );
};

export default LogIn;