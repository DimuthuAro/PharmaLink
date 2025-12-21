// src/pages/PersonalizedMealPlan.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo.jsx";
import UserAvatar from "../components/UserAvatar.jsx";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

import { fetchDrugs, generateMealPlan } from "../utils/api.js";
import AutoComplete from "../components/AutoComplete.jsx";

const ALLERGY_OPTIONS = [
  { key: "peanut", label: "Peanut" },
  { key: "tree_nut", label: "Tree nuts" },
  { key: "milk", label: "Milk / Dairy" },
  { key: "egg", label: "Egg" },
  { key: "fish", label: "Fish" },
  { key: "shellfish", label: "Shellfish" },
  { key: "soy", label: "Soy" },
  { key: "wheat", label: "Wheat / Gluten" },
  { key: "sesame", label: "Sesame" },
];

const STORAGE_KEYS = {
  drugs: "pharmlink_user_drugs",
  allergies: "pharmlink_user_allergies",
};

const PersonalizedMealPlan = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  // ----------------- AUTH GUARD -----------------
  useEffect(() => {
    if (isAuthenticated === false) navigate("/login");
  }, [isAuthenticated, navigate]);

  // ----------------- STATE -----------------
  const [selectedDrugs, setSelectedDrugs] = useState([]); // [{index, name}]
  const [currentDrug, setCurrentDrug] = useState(null);

  const [caloriesPerDay, setCaloriesPerDay] = useState(2000);
  const [globalRestrictions, setGlobalRestrictions] = useState({
    noAlcohol: true,
    vegetarian: false,
  });

  // ----------------- ALLERGIES (persisted) -----------------
  const [allergies, setAllergies] = useState(() => {
    const initial = {};
    ALLERGY_OPTIONS.forEach((a) => (initial[a.key] = false));

    // load saved allergies (if any)
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.allergies) || "[]");
      if (Array.isArray(saved)) {
        saved.forEach((k) => {
          if (k in initial) initial[k] = true;
        });
      }
    } catch {
      // ignore
    }

    return initial;
  });

  const [days, setDays] = useState(3);
  const [mealsPerDay, setMealsPerDay] = useState(3);

  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Day selector (-1 = All days)
  const [activeDay, setActiveDay] = useState(-1);

  // Export dropdown UI state
  const [exportOpen, setExportOpen] = useState(false);

  // User menu dropdown UI state
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ----------------- HEADER HELPERS -----------------
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
    try {
      logout?.();
    } finally {
      navigate("/");
    }
  };

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const onDocClick = () => setExportOpen(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [exportOpen]);

  // Close user menu on outside click + ESC
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

  // ----------------- HELPERS -----------------
  const handleAddDrug = () => {
    if (!currentDrug) return;
    if (selectedDrugs.find((d) => d.index === currentDrug.index)) return;
    setSelectedDrugs((prev) => [...prev, currentDrug]);
    setCurrentDrug(null);
  };

  const handleRemoveDrug = (index) => {
    setSelectedDrugs((prev) => prev.filter((d) => d.index !== index));
  };

  const aggregateMeal = (meal) =>
    meal.items.reduce(
      (acc, item) => ({
        energy: acc.energy + (item.energy || 0),
        protein: acc.protein + (item.protein || 0),
        fat: acc.fat + (item.fat || 0),
        carbs: acc.carbs + (item.carbs || 0),
      }),
      { energy: 0, protein: 0, fat: 0, carbs: 0 }
    );

  const aggregateDay = (day) =>
    day.meals.reduce(
      (acc, meal) => {
        const m = aggregateMeal(meal);
        return {
          energy: acc.energy + m.energy,
          protein: acc.protein + m.protein,
          fat: acc.fat + m.fat,
          carbs: acc.carbs + m.carbs,
        };
      },
      { energy: 0, protein: 0, fat: 0, carbs: 0 }
    );

  // ----------------- API CALL -----------------
  const handleGenerate = async () => {
    try {
      setError("");
      setLoading(true);
      setMealPlan(null);

      if (selectedDrugs.length === 0) {
        setError("Please add at least one active medication.");
        setLoading(false);
        return;
      }

      // convert allergy boolean map => array of selected allergy keys
      const selectedAllergies = Object.entries(allergies)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const payload = {
        drug_indices: selectedDrugs.map((d) => d.index),
        dietary_restrictions: [
          globalRestrictions.noAlcohol && "no_alcohol",
          globalRestrictions.vegetarian && "vegetarian",
        ].filter(Boolean),
        allergies: selectedAllergies, // backend can ignore if not implemented yet
        days,
        meals_per_day: mealsPerDay,
        calories_per_day: caloriesPerDay,
      };

      const res = await generateMealPlan(payload);
      setMealPlan(res);

      // Persist for Profile page (with date)
    try {
      const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    
      const drugWithDate = selectedDrugs.map((d) => ({
        name: d.name,
        index: d.index,
        date: today, // you can change this if you want user-selected date
      }));
    
      localStorage.setItem("pharmlink_user_drugs", JSON.stringify(drugWithDate));
      localStorage.setItem("pharmlink_user_allergies", JSON.stringify(selectedAllergies));
    } catch {
      // ignore
    }


      // auto select Day 1 after generating
      setActiveDay(1);
    } catch (err) {
      setError(err.message || "Failed to generate meal plan.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------- EXPORTS -----------------
  const exportJSON = () => {
    if (!mealPlan) return;
    const blob = new Blob([JSON.stringify(mealPlan, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pharmlink-meal-plan.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!mealPlan?.days?.length) return;

    const rows = [];
    mealPlan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        meal.items.forEach((item) => {
          rows.push({
            Day: day.day,
            Meal: meal.name,
            Food: item.food,
            Calories: item.energy ?? 0,
            Protein_g: item.protein ?? 0,
            Fat_g: item.fat ?? 0,
            Carbs_g: item.carbs ?? 0,
          });
        });
      });
    });

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = r[h] ?? "";
            const safe = String(val).replace(/"/g, '""');
            return `"${safe}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pharmlink-meal-plan.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!mealPlan?.days?.length) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("PharmaLink Meal Plan", 14, 15);

    doc.setFontSize(10);
    doc.text(`Generated for: ${user?.name || "User"}`, 14, 22);
    doc.text(`Calories/day: ${caloriesPerDay}`, 14, 27);
    doc.text(`Days: ${mealPlan.days.length}`, 14, 32);

    let startY = 38;

    mealPlan.days.forEach((day, idx) => {
      doc.setFontSize(13);
      doc.text(`Day ${day.day}`, 14, startY);
      startY += 5;

      const body = [];
      day.meals.forEach((meal) => {
        meal.items.forEach((item) => {
          body.push([
            meal.name,
            item.food,
            Math.round(item.energy ?? 0),
            Number(item.protein ?? 0).toFixed(1),
            Number(item.fat ?? 0).toFixed(1),
            Number(item.carbs ?? 0).toFixed(1),
          ]);
        });
      });

      autoTable(doc, {
        startY,
        head: [["Meal", "Food", "kcal", "Protein(g)", "Fat(g)", "Carbs(g)"]],
        body,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] },
      });

      startY = doc.lastAutoTable.finalY + 10;

      if (idx < mealPlan.days.length - 1 && startY > 260) {
        doc.addPage();
        startY = 15;
      }
    });

    doc.save("pharmlink-meal-plan.pdf");
  };

  // days list
  const daysList = useMemo(() => {
    if (!mealPlan?.days?.length) return [];
    return mealPlan.days;
  }, [mealPlan]);

  // visible days (either one day or all)
  const visibleDays = useMemo(() => {
    if (!daysList.length) return [];
    if (activeDay === -1) return daysList;
    return daysList.filter((d) => d.day === activeDay);
  }, [daysList, activeDay]);

  // ----------------- RENDER -----------------
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-7 w-7" />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate("/advisory")}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                Food–Drug Check
              </button>
              <button
                onClick={() => navigate("/history")}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                History
              </button>
            </div>

            {/* user menu */}
            <div id="user-menu-wrapper" className="relative">
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-50 transition border border-transparent hover:border-slate-200 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu((s) => !s);
                }}
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
              >
                <UserAvatar user={user} size={36} />

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
                      <div className="h-12 w-12 rounded-2xl overflow-hidden bg-blue-600 flex items-center justify-center">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user?.name || "User"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-extrabold">{initials}</span>
                        )}
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
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
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
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
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

      {/* PAGE TITLE */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-7">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <ShieldCheckIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Generate New Meal Plan
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Create interaction-aware meals based on active medications, calories,
                preferences, and allergies.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-4 py-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
        {/* LEFT COLUMN */}
        <section className="space-y-5">
          {/* Active medications */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold tracking-wide text-slate-900 mb-1">
              Step 1 — Active medications
            </h2>
            <p className="text-[11px] text-slate-500 mb-3">
              Your meal plan respects food–drug interactions for these medicines.
            </p>

            {error && (
              <div className="mb-3 flex items-start space-x-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <ExclamationTriangleIcon className="h-4 w-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <AutoComplete
              label="Add a drug"
              placeholder="Type drug name…"
              fetcher={fetchDrugs}
              value={currentDrug?.name || ""}
              onSelect={(d) => setCurrentDrug(d)}
            />

            <button
              onClick={handleAddDrug}
              className="mt-2 inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-800 hover:bg-slate-200 cursor-pointer"
            >
              + Add to list
            </button>

            <ul className="mt-3 space-y-1 text-xs max-h-36 overflow-y-auto">
              {selectedDrugs.length === 0 && (
                <li className="text-slate-400">No drugs added yet. Add at least one.</li>
              )}
              {selectedDrugs.map((d) => (
                <li
                  key={d.index}
                  className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-2 py-1"
                >
                  <span className="truncate">{d.name}</span>
                  <button
                    className="text-[11px] text-red-500 hover:underline cursor-pointer"
                    onClick={() => handleRemoveDrug(d.index)}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Calories + prefs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Step 2 — Calories</h2>
            <p className="text-[11px] text-slate-500 mb-2">
              Target calories per day for this plan.
            </p>

            <input
              type="number"
              min={100}
              value={caloriesPerDay}
              onChange={(e) => setCaloriesPerDay(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm mb-4"
            />

            <div className="border-t border-slate-200 pt-3 mt-1">
              <h3 className="text-xs font-semibold text-slate-900 mb-2">
                General preferences
              </h3>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalRestrictions.noAlcohol}
                    onChange={(e) =>
                      setGlobalRestrictions((r) => ({ ...r, noAlcohol: e.target.checked }))
                    }
                  />
                  <span>No alcohol</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalRestrictions.vegetarian}
                    onChange={(e) =>
                      setGlobalRestrictions((r) => ({ ...r, vegetarian: e.target.checked }))
                    }
                  />
                  <span>Vegetarian</span>
                </label>
              </div>

              {/* Allergies */}
              <div className="border-t border-slate-200 pt-3 mt-3">
                <h3 className="text-xs font-semibold text-slate-900 mb-2">Allergies</h3>
                <p className="text-[11px] text-slate-500 mb-2">
                  Foods containing these allergens will be excluded.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {ALLERGY_OPTIONS.map((a) => (
                    <label key={a.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!allergies[a.key]}
                        onChange={(e) =>
                          setAllergies((prev) => ({ ...prev, [a.key]: e.target.checked }))
                        }
                      />
                      <span>{a.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Days</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value) || 1)}
                    className="w-16 rounded-md border border-slate-300 px-2 py-1 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Meals / day</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={mealsPerDay}
                    onChange={(e) => setMealsPerDay(Number(e.target.value) || 3)}
                    className="w-16 rounded-md border border-slate-300 px-2 py-1 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="mt-4 w-full inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-400 cursor-pointer"
            >
              {loading ? "Generating meal plan..." : "Generate Meal Plan"}
            </button>

            {/* Export dropdown */}
            {mealPlan && (
              <div className="mt-2 relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExportOpen((s) => !s);
                  }}
                  className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Export as…
                  <ChevronDownIcon
                    className={`h-4 w-4 transition ${exportOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {exportOpen && (
                  <div
                    className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="cursor-pointer w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50"
                      onClick={() => {
                        exportJSON();
                        setExportOpen(false);
                      }}
                    >
                      Export as JSON
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50"
                      onClick={() => {
                        exportCSV();
                        setExportOpen(false);
                      }}
                    >
                      Export as CSV
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50"
                      onClick={() => {
                        exportPDF();
                        setExportOpen(false);
                      }}
                    >
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN */}
        <section className="space-y-5">
          {!mealPlan ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-500">
              Configure your medications, calories and preferences, then click{" "}
              <span className="font-semibold ml-1">Generate Meal Plan</span>.
            </div>
          ) : (
            <>
              {/* Day Selector */}
              <div className="sticky top-4 z-10 bg-slate-50 pb-2">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Quick Day View
                    </p>

                    <button
                      type="button"
                      onClick={() => setActiveDay(-1)}
                      className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition cursor-pointer ${
                        activeDay === -1
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      All Days
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {daysList.map((d) => (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => setActiveDay(d.day)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition cursor-pointer ${
                          activeDay === d.day
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        Day {d.day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Render selected day(s) */}
              {visibleDays.map((day) => {
                const totals = aggregateDay(day);

                return (
                  <div
                    key={day.day}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
                        DAY {day.day}
                      </h3>

                      <span className="inline-flex items-center text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
                        Interaction-safe meals
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Calories
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          {totals.energy.toFixed(0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Protein
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          {totals.protein.toFixed(1)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Fat</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {totals.fat.toFixed(1)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Carbohydrates
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          {totals.carbs.toFixed(1)}g
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {day.meals.map((meal, idx) => {
                        const mm = aggregateMeal(meal);

                        return (
                          <div key={idx} className="border-t border-slate-200 pt-4">
                            <h4 className="text-lg font-extrabold text-slate-900 uppercase tracking-wide mb-2">
                              {meal.name}
                            </h4>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3 text-xs">
                              <div>
                                <p className="text-[11px] text-slate-500 uppercase">
                                  Calories
                                </p>
                                <p className="text-sm font-semibold text-slate-900">
                                  {mm.energy.toFixed(0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] text-slate-500 uppercase">
                                  Protein
                                </p>
                                <p className="text-sm font-semibold text-slate-900">
                                  {mm.protein.toFixed(1)}g
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] text-slate-500 uppercase">Fat</p>
                                <p className="text-sm font-semibold text-slate-900">
                                  {mm.fat.toFixed(1)}g
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] text-slate-500 uppercase">
                                  Carbohydrates
                                </p>
                                <p className="text-sm font-semibold text-slate-900">
                                  {mm.carbs.toFixed(1)}g
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {meal.items.map((item, i) => (
                                <div
                                  key={i}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                                >
                                  <p className="font-semibold text-slate-900">{item.food}</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    {Number(item.energy ?? 0).toFixed(0)} kcal ·{" "}
                                    {Number(item.protein ?? 0).toFixed(1)}g protein ·{" "}
                                    {Number(item.fat ?? 0).toFixed(1)}g fat ·{" "}
                                    {Number(item.carbs ?? 0).toFixed(1)}g carbs
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </section>
      </main>

      <footer className="mt-10 mb-4 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 max-w-6xl mx-auto px-4 w-full">
        <span>© {new Date().getFullYear()} PharmaLink. For academic/research use.</span>
        <span>Always consult a qualified healthcare professional.</span>
      </footer>
    </div>
  );
};

export default PersonalizedMealPlan;
