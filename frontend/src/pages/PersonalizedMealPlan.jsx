// src/pages/PersonalizedMealPlan.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  ShieldCheckIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

import { fetchDrugs, generateMealPlan } from "../utils/api.js";
import AutoComplete from "../components/AutoComplete.jsx";

const PersonalizedMealPlan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ----------------- STATE -----------------
  const [selectedDrugs, setSelectedDrugs] = useState([]); // [{index, name}]
  const [currentDrug, setCurrentDrug] = useState(null);

  const [caloriesPerDay, setCaloriesPerDay] = useState(2000);
  const [globalRestrictions, setGlobalRestrictions] = useState({
    noAlcohol: true,
    vegetarian: false,
  });

  const [days, setDays] = useState(3);
  const [mealsPerDay, setMealsPerDay] = useState(3);

  const [mealPlan, setMealPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Day selector (-1 = All days)
  const [activeDay, setActiveDay] = useState(-1);

  // ✅ Export dropdown UI state
  const [exportOpen, setExportOpen] = useState(false);

  // close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const onDocClick = () => setExportOpen(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [exportOpen]);

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

  const aggregateMeal = (meal) => {
    return meal.items.reduce(
      (acc, item) => ({
        energy: acc.energy + (item.energy || 0),
        protein: acc.protein + (item.protein || 0),
        fat: acc.fat + (item.fat || 0),
        carbs: acc.carbs + (item.carbs || 0),
      }),
      { energy: 0, protein: 0, fat: 0, carbs: 0 }
    );
  };

  const aggregateDay = (day) => {
    return day.meals.reduce(
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
  };

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

      const drug_indices = selectedDrugs.map((d) => d.index);

      const dietary_restrictions = [
        globalRestrictions.noAlcohol && "no_alcohol",
        globalRestrictions.vegetarian && "vegetarian",
      ].filter(Boolean);

      const payload = {
        drug_indices,
        dietary_restrictions,
        days,
        meals_per_day: mealsPerDay,
        calories_per_day: caloriesPerDay,
      };

      const res = await generateMealPlan(payload);
      setMealPlan(res);

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
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Generate New Meal Plan
              </h1>
              <p className="text-xs text-gray-500">
                Logged in as {user?.name || "Dr. Sarah Smith"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-gray-100 transition cursor-pointer"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate("/advisory")}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-gray-100 transition cursor-pointer"
            >
              Food-Drug Interactions Check
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
        {/* LEFT COLUMN – FORM */}
        <section className="space-y-5">
          {/* Active medications */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold tracking-wide text-slate-900 mb-1">
              Step 1 — Active medications
            </h2>
            <p className="text-[11px] text-slate-500 mb-3">
              Your personalized meal plan will respect food–drug interactions
              for these medicines.
            </p>

            {error && (
              <div className="mb-3 flex items-start space-x-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
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
              className="mt-2 inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-800 hover:bg-slate-200"
            >
              + Add to list
            </button>

            <ul className="mt-3 space-y-1 text-xs max-h-36 overflow-y-auto">
              {selectedDrugs.length === 0 && (
                <li className="text-slate-400">
                  No drugs added yet. Add at least one.
                </li>
              )}
              {selectedDrugs.map((d) => (
                <li
                  key={d.index}
                  className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-2 py-1"
                >
                  <span className="truncate">{d.name}</span>
                  <button
                    className="text-[11px] text-red-500 hover:underline"
                    onClick={() => handleRemoveDrug(d.index)}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Calories + prefs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Calories</h2>
            <p className="text-[11px] text-slate-500 mb-2">
              Target calories per day for this plan.
            </p>

            <input
              type="number"
              min={100}
              value={caloriesPerDay}
              onChange={(e) => setCaloriesPerDay(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4"
            />

            <div className="border-t border-slate-200 pt-3 mt-1">
              <h3 className="text-xs font-semibold text-slate-900 mb-2">
                General preferences
              </h3>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalRestrictions.noAlcohol}
                    onChange={(e) =>
                      setGlobalRestrictions((r) => ({
                        ...r,
                        noAlcohol: e.target.checked,
                      }))
                    }
                  />
                  <span>No alcohol</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={globalRestrictions.vegetarian}
                    onChange={(e) =>
                      setGlobalRestrictions((r) => ({
                        ...r,
                        vegetarian: e.target.checked,
                      }))
                    }
                  />
                  <span>Vegetarian</span>
                </label>
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
                    className="w-16 rounded-md border border-slate-300 px-2 py-1"
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
                    className="w-16 rounded-md border border-slate-300 px-2 py-1"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="mt-4 w-full inline-flex items-center justify-center rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:bg-slate-400"
            >
              {loading ? (
                "Generating meal plan..."
              ) : (
                <>
                  Generate Meal Plan
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </>
              )}
            </button>

            {/* Demo Button */}
            <button
              type="button"
              onClick={() => {
                // Load demo drugs for meal planning
                setSelectedDrugs([
                  { index: 1, name: 'Metformin' },
                  { index: 2, name: 'Atorvastatin' },
                  { index: 3, name: 'Lisinopril' }
                ]);
                setCaloriesPerDay(2000);
                setDays(3);
                setMealsPerDay(3);
                setGlobalRestrictions({ noAlcohol: true, vegetarian: false });
              }}
              className="mt-2 w-full inline-flex items-center justify-center rounded-full border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:border-amber-300 hover:shadow-md transition-all"
            >
              <span className="mr-2">✨</span>
              Load Demo Data
            </button>

            {/*Export dropdown */}
            {mealPlan && (
              <div className="mt-2 relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExportOpen((s) => !s);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Export as…
                  <ChevronDownIcon className={`h-4 w-4 transition ${exportOpen ? "rotate-180" : ""}`} />
                </button>

                {exportOpen && (
                  <div
                    className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50"
                      onClick={() => {
                        exportJSON();
                        setExportOpen(false);
                      }}
                    >
                      Export as JSON
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50"
                      onClick={() => {
                        exportCSV();
                        setExportOpen(false);
                      }}
                    >
                      Export as CSV
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50"
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

        {/* RIGHT COLUMN – RESULTS */}
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
                      className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition ${
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
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
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
                      <div className="flex items-baseline gap-3">
                        <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
                          DAY {day.day}
                        </h3>
                        <button
                          type="button"
                          className="hidden sm:inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700"
                        >
                          Swap out this day
                        </button>
                      </div>
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
                        <p className="text-xs text-slate-500 uppercase tracking-wide">
                          Fat
                        </p>
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
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-lg font-extrabold text-slate-900 uppercase tracking-wide">
                                {meal.name}
                              </h4>
                              <button
                                type="button"
                                className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-800"
                              >
                                Swap out this meal
                              </button>
                            </div>

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
                                <p className="text-[11px] text-slate-500 uppercase">
                                  Fat
                                </p>
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
                                  className="flex justify-between items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                                >
                                  <div>
                                    <p className="font-semibold text-slate-900">
                                      {item.food}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {item.energy.toFixed(0)} kcal ·{" "}
                                      {item.protein.toFixed(1)}g protein ·{" "}
                                      {item.fat?.toFixed ? item.fat.toFixed(1) : "0.0"}g fat ·{" "}
                                      {item.carbs.toFixed(1)}g carbs
                                    </p>
                                  </div>
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
