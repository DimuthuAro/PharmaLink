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
  <div className="animate-pulse">
    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
    <div className="h-8 bg-slate-200 rounded w-1/2"></div>
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

  // Better quick actions with images + gradients
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
        tint: "from-indigo-600/25 via-blue-600/10 to-transparent",
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
        tint: "from-violet-600/25 via-fuchsia-600/10 to-transparent",
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
        tint: "from-indigo-600/20 via-sky-600/10 to-transparent",
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
        tint: "from-emerald-600/20 via-green-600/10 to-transparent",
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

  // Fix labels/values mix-up
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="flex">
        {/* SIDEBAR */}
        <aside className="hidden md:flex w-72 min-h-screen bg-gradient-to-b from-[#2f2971] via-[#2a246a] to-[#251f5e] text-white flex-col shadow-2xl">
          <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
            <div
              className="shrink-0 flex items-center cursor-pointer"
              onClick={() => handleNavigation("/")}
            >
            <div className="transform group-hover:scale-105 transition-transform duration-200">
                <BrandLogo />
              </div>
            </div>
          </div>

          <nav className="px-4 py-6 space-y-2">
            <button
              onClick={() => handleTabChange("overview")}
              className={`relative w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold transition
                ${
                  activeTab === "overview"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <HomeIcon className="h-5 w-5" />
              Dashboard
            </button>

            <button
              onClick={() => handleTabChange("patients")}
              className={`relative w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold transition
                ${
                  activeTab === "patients"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <ChartBarIcon className="h-5 w-5" />
              Overview
            </button>

            <button
              onClick={() => handleTabChange("messages")}
              className={`relative w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold transition
                ${
                  activeTab === "messages"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              Messages
            </button>

            <button
              onClick={() => handleTabChange("help")}
              className={`relative w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold transition
                ${
                  activeTab === "help"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
              Help & Support
            </button>

            <div className="mt-3 border-t border-white/10 pt-3 space-y-1">
             <button
                onClick={() => {
                  setActiveTab("profile");
                  navigate("/profile");
                }}
                className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                  ${
                    activeTab === "profile"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                  }`}
              >
                <UserCircle className="h-5 w-5" />
                Profile
              </button>


              <button
                onClick={handleLogout}
                className=" relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200 text-white hover:bg-red-500/20 rounded-r-full -ml-4 pl-10"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </nav>
        </aside>

        {/* MAIN */}
        <div className="flex-1">
          {/* TOP BAR */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 sticky top-0 z-40">
            <div className="flex-1" />

            <div className="hidden sm:block w-[420px] max-w-[55vw] relative">
              <Search className="h-5 w-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search here"
                className="w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 ml-4">
              <button
                className="relative p-2 rounded-full hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell className="h-6 w-6 text-slate-500" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-rose-500 rounded-full" />
              </button>

              {/* USER MENU */}
              <div id="user-menu-wrapper" className="relative">
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-full pl-1 pr-3 py-1 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu((s) => !s);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={showUserMenu}
                >
                  <UserAvatar user={user} size={34} />
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-sm font-bold text-slate-900">
                      {user?.name || "User"}
                    </span>
                    <span className="text-xs text-slate-500">{roleLabel}</span>
                  </div>
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-3 w-[320px] rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden z-50"
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="absolute -top-2 right-6 h-4 w-4 rotate-45 bg-white border-l border-t border-slate-200" />

                    <div className="p-4 bg-slate-50/70 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl overflow-hidden bg-indigo-600 flex items-center justify-center">
                          {user?.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user?.name || "User"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-extrabold">
                              {initials}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {user?.name || "User"}
                          </p>
                          <p className="text-sm text-slate-600 truncate">
                            {user?.email || "user@example.com"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {roleLabel}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                        onClick={() => {
                          setShowUserMenu(false);
                          handleNavigation("/profile");
                        }}
                        role="menuitem"
                      >
                        <UserCircle className="h-5 w-5 text-slate-400" />
                        Profile
                      </button>

                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                        onClick={() => {
                          setShowUserMenu(false);
                          handleNavigation("/settings");
                        }}
                        role="menuitem"
                      >
                        <Cog6ToothIcon className="h-5 w-5 text-slate-400" />
                        Account settings
                      </button>

                      <div className="my-2 h-px bg-slate-200" />

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                        role="menuitem"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <main className="p-4 md:p-6">
            {/* WELCOME */}
            <div className="mb-5">
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
                Welcome back, {user?.name?.split(" ")[0] || "User"}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Welcome to your healthcare management dashboard.
              </p>
            </div>

            {/* TOP STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {formattedStats.map((s, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-600 truncate">
                        {s.label}
                      </p>

                      <p className="mt-2 text-3xl font-extrabold text-slate-900">
                        {isLoading ? <span className="opacity-60">…</span> : s.value}
                      </p>
                    </div>

                    <div className="shrink-0 text-sm font-bold text-emerald-600">
                      {s.change}
                    </div>
                  </div>

                  <div className="mt-5 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2a246a] transition-all duration-700"
                      style={{
                        width: isLoading ? "0%" : `${s.progress}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* QUICK ACTIONS + METRICS */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* QUICK ACTIONS */}
              <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-extrabold text-slate-900">
                  Quick Actions
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Jump into core workflows (interaction checks, advisory & more).
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((a) => {
                    const Icon = a.icon;

                    return (
                      <button
                        key={a.id}
                        onClick={() => handleNavigation(a.path)}
                        className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm
                                   hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left"
                      >
                        {/* image header */}
                        <div className="relative h-28">
                          <img
                            src={a.image}
                            alt={a.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />

                          {/* soft gradient overlay */}
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${a.tint}`}
                          />

                          {/* icon badge */}
                          <div
                            className="absolute left-4 top-4 inline-flex items-center justify-center h-11 w-11 rounded-2xl
                                       bg-white/85 backdrop-blur border border-white/60 shadow-sm"
                          >
                            <Icon className="h-6 w-6 text-slate-800" />
                          </div>

                          {/* priority badge */}
                          {a.priority === "high" && (
                            <div className="absolute right-4 top-4">
                              <span
                                className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200
                                           px-2.5 py-1 text-[11px] font-extrabold text-rose-700"
                              >
                                Priority
                              </span>
                            </div>
                          )}
                        </div>

                        {/* body */}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                                {a.title}
                              </h3>
                              <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                                {a.description}
                              </p>
                            </div>

                            <ChevronRightIcon className="h-5 w-5 text-slate-300 group-hover:text-slate-600 transition mt-0.5" />
                          </div>

                          {/* footer */}
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-600">
                              {a.stats}
                            </span>

                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700">
                              Open
                              <span className="inline-block transition-transform group-hover:translate-x-0.5">
                                →
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* hover ring */}
                        <div
                          className="pointer-events-none absolute inset-0 rounded-3xl ring-0 ring-blue-500/0
                                     group-hover:ring-2 group-hover:ring-blue-500/30 transition"
                        />
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* SYSTEM PERFORMANCE */}
              <aside className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-extrabold text-slate-900">
                  System Performance
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Live platform metrics snapshot.
                </div>

                <div className="mt-4 space-y-2">
                  {systemMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <m.icon className="h-4 w-4 text-slate-600" />
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {m.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-slate-900">
                          {m.value}
                        </div>
                        <div className="text-[10px] text-slate-500">{m.change}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            {/* ALERT */}
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-extrabold text-rose-800">
                      High Priority Alert{" "}
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Urgent
                      </span>
                    </div>
                    <button
                      className="text-rose-500 hover:text-rose-700"
                      aria-label="Dismiss alert"
                    >
                      ×
                    </button>
                  </div>

                  <p className="text-sm text-rose-700 mt-2">
                    <b>3 potential drug interactions</b> detected in the last hour
                    requiring immediate review.
                  </p>

                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <button
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-rose-300 bg-white text-rose-700 font-bold text-sm hover:bg-rose-50"
                      onClick={() => handleNavigation("/interaction-check")}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Review Interactions
                    </button>
                    <button className="text-sm font-bold text-rose-700 hover:underline text-left">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <footer className="mt-10 mb-4 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
              <span>© {new Date().getFullYear()} PharmaLink. For academic/research use.</span>
              <span>Always consult a qualified healthcare professional.</span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
};

const DashboardWithSuspense = () => (
  <Suspense
    fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    }
  >
    <Dashboard />
  </Suspense>
);

export default DashboardWithSuspense;
