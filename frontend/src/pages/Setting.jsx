import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import { USERS } from "../data/users.js";

import {
  ShieldCheckIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PhotoIcon,
  PencilSquareIcon,
  PhoneIcon,
  EnvelopeIcon,
  KeyIcon,
  MoonIcon,
  BellIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const PROFILE_LOG_KEY = "pharmlink_profile_log_v1";

// ---------- helpers for history ----------
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

const Section = ({ title, desc, children }) => (
  <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 md:p-6">
    <div className="mb-4">
      <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
        {title}
      </h2>
      {desc && (
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          {desc}
        </p>
      )}
    </div>
    {children}
  </div>
);

const Toggle = ({ value, onChange, label, desc, Icon }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3">
    <div className="min-w-0 flex items-start gap-3">
      {Icon && <Icon className="h-5 w-5 text-slate-500 dark:text-slate-300 mt-0.5" />}
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-50">
          {label}
        </p>
        {desc && (
          <p className="text-sm text-slate-600 dark:text-slate-300">{desc}</p>
        )}
      </div>
    </div>

    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
        value ? "bg-blue-600" : "bg-slate-300"
      }`}
      aria-pressed={value}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

const Settings = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, login, logout } = useAuth();

  // auth guard
  useEffect(() => {
    if (!isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  // dropdown
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  // status banner
  const [status, setStatus] = useState({ type: "", msg: "" });
  const setOk = (msg) => setStatus({ type: "ok", msg });
  const setErr = (msg) => setStatus({ type: "err", msg });

  // profile state
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);

  useEffect(() => {
    setDisplayName(user?.name || "");
    setPhone(user?.phone || "");
    setEmail(user?.email || "");
    setAvatarPreview(user?.avatar || null);
  }, [user?.name, user?.phone, user?.email, user?.avatar]);

  const [selectedAvatarId, setSelectedAvatarId] = useState(() => {
    const found = USERS.find((u) => u.email === user?.email);
    return found?.id || USERS?.[0]?.id || 1;
  });

  useEffect(() => {
    const found = USERS.find((u) => u.email === user?.email);
    if (found?.id) setSelectedAvatarId(found.id);
  }, [user?.email]);

  // notifications
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("pharmalink_settings_notifications");
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem(
      "pharmalink_settings_notifications",
      JSON.stringify(notifications)
    );
  }, [notifications]);

  // dark mode: init + persist + apply to <html>
const [darkMode, setDarkMode] = useState(() => {
  const saved = localStorage.getItem("pharmalink_dark_mode");
  return saved === "true";
});

useEffect(() => {
  const root = document.documentElement;
  root.classList.toggle("dark", darkMode);
  localStorage.setItem("pharmalink_dark_mode", String(darkMode));
}, [darkMode]);


  // password (demo)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // image upload
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return setErr("Upload a valid image.");

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) return setErr("Use an image under 2MB.");

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      setOk("Image selected. Save changes to apply.");
    };
    reader.onerror = () => setErr("Failed to read image.");
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const saveProfileSettings = () => {
    try {
      const trimmed = displayName.trim();
      if (!trimmed) return setErr("Display name cannot be empty.");

      const cleanEmail = email.trim();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return setErr("Please enter a valid email address.");
      }

      const teamAvatar = USERS.find((u) => u.id === selectedAvatarId)?.avatar;

      const nextUser = {
        ...user,
        name: trimmed,
        phone: phone.trim(),
        email: cleanEmail,
        avatar: avatarPreview || teamAvatar || null,
      };

      login(nextUser);
      setOk("Profile saved successfully.");
    } catch {
      setErr("Failed to save settings.");
    }
  };

  const handleChangePassword = () => {
    try {
      if (!user?.password) {
        return setErr("Demo only: no stored password in this session.");
      }

      if (!currentPassword || !newPassword || !confirmPassword) {
        return setErr("Fill all password fields.");
      }

      if (currentPassword !== user.password) {
        return setErr("Current password is incorrect.");
      }

      if (newPassword.length < 6) {
        return setErr("New password must be at least 6 characters.");
      }

      if (newPassword !== confirmPassword) {
        return setErr("New password and confirm password do not match.");
      }

      login({ ...user, password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOk("Password updated (demo/local).");
    } catch {
      setErr("Failed to update password.");
    }
  };

    // Saved Checks History state + loader 
  const [profileLog, setProfileLog] = useState([]);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(PROFILE_LOG_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setProfileLog(Array.isArray(parsed) ? parsed : []);
    } catch {
      setProfileLog([]);
    }
  };

   useEffect(() => {
    loadHistory();

    const onCustomUpdate = () => loadHistory();
    window.addEventListener("pharmlink_profile_log_updated", onCustomUpdate);

    const onStorage = (e) => {
      if (e.key === PROFILE_LOG_KEY) loadHistory();
    };
    window.addEventListener("storage", onStorage);

    const onFocus = () => loadHistory();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("pharmlink_profile_log_updated", onCustomUpdate);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

    const clearHistory = () => {
    if (!window.confirm("Clear saved checks history?")) return;
    localStorage.removeItem(PROFILE_LOG_KEY);
    loadHistory();
  };

  const resetEverythingAndLogout = () => {
    if (!window.confirm("This will log you out and remove local data. Continue?"))
      return;

    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("pharmalink_")
    );
    keys.forEach((k) => localStorage.removeItem(k));
    handleLogout();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* HEADER */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-7 w-7" />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
              >
                Dashboard
              </button>
            </div>

            {/* user dropdown */}
            <div id="user-menu-wrapper" className="relative">
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu((s) => !s);
                }}
              >
                <UserAvatar user={user} size={36} />
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-300">
                    {roleLabel}
                  </span>
                </div>
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-3 w-[320px] rounded-2xl bg-white dark:bg-slate-950 shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 bg-slate-50/70 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl overflow-hidden bg-blue-600 flex items-center justify-center">
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
                        <p className="font-bold text-slate-900 dark:text-slate-50 truncate">
                          {user?.name || "User"}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                          {user?.email || "user@example.com"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {roleLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/profile");
                      }}
                    >
                      <UserCircleIcon className="h-5 w-5 text-slate-400" />
                      Profile
                    </button>

                    <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />

                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition cursor-pointer"
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
      <main className="flex-1 bg-blue-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* status */}
          {status.msg && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm flex items-start gap-2 ${
                status.type === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {status.type === "ok" ? (
                <CheckCircleIcon className="h-5 w-5 mt-0.5" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 mt-0.5" />
              )}
              <span>{status.msg}</span>
            </div>
          )}

          {/* Profile */}
          <Section title="Profile">
            <div className="flex items-center gap-4">
              <UserAvatar
                user={{ ...user, avatar: avatarPreview || user?.avatar }}
                size={64}
                className="ring-1 ring-slate-200 dark:ring-slate-800"
              />
              <div className="min-w-0">
                <p className="text-base font-extrabold text-slate-900 dark:text-slate-50 truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                  {user?.email || "user@example.com"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {roleLabel}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Display name
                </label>
                <div className="relative">
                  <PencilSquareIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Phone number
                </label>
                <div className="relative">
                  <PhoneIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-50"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <EnvelopeIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-50"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Upload profile image
                </label>
                <label className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-blue-700 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer">
                  <PhotoIcon className="h-5 w-5" />
                  Choose image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Avatar
                </label>
                <div className="relative">
                  <PhotoIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedAvatarId}
                    onChange={(e) => setSelectedAvatarId(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-50"
                  >
                    {USERS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={saveProfileSettings}
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Save changes
              </button>
            </div>
          </Section>

           <Section
            title="Saved checks history"
            desc="This is the same history shown on your Profile page."
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                History
              </p>

              {profileLog.length > 0 ? (
                <button
                  onClick={clearHistory}
                  className="text-sm font-bold text-red-600 hover:underline cursor-pointer dark:text-red-300"
                >
                  Clear
                </button>
              ) : null}
            </div>
            {profileLog.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                No saved checks yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {profileLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4
                               dark:border-slate-800 dark:bg-slate-950"
                  >
                    <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                      {prettyTime(entry.timestamp)}
                    </p>
                    <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                      Medications
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(entry.drugs || []).length ? (
                        (entry.drugs || []).map((d, i) => (
                          <Chip key={`${entry.id}-d-${d?.index ?? i}`} tone="blue">
                            {d?.name}
                          </Chip>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          None
                        </span>
                      )}
                    </div>
                    
                    <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                      Allergies
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(entry.allergies || []).length ? (
                        entry.allergies.map((a, i) => (
                          <Chip key={`${entry.id}-a-${a}-${i}`} tone="red">
                            {normalizeAllergyLabel(a)}
                          </Chip>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          None
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Security */}
          <Section title="Security">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Current password
                </label>
                <div className="relative">
                  <KeyIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-50"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleChangePassword}
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
              >
                Update password
              </button>
            </div>
          </Section>

          {/* Display */}
          <Section title="Display settings">
            <div className="space-y-3">
              <Toggle
                value={darkMode}
                onChange={setDarkMode}
                label="Dark mode"
                desc="Enable dark theme across the app."
                Icon={MoonIcon}
              />
              <Toggle
                value={notifications}
                onChange={setNotifications}
                label="Notifications"
                desc="Show tips and reminders."
                Icon={BellIcon}
              />
            </div>
          </Section>

          {/* Danger zone */}
          <Section
            title="Danger zone"
            desc="Remove PharmaLink local data from your browser and sign out."
          >
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-extrabold text-rose-900 flex items-center gap-2">
                <TrashIcon className="h-5 w-5" />
                Reset & Sign out
              </p>
              <p className="text-sm text-rose-800 mt-1">
                This will clear app data from localStorage and log you out.
              </p>

              <button
                onClick={resetEverythingAndLogout}
                className="mt-3 rounded-2xl px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer inline-flex items-center gap-2"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Reset & Sign out
              </button>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
};

export default Settings;
