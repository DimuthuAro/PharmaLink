// src/pages/History.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo.jsx";
import {
  ClockIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { loadHistory, clearHistory, deleteHistoryEntry } from "../utils/historyUtils.js";

const riskMeta = {
  0: {
    label: "Safe",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    card: "bg-emerald-100/40 border-emerald-200 text-emerald-900",
    icon: CheckCircleIcon,
    iconColor: "text-emerald-600",
  },
  1: {
    label: "Moderate",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    card: "bg-amber-100/40 border-amber-200 text-amber-900",
    icon: ExclamationTriangleIcon,
    iconColor: "text-amber-600",
  },
  2: {
    label: "High",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    card: "bg-rose-100/40 border-rose-200 text-rose-900",
    icon: ExclamationTriangleIcon,
    iconColor: "text-rose-600",
  },
};

const History = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Header dropdown
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Redirect to login if someone tries to open /history without auth
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!user?.email) return;
    const h = loadHistory(user.email);
    setHistory(h);
    setLoading(false);
  }, [user?.email]);

  // ✅ click outside + ESC close
  useEffect(() => {
    if (!showUserMenu) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowUserMenu(false);
    };

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

  const formattedHistory = useMemo(
    () =>
      (history || []).map((h) => ({
        ...h,
        time: new Date(h.timestamp).toLocaleString(),
      })),
    [history]
  );

  const handleClear = () => {
    if (!user?.email) return;
    if (!window.confirm("Clear all interaction history for this account?")) return;
    clearHistory(user.email);
    setHistory([]);
  };

  const handleDeleteOne = (entry) => {
    if (!user?.email) return;
    if (!window.confirm("Delete this interaction from history?")) return;
    const updated = deleteHistoryEntry(user.email, entry.id);
    setHistory(updated);
  };

  const handleRecheck = (entry) => {
    navigate("/advisory", {
      state: {
        fromHistory: true,
        drugIndex: entry.drugIndex,
        drugName: entry.drug,
        foodName: entry.food,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/*HEADER (same layout as FoodDrugInteraction) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center">
          {/* LEFT: Brand */}
          <div className="flex items-center gap-3">
            <BrandLogo className="h-7 w-7" />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* RIGHT: Nav + User */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Nav */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigate("/advisory")}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                Food-Drug Interaction Check
              </button>
            </div>

            {/* User Menu (Dashboard style) */}
            <div id="user-menu-wrapper" className="relative">
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu((s) => !s);
                }}
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
              >
                <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-sm">{initials}</span>
                </div>

                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-slate-900">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-slate-500">{roleLabel}</span>
                </div>

                <svg
                  className={`hidden sm:block h-4 w-4 text-slate-400 transition-transform ${
                    showUserMenu ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
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
                      <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 truncate">
                            {user?.name || "User"}
                          </p>
                          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <ShieldCheckIcon className="h-3.5 w-3.5 mr-1" />
                            Secure
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 truncate">
                          {user?.email || "user@example.com"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{roleLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/profile");
                      }}
                      role="menuitem"
                    >
                      <UserCircleIcon className="h-5 w-5 text-slate-400" />
                      Profile
                    </button>

                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/settings");
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
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 bg-blue-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Page title row */}


          {/* Content card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 md:p-7">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <ClockIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Interaction History
                </h1>
                <p className="text-sm text-slate-600 mt-0.5">
                   Review and manage your past food–drug interaction checks.
                </p>

              </div>
            </div>

            <div className="flex items-center gap-2">


              {history.length > 0 && (
                <button
                  onClick={handleClear}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 cursor-pointer"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Clear history
                </button>
              )}
            </div>
          </div>
            {loading ? (
              <p className="text-sm text-slate-600">Loading history…</p>
            ) : formattedHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 border border-blue-100">
                  <ShieldCheckIcon className="h-7 w-7 text-blue-600" />
                </div>
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  No interactions yet
                </h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Start by checking a food–drug interaction. Your results will appear
                  here automatically.
                </p>
                <button
                  onClick={() => navigate("/advisory")}
                  className="mt-4 inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  Go to interaction checker
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formattedHistory.map((entry) => {
                  const meta = riskMeta[entry.risk] || riskMeta[1];
                  const Icon = meta.icon;

                  return (
                    <div
                      key={entry.id}
                      className={`rounded-2xl border p-4 md:p-5 ${meta.card}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        {/* Left */}
                        <div className="min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                              <div className="h-9 w-9 rounded-xl bg-white/70 border border-slate-200 flex items-center justify-center">
                                <Icon className={`h-5 w-5 ${meta.iconColor}`} />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold  text-sm md:text-base wrap-break-words">
                                  {entry.drug} + {entry.food}
                                </h3>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${meta.pill}`}
                                >
                                  {meta.label}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                                {entry.message}
                              </p>

                              <p className="mt-2 text-xs text-slate-600 flex items-center gap-2">
                                <ClockIcon className="h-4 w-4" />
                                {entry.time}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Right actions */}
                        <div className="flex items-center gap-2 md:gap-3 shrink-0 justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteOne(entry)}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 cursor-pointer"
                          >
                            Delete
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRecheck(entry)}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 cursor-pointer"
                          >
                            Re-check this pair
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* footer */}
          <footer className="mt-10 mb-4 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
            <span>© {new Date().getFullYear()} PharmaLink. For academic/research use.</span>
            <span>Always consult a qualified healthcare professional.</span>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default History;
