<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/auth.jsx';
=======
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo.jsx"
import LoginImg from "../assets/Loginn.jpeg"; 

>>>>>>> origin/main
import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  EnvelopeIcon,
<<<<<<< HEAD
  ChartBarIcon,
  UserIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
=======
  ShieldCheckIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
>>>>>>> origin/main

const LogIn = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
<<<<<<< HEAD
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  // UI state
=======

  // ---------------- UI + FORM STATE ----------------
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

>>>>>>> origin/main
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

<<<<<<< HEAD
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
=======
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

>>>>>>> origin/main
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

<<<<<<< HEAD
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLocked) {
      alert('Account temporarily locked. Please try again later.');
      return;
    }
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock authentication logic
      const { email, password } = formData;
      
      // Demo credentials
      const validCredentials = [
        { email: 'doctor@pharmalink.com', password: 'pharma123', role: 'doctor', name: 'Dr. Sarah Smith' },
        { email: 'admin@pharmalink.com', password: 'admin123', role: 'admin', name: 'Admin User' },
        { email: 'pharmacist@pharmalink.com', password: 'pharma123', role: 'pharmacist', name: 'John Pharmacist' }
      ];
      
      const user = validCredentials.find(
        cred => cred.email === email && cred.password === password
      );
      
      if (user) {
        // Successful login
        login({
          id: Date.now(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: null,
          lastLogin: new Date().toISOString()
        });
        
        // Save remember me preference
        if (formData.rememberMe) {
          localStorage.setItem('pharmalink_remember', 'true');
          localStorage.setItem('pharmalink_email', email);
        }
        
        navigate('/dashboard');
      } else {
        // Failed login
        setLoginAttempts(prev => prev + 1);
        
        if (loginAttempts >= 2) {
          setIsLocked(true);
          setTimeout(() => setIsLocked(false), 30000); // 30 seconds lockout
          setErrors({ general: 'Too many failed attempts. Account locked for 30 seconds.' });
        } else {
          setErrors({ general: 'Invalid email or password. Please try again.' });
        }
      }
    } catch (error) {
      setErrors({ general: 'An error occurred. Please try again later.' });
=======
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
>>>>>>> origin/main
    } finally {
      setIsLoading(false);
    }
  };

<<<<<<< HEAD
  // Demo credentials helper
  const fillDemoCredentials = (type) => {
    const credentials = {
      doctor: { email: 'doctor@pharmalink.com', password: 'pharma123' },
      admin: { email: 'admin@pharmalink.com', password: 'admin123' },
      pharmacist: { email: 'pharmacist@pharmalink.com', password: 'pharma123' }
    };
    
    setFormData(prev => ({
      ...prev,
      ...credentials[type]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <ChartBarIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to Pharmalink
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your healthcare management platform
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Credentials:</h3>
          <div className="space-y-2 text-xs">
            <button
              onClick={() => fillDemoCredentials('doctor')}
              className="block w-full text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors"
            >
              <strong>Doctor:</strong> doctor@pharmalink.com / pharma123
            </button>
            <button
              onClick={() => fillDemoCredentials('admin')}
              className="block w-full text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors"
            >
              <strong>Admin:</strong> admin@pharmalink.com / admin123
            </button>
            <button
              onClick={() => fillDemoCredentials('pharmacist')}
              className="block w-full text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors"
            >
              <strong>Pharmacist:</strong> pharmacist@pharmalink.com / pharma123
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                <span className="text-sm">{errors.general}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link 
                  to="/forgot-password" 
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
=======
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
>>>>>>> origin/main
                >
                  Forgot password?
                </Link>
              </div>
<<<<<<< HEAD
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isLocked}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white transition-all duration-200 ${
                isLoading || isLocked
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <LockClosedIcon className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
                )}
              </span>
              {isLoading ? 'Signing in...' : isLocked ? 'Account Locked' : 'Sign in'}
            </button>
          </form>

          {/* Additional Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to Pharmalink?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                Create an account
              </Link>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <ShieldCheckIcon className="h-4 w-4" />
            <span>Secured with 256-bit SSL encryption</span>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center space-x-4 text-sm">
          <Link to="/privacy" className="text-gray-500 hover:text-gray-700 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/terms" className="text-gray-500 hover:text-gray-700 transition-colors">
            Terms of Service
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/help" className="text-gray-500 hover:text-gray-700 transition-colors">
            Help
          </Link>
=======

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
>>>>>>> origin/main
        </div>
      </div>
    </div>
  );
};

export default LogIn;
