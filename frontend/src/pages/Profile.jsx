import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo.jsx";
import UserAvatar from "../components/UserAvatar.jsx";

import {
  ShieldCheckIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  EnvelopeIcon,
  IdentificationIcon,
  BriefcaseIcon,
  ClipboardDocumentCheckIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm
                  dark:border-slate-800 dark:bg-slate-900/60">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const Chip = ({ children, tone = "slate" }) => {
  const tones = {
    slate:
      "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-800",
    red:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-900/40",
    emerald:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800",
    blue:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const normalizeAllergyLabel = (key) => {
  const map = {
    peanut: "Peanut",
    tree_nut: "Tree nuts",
    milk: "Milk / Dairy",
    egg: "Egg",
    fish: "Fish",
    shellfish: "Shellfish",
    soy: "Soy",
    wheat: "Wheat / Gluten",
    sesame: "Sesame",
  };
  return map[key] || key;
};

const Profile = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const [showUserMenu, setShowUserMenu] = useState(false);

  // stored user data for display
  const [userDrugs, setUserDrugs] = useState([]);
  const [userAllergies, setUserAllergies] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  // Load stored drugs/allergies
  useEffect(() => {
    try {
      const drugs = JSON.parse(localStorage.getItem("pharmlink_user_drugs") || "[]");
      const allergies = JSON.parse(
        localStorage.getItem("pharmlink_user_allergies") || "[]"
      );

      setUserDrugs(Array.isArray(drugs) ? drugs : []);
      setUserAllergies(Array.isArray(allergies) ? allergies : []);
    } catch {
      setUserDrugs([]);
      setUserAllergies([]);
    }
  }, []);

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

  const roleLabel = useMemo(() => {
    const r = (user?.role || "").toLowerCase();
    if (!r) return "Healthcare Professional";
    return r.charAt(0).toUpperCase() + r.slice(1);
  }, [user?.role]);

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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const lastLoginNice = useMemo(() => {
    if (!user?.lastLogin) return "—";
    try {
      return new Date(user.lastLogin).toLocaleString();
    } catch {
      return "—";
    }
  }, [user?.lastLogin]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col
                    dark:bg-slate-950 dark:text-slate-100">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50
                         dark:bg-slate-950 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-7 w-7" />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer
                           dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900"
              >
                Dashboard
              </button>
            </div>

            {/* user dropdown */}
            <div id="user-menu-wrapper" className="relative">
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors border border-transparent cursor-pointer
                           hover:bg-slate-50 hover:border-slate-200
                           dark:hover:bg-slate-900 dark:hover:border-slate-800"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu((s) => !s);
                }}
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
              >
                <UserAvatar user={user} size={36} />
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {roleLabel}
                  </span>
                </div>

                <svg
                  className={`hidden sm:block h-4 w-4 text-slate-400 transition-transform ${
                    showUserMenu ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
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
                  className="absolute right-0 mt-3 w-[320px] rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden z-50
                             dark:bg-slate-950 dark:border-slate-800"
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2">
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer
                                 dark:text-slate-200 dark:hover:bg-slate-900"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/settings");
                      }}
                    >
                      <Cog6ToothIcon className="h-5 w-5 text-slate-400" />
                      Account settings
                    </button>

                    <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />

                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer
                                 dark:text-red-300 dark:hover:bg-red-900/20"
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
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
      <main className="flex-1 bg-blue-50 dark:bg-slate-900/20">
        <div className="max-w-6xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-3">
          {/* LEFT */}
          <section className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden
                            dark:border-slate-800 dark:bg-slate-950">
              <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900
                              dark:from-blue-700 dark:via-indigo-700 dark:to-slate-950" />

              <div className="px-6 pb-6 -mt-10">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div className="flex items-end gap-4">
                    <div className="h-24 w-24 rounded-3xl overflow-hidden border-4 border-white bg-slate-100 shadow-sm
                                    dark:border-slate-950 dark:bg-slate-900">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user?.name || "User"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-700 dark:text-slate-100 font-extrabold text-xl">
                          {initials}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xl font-extrabold text-white truncate">
                        {user?.name || "User"}
                      </p>
                      <p className="text-sm text-black-200 truncate">
                        {user?.email || "user@example.com"}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-4">
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700
                                         dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
                          <ShieldCheckIcon className="h-4 w-4 mr-1" />
                          Secure session
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate("/settings")}
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer
                                 dark:bg-slate-950 dark:text-slate-200 dark:border-slate-800 dark:hover:bg-slate-900"
                    >
                      Manage settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-red-600 bg-white border border-rose-200 hover:bg-rose-50 cursor-pointer
                                 dark:bg-slate-950 dark:text-red-300 dark:border-red-900/40 dark:hover:bg-red-900/20"
                    >
                      Sign out
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <StatCard icon={IdentificationIcon} label="Role" value={roleLabel} />
                  <StatCard
                    icon={ClipboardDocumentCheckIcon}
                    label="Module Access"
                    value="Interactions • Meal Plans"
                  />
                  <StatCard icon={BriefcaseIcon} label="Last Login" value={lastLoginNice} />
                </div>

                {/* Details */}
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {/* Account info */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4
                                  dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300">
                      Account info
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <EnvelopeIcon className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{user?.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserCircleIcon className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{user?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IdentificationIcon className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{roleLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* PharmaLink notes */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4
                                  dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300">
                      PharmaLink notes
                    </p>
                    <p className="mt-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      Your workspace supports food–drug interaction checks and interaction-aware
                      meal plan generation. Always validate clinical decisions with approved
                      references and a licensed healthcare professional.
                    </p>
                  </div>

                  {/* Active drugs */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4
                                  dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300">
                      Active medications
                    </p>
                  
                    <div className="mt-3">
                      {userDrugs.length === 0 ? (
                        <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 text-slate-400" />
                          <span>No saved medications yet. Add medications on Meal Plan page.</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {userDrugs.map((d, i) => (
                            <div
                              key={`${d.name}-${i}`}
                              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2
                                         dark:border-slate-800 dark:bg-slate-950"
                            >
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {d.name}
                              </p>
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {d.date ? new Date(d.date).toLocaleDateString() : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  


                  {/* Allergies */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4
                                  dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300">
                      Allergies
                    </p>

                    {userAllergies.length === 0 ? (
                      <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 text-slate-400" />
                        <span>No saved allergies yet. Select allergies on Meal Plan page.</span>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {userAllergies.map((a, idx) => (
                          <Chip key={`${a}-${idx}`} tone="red">
                            {normalizeAllergyLabel(a)}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT */}
          <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5
                            dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Quick actions
              </p>
              <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
                Jump to the main modules.
              </p>

              <div className="mt-4 grid gap-2">
                <button
                  onClick={() => navigate("/interaction-check")}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  Drug Interaction Check
                </button>
                <button
                  onClick={() => navigate("/advisory")}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  Food–Drug Interaction Check
                </button>
                <button
                  onClick={() => navigate("/comparator")}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  Cross Brand Comparator
                </button>
                <button
                  onClick={() => navigate("/prescription")}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  Prescription Interpreter
                </button>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-10 mb-4 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 max-w-6xl mx-auto px-4 w-full
                           dark:border-slate-800 dark:text-slate-400">
          <span>© {new Date().getFullYear()} PharmaLink. For academic/research use.</span>
          <span>Always consult a qualified healthcare professional.</span>
        </footer>
      </main>
    </div>
  );
};

export default Profile;
