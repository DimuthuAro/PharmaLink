// src/pages/FoodDrugInteraction.jsx
import React, { useState } from "react";
import {
  PlusIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const FoodDrugInteraction = () => {
  const [drug, setDrug] = useState("");
  const [foods, setFoods] = useState([""]);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);

  const canSubmit =
    drug.trim().length > 0 && foods.some((f) => f.trim().length > 0);

  const handleFoodChange = (index, value) => {
    const copy = [...foods];
    copy[index] = value;
    setFoods(copy);
  };

  const handleAddFood = () => {
    if (foods.length >= 4) return; // limit
    setFoods((prev) => [...prev, ""]);
  };

  // purely MOCK logic – replace with real API later
  const handleCheck = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsChecking(true);
    setResult(null);

    await new Promise((res) => setTimeout(res, 700)); // fake delay

    const cleanDrug = drug.trim().toLowerCase();
    const cleanFoods = foods
      .map((f) => f.trim())
      .filter(Boolean)
      .map((f) => f.toLowerCase());

    let risk = "safe";
    let message = "No harmful interaction detected.";
    let color = "emerald";

    if (
      cleanDrug.includes("warfarin") &&
      cleanFoods.some((f) => f.includes("spinach"))
    ) {
      risk = "harmful";
      message = "High-risk interaction – avoid this combination.";
      color = "red";
    } else if (
      cleanDrug.includes("paracetamol") &&
      cleanFoods.some((f) => f.includes("alcohol"))
    ) {
      risk = "caution";
      message =
        "Use with caution: monitor liver function and overall patient status.";
      color = "amber";
    }

    setResult({
      risk,
      message,
      color,
      drug: drug.trim(),
      foods: cleanFoods.map(
        (f) => f.charAt(0).toUpperCase() + f.slice(1).toLowerCase()
      ),
    });

    setIsChecking(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-50 to-sky-100 flex items-center justify-center px-4 py-10">
      <div className="max-w-5xl w-full">
        {/* small logo / title strip */}
        <div className="flex items-center mb-4">
          <div className="text-xl font-semibold text-sky-700 tracking-tight">
            PharmaLink
          </div>
        </div>

        {/* main card */}
        <div className="bg-white/95 rounded-3xl shadow-xl border border-sky-100 grid md:grid-cols-[1.4fr,1fr] overflow-hidden">
          {/* LEFT: form */}
          <div className="px-6 sm:px-10 py-8 sm:py-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
              Food & Drug Interaction Checker
            </h1>
            <p className="text-sm text-slate-600 mb-6">
              Enter a medication and one or more foods / beverages to screen for
              potential interactions.
            </p>

            <form className="space-y-4" onSubmit={handleCheck}>
              {/* drug */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Drug
                </label>
                <input
                  type="text"
                  value={drug}
                  onChange={(e) => setDrug(e.target.value)}
                  placeholder="e.g. Warfarin, Paracetamol"
                  className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              {/* food fields */}
              {foods.map((food, index) => (
                <div key={index}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    {index === 0 ? "Food / drink" : `Additional food ${index + 1}`}
                  </label>
                  <input
                    type="text"
                    value={food}
                    onChange={(e) => handleFoodChange(index, e.target.value)}
                    placeholder={
                      index === 0
                        ? "e.g. Spinach, Rice, Curd"
                        : "e.g. Grapefruit juice"
                    }
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              ))}

              {/* add another */}
              <button
                type="button"
                onClick={handleAddFood}
                disabled={foods.length >= 4}
                className="mt-1 inline-flex items-center justify-between w-full h-11 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 px-3 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Add another food</span>
                <PlusIcon className="h-4 w-4" />
              </button>

              {/* check button */}
              <button
                type="submit"
                disabled={!canSubmit || isChecking}
                className={`mt-3 w-full h-11 rounded-lg text-sm font-semibold text-white flex items-center justify-center
                transition-all duration-150 ${
                  canSubmit && !isChecking
                    ? "bg-sky-600 hover:bg-sky-700 shadow-sm"
                    : "bg-sky-200 cursor-not-allowed"
                }`}
              >
                {isChecking ? "Checking…" : "Check Interaction"}
              </button>

              <p className="text-[11px] text-slate-400 pt-1">
                This is a prototype UI. When your backend is ready, connect this
                form to your API endpoint.
              </p>
            </form>
          </div>

          {/* RIGHT: nice visual & short text */}
          <div className="relative bg-gradient-to-b from-sky-100 via-sky-50 to-sky-100 flex flex-col items-center justify-center px-6 py-8">
            {/* pill stack imitation */}
            <div className="flex flex-col items-center space-y-2 mb-5">
              <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full shadow-lg opacity-90" />
              <div className="w-14 h-6 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-md" />
              <div className="w-12 h-6 bg-gradient-to-r from-amber-300 to-amber-500 rounded-full shadow-md" />
              <div className="w-10 h-6 bg-gradient-to-r from-rose-300 to-rose-500 rounded-full shadow-md" />
              <div className="w-8 h-6 bg-gradient-to-r from-slate-300 to-slate-500 rounded-full shadow-md" />
            </div>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/80 border border-sky-100 text-[11px] font-medium text-sky-700 mb-1">
                <SparklesIcon className="h-4 w-4 mr-1" />
                Smart interaction screening
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Reduce risk before it reaches your patients.
              </p>
              <p className="text-xs text-slate-500">
                Pharmalink can combine drug labels, food composition data, and
                clinical rules to highlight potential issues in seconds.
              </p>
            </div>
          </div>
        </div>

        {/* Result panel under the main card */}
        <div className="mt-5">
          {result ? (
            <div
              className={`rounded-2xl border px-5 py-4 bg-${result.color}-50 border-${result.color}-200 text-sm flex items-start space-x-3`}
            >
              {result.risk === "harmful" ? (
                <ExclamationTriangleIcon
                  className={`h-5 w-5 text-${result.color}-600 mt-0.5`}
                />
              ) : (
                <ShieldCheckIcon
                  className={`h-5 w-5 text-${result.color}-600 mt-0.5`}
                />
              )}
              <div>
                <p className="font-semibold text-slate-900 mb-1">
                  {result.drug} + {result.foods.join(", ")}
                </p>
                <p className="text-slate-700 mb-1">{result.message}</p>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-${result.color}-100 text-${result.color}-800`}
                >
                  {result.risk === "safe"
                    ? "Safe"
                    : result.risk === "caution"
                    ? "Use with caution"
                    : "Harmful interaction"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center">
              Results will appear here after you run a check.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodDrugInteraction;
