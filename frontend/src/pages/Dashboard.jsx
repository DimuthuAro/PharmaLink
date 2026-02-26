// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo2.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import drugImg from "../assets/drug-interaction.png";
import healthImg from "../assets/food-drug.jpeg";
import comparatorImg from "../assets/comparator.jpeg";
import prescriptionImg from "../assets/prescriptionn.jpeg";
import {
  ShieldCheckIcon as ShieldCheck,
  LightBulbIcon as LightBulb,
  ScaleIcon as Scale,
  DocumentTextIcon as DocumentText,
  UserCircleIcon as UserCircle,
  BellIcon as Bell,
  MagnifyingGlassIcon as Search,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  MinusIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  HomeIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[#2f2971] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-slate-600">Loading dashboard...</p>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [stats, setStats] = useState({
    prescriptionsProcessed: 0,
    interactionsChecked: 0,
    costSavings: 0,
    accuracyRate: 0,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  // Simulated API call
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      setStats({
        prescriptionsProcessed: 1247,
        interactionsChecked: 8923,
        costSavings: 45600,
        accuracyRate: 98.7,
      });
      setIsLoading(false);
    };
    fetchDashboardData();
  }, []);

  const handleNavigation = useCallback(
    (path) => {
      navigate(path);
    },
    [navigate]
  );

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  // Close user menu when clicking outside
  useEffect(() => {
    if (!showUserMenu) return;
    const onKeyDown = (e) => e.key === "Escape" && setShowUserMenu(false);
    const onMouseDown = (e) => {
      if (!e.target.closest("#user-menu-wrapper")) setShowUserMenu(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [showUserMenu]);

  // Quick actions
  const quickActions = useMemo(
    () => [
      {
        id: 1,
        title: "Drug Interaction Check",
        description: "Check for potential drug interactions and allergies",
        icon: ShieldCheck,
        path: "/interaction-check",
        stats: `${stats.interactionsChecked.toLocaleString()} checks`,
        priority: "high",
        image: drugImg,
      },
      {
        id: 2,
        title: "Health Advisory Center",
        description: "Smart Healthcare Tools for Food–Drug Safety, Personalized Nutrition & Pill Identification",
        icon: LightBulb,
        path: "/advisory",
        stats: "AI-Powered",
        priority: "medium",
        image: healthImg,
      },
      {
        id: 3,
        title: "Cross-Brand Comparator",
        description: "Compare drug alternatives and costs",
        icon: Scale,
        path: "/comparator",
        stats: "Save up to 80%",
        priority: "medium",
        image: comparatorImg,
      },
      {
        id: 4,
        title: "Prescription Interpreter",
        description: "AI-powered handwritten prescription analysis",
        icon: DocumentText,
        path: "/prescription",
        stats: `${stats.accuracyRate}% accuracy`,
        priority: "high",
        image: prescriptionImg,
      },
    ],
    [stats]
  );

  const systemMetrics = useMemo(
    () => [
      {
        name: "API Response Time",
        value: "124ms",
        change: "+2.1%",
        icon: ArrowTrendingUpIcon,
      },
      {
        name: "Model Accuracy",
        value: "98.7%",
        change: "+0.3%",
        icon: ArrowTrendingUpIcon,
      },
      {
        name: "Uptime",
        value: "99.9%",
        change: "0.0%",
        icon: MinusIcon,
      },
      {
        name: "Active Users",
        value: "247",
        change: "+12.4%",
        icon: ArrowTrendingUpIcon,
      },
    ],
    []
  );

  const formattedStats = useMemo(
    () => [
      {
        label: "Prescriptions Processed",
        value: stats.prescriptionsProcessed.toLocaleString(),
        change: "+12%",
        progress: 25,
      },
      {
        label: "Interactions Checked",
        value: stats.interactionsChecked.toLocaleString(),
        change: "+8%",
        progress: 50,
      },
      {
        label: "Cost Savings",
        value: stats.costSavings.toLocaleString(),
        change: "+23%",
        progress: 75,
      },
      {
        label: "Accuracy Rate",
        value: `${stats.accuracyRate}%`,
        change: "+0.3%",
        progress: 100,
      },
    ],
    [stats]
  );

  const initials = useMemo(() => {
    const name = user?.name?.trim() || "User";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user?.name]);

  const roleLabel = useMemo(() => {
    const r = (user?.role || "").toLowerCase();
    if (!r) return "Healthcare Professional";
    return r.charAt(0).toUpperCase() + r.slice(1);
  }, [user?.role]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-72 min-h-screen bg-gradient-to-b from-[#2f2971] via-[#2a246a] to-[#251f5e] text-white flex-col shadow-2xl">
          <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
            <div
              className="shrink-0 flex items-center cursor-pointer group"
              onClick={() => handleNavigation("/")}
            >
              <div className="transform group-hover:scale-105 transition-transform duration-200">
                <BrandLogo />
              </div>
            </div>
          </div>

        {/* Navigation */}
        <nav className="px-4 py-6 space-y-2">
          <button
            onClick={() => handleTabChange("overview")}
            className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === "overview"
                ? "bg-white text-[#2f2971] rounded-r-full shadow-lg -ml-4 pl-10"
                : "text-white/90 hover:bg-white/10 rounded-r-full -ml-4 pl-10"
            }`}
          >
            <HomeIcon className="w-5 h-5" />
            Dashboard
          </button>

          <button
            onClick={() => handleTabChange("patients")}
            className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === "patients"
                ? "bg-white text-[#2f2971] rounded-r-full shadow-lg -ml-4 pl-10"
                : "text-white/90 hover:bg-white/10 rounded-r-full -ml-4 pl-10"
            }`}
          >
            <ChartBarIcon className="w-5 h-5" />
            Overview
          </button>

          <button
            onClick={() => handleTabChange("messages")}
            className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === "messages"
                ? "bg-white text-[#2f2971] rounded-r-full shadow-lg -ml-4 pl-10"
                : "text-white/90 hover:bg-white/10 rounded-r-full -ml-4 pl-10"
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            Messages
          </button>

          <button
            onClick={() => handleTabChange("help")}
            className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === "help"
                ? "bg-white text-[#2f2971] rounded-r-full shadow-lg -ml-4 pl-10"
                : "text-white/90 hover:bg-white/10 rounded-r-full -ml-4 pl-10"
            }`}
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
            Help & Support
          </button>
        </nav>

        {/* Bottom actions */}
        <div className="px-4 pb-6 space-y-2 border-t border-white/10 pt-4">
          <button
            onClick={() => {
              setActiveTab("profile");
              navigate("/profile");
            }}
            className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === "profile"
                ? "bg-white text-[#2f2971] rounded-r-full shadow-lg -ml-4 pl-10"
                : "text-white/90 hover:bg-white/10 rounded-r-full -ml-4 pl-10"
            }`}
          >
            <UserCircle className="w-5 h-5" />
            My Profile
          </button>

          <button
            onClick={handleLogout}
            className="relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold text-white/90 hover:bg-red-500/20 rounded-r-full transition-all duration-200 -ml-4 pl-10"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-8 py-4">
            {/* Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search patients, prescriptions, drugs..."
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2f2971]/20 focus:border-[#2f2971] transition"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="relative p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* USER MENU */}
              <div id="user-menu-wrapper" className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu((s) => !s);
                  }}
                  className="flex items-center gap-3 pl-3 pr-4 py-2 hover:bg-slate-50 rounded-xl transition group"
                  aria-haspopup="menu"
                  aria-expanded={showUserMenu}
                >
                  <div className="flex items-center gap-3">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover border-2 border-slate-200"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2f2971] to-[#1e1a4a] flex items-center justify-center text-white text-sm font-bold border-2 border-slate-200">
                        {initials}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-900">
                        {user?.name || "User"}
                      </p>
                      <p className="text-xs text-slate-500">{roleLabel}</p>
                    </div>
                  </div>
                  <ChevronRightIcon
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      showUserMenu ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {showUserMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    {/* User info header */}
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2f2971] to-[#1e1a4a] flex items-center justify-center text-white text-base font-bold border-2 border-white shadow-md">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {user?.name || "User"}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {user?.email || "user@example.com"}
                          </p>
                          <p className="text-xs text-[#2f2971] font-medium mt-0.5">
                            {roleLabel}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleNavigation("/profile");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                        role="menuitem"
                      >
                        <UserCircle className="w-5 h-5 text-slate-400" />
                        Profile
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleNavigation("/settings");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                        role="menuitem"
                      >
                        <Cog6ToothIcon className="w-5 h-5 text-slate-400" />
                        Account settings
                      </button>
                    </div>

                    {/* Sign out */}
                    <div className="p-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                        role="menuitem"
                      >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* WELCOME */}
            <div className="bg-gradient-to-br from-[#2f2971] to-[#1e1a4a] rounded-2xl p-8 text-white shadow-lg">
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {user?.name?.split(" ")[0] || "User"}
              </h1>
              <p className="text-white/80 text-sm">
                Welcome to your healthcare management dashboard.
              </p>
            </div>

            {/* TOP STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {formattedStats.map((s, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-sm font-medium text-slate-600">{s.label}</p>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg">
                      {s.change}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-4">
                    {isLoading ? "…" : s.value}
                  </p>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#2f2971] to-[#4a42a0] h-full rounded-full transition-all duration-1000"
                      style={{ width: `${s.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* QUICK ACTIONS + METRICS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* QUICK ACTIONS */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Jump into core workflows (interaction checks, advisory & more).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.id}
                        onClick={() => handleNavigation(a.path)}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left"
                      >
                        {/* Image header */}
                        <div className="relative h-36 overflow-hidden bg-slate-100">
                          <img
                            src={a.image}
                            alt={a.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/20 to-transparent"></div>

                          {/* Icon badge */}
                          <div className="absolute bottom-3 left-3">
                            <div className="w-12 h-12 rounded-xl bg-white shadow-lg flex items-center justify-center">
                              <Icon className="w-6 h-6 text-[#2f2971]" />
                            </div>
                          </div>

                          {/* Priority badge */}
                          {a.priority === "high" && (
                            <div className="absolute top-3 right-3">
                              <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-lg">
                                Priority
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Body */}
                        <div className="p-5">
                          <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-[#2f2971] transition">
                            {a.title}
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed mb-4">
                            {a.description}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-500">{a.stats}</span>
                            <span className="flex items-center gap-1 text-[#2f2971] font-semibold group-hover:gap-2 transition-all">
                              Open
                              <ChevronRightIcon className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>

                        {/* Hover ring */}
                        <div className="absolute inset-0 rounded-2xl ring-2 ring-[#2f2971] opacity-0 group-hover:opacity-100 transition pointer-events-none"></div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SYSTEM PERFORMANCE */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">System Performance</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Live platform metrics snapshot.</p>
                </div>

                <div className="space-y-3">
                  {systemMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-medium text-slate-600">{m.name}</p>
                        <m.icon className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl font-bold text-slate-900">{m.value}</p>
                        <span className="text-xs font-semibold text-emerald-600">
                          {m.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ALERT */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-base font-bold text-red-900">
                        High Priority Alert{" "}
                        <span className="ml-2 px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-lg">
                          Urgent
                        </span>
                      </h3>
                    </div>
                    <button className="text-red-400 hover:text-red-600 transition text-lg font-bold">
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-red-800 mb-4">
                    3 potential drug interactions detected in the last hour requiring immediate review.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleNavigation("/interaction-check")}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition shadow-sm"
                    >
                      Review Interactions
                    </button>
                    <button className="px-4 py-2 bg-white text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition border border-red-200">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="bg-white border-t border-slate-200 px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>
                    © {new Date().getFullYear()} PharmaLink. All rights reserved.
                  </span>
                </div>
                <span>For academic and research purposes only.</span>
              </div>
              
        </footer>
      </main>
    </div>
  );
};

const DashboardWithSuspense = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Dashboard />
  </Suspense>
);

export default DashboardWithSuspense;