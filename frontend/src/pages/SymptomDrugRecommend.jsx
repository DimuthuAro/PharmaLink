// src/pages/FoodDrugInteraction.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo2.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import { recommendDrugsFromSymptoms } from "../services/advisoryApi.js";

import {
  HomeIcon,
  UserCircleIcon as UserCircle,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  XMarkIcon,
  PlusIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  BeakerIcon,
  ArrowPathIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";



/* ─── Risk meta — mirrors FoodDrugInteraction ──────────────────────────── */
const riskMeta = {
  high: {
    label: "High Interaction Risk",
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-900",
    pill: "bg-white text-red-700 border-red-200",
    dotColor: "bg-red-500",
    icon: ExclamationTriangleIcon,
    iconColor: "text-red-600",
    iconBg: "bg-red-100",
  },
  moderate: {
    label: "Moderate Interaction Risk",
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-900",
    pill: "bg-white text-amber-700 border-amber-200",
    dotColor: "bg-amber-500",
    icon: ExclamationTriangleIcon,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
  },
  safe: {
    label: "Generally Safe",
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    pill: "bg-white text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
    icon: CheckCircleIcon,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
  },
};

/* ─── ResultTab button ─────────────────────────────────────────────────── */
function ResultTabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-200
        ${active
          ? "bg-white text-[#2f2971] shadow-md border-2 border-slate-200"
          : "text-slate-500 hover:bg-white/50 border-2 border-transparent"
        }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count > 0 && (
        <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-xs font-bold
          ${active ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-600"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
const capitalizeFirst = (text) => {
  const s = String(text ?? "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};
/* ─── Single recommendation card (matches FoodDrug result card style) ── */
function RecommendationCard({ r, index, type, expanded, onToggle }) {
  const rawLabel = r?.disease || r?.symptom || "—";
const label = toTitleCase(rawLabel);
  const prob  = typeof r?.prob === "number" ? r.prob : null;

  // Derive risk level from avoid_drugs / warnings presence
  const hasWarnings = Array.isArray(r?.safety_warnings) && r.safety_warnings.length > 0;
  const hasAvoid    = Array.isArray(r?.avoid_drugs) && r.avoid_drugs.length > 0;
  const meta = hasAvoid || hasWarnings ? riskMeta.moderate : riskMeta.safe;
  const RiskIcon = meta.icon;

  return (
    <div className={`rounded-3xl border-2 shadow-lg p-6 md:p-8 ${meta.bg} ${meta.border} ${meta.text}`}>
      {/* Header row */}
      <div className="flex items-start gap-4">
        <div className={`h-14 w-14 rounded-2xl ${meta.iconBg} flex items-center justify-center shrink-0`}>
          <RiskIcon className={`h-7 w-7 ${meta.iconColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Pills row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold ${meta.pill}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${meta.dotColor} animate-pulse`} />
              {meta.label}
            </span>
            {prob !== null && (
              <span className="text-xs font-semibold text-slate-700 px-3 py-1 rounded-full bg-white border border-slate-200">
                Match: {(prob * 100).toFixed(type === "disease" ? 1 : 0)}%
              </span>
            )}
            <span className="text-xs font-semibold text-slate-500 px-3 py-1 rounded-full bg-white border border-slate-200">
              #{index + 1}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 mb-3 capitalize">{label}</h3>

          {/* Drug sections */}
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            {/* First line */}
            <DrugBlock
              label="First Line Drugs"
              drugs={r?.first_line_drugs}
              bgClass="bg-white"
              dotClass="bg-[#2f2971]"
              tagClass="bg-purple-50 text-[#2f2971] border-purple-200"
            />
            {/* Second line */}
            <DrugBlock
              label="Second Line Drugs"
              drugs={r?.second_line_drugs}
              bgClass="bg-white"
              dotClass="bg-slate-400"
              tagClass="bg-slate-50 text-slate-700 border-slate-200"
            />
            {/* Avoid */}
            <DrugBlock
              label="Avoid"
              drugs={r?.avoid_drugs}
              bgClass="bg-white"
              dotClass="bg-slate-700"
              tagClass="bg-slate-100 text-slate-700 border-slate-300"
              avoid
            />
          </div>

          {/* Safety warnings accordion */}
          {hasWarnings && (
            <div className="mt-2">
              <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <LightBulbIcon className="h-5 w-5 text-[#2f2971]" />
                  <span className="text-base font-bold text-slate-900">Safety Warnings</span>
                  <span className="text-xs font-bold rounded-full bg-purple-100 px-2.5 py-1 text-purple-700 border border-purple-200">
                    {r.safety_warnings.length}
                  </span>
                </div>
                {expanded
                  ? <ChevronUpIcon className="h-5 w-5 text-slate-500" />
                  : <ChevronDownIcon className="h-5 w-5 text-slate-500" />
                }
              </button>

              {expanded && (
                <div className="mt-4 rounded-2xl border-2 border-slate-200 bg-white p-5">
                  <ul className="space-y-2 text-sm text-slate-700">
                    {uniqueList(r.safety_warnings)
                    .map(cleanWarning)
                    .filter(Boolean)
                    .map((w, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-purple-600 mt-1 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── DrugBlock inside card ────────────────────────────────────────────── */
function DrugBlock({ label, drugs, dotClass, tagClass, avoid }) {
  const list = Array.isArray(drugs) ? drugs : [];
  const pretty = list.map((d) => toTitleCase(d)).filter(Boolean);
  const has = pretty.length > 0;

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-block h-2 w-2 rounded-full ${dotClass} shrink-0`} />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      </div>

      {has ? (
        <div className="flex flex-wrap gap-1.5">
          {pretty.map((d, i) => (
            <span
              key={i}
              className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${tagClass}`}
              title={avoid ? "Avoid" : undefined}
            >
              {d}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-sm text-slate-400">—</span>
      )}
    </div>
  );
}

// ---- Display formatting helpers (UI only) ----
const humanize = (value) => {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const toTitleCase = (value) => {
  const s = humanize(value);
  if (!s) return "";
  return s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
};


const cleanWarning = (value) => {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const cleaned = s
    .replace(/^R\d+\s*[:\-]\s*/i, "")   
    .replace(/\s+/g, " ")
    .trim();

  return capitalizeFirst(cleaned);      
};

// Remove duplicates (case-insensitive)
const uniqueList = (arr = []) => {
  const seen = new Set();
  const out = [];
  for (const x of arr || []) {
    const v = String(x ?? "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
};

/* --------------------------------- Page ---------------------------------- */
export default function SymptomDrugs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, token } = useAuth();

  const [activeTab, setActiveTab] = useState("symptom-drug");
  const [symptomInput, setSymptomInput] = useState("");
  const [symptoms, setSymptoms]       = useState([]);
  const [topK, setTopK]               = useState(3);
  const [resultTab, setResultTab]     = useState("diseases");

  const [patient, setPatient] = useState({
    age: 24, sex: "female", pregnant: 0,
    diabetes: 0, hypertension: 0, asthma: 0,
    kidney_disease: 0, liver_disease: 0, allergy_penicillin: 0,
  });

  const [loading, setLoading]   = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Accordion states
  const [expandedCards, setExpandedCards] = useState({});
  const [expandedSide, setExpandedSide]   = useState({});

  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  const addSymptom = useCallback(() => {
    const s = String(symptomInput || "").trim().toLowerCase();
    if (!s) return;
    setSymptoms((p) => (p.includes(s) ? p : [...p, s]));
    setSymptomInput("");
  }, [symptomInput]);

  const removeSymptom = (s) => setSymptoms((p) => p.filter((x) => x !== s));

  const clearAll = () => {
    setSymptoms([]); setSymptomInput(""); setTopK(3);
    setResult(null); setError("");
    setExpandedCards({}); setExpandedSide({});
  };

  const submit = async () => {
    if (!symptoms.length) { setError("Please add at least one symptom."); return; }
    setError(""); setLoading(true); setResult(null);
    setExpandedCards({}); setExpandedSide({});
    try {
      const res = await recommendDrugsFromSymptoms({
        token, symptoms, top_k_diseases: Number(topK || 3), patient,
      });
      setResult(res);
      setResultTab("diseases");
    } catch (e) {
      setError(e?.message || e?.error || e?.details || "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const symptomResults = useMemo(() =>
    Array.isArray(result?.direct_symptom_recommendations)
      ? result.direct_symptom_recommendations : [], [result]);

  const diseaseResults = useMemo(() =>
    Array.isArray(result?.predicted_disease_recommendations)
      ? result.predicted_disease_recommendations : [], [result]);

  // Active panel items
  const activeItems = resultTab === "diseases" ? diseaseResults : symptomResults;

    // Sidebar shows ALL results combined for quick reference
  const allResults = useMemo(() => [...diseaseResults, ...symptomResults], [diseaseResults, symptomResults]);

  const patientFields = [
    ["diabetes", "Diabetes"], ["hypertension", "Hypertension"], ["asthma", "Asthma"],
    ["kidney_disease", "Kidney Disease"], ["liver_disease", "Liver Disease"],
    ["allergy_penicillin", "Penicillin Allergy"],
  ];

  const fieldCls = "w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-sm bg-white outline-none focus:border-[#413c79] focus:ring-4 focus:ring-purple-100 transition-all duration-200";
  const handleNavigation = useCallback((path) => navigate(path), [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="flex">
        
         {/* ── MAIN ────────────────────────────────────────────────── */}
        <div className="flex-1">

          {/* Top bar */}
          <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center px-4 md:px-6 sticky top-0 z-40 shadow-sm">
            <div className="leading-tight">
              <div className="text-base md:text-lg font-extrabold text-[#2f2971]">
                Health Advisory Center
              </div>
              <div className="text-xs text-slate-500">
                Smart Healthcare Tools for Food–Drug Safety, Personalized Nutrition & Pill Identification
              </div>
            </div>
          </header>

          <main className="p-4 md:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">

              {/* Page header */}
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
                  Symptom Drug Recommender
                </h1>
                <p className="text-base text-slate-600">
                  Enter your symptoms to get first-line / second-line drug recommendations and safety warnings.
                </p>
              </div>

              <div className="">

                {/* ── LEFT: Input + Results ───────────────────────── */}
                <section className="lg:col-span-2 space-y-6">

                  {/* Input Card */}
                  <div className="bg-white rounded-3xl shadow-lg border-2 border-slate-200 p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#2f2971] to-[#3d3086] flex items-center justify-center shadow-lg">
                          <SparklesIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">Symptom Analysis</h2>
                          <p className="text-sm text-slate-600 mt-0.5">Add symptoms to get recommendations</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="group inline-flex items-center justify-center h-12 w-12 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 transition-all"
                        aria-label="Reset"
                      >
                        <ArrowPathIcon className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300" />
                      </button>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="mb-6 rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-5">
                        <div className="flex items-start gap-3">
                          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-red-900 mb-1">Error</h4>
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Symptom input */}
                    <div className="flex flex-col md:flex-row gap-3 mb-4">
                      <input
                        value={symptomInput}
                        onChange={(e) => setSymptomInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSymptom(); } }}
                        placeholder="Type a symptom and press Enter or click Add"
                        className="flex-1 px-4 py-3.5 border-2 border-slate-200 rounded-2xl text-sm bg-white outline-none focus:border-[#413c79] focus:ring-4 focus:ring-purple-100 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={addSymptom}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold shadow text-white bg-gradient-to-r from-[#2f2971] to-[#3d3086] hover:from-[#3d3086] hover:to-[#2f2971] transition-all"
                      >
                        <PlusIcon className="h-5 w-5" />
                    
                      </button>
                      <div className="w-full md:w-32">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Top K</label>
                        <input
                          type="number" min={1} max={20} value={topK}
                          onChange={(e) => setTopK(e.target.value)}
                          className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-2xl text-sm font-bold bg-white outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                        />
                      </div>
                    </div>

                    {/* Chips */}
                    {symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {symptoms.map((s) => (
                          <span key={s} className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold">
                            {s}
                            <button type="button" onClick={() => removeSymptom(s)} className="rounded-full hover:bg-purple-100 p-0.5">
                              <XMarkIcon className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Patient profile */}
                    <div className="border-t-2 border-slate-200 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <InformationCircleIcon className="h-5 w-5 text-[#2f2971]" />
                        <h3 className="text-base font-bold text-slate-900">Patient Profile</h3>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Age</label>
                          <input
                            type="number" value={patient.age ?? ""}
                            onChange={(e) => setPatient((p) => ({ ...p, age: Number(e.target.value) }))}
                            className={fieldCls}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Sex</label>
                          <select value={patient.sex} onChange={(e) => setPatient((p) => ({ ...p, sex: e.target.value }))} className={fieldCls}>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Pregnant</label>
                          <select value={patient.pregnant} onChange={(e) => setPatient((p) => ({ ...p, pregnant: Number(e.target.value) }))} className={fieldCls}>
                            <option value={0}>No</option>
                            <option value={1}>Yes</option>
                          </select>
                        </div>
                        {patientFields.map(([key, label]) => (
                          <div key={key}>
                            <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
                            <select value={patient[key]} onChange={(e) => setPatient((p) => ({ ...p, [key]: Number(e.target.value) }))} className={fieldCls}>
                              <option value={0}>No</option>
                              <option value={1}>Yes</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="mt-6">
                      <button
                        onClick={submit}
                        disabled={loading}
                        className={`group w-full inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-bold shadow-lg text-white transition-all duration-300
                          ${loading
                            ? "bg-slate-300 cursor-not-allowed"
                            : "bg-gradient-to-r from-[#2f2971] to-[#3d3086] hover:from-[#3d3086] hover:to-[#2f2971] hover:shadow-xl hover:shadow-purple-500/50 transform hover:scale-[1.02]"
                          }`}
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                            Analysing…
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                            Recommend Drugs
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ── Results ──────────────────────────────────── */}
                  {result && (
                    <div>
                      {/* Tab bar */}
                      <div className="flex items-center gap-2 mb-5 bg-slate-100 p-1.5 rounded-2xl w-fit">
                        <ResultTabBtn
                          active={resultTab === "diseases"}
                          onClick={() => setResultTab("diseases")}
                          icon={BeakerIcon}
                          label="Diseases"
                          count={diseaseResults.length}
                        />
                        <ResultTabBtn
                          active={resultTab === "symptoms"}
                          onClick={() => setResultTab("symptoms")}
                          icon={HeartIcon}
                          label="Symptoms"
                          count={symptomResults.length}
                        />
                      </div>

                      {/* Count badge */}
                      {activeItems.length > 0 && (
                        <div className="flex items-center gap-2 mb-4">
                          <CheckCircleIcon className="h-5 w-5 text-[#2f2971]" />
                          <span className="text-sm font-bold text-slate-600">
                            {activeItems.length} recommendation{activeItems.length !== 1 ? "s" : ""} found
                          </span>
                        </div>
                      )}

                      {/* Cards */}
                      <div className="space-y-6">
                        {activeItems.length > 0 ? (
                          activeItems.map((r, i) => (
                            <RecommendationCard
                              key={`${resultTab}-${i}`}
                              r={r}
                              index={i}
                              type={resultTab === "diseases" ? "disease" : "symptom"}
                              expanded={!!expandedCards[`${resultTab}-${i}`]}
                              onToggle={() => setExpandedCards((p) => ({ ...p, [`${resultTab}-${i}`]: !p[`${resultTab}-${i}`] }))}
                            />
                          ))
                        ) : (
                          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-10 text-center">
                            <BeakerIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-slate-500">
                              No {resultTab === "diseases" ? "disease-based" : "symptom-based"} recommendations returned.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* ── RIGHT: All results sidebar ──────────────────── */}

              </div>

              {/* Footer */}
              <footer className="mt-12 pt-6 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                  <span>© {new Date().getFullYear()} PharmaLink. All rights reserved.</span>
                  <span>For academic and research purposes only. Always consult a healthcare professional.</span>
                </div>
              </footer>
            </div>
          </main>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}