// PharmaLink/frontend/src/pages/PersonalizedMealPlan.jsx
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth";
import { advisoryRequest } from "../utils/api";
import AutoComplete from "../components/AutoComplete";
import BrandLogo from "../components/brandLogo2.jsx";

import {
  HomeIcon,
  UserCircleIcon as UserCircle,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  FireIcon,
  CalendarDaysIcon,
  HeartIcon,
  XMarkIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

// --- helpers ---
const uniq = (arr) =>
  Array.from(new Set((arr || []).map((x) => String(x).trim()).filter(Boolean)));

function isAlcoholFood(foodObj) {
  const name = String(foodObj?.food || "").toLowerCase();

  const perDrug = foodObj?.explanation?.per_drug;
  if (Array.isArray(perDrug) && perDrug.length > 0) {
    const anyAlcohol = perDrug.some(
      (d) => Number(d?.explanation?.food_signals?.is_alcohol) === 1
    );
    if (anyAlcohol) return true;
  }

  const signal = foodObj?.explanation?.food_signals?.is_alcohol;
  if (Number(signal) === 1) return true;

  return [
    "wine",
    "beer",
    "vodka",
    "whisky",
    "whiskey",
    "rum",
    "arrack",
    "gin",
    "brandy",
  ].some((k) => name.includes(k));
}

function severityLabel(sev) {
  const n = Number(sev ?? 0);
  if (n === 2)
    return {
      text: "High Risk",
      cls: "bg-red-50 border-red-300 text-red-800",
      dotCls: "bg-red-500",
    };
  if (n === 1)
    return {
      text: "Moderate",
      cls: "bg-amber-50 border-amber-300 text-amber-800",
      dotCls: "bg-amber-500",
    };
  return {
    text: "Safe",
    cls: "bg-emerald-50 border-emerald-300 text-emerald-800",
    dotCls: "bg-emerald-500",
  };
}

function Chip({ name, onRemove }) {
  return (
    <span className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors">
      {name}
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center justify-center h-4 w-4 rounded hover:bg-slate-300 transition-colors"
        aria-label="remove"
        title="Remove"
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </span>
  );
}

function toTitleCase(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function prettyFoodName(name) {
  let s = toTitleCase(name);
  s = s.replace(/\bKcal\b/g, "kcal");
  s = s.replace(/\bMg\b/g, "mg");
  s = s.replace(/\bG\b/g, "g");
  return s;
}

function resolveImageUrl(img) {
  const v = String(img || "").trim();
  if (!v) return "";

  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  const FASTAPI = import.meta.env.VITE_FASTAPI_BASE || "http://localhost:8000";

  if (v.startsWith("/")) return `${FASTAPI}${v}`;

  return `${FASTAPI}/${v}`;
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer">
      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full relative transition-all duration-200 ${value
            ? "bg-[#2f2971]"
            : "bg-slate-300"
          }`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${value ? "left-5" : "left-0.5"
            }`}
        />
      </button>
    </label>
  );
}

function extractExplanationPoints(item) {
  const perDrug = item?.explanation?.per_drug;
  if (Array.isArray(perDrug) && perDrug.length > 0) {
    const pts = [];
    for (const d of perDrug) {
      const arr = d?.explanation?.explanation_points;
      if (Array.isArray(arr)) pts.push(...arr);
    }
    return Array.from(new Set(pts.map((x) => String(x).trim()).filter(Boolean)));
  }

  const old = item?.explanation?.explanation_points;
  if (Array.isArray(old)) return old;

  return [];
}

function FoodItemCard({ label, item, hideAlcohol }) {
  const alcohol = isAlcoholFood(item);
  const sev = severityLabel(item?.severity);

  if (hideAlcohol && alcohol) {
    return (
      <div className="relative p-4 rounded-lg border border-slate-200 bg-slate-50">
        <div className="absolute top-3 right-3">
          <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center">
            <ExclamationTriangleIcon className="h-4 w-4 text-slate-400" />
          </div>
        </div>
        {label ? (
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            {label}
          </div>
        ) : null}
        <div className="mt-1 text-sm font-semibold text-slate-700">
          Alcohol Item Hidden
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Disable "Hide alcohol" to view this item
        </div>
      </div>
    );
  }

  const allergens = (item?.allergens_detected || []).map((a) =>
    String(a).toLowerCase()
  );
  const points = extractExplanationPoints(item);

  const imgUrl = item?.image ? resolveImageUrl(item.image) : "";

  return (
    <div className="group relative p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="relative">
        {label ? (
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {label}
            </div>
            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <BeakerIcon className="h-4 w-4 text-slate-600" />
            </div>
          </div>
        ) : null}

        <div className="text-sm font-semibold text-slate-900 mb-2">
          {prettyFoodName(item?.food) || "-"}
        </div>

        {imgUrl ? (
          <div className="mb-3 overflow-hidden rounded-lg border border-slate-200">
            <img
              src={imgUrl}
              alt={prettyFoodName(item?.food)}
              className="h-32 w-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        ) : null}

        {item?.quantity ? (
          <div className="mb-2 text-xs font-medium text-slate-600">
            Quantity:{" "}
            <span className="font-semibold text-slate-800">
              {String(item.quantity)}
            </span>
          </div>
        ) : null}

        <div className="flex items-center gap-3 text-xs text-slate-600 mb-3">
          {item?.food_type && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 font-medium">
              {item.food_type}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <FireIcon className="h-3.5 w-3.5" />
            {Math.round(item?.energy ?? 0)} kcal
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${sev.cls}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sev.dotCls}`} />
            {sev.text}
          </span>

          {alcohol && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-300 bg-red-50 text-xs font-semibold text-red-800">
              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
              Alcohol
            </span>
          )}
        </div>

        {allergens.length > 0 && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
            <div className="text-xs font-semibold text-red-900 mb-1">
              Allergens Detected:
            </div>
            <div className="text-xs font-medium text-red-700">
              {allergens.join(", ")}
            </div>
          </div>
        )}

        {points.length > 0 && (
          <div className="pt-3 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Safety Notes:
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5">
              {points.slice(0, 3).map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function MealCard({ meal, hideAlcohol }) {
  const items = [meal?.main, meal?.protein, meal?.vegetable].filter(Boolean);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2f2971] to-[#3d3086] px-5 py-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-white capitalize">
              {meal?.name}
            </div>
            <div className="text-xs text-white/80 mt-1 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <FireIcon className="h-3.5 w-3.5" />
                Target: {Math.round(meal?.target_kcal ?? 0)} kcal
              </span>
              <span className="flex items-center gap-1">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                Est: {Math.round(meal?.estimated_kcal ?? 0)} kcal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((obj, idx) => (
            <FoodItemCard key={idx} item={obj} hideAlcohol={hideAlcohol} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PersonalizedMealPlan() {
  const navigate = useNavigate();
  const { token, logout, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState("meal-plan");

  // form state
  const [drugInput, setDrugInput] = useState("");
  const [drugNames, setDrugNames] = useState([]);

  const [allergyInput, setAllergyInput] = useState("");
  const [allergies, setAllergies] = useState([]);

  const [days, setDays] = useState(2);
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [caloriesPerDay, setCaloriesPerDay] = useState(1800);

  const [vegetarian, setVegetarian] = useState(false);
  const [diabeticFriendly, setDiabeticFriendly] = useState(false);
  const [lowSodium, setLowSodium] = useState(false);

  const [hideAlcohol, setHideAlcohol] = useState(true);

  // result
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [activeDay, setActiveDay] = useState(1);

  useEffect(() => {
    if (isAuthenticated === false) navigate("/login");
  }, [isAuthenticated, navigate]);

  const handleNavigation = useCallback((path) => navigate(path), [navigate]);
  const handleLogout = useCallback(() => {
    logout?.();
    navigate("/");
  }, [logout, navigate]);

  async function fetchDrugs(q) {
    const qq = String(q || "").trim();
    if (!qq) return [];

    const FASTAPI =
      import.meta.env.VITE_FASTAPI_BASE || "http://localhost:8000";
    try {
      const res = await fetch(
        `${FASTAPI}/advisory/drugs?q=${encodeURIComponent(qq)}&limit=20`
      );
      const data = await res.json().catch(() => []);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function addDrug(name) {
    const n = String(name || "").trim();
    if (!n) return;
    setDrugNames((prev) => uniq([...prev, n]));
    setDrugInput("");
  }

  function addAllergy() {
    const n = String(allergyInput || "").trim().toLowerCase();
    if (!n) return;
    setAllergies((prev) => uniq([...prev, n]));
    setAllergyInput("");
  }

  async function generate() {
    setErr("");
    setResult(null);

    if (!token) {
      setErr("Please login first (missing token).");
      return;
    }

    try {
      if (drugNames.length === 0) throw { error: "Please add at least 1 drug" };

      const mpd = Math.max(1, Math.min(3, Number(mealsPerDay || 3)));

      const body = {
        drug_names: drugNames,
        days: Math.max(1, Number(days || 2)),
        meals_per_day: mpd,
        calories_per_day: Math.max(600, Number(caloriesPerDay || 1800)),
        allergies: (allergies || [])
          .map((x) => String(x).toLowerCase().trim())
          .filter(Boolean),
        preferences: {
          vegetarian,
          diabeticFriendly,
          lowSodium,
        },
      };

      setLoading(true);
      const data = await advisoryRequest("/meal-plan/generate", {
        method: "POST",
        body,
        token,
      });

      setResult(data?.result || null);
      setActiveDay(1);
    } catch (e) {
      setErr(
        e?.error || e?.details || e?.message || "Meal plan generation failed"
      );
    } finally {
      setLoading(false);
    }
  }

  const daysList = result?.days || [];
  const activeDayData = daysList.find(
    (d) => Number(d.day) === Number(activeDay)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="flex">
        {/* MAIN */}
        <div className="flex-1">
          {/* TOP HEADER */}
          <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center px-4 md:px-6 sticky top-0 z-40 shadow-sm">
            <div className="leading-tight">
              <div className="text-base md:text-lg font-extrabold text-[#2f2971]">
                Health Advisory Center
              </div>
              <div className="text-xs text-slate-500">
                Smart Healthcare Tools for Food–Drug Safety, Personalized
                Nutrition & Pill Identification
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <main className="p-4 md:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
              {/* Page Header */}
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
                  Meal Plan Advisor
                </h1>
                <p className="text-sm text-slate-600">
                  Create safe, personalized meal plans that avoid risky food-drug
                  interactions based on your medications and dietary preferences.
                </p>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT PANEL */}
                <div className="lg:col-span-1 space-y-5">
                  {/* Drugs */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#2f2971] to-[#3d3086] flex items-center justify-center">
                        <BeakerIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Medications
                        </div>
                        <div className="text-xs text-slate-500">
                          {drugNames.length} added
                        </div>
                      </div>
                    </div>

                    <AutoComplete
                      label={null}
                      placeholder="Type medication name..."
                      fetcher={fetchDrugs}
                      value={drugInput}
                      onChange={setDrugInput}
                      onSelect={(item) => addDrug(item?.name)}
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      {drugNames.map((d) => (
                        <Chip
                          key={d}
                          name={d}
                          onRemove={() =>
                            setDrugNames((p) => p.filter((x) => x !== d))
                          }
                        />
                      ))}
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-xs text-amber-800 flex items-start gap-2">
                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>AI-assisted. Always verify with your pharmacist.</span>
                      </p>
                    </div>
                  </div>

                  {/* Allergies */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Allergies
                        </div>
                        <div className="text-xs text-slate-500">
                          {allergies.length} listed
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                        placeholder="e.g. dairy, peanuts..."
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-[#2f2971] focus:ring-1 focus:ring-[#2f2971] focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={addAllergy}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
                      >
                        +
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {allergies.map((a) => (
                        <Chip
                          key={a}
                          name={a}
                          onRemove={() =>
                            setAllergies((p) => p.filter((x) => x !== a))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Targets */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#2f2971] to-[#3d3086] flex items-center justify-center">
                        <CalendarDaysIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        Plan Settings
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <label className="text-xs font-medium text-slate-600">
                        Days
                        <input
                          type="number"
                          min={1}
                          max={14}
                          value={days}
                          onChange={(e) => setDays(e.target.value)}
                          className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:border-[#2f2971] focus:ring-1 focus:ring-[#2f2971] focus:outline-none transition-colors"
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600">
                        Meals/day
                        <input
                          type="number"
                          min={1}
                          max={3}
                          value={mealsPerDay}
                          onChange={(e) => setMealsPerDay(e.target.value)}
                          className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:border-[#2f2971] focus:ring-1 focus:ring-[#2f2971] focus:outline-none transition-colors"
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600">
                        kcal/day
                        <input
                          type="number"
                          min={800}
                          max={3500}
                          value={caloriesPerDay}
                          onChange={(e) => setCaloriesPerDay(e.target.value)}
                          className="mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:border-[#2f2971] focus:ring-1 focus:ring-[#2f2971] focus:outline-none transition-colors"
                        />
                      </label>
                    </div>

                    <div className="space-y-2.5">
                      <Toggle
                        label="Vegetarian Diet"
                        value={vegetarian}
                        onChange={setVegetarian}
                      />
                      <Toggle
                        label="Diabetic Friendly"
                        value={diabeticFriendly}
                        onChange={setDiabeticFriendly}
                      />
                      <Toggle
                        label="Low Sodium"
                        value={lowSodium}
                        onChange={setLowSodium}
                      />
                    </div>

                    <label className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={hideAlcohol}
                        onChange={(e) => setHideAlcohol(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#2f2971] focus:ring-[#2f2971]"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Hide alcohol items (recommended)
                      </span>
                    </label>

                    <button
                      onClick={generate}
                      disabled={loading}
                      className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm shadow-sm text-white transition-all
                        ${loading
                          ? "bg-slate-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-[#2f2971] to-[#3d3086] hover:from-[#3d3086] hover:to-[#2f2971] shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/50"
                        }`}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Generating Plan...
                        </>
                      ) : (
                        <>
                            <SparklesIcon className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                            Generate Meal Plan
                        </>
                      )}
                    </button>
                  </div>

                  {err && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-red-900 mb-1">
                            Error
                          </h4>
                          <p className="text-sm text-red-700">{err}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT PANEL */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#2f2971] to-[#3d3086] px-6 py-5 rounded-t-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <HeartIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-white">
                            Your Meal Plan
                          </div>
                          {result?.drug_names?.length ? (
                            <div className="text-xs text-white/80 mt-0.5">
                              Medications: {result.drug_names.join(", ")}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                      {!result ? (
                        <div className="text-center py-16">
                          <div className="inline-flex items-center justify-center h-16 w-16 rounded-lg bg-slate-100 mb-4">
                            <ClipboardDocumentListIcon className="h-8 w-8 text-slate-400" />
                          </div>
                          <h3 className="text-base font-semibold text-slate-900 mb-2">
                            No Meal Plan Generated Yet
                          </h3>
                          <p className="text-sm text-slate-600 max-w-md mx-auto">
                            Add your medications, set your preferences, and click
                            "Generate Meal Plan" to create your personalized
                            nutrition plan.
                          </p>
                        </div>
                      ) : (
                        <>
                            {/* Day Tabs */}
                            <div className="flex gap-2 flex-wrap mb-6">
                              {daysList.map((d) => (
                                <button
                                  key={d.day}
                                onClick={() => setActiveDay(d.day)}
                                className={`px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all
                                  ${Number(activeDay) === Number(d.day)
                                    ? "bg-gradient-to-r from-[#2f2971] to-[#3d3086] text-white border-[#2f2971] shadow-sm"
                                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                              >
                                Day {d.day}
                              </button>
                            ))}
                            </div>

                            {/* Meals */}
                            <div className="space-y-5">
                              {(activeDayData?.meals || []).map((m, idx) => (
                                <MealCard
                                  key={idx}
                                  meal={m}
                                  hideAlcohol={hideAlcohol}
                                />
                              ))}
                            </div>

                            {/* Disclaimer */}
                            <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
                              <div className="flex items-start gap-3">
                                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-800">
                                  <strong>Medical Disclaimer:</strong> This is an
                                  AI-assisted recommendation tool. If you have any
                                  medical conditions or concerns, please consult
                                  with your doctor or pharmacist before making
                                  dietary changes.
                                </div>
                              </div>
                            </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <footer className="mt-12 pt-6 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>
                      © {new Date().getFullYear()} PharmaLink. All rights
                      reserved.
                    </span>
                  </div>
                  <span>For academic and research purposes only.</span>
                </div>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}