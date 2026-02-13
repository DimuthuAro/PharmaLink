// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo2.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import { authRequest } from "../utils/api.js";

import {
  HomeIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  EnvelopeIcon,
  IdentificationIcon,
  BriefcaseIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  ClockIcon,
  CheckCircleIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";

const PROFILE_LOG_KEY = "pharmlink_profile_log_v1";
const AVATAR_KEY = "pharmalink_avatar_v1";

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    
    <div className="relative flex items-center gap-4">
      <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#2f2971] to-[#3d3086] flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm font-bold text-slate-900 truncate">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const Chip = ({ children, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    red: "bg-red-50 text-red-700 border-red-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${tones[tone]} transition-all duration-200 hover:shadow-sm`}
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

const prettyTime = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

// recover meds array even if backend accidentally saved { $each: [...] }
const normalizeMedicationNames = (val) => {
  if (Array.isArray(val)) return val.filter(Boolean).map(String);

  // if saved wrongly like: { $each: ["Andol"] }
  if (val && typeof val === "object") {
    const eachArr = val.$each;
    if (Array.isArray(eachArr)) return eachArr.filter(Boolean).map(String);
  }
  return [];
};

// Build unique meds list with "last seen" timestamp for each med (from localStorage history)
const buildMedicationLastSeen = (logArr) => {
  const map = new Map(); // key -> { name, index, lastIso }

  for (const entry of logArr || []) {
    const ts = entry?.timestamp;
    if (!ts) continue;

    const drugs = Array.isArray(entry?.drugs) ? entry.drugs : [];
    for (const d of drugs) {
      const name = d?.name?.trim();
      if (!name) continue;

      const key = d?.index != null ? `i:${d.index}` : `n:${name.toLowerCase()}`;

      const existing = map.get(key);
      if (!existing || new Date(ts) > new Date(existing.lastIso)) {
        map.set(key, { name, index: d?.index ?? null, lastIso: ts });
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastIso) - new Date(a.lastIso)
  );
};

// Convert uploaded file to base64 (for localStorage)
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Profile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, token, logout, setUser } = useAuth();

  const [activeTab, setActiveTab] = useState("profile");
  const [showUserMenu, setShowUserMenu] = useState(false);

  // log state
  const [profileLog, setProfileLog] = useState([]);
  const [activeMedsList, setActiveMedsList] = useState([]);
  const [userAllergies, setUserAllergies] = useState([]);

  // profile data state
  const [loadingMe, setLoadingMe] = useState(false);
  const [meError, setMeError] = useState("");

  // avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);

  // highlight sidebar based on route (design only)
  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith("/dashboard")) setActiveTab("dashboard");
    else if (p.startsWith("/overview")) setActiveTab("overview");
    else if (p.startsWith("/messages")) setActiveTab("messages");
    else if (p.startsWith("/help")) setActiveTab("help");
    else if (p.startsWith("/profile")) setActiveTab("profile");
    else setActiveTab("profile");
  }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  // Load user from backend (/me) + attach avatar from localStorage
  useEffect(() => {
    const loadMe = async () => {
      if (!token) return;
      setLoadingMe(true);
      setMeError("");

      try {
        const data = await authRequest("/api/users/me", { token });
        const savedAvatar = localStorage.getItem(AVATAR_KEY);

        const u = data?.user || {};
        const id = u.id || u._id;

        const medsFromDb = normalizeMedicationNames(u.activeMedicationNames);

        const mappedUser = {
          id,
          name: u.fullName,
          email: u.email,

          age: u.age,
          phone: u.phone,
          allergies: Array.isArray(u.allergies) ? u.allergies : [],
          dietaryPreferences: u.dietaryPreferences || {
            vegetarian: false,
            diabeticFriendly: false,
            lowSodium: false,
          },
          activeMedicationNames: medsFromDb,

          role: user?.role || "user",
          lastLogin: user?.lastLogin || new Date().toISOString(),
          avatar: savedAvatar || user?.avatar || null,
        };

        setUser(mappedUser);

        // set fallback states from DB immediately
        setUserAllergies(mappedUser.allergies);
        setActiveMedsList(
          medsFromDb.map((name) => ({
            name,
            index: null,
            lastIso: u.updatedAt || new Date().toISOString(),
          }))
        );
      } catch (e) {
        setMeError(e?.error || "Failed to load profile.");
        if (e?.error === "Invalid token" || e?.error === "Missing token") {
          logout?.();
          navigate("/");
        }
      } finally {
        setLoadingMe(false);
      }
    };

    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  const lastLoginNice = useMemo(() => {
    if (!user?.lastLogin) return "—";
    try {
      return new Date(user.lastLogin).toLocaleString();
    } catch {
      return "—";
    }
  }, [user?.lastLogin]);

  const handleLogout = () => {
    logout?.();
    navigate("/");
  };

  // Load log and fallback to DB meds/allergies if log is empty
  const loadLog = () => {
    try {
      const raw = localStorage.getItem(PROFILE_LOG_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const logArr = Array.isArray(parsed) ? parsed : [];

      setProfileLog(logArr);

      const latest = logArr[0];

      const allergiesFromLog = Array.isArray(latest?.allergies) ? latest.allergies : [];
      setUserAllergies(allergiesFromLog.length ? allergiesFromLog : user?.allergies || []);

      const medsFromLog = buildMedicationLastSeen(logArr);
      if (medsFromLog.length) {
        setActiveMedsList(medsFromLog);
      } else {
        const fromDb = (user?.activeMedicationNames || []).map((n) => ({
          name: n,
          index: null,
          lastIso: user?.lastLogin || new Date().toISOString(),
        }));
        setActiveMedsList(fromDb);
      }
    } catch {
      setProfileLog([]);
      setUserAllergies(user?.allergies || []);
      setActiveMedsList(
        (user?.activeMedicationNames || []).map((n) => ({
          name: n,
          index: null,
          lastIso: user?.lastLogin || new Date().toISOString(),
        }))
      );
    }
  };

  // keep profile updated when meal-plan saves + storage + focus + when user changes
  useEffect(() => {
    loadLog();

    const onCustomUpdate = () => loadLog();
    window.addEventListener("pharmlink_profile_log_updated", onCustomUpdate);

    const onStorage = (e) => {
      if (e.key === PROFILE_LOG_KEY) loadLog();
    };
    window.addEventListener("storage", onStorage);

    const onFocus = () => loadLog();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("pharmlink_profile_log_updated", onCustomUpdate);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // close user menu when clicking outside
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

  const clearHistory = () => {
    if (!confirm("Clear saved checks history?")) return;
    localStorage.removeItem(PROFILE_LOG_KEY);
    loadLog();
  };

  // Avatar upload handler (localStorage)
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file (png/jpg).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image too large. Please use an image under 2MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const base64 = await fileToBase64(file);
      localStorage.setItem(AVATAR_KEY, base64);

      setUser((prev) => ({
        ...(prev || {}),
        avatar: base64,
      }));
    } catch {
      alert("Failed to upload image.");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const removeAvatar = () => {
    localStorage.removeItem(AVATAR_KEY);
    setUser((prev) => ({
      ...(prev || {}),
      avatar: null,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Layout like Dashboard */}
      <div className="flex">
        {/* ===================== SIDEBAR ===================== */}
        <aside className="hidden md:flex w-72 min-h-screen bg-gradient-to-b from-[#2f2971] via-[#2a246a] to-[#251f5e] text-white flex-col shadow-2xl">
          <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
            <div
              className="shrink-0 flex items-center cursor-pointer group"
              onClick={() => {
                setActiveTab("dashboard");
                navigate("/");
              }}
            >
              <div className="transform group-hover:scale-105 transition-transform duration-200">
                <BrandLogo />
              </div>
            </div>
          </div>

          <nav className="px-4 py-6 space-y-2">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                navigate("/dashboard");
              }}
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
              onClick={() => {
                setActiveTab("overview");
                navigate("/overview");
              }}
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
              onClick={() => {
                setActiveTab("messages");
                navigate("/messages");
              }}
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
              onClick={() => {
                setActiveTab("help");
                navigate("/help");
              }}
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

            <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
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
                <UserCircleIcon className="h-5 w-5" />
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

        {/* ===================== MAIN ===================== */}
        <div className="flex-1">
          {/* Top bar */}
          <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center px-4 md:px-6 sticky top-0 z-40 shadow-sm">
            <div className="md:hidden flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2f2971] to-[#2a246a] text-white flex items-center justify-center shadow-lg">
                <BrandLogo />
              </div>
              <div className="font-extrabold text-slate-900">Profile</div>
            </div>

            <div className="flex-1" />

            {/* User Menu */}
            <div id="user-menu-wrapper" className="relative">
   


            </div>
          </header>

          {/* Page content */}
          <main className="p-4 md:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-3">
              {/* LEFT */}
              <section className="lg:col-span-2 space-y-8">
                {/* Profile Header Card */}
                <div className="rounded-3xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                {/* Cover Image */}
                <div className="relative h-32 bg-gradient-to-r from-[#2f2971] via-[#3d3086] to-[#4a3d9a]">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzAtMS4xMDUuODk1LTIgMi0yczIgLjg5NSAyIDItLjg5NSAyLTIgMi0yLS44OTUtMi0yem0tMjAgMGMwLTEuMTA1Ljg5NS0yIDItMnMyIC44OTUgMiAyLS44OTUgMi0yIDItMi0uODk1LTItMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
                  <div className="absolute left-6 bottom-4 z-10 sm:left-40">
                    <h2 className="text-white text-xl md:text-2xl font-extrabold leading-tight">
                      {loadingMe ? "Loading..." : (user?.name || "User")}
                    </h2>
                  </div>
                </div>


                  <div className="px-6 md:px-8 pb-8 -mt-12">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-6">
                      {/* Avatar */}
                      <div className="relative group">
                        <div className="h-28 w-28 rounded-3xl overflow-hidden border-4 border-white bg-gradient-to-br from-slate-100 to-slate-50 shadow-xl">
                          {user?.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user?.name || "User"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#2f2971] to-[#3d3086] text-white font-extrabold text-2xl">
                              {initials}
                            </div>
                          )}
                        </div>
                        

                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
                          {user?.name || "User"}
                        </h1>
                        <p className="text-sm text-slate-600 mb-3 flex items-center gap-2">
                          <EnvelopeIcon className="h-4 w-4" />
                          {user?.email || "user@example.com"}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                            <ShieldCheckIcon className="h-4 w-4 mr-1.5" />
                            Verified Account
                          </span>

                          {avatarUploading && (
                            <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">
                              Uploading...
                            </span>
                          )}
                        </div>

                        {loadingMe && (
                          <p className="mt-3 text-sm text-slate-500 flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-[#2f2971] rounded-full" />
                            Loading profile from server...
                          </p>
                        )}
                        {meError && (
                          <p className="mt-3 text-sm text-red-600 font-semibold flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            {meError}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => navigate("/settings")}
                          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 shadow-sm hover:shadow"
                        >
                          <Cog6ToothIcon className="h-4 w-4 inline mr-1.5" />
                          Settings
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="mt-8 grid gap-2 sm:grid-cols-2">
                      <StatCard icon={IdentificationIcon} label="Role" value={roleLabel} />
                      <StatCard 
                        icon={ClipboardDocumentCheckIcon} 
                        label="Module Access" 
                        value="All Features" 
                      />
                      <StatCard 
                        icon={ClockIcon} 
                        label="Last Login" 
                        value={lastLoginNice.split(',')[0] || "Recent"} 
                      />
                    </div>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid gap-8 ">
                  {/* Account Information */}
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2f2971] to-[#3d3086] flex items-center justify-center">
                        <UserCircleIcon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Account Information</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <EnvelopeIcon className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Email</p>
                          <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <UserCircleIcon className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Full Name</p>
                          <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <IdentificationIcon className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Role</p>
                          <p className="text-sm font-medium text-slate-900 truncate">{roleLabel}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Platform Notes */}
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2f2971] to-[#3d3086] flex items-center justify-center">
                        <BriefcaseIcon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Platform Access</h3>
                    </div>
                    
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      Your workspace supports comprehensive drug interaction checks, food–drug interaction analysis, 
                      and intelligent meal plan generation.
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {user?.dietaryPreferences?.vegetarian && (
                        <Chip tone="purple">🥗 Vegetarian</Chip>
                      )}
                      {user?.dietaryPreferences?.diabeticFriendly && (
                        <Chip tone="purple">🩺 Diabetic-friendly</Chip>
                      )}
                      {user?.dietaryPreferences?.lowSodium && (
                        <Chip tone="purple">🧂 Low Sodium</Chip>
                      )}

                      {!user?.dietaryPreferences?.vegetarian &&
                        !user?.dietaryPreferences?.diabeticFriendly &&
                        !user?.dietaryPreferences?.lowSodium && (
                        <Chip tone="slate">No dietary preferences set</Chip>
                      )}
                    </div>

                    <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-xs font-semibold text-amber-800 flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        Always validate clinical decisions with a licensed healthcare professional
                      </p>
                    </div>
                  </div>

                  {/* Active Medications */}
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2f2971] to-[#3d3086] flex items-center justify-center">
                          <BeakerIcon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Active Medications</h3>
                      </div>
                      {activeMedsList.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                          {activeMedsList.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                      {activeMedsList.length === 0 ? (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <ExclamationTriangleIcon className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-1">No medications recorded</p>
                            <p className="text-xs text-slate-500">Generate a meal plan to add medications</p>
                          </div>
                        </div>
                      ) : (
                        activeMedsList.map((m, i) => (
                          <div
                            key={`${m.index ?? m.name}-${i}`}
                            className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-[#2f2971] hover:shadow-md transition-all duration-200"
                          >
                            <div className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-[#2f2971] to-[#3d3086] flex items-center justify-center shadow-sm group-hover:shadow-lg group-hover:scale-110 transition-all duration-200">
                              <BeakerIcon className="h-6 w-6 text-white" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font text-slate-900 truncate mb-0.5">
                                {m.name}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <ClockIcon className="h-3 w-3" />
                                {prettyTime(m.lastIso)}
                              </p>
                            </div>

                            <CheckCircleIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Allergies */}
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                          <ExclamationTriangleIcon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Allergies</h3>
                      </div>
                      {userAllergies.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                          {userAllergies.length}
                        </span>
                      )}
                    </div>

                    {userAllergies.length === 0 ? (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <ExclamationTriangleIcon className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-1">No allergies recorded</p>
                          <p className="text-xs text-slate-500">Select allergies on the Meal Plan page</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {userAllergies.map((a, idx) => (
                          <span
                            key={`${a}-${idx}`}
                            className="inline-flex items-center rounded-full border-2 border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 transition-colors duration-200"
                          >
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1.5" />
                            {normalizeAllergyLabel(a)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Clear History Button */}
                {profileLog?.length > 0 && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-sm font-semibold text-slate-600 hover:text-slate-900 underline decoration-2 underline-offset-4 hover:decoration-slate-900 transition-all duration-200"
                    >
                      Clear saved interaction history
                    </button>
                  </div>
                )}
              </section>

              {/* RIGHT SIDEBAR */}
              <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
                {/* Quick Actions */}
                <div className="rounded-3xl border border-slate-200 bg-white shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2f2971] to-[#3d3086] flex items-center justify-center">
                      <ClipboardDocumentCheckIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
                      <p className="text-xs text-slate-500">Access main features</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => navigate("/interaction-check")}
                      className="group w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white bg-gradient-to-r from-[#2f2971] to-[#3d3086] hover:from-[#3d3086] hover:to-[#2f2971] transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between">
                        <span>Drug Interaction Check</span>
                        <ShieldCheckIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    <button
                      onClick={() => navigate("/advisory")}
                      className="group w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white bg-gradient-to-r from-[#2f2971] to-[#3d3086] hover:from-[#3d3086] hover:to-[#2f2971] transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between">
                        <span>Health Advisory Center</span>
                        <BeakerIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    <button
                      onClick={() => navigate("/comparator")}
                      className="group w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white bg-gradient-to-r from-[#2f2971] to-[#3d3086] hover:from-[#3d3086] hover:to-[#2f2971] transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between">
                        <span>Cross Brand Comparator</span>
                        <ChartBarIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    <button
                      onClick={() => navigate("/prescription")}
                      className="group w-full rounded-2xl px-5 py-4 text-sm font-semibold text-white bg-gradient-to-r from-[#2f2971] to-[#3d3086] hover:from-[#3d3086] hover:to-[#2f2971] transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between">
                        <span>Prescription Interpreter</span>
                        <ClipboardDocumentCheckIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Security Notice */}
                <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <ShieldCheckIcon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900 mb-2">Secure & Private</h4>
                      <p className="text-xs text-emerald-700 leading-relaxed">
                        Your health data is encrypted and stored securely. We never share your information 
                        with third parties.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            {/* Footer */}
            <footer className="mt-12 pt-6 border-t border-slate-200 max-w-6xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-4 w-4" />
                  <span>© {new Date().getFullYear()} PharmaLink. All rights reserved.</span>
                </div>
                <span>For academic and research purposes only.</span>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Profile;