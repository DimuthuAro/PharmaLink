// src/pages/FoodDrugInteraction.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo2.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import { advisoryRequest, mlRequest } from "../utils/api.js";

import {
  HomeIcon,
  UserCircleIcon as UserCircle,
  ArrowRightOnRectangleIcon,
  PhotoIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  SparklesIcon,
  BeakerIcon,
  FireIcon,
} from "@heroicons/react/24/outline";

/* ------------------------ Reason mapping (pretty UI) ----------------------- */
const REASON_MAP = {
  cns_alcohol: {
    title: "Alcohol + sedating medicine",
    detail:
      "Alcohol can increase drowsiness, dizziness, and breathing problems. Avoid alcohol while taking this medicine.",
    badge: "Avoid",
  },
  high_fat_empty_stomach: {
    title: "High-fat food effect",
    detail:
      "High-fat meals can change absorption. Follow directions about taking before/after meals.",
    badge: "Caution",
  },
  calcium_antibiotic: {
    title: "Calcium reduces absorption",
    detail:
      "Dairy/calcium may reduce absorption of some antibiotics. Take 2–4 hours apart.",
    badge: "Separate",
  },
  iron_levothyroxine: {
    title: "Iron affects levothyroxine",
    detail:
      "Iron can reduce absorption of levothyroxine. Take levothyroxine and iron foods/supplements a few hours apart.",
    badge: "Separate",
  },
  vitk_warfarin: {
    title: "Vitamin K + anticoagulant",
    detail:
      "Vitamin K can affect warfarin/anticoagulants. Keep vitamin K intake consistent and follow medical advice.",
    badge: "Monitor",
  },
};

function prettifyReasonTag(tag) {
  const key = String(tag || "").trim().toLowerCase();
  const fixed = key === "cns_alchohol" ? "cns_alcohol" : key;

  if (REASON_MAP[fixed]) return { tag: fixed, ...REASON_MAP[fixed] };

  const title = fixed.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { tag: fixed, title, detail: "", badge: "Note" };
}

/* -------------------------------- Risk UI -------------------------------- */
const riskMeta = {
  0: {
    label: "Safe",
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    pill: "bg-white text-emerald-700 border-emerald-200",
    icon: CheckCircleIcon,
    iconColor: "text-emerald-600",
    dotColor: "bg-emerald-500",
  },
  1: {
    label: "Moderate Risk",
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-900",
    pill: "bg-white text-amber-700 border-amber-200",
    icon: ExclamationTriangleIcon,
    iconColor: "text-amber-600",
    dotColor: "bg-amber-500",
  },
  2: {
    label: "High Risk",
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-900",
    pill: "bg-white text-red-700 border-red-200",
    icon: ExclamationTriangleIcon,
    iconColor: "text-red-600",
    dotColor: "bg-red-500",
  },
};

function normalizeRisk(result) {
  const r = result?.risk ?? result?.severity ?? 1;
  return Number(r);
}

/* ----------------------------- AutoComplete UI ---------------------------- */
const AutoComplete = ({ label, placeholder, fetcher, onSelect, value, getLabel }) => {
  const [query, setQuery] = useState(value || "");
  const [options, setOptions] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => setQuery(value || ""), [value]);

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
      setOptions(Array.isArray(res) ? res : res?.drugs || res?.foods || []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    const labelText = getLabel ? getLabel(item) : item?.name || item?.Food || "";
    setQuery(labelText);
    setShow(false);
    setOptions([]);
    onSelect(item);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>

      <div className="relative">
        <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-200 rounded-2xl text-sm bg-white outline-none focus:border-[#413c79] focus:ring-4 focus:ring-purple-100 transition-all duration-200"
          onBlur={() => setTimeout(() => setShow(false), 150)}
          onFocus={() => {
            if (options.length > 0) setShow(true);
          }}
        />
      </div>

      {show && (
        <div className="absolute z-30 mt-2 w-full bg-white shadow-xl rounded-2xl border-2 border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-4 text-sm text-slate-500 flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-[#2f2971] rounded-full" />
              Searching…
            </div>
          ) : options.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No results found</div>
          ) : (
            <div className="max-h-60 overflow-auto">
              {options.map((item) => {
                const key = item.index ?? item.name ?? item.Food ?? JSON.stringify(item);
                const title = item.name || item.Food;
                return (
                  <button
                    key={key}
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm hover:bg-purple-50 border-b border-slate-100 last:border-0 transition-colors"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(item)}
                  >
                    <span className="font-bold text-slate-900">{title}</span>

                    {item.contains && (
                      <span className="block text-xs text-slate-500 mt-1">{item.contains}</span>
                    )}

                    {(item.is_alcohol === 1 || item.is_alcohol === true) && (
                      <span className="ml-2 text-xs text-red-600 font-bold">⚠ Alcohol</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ------------------------------ Tiny helpers ------------------------------ */
const fmt = (n, d = 1) => Number(n || 0).toFixed(d);

function pickExplainPoints(obj) {
  const pts = obj?.explanation?.explanation_points;
  return Array.isArray(pts) ? pts : [];
}

function pickSignals(obj) {
  return obj?.explanation?.food_signals || {};
}

function SignalsGrid({ signals }) {
  const items = [
    ["Alcohol", signals?.is_alcohol ? "Yes" : "No"],
    ["Leafy Green", signals?.is_leafy_green ? "Yes" : "No"],
    ["Calcium", `${fmt(signals?.calcium, 1)} mg`],
    ["Iron", `${fmt(signals?.iron, 2)} mg`],
    ["Vitamin K", `${fmt(signals?.vitamin_k_proxy, 1)}`],
    ["Fat", `${fmt(signals?.fat, 2)} g`],
    ["Fiber", `${fmt(signals?.fiber, 2)} g`],
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 mt-4">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-xl border-2 border-slate-200 bg-white p-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k}</div>
          <div className="text-xs font-bold text-slate-900 mt-0">{v}</div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */
export default function FoodDrugInteraction() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, token } = useAuth();

  const [activeTab, setActiveTab] = useState("food-drug");

  const [selectedDrugIndex, setSelectedDrugIndex] = useState(null);
  const [selectedDrugName, setSelectedDrugName] = useState("");
  const [selectedFoodName, setSelectedFoodName] = useState("");
  const [safeLimit, setSafeLimit] = useState(10);

  const [result, setResult] = useState(null);
  const [safeFoods, setSafeFoods] = useState([]);

  const [loadingCheck, setLoadingCheck] = useState(false);
  const [error, setError] = useState("");

  // expanded UI states
  const [showResultExplain, setShowResultExplain] = useState(true);
  const [expandedSafe, setExpandedSafe] = useState({});
  const [expandedReason, setExpandedReason] = useState({});

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

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

  // --- fetchers (FastAPI) ---
  const fetchDrugs = useMemo(
    () => async (q) => await mlRequest(`/advisory/drugs?q=${encodeURIComponent(q)}&limit=10`),
    []
  );

  const fetchFoods = useMemo(
    () => async (q) => await mlRequest(`/advisory/foods?q=${encodeURIComponent(q)}&limit=10`),
    []
  );

  const handleNavigation = useCallback((path) => navigate(path), [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  const resetAll = () => {
    setSelectedDrugIndex(null);
    setSelectedDrugName("");
    setSelectedFoodName("");
    setSafeFoods([]);
    setResult(null);
    setError("");
    setExpandedSafe({});
    setExpandedReason({});
    setShowResultExplain(true);
  };

  const handleCheck = async () => {
    const drug_name = String(selectedDrugName || "").trim();
    const food_name = String(selectedFoodName || "").trim();

    if (!drug_name || !food_name) {
      setError("Please select/type both a drug and a food item.");
      return;
    }

    setError("");
    setLoadingCheck(true);

    try {
      const res = await advisoryRequest("/food-drug/check", {
        method: "POST",
        token,
        body: { drug_name, food_name, safe_food_limit: Number(safeLimit || 10) },
      });

      setResult(res);

      const safeFromRes = Array.isArray(res?.safe_foods) ? res.safe_foods : [];
      const nonAlcoholic = safeFromRes.filter(
        (f) => f?.explanation?.food_signals?.is_alcohol !== 1
      );
      setSafeFoods(nonAlcoholic);

      setExpandedSafe({});
      setExpandedReason({});
      setShowResultExplain(true);
    } catch (err) {
      console.error(err);
      setError(
        err?.error ||
          err?.details ||
          err?.message ||
          "Error checking interaction. Please try again."
      );
    } finally {
      setLoadingCheck(false);
    }
  };

  const risk = result ? normalizeRisk(result) : null;
  const rmeta = risk != null ? riskMeta[risk] || riskMeta[1] : null;
  const RiskIcon = rmeta?.icon || ExclamationTriangleIcon;

  const resultExplainPoints = pickExplainPoints(result || {});
  const resultReasonDetails = Array.isArray(result?.explanation?.reason_details)
    ? result.explanation.reason_details
    : [];
  const resultSignals = pickSignals(result || {});

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
                  Food–Drug Interaction Checker
                </h1>
                <p className="text-base text-slate-600">
                  Check potential interactions between medications and food items. Get AI-powered safety recommendations.
                </p>
              </div>

              <div className="grid gap-2 lg:grid-cols-3">
                {/* LEFT */}
                <section className="lg:col-span-2 space-y-8">
                  {/* Input Card */}
                  <div className="bg-white rounded-3xl shadow-lg border-2 border-slate-200 p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#2f2971] to-[#3d3086] flex items-center justify-center shadow-lg">
                          <BeakerIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">
                            Interaction Analysis
                          </h2>
                          <p className="text-sm text-slate-600 mt-0.5">
                            Select medication and food to check
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={resetAll}
                        className="group inline-flex items-center justify-center h-12 w-12 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 transition-all"
                        aria-label="Reset"
                      >
                        <ArrowPathIcon className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300" />
                      </button>
                    </div>

                    {error && (
                      <div className="mb-6 rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-start gap-3">
                          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-red-900 mb-1">Error</h4>
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                      <AutoComplete
                        label="Medication"
                        placeholder="Search medication name..."
                        fetcher={fetchDrugs}
                        value={selectedDrugName}
                        getLabel={(d) => d?.name || ""}
                        onSelect={(d) => {
                          setSelectedDrugIndex(typeof d?.index === "number" ? d.index : null);
                          setSelectedDrugName(d?.name || "");
                          setResult(null);
                          setSafeFoods([]);
                        }}
                      />

                      <AutoComplete
                        label="Food Item"
                        placeholder="Search food name..."
                        fetcher={fetchFoods}
                        value={selectedFoodName}
                        getLabel={(f) => f?.name || f?.Food || ""}
                        onSelect={(f) => {
                          setSelectedFoodName(f?.name || f?.Food || "");
                          setResult(null);
                          setSafeFoods([]);
                        }}
                      />
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div className="md:col-span-1">
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Safe Alternatives Limit
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={safeLimit}
                          onChange={(e) => setSafeLimit(e.target.value)}
                          className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-2xl text-sm font-bold bg-white outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100 transition-all"
                        />
                      </div>

                      <div className="md:col-span-2 flex items-end">
                        <button
                          onClick={handleCheck}
                          disabled={loadingCheck}
                          className={`group w-full inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-bold shadow-lg text-white transition-all duration-300
                            ${
                              loadingCheck
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-gradient-to-r from-[#2f2971] to-[#3d3086] hover:from-[#3d3086] hover:to-[#2f2971] hover:shadow-xl hover:shadow-purple-500/50 transform hover:scale-[1.02]"
                            }`}
                        >
                          {loadingCheck ? (
                            <>
                              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <SparklesIcon className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                              Check Interaction
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Result Card */}
                  {result && risk != null && (
                    <div className={`rounded-3xl border-2 shadow-lg p-6 md:p-8 ${rmeta.bg} ${rmeta.border} ${rmeta.text}`}>
                      <div className="flex items-start gap-4">
                        <div className={`h-14 w-14 rounded-2xl ${rmeta.iconColor === 'text-emerald-600' ? 'bg-emerald-100' : rmeta.iconColor === 'text-amber-600' ? 'bg-amber-100' : 'bg-red-100'} flex items-center justify-center shrink-0`}>
                          <RiskIcon className={`h-7 w-7 ${rmeta.iconColor}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold ${rmeta.pill}`}>
                              <span className={`h-2.5 w-2.5 rounded-full ${rmeta.dotColor} animate-pulse`} />
                              {rmeta.label}
                            </span>
                            <span className="text-xs font-semibold text-slate-700 px-3 py-1 rounded-full bg-white border border-slate-200">
                              Severity Level: {risk}
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-slate-900 mb-3">
                            {result.drug || selectedDrugName} + {result.food || selectedFoodName}
                          </h3>

                          <p className="text-base text-slate-700 leading-relaxed">{result.message}</p>

                          {/* Reasons */}
                          {resultReasonDetails.length > 0 && (
                            <div className="mt-6">
                              <h4 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <InformationCircleIcon className="h-5 w-5 text-[#2f2971]" />
                                Interaction Reasons
                              </h4>

                              <div className="space-y-3">
                                {resultReasonDetails.map((r) => {
                                  const tag = r?.tag || "unknown_reason";
                                  const open = !!expandedReason[tag];

                                  return (
                                    <div key={tag} className="rounded-2xl border-2 border-slate-200 bg-white p-4">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1">
                                          <div className="font-bold text-slate-900">{r?.title || tag}</div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedReason((prev) => ({ ...prev, [tag]: !prev[tag] }))
                                          }
                                          className="text-sm font-bold px-4 py-2 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                                        >
                                          {open ? "Hide Details" : "View Details"}
                                        </button>
                                      </div>

                                      {open && (
                                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                          <p className="text-sm text-slate-700 leading-relaxed">
                                            {r?.generated_text || "No detailed explanation available."}
                                          </p>

                                          {r?.advice && (
                                            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                              <p className="text-sm text-amber-900">
                                                <strong className="font-bold">Recommendation:</strong> {r.advice}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Explanation */}
                          <div className="mt-6">
                            <button
                              type="button"
                              onClick={() => setShowResultExplain((s) => !s)}
                              className="w-full flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 hover:bg-slate-50 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <LightBulbIcon className="h-5 w-5 text-[#2f2971]" />
                                <span className="text-base font-bold text-slate-900">
                                  Scientific Explanation
                                </span>
                              </div>
                              {showResultExplain ? (
                                <ChevronUpIcon className="h-5 w-5 text-slate-500" />
                              ) : (
                                <ChevronDownIcon className="h-5 w-5 text-slate-500" />
                              )}
                            </button>

                            {showResultExplain && (
                              <div className="mt-4 rounded-2xl border-2 border-slate-200 bg-white p-5">
                                {resultExplainPoints.length > 0 ? (
                                  <ul className="space-y-2 text-sm text-slate-700">
                                    {resultExplainPoints.map((p, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-purple-600 mt-1 font-bold">•</span>
                                        <span>{p}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-sm text-slate-600">
                                    No detailed explanation points available for this interaction.
                                  </div>
                                )}

                                <div className="mt-5 pt-5 border-t-2 border-slate-200">
                                  <h5 className="text-sm font-bold text-slate-900 mb-3">Nutritional Signals</h5>
                                  <SignalsGrid signals={resultSignals} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* RIGHT: Safe foods */}
                <aside className="lg:sticky lg:top-24 h-fit">
                  <div className="bg-white rounded-3xl shadow-lg border-2 border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Safe Alternatives</h2>
                      </div>
                      <span className="text-xs font-bold rounded-full bg-purple-100 px-3 py-1.5 text-purple-700 border border-purple-200">
                        {safeFoods.length} 
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mb-5">
                      Tap any food card to see detailed nutritional signals and safety explanation.
                    </p>

                    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                      {safeFoods.length === 0 ? (
                        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-center">
                          <CheckCircleIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-sm font-semibold text-slate-600">
                            No safe alternatives yet
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Run an interaction check to see safer food options
                          </p>
                        </div>
                      ) : (
                        safeFoods.map((f, i) => {
                          const name = f.Food || f.food || f.name || `Food ${i + 1}`;
                          const open = !!expandedSafe[i];
                          const explainPts = pickExplainPoints(f);
                          const sig = pickSignals(f);

                          return (
                            <div key={`${name}-${i}`} className="group rounded-2xl border-2 border-emerald-200 bg-emerald-50 overflow-hidden hover:shadow-lg transition-all duration-200">
                              <button
                                type="button"
                                onClick={() => setExpandedSafe((prev) => ({ ...prev, [i]: !prev[i] }))}
                                className="w-full text-left p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-emerald-900 text-sm leading-snug uppercase">
                                      {name}
                                    </p>
                                    <p className="text-xs text-emerald-700 mt-1 flex items-center gap-2">
                                      <CheckCircleIcon className="h-3.5 w-3.5" />
                                      Safety Level: {Number(f.severity ?? 0)}
                                    </p>
                                  </div>

                                  <div className="text-center shrink-0">
                                    <FireIcon className="h-5 w-5 text-orange-500 mx-auto" />
                                    <div className="text-xs font-bold text-slate-900">{fmt(f.energy, 0)}</div>
                                    <div className="text-[10px] text-slate-500">kcal</div>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between pt-3 border-t border-emerald-200">
                                  <div className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                                    <InformationCircleIcon className="h-4 w-4" />
                                    {open ? "Hide" : "View"} Details
                                  </div>
                                  {open ? (
                                    <ChevronUpIcon className="h-5 w-5 text-emerald-700" />
                                  ) : (
                                    <ChevronDownIcon className="h-5 w-5 text-emerald-700" />
                                  )}
                                </div>
                              </button>

                              {open && (
                                <div className="px-4 pb-4">
                                  <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
                                    <div className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                      <LightBulbIcon className="h-4 w-4 text-purple-600" />
                                      Safety Explanation
                                    </div>

                                    {explainPts.length > 0 ? (
                                      <ul className="space-y-2 text-sm text-slate-700">
                                        {explainPts.map((p, idx) => (
                                          <li key={idx} className="flex items-start gap-2">
                                            <span className="text-purple-600 mt-0.5 font-bold">•</span>
                                            <span>{p}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div className="text-sm text-slate-600">
                                        No specific explanation points available.
                                      </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t-2 border-slate-200">
                                      <h5 className="text-xs font-bold text-slate-900 mb-3">Nutritional Profile</h5>
                                      <SignalsGrid signals={sig} />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </aside>
              </div>

              {/* Footer */}
              <footer className="mt-12 pt-6 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-2">

                    <span>© {new Date().getFullYear()} PharmaLink. All rights reserved.</span>
                  </div>
                  <span>For academic and research purposes only. Always consult a healthcare professional.</span>
                </div>
              </footer>
            </div>
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
}