import React, { useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import BrandLogo from "../components/brandLogo.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import {
    HomeIcon,
    ShieldCheckIcon,
    LightBulbIcon,
    ScaleIcon,
    DocumentTextIcon,
    BeakerIcon,
    ClockIcon,
    UserCircleIcon,
    ArrowRightOnRectangleIcon,
    Cog6ToothIcon,
    SunIcon,
    MoonIcon,
    Bars3Icon,
    XMarkIcon,
    ChevronDownIcon,
    EyeIcon,
    SparklesIcon,
    FireIcon,
} from "@heroicons/react/24/outline";

const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: HomeIcon },
    { id: "interaction-check", label: "Drug Interaction", path: "/interaction-check", icon: ShieldCheckIcon },
    { id: "advisory", label: "Food–Drug Interaction", path: "/advisory", icon: LightBulbIcon },
    { id: "meal-plan", label: "Meal Plan Advisor", path: "/meal-plan", icon: EyeIcon },
    { id: "drug-image", label: "Drug Image Prediction", path: "/drug-image", icon: FireIcon },
    { id: "drug-recommender", label: "Drug Recommender", path: "/drug-recommender", icon: BeakerIcon },
    { id: "treatment-identifier", label: "Treatment Identifier", path: "/treatment-identifier", icon: ShieldCheckIcon },
    { id: "comparator", label: "Cross-Brand Comparator", path: "/comparator", icon: ScaleIcon },
    { id: "prescription", label: "Prescription Interpreter", path: "/prescription", icon: DocumentTextIcon },
    { id: "treatment", label: "Treatment Identifier", path: "/treatment-identifier", icon: SparklesIcon },
    { id: "history", label: "History", path: "/history", icon: ClockIcon },
];

export default function AppLayout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const activeId = useMemo(() => {
        const match = NAV_ITEMS.find((n) => location.pathname.startsWith(n.path));
        return match?.id || "dashboard";
    }, [location.pathname]);

    const handleNav = useCallback((path) => {
        navigate(path);
        setSidebarOpen(false);
    }, [navigate]);

    const handleLogout = useCallback(() => {
        logout();
        navigate("/");
    }, [logout, navigate]);

    const initials = useMemo(() => {
        const name = user?.name?.trim() || "User";
        return name.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
    }, [user?.name]);

    const roleLabel = useMemo(() => {
        const r = (user?.role || "").toLowerCase();
        if (!r) return "Healthcare Professional";
        return r.charAt(0).toUpperCase() + r.slice(1);
    }, [user?.role]);

    /* ---------- Sidebar nav button ---------- */
    const NavBtn = ({ item }) => {
        const Icon = item.icon;
        const active = activeId === item.id;
        return (
            <button
                onClick={() => handleNav(item.path)}
                className={`group relative w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${active
                        ? "bg-white/15 text-white shadow-lg shadow-white/5"
                        : "text-white/70 hover:text-white hover:bg-white/8"
                    }`}
            >
                <Icon className={`h-5 w-5 shrink-0 transition ${active ? "text-white" : "text-white/50 group-hover:text-white/80"}`} />
                <span className="truncate">{item.label}</span>
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />}
            </button>
        );
    };

    /* ---------- Sidebar content (shared between desktop & mobile) ---------- */
    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
                <div className="cursor-pointer" onClick={() => handleNav("/")}>
                    <BrandLogo />
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {NAV_ITEMS.map((item) => (
                    <NavBtn key={item.id} item={item} />
                ))}
            </nav>

            {/* Bottom section */}
            <div className="px-3 pb-4 space-y-1 border-t border-white/10 pt-3 shrink-0">
                <button
                    onClick={() => handleNav("/profile")}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/8 rounded-xl transition"
                >
                    <UserCircleIcon className="h-5 w-5 text-white/50" />
                    My Profile
                </button>
                <button
                    onClick={() => handleNav("/settings")}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/8 rounded-xl transition"
                >
                    <Cog6ToothIcon className="h-5 w-5 text-white/50" />
                    Settings
                </button>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm font-semibold text-red-300 hover:text-red-200 hover:bg-red-500/15 rounded-xl transition"
                >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-300">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                    <aside className="absolute left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-[#2f2971] via-[#2a246a] to-[#1e1a52]">
                        <div className="absolute top-3 right-3">
                            <button onClick={() => setSidebarOpen(false)} className="p-1 text-white/70 hover:text-white">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <SidebarContent />
                    </aside>
                </div>
            )}

            <div className="flex">
                {/* Desktop sidebar */}
                <aside className="hidden md:flex w-64 min-h-screen bg-gradient-to-b from-[#2f2971] via-[#2a246a] to-[#1e1a52] flex-col shadow-2xl sticky top-0 h-screen">
                    <SidebarContent />
                </aside>

                {/* Content area */}
                <div className="flex-1 min-w-0">
                    {/* Top bar */}
                    <header className="h-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
                        {/* Left: hamburger + page title */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800"
                            >
                                <Bars3Icon className="h-5 w-5" />
                            </button>
                            <div className="leading-tight">
                                <div className="text-sm md:text-base font-bold text-[#2f2971] dark:text-indigo-300">
                                    PharmaLink
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-gray-500 hidden sm:block">
                                    Intelligent Healthcare Platform
                                </div>
                            </div>
                        </div>

                        {/* Right: theme toggle + user */}
                        <div className="flex items-center gap-2">
                            {/* Theme toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-xl text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
                                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                            >
                                {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                            </button>

                            {/* User dropdown */}
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowUserMenu((s) => !s); }}
                                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-gray-800 transition border border-transparent hover:border-slate-200 dark:hover:border-gray-700"
                                >
                                    <UserAvatar user={user} size={32} />
                                    <span className="hidden sm:block text-sm font-semibold text-slate-900 dark:text-gray-100 max-w-[120px] truncate">
                                        {user?.name || "User"}
                                    </span>
                                    <ChevronDownIcon className={`hidden sm:block h-4 w-4 text-slate-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
                                </button>

                                {showUserMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                                        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden z-50">
                                            <div className="p-4 bg-slate-50/70 dark:bg-gray-800/70 border-b border-slate-200 dark:border-gray-700">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={user} size={44} />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 dark:text-gray-100 truncate">{user?.name || "User"}</p>
                                                        <p className="text-sm text-slate-600 dark:text-gray-400 truncate">{user?.email || ""}</p>
                                                        <p className="text-xs text-slate-500 dark:text-gray-500">{roleLabel}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-2">
                                                <button onClick={() => { setShowUserMenu(false); handleNav("/profile"); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition">
                                                    <UserCircleIcon className="h-5 w-5 text-slate-400 dark:text-gray-500" /> Profile
                                                </button>
                                                <button onClick={() => { setShowUserMenu(false); handleNav("/settings"); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition">
                                                    <Cog6ToothIcon className="h-5 w-5 text-slate-400 dark:text-gray-500" /> Settings
                                                </button>

                                                {/* Theme row */}
                                                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300 flex items-center gap-3">
                                                        {theme === "dark" ? <MoonIcon className="h-5 w-5 text-slate-400 dark:text-gray-500" /> : <SunIcon className="h-5 w-5 text-slate-400" />}
                                                        Dark Mode
                                                    </span>
                                                    <button
                                                        onClick={toggleTheme}
                                                        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${theme === "dark" ? "bg-indigo-500" : "bg-slate-300"}`}
                                                    >
                                                        <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${theme === "dark" ? "translate-x-[22px]" : "translate-x-0.5"} mt-0.5`} />
                                                    </button>
                                                </div>

                                                <div className="my-2 h-px bg-slate-200 dark:bg-gray-700" />
                                                <button onClick={() => { setShowUserMenu(false); handleLogout(); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                                                    <ArrowRightOnRectangleIcon className="h-5 w-5" /> Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Page content */}
                    <main className="p-4 md:p-6 lg:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
