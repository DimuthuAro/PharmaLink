// src/pages/FoodDrugInteraction.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo.jsx";

import {
  UserCircleIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

import {
  fetchDrugs,
  fetchFoods,
  checkFoodDrugRisk,
  fetchSafeFoods,
} from "../utils/api.js";

import { loadHistory, addHistoryEntry } from "../utils/historyUtils.js";

const riskColors = {
  0: "bg-emerald-50 text-emerald-900 border-emerald-200",
  1: "bg-amber-50 text-amber-900 border-amber-200",
  2: "bg-rose-50 text-rose-900 border-rose-200",
};

const riskBadge = (r) =>
  r === 0 ? "Safe" : r === 1 ? "Moderate risk" : "High risk";

/** ✅ ONE AutoComplete component */
const AutoComplete = ({ label, placeholder, fetcher, onSelect, value }) => {
  const [query, setQuery] = useState(value || "");
  const [options, setOptions] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const handleSearch = async (val) => {
    setQuery(val);

    if (!val.trim()) {
      setOptions([]);
      setShow(false);
      return;
    }

    setShow(true);
    try {
      setLoading(true);
      const res = await fetcher(val);
      setOptions(res || []);
    } catch (e) {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    const labelText = item?.name || item?.Food || "";
    setQuery(labelText);
    setShow(false);
    setOptions([]);
    onSelect(item);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-slate-800 mb-2">
        {label}
      </label>

      <div className="relative">
        <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-3 border border-slate-200 rounded-2xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
          onBlur={() => setTimeout(() => setShow(false), 150)}
          onFocus={() => {
            if (options.length > 0) setShow(true);
          }}
        />
      </div>

      {show && (
        <div className="absolute z-30 mt-2 w-full bg-white shadow-lg rounded-2xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-3 text-sm text-slate-500">Searching…</div>
          ) : options.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No results</div>
          ) : (
            <div className="max-h-60 overflow-auto">
              {options.map((item) => (
                <button
                  key={item.index ?? item.name ?? item.Food}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(item)}
                >
                  <span className="font-semibold text-slate-900">
                    {item.name || item.Food}
                  </span>

                  {item.contains && (
                    <span className="block text-xs text-slate-500">
                      {item.contains}
                    </span>
                  )}

                  {(item.is_alcohol === 1 || item.is_alcohol === true) && (
                    <span className="ml-2 text-xs text-rose-600 font-semibold">
                      Alcohol
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FoodDrugInteraction = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  const [selectedDrugIndex, setSelectedDrugIndex] = useState(null);
  const [selectedDrugName, setSelectedDrugName] = useState("");
  const [selectedFoodName, setSelectedFoodName] = useState("");

  const [result, setResult] = useState(null);
  const [safeFoods, setSafeFoods] = useState([]);
  const [history, setHistory] = useState([]);

  const [loadingCheck, setLoadingCheck] = useState(false);
  const [error, setError] = useState("");

  /** ✅ Dropdown state */
  const [showUserMenu, setShowUserMenu] = useState(false);

  /** ✅ initials + role label like Dashboard */
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
    navigate("/");
  };

  /** auth guard */
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  /** close dropdown: click outside + ESC */
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

  /** if coming from history */
  useEffect(() => {
    const state = location.state;
    if (state?.fromHistory) {
      const { drugIndex, drugName, foodName } = state;

      if (typeof drugIndex === "number") setSelectedDrugIndex(drugIndex);
      if (drugName) setSelectedDrugName(drugName);
      if (foodName) setSelectedFoodName(foodName);

      setResult(null);
      setSafeFoods([]);
      setError("");
    }
  }, [location.state]);

  /** load history */
  useEffect(() => {
    if (user?.email) setHistory(loadHistory(user.email));
  }, [user?.email]);

  const handleCheck = async () => {
    if (selectedDrugIndex == null || !selectedFoodName) {
      setError("Please select both a drug and a food item.");
      return;
    }

    setError("");
    setLoadingCheck(true);

    try {
      const res = await checkFoodDrugRisk(selectedDrugIndex, selectedFoodName);
      setResult(res);

      const safe = await fetchSafeFoods(selectedDrugIndex, 50);
      const nonAlcoholic = (safe?.foods || []).filter(
        (f) => f.is_alcohol !== 1 && f.is_alcohol !== true
      );
      setSafeFoods(nonAlcoholic);

      if (user?.email) {
        const updated = addHistoryEntry(user.email, {
          timestamp: new Date().toISOString(),
          drugIndex: selectedDrugIndex,
          drug: res.drug,
          food: res.food,
          risk: res.risk,
          message: res.message,
        });
        setHistory(updated);
      }
    } catch (err) {
      console.error(err);
      setError("Error checking interaction. Please try again.");
    } finally {
      setLoadingCheck(false);
    }
  };

  const formattedHistory = useMemo(
    () =>
      (history || [])
        .slice(0, 6)
        .map((h) => ({ ...h, time: new Date(h.timestamp).toLocaleString() })),
    [history]
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* HEADER */}
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
                onClick={() => navigate("/dashboard")}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate("/meal-plan")}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                Meal Plan
              </button>
              <button
                onClick={() => navigate("/history")}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                History
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
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-sm">
                    {initials}
                  </span>
                </div>

                {/* Name + role */}
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-slate-900">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-slate-500">{roleLabel}</span>
                </div>

                {/* Chevron */}
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

              {/* Dropdown */}
              {showUserMenu && (
                <div
                  className="absolute right-0 mt-3 w-[320px] rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden z-50"
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* caret */}
                  <div className="absolute -top-2 right-6 h-4 w-4 rotate-45 bg-white border-l border-t border-slate-200" />

                  {/* header */}
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
                        <p className="text-xs text-slate-500 mt-0.5">
                          {roleLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* items */}
                  <div className="p-2">
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/profile"); // change if you want
                      }}
                      role="menuitem"
                    >
                      <UserCircleIcon className="h-5 w-5 text-slate-400" />
                      Profile
                    </button>

                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/settings"); // change if you want
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
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
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
        <div className="max-w-6xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-3">
          {/* LEFT */}
          <section className="lg:col-span-2 space-y-6">
            {/* Selector card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                      <LightBulbIcon className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                      Food–Drug Interaction Check
                    </h2>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Search and select both inputs to evaluate potential
                    interactions.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                  <ExclamationTriangleIcon className="h-5 w-5 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <AutoComplete
                  label="Drug"
                  placeholder="Type drug name…"
                  fetcher={(q) => fetchDrugs(q)}
                  value={selectedDrugName}
                  onSelect={(d) => {
                    setSelectedDrugIndex(d.index);
                    setSelectedDrugName(d.name);
                    setResult(null);
                    setSafeFoods([]);
                  }}
                />

                <AutoComplete
                  label="Food"
                  placeholder="Type food name…"
                  fetcher={(q) => fetchFoods(q)}
                  value={selectedFoodName}
                  onSelect={(f) => {
                    setSelectedFoodName(f.name || f.Food);
                    setResult(null);
                  }}
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleCheck}
                  disabled={loadingCheck}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-400"
                >
                  {loadingCheck ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Checking…
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="h-5 w-5" />
                      Check interaction
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Result */}
            {result && (
              <div
                className={`rounded-3xl border shadow-sm p-5 md:p-7 ${riskColors[result.risk]}`}
              >
                <div className="flex items-start gap-3">
                  {result.risk === 0 ? (
                    <CheckCircleIcon className="h-6 w-6 mt-0.5 text-emerald-600" />
                  ) : (
                    <ExclamationTriangleIcon className="h-6 w-6 mt-0.5 text-rose-600" />
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold">
                        {riskBadge(result.risk)}
                      </span>
                      <span className="text-xs text-slate-700">
                        Recommendation summary
                      </span>
                    </div>

                    <h3 className="mt-3 text-base md:text-lg font-bold  wrap-break-words">
                      {result.drug} + {result.food}
                    </h3>

                    <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                      {result.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* RIGHT SIDEBAR */}
          <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 md:p-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Suggested safer foods
                </h2>
                <span className="text-xs font-semibold rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  Top picks
                </span>
              </div>

              <p className="text-sm text-slate-600 mb-4">
                After you check an interaction, we’ll show safer alternatives
                for the selected drug.
              </p>

              <div className="max-h-[420px] overflow-y-auto pr-1">
                {safeFoods.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No suggestions yet. Run an interaction check to populate
                    this panel.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {safeFoods.map((f) => {
                      const name = f.Food || f.food || f.name;
                      return (
                        <div
                          key={name}
                          className="rounded-2xl border border-green-200 bg-green-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold  text-green-900 text-sm leading-snug uppercase">
                              {name}
                            </p>
                            <div className="text-right text-xs text-slate-600 shrink-0">
                              <div className="font-semibold">
                                {Number(f.energy || 0).toFixed(1)}
                              </div>
                              <div className="-mt-0.5">kcal</div>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                            <span>
                              Protein:{" "}
                              <b>{Number(f.protein || 0).toFixed(2)} g</b>
                            </span>
                            <span>
                              Carbs:{" "}
                              <b>{Number(f.carbs || 0).toFixed(2)} g</b>
                            </span>
                            <span>
                              Fat:{" "}
                              <b>{Number(f.fat || 0).toFixed(2)} g</b>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="mt-8 mb-4 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 max-w-6xl mx-auto px-4 w-full">
        <span>
          © {new Date().getFullYear()} PharmaLink. For academic/research use.
        </span>
        <span>Always consult a qualified healthcare professional.</span>
      </footer>
    </div>
  );
};

export default FoodDrugInteraction;
