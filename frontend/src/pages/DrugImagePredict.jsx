import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo2.jsx";
import { predictDrugImage } from "../services/advisoryApi";


import {
  HomeIcon,
  UserCircleIcon as UserCircle,
  ArrowRightOnRectangleIcon,
  PhotoIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

/** Nice labels (you can adjust) */
const LABELS = {
  generic_name: "Generic Name",
  contains: "Contains",
  uses: "Uses",
  dosage_info: "Dosage Info",
  warnings: "Warnings",
  side_effects: "Side Effects",
  availability_sri_lanka: "Availability (Sri Lanka)",
  brand_name: "Brand Name",
  drug_name: "Drug Name",
};

/** Availability normalize map */
const AVAILABILITY_MAP = {
  "widely available": "Widely available",
  "available otc": "Available OTC",
  "commonly available otc": "Commonly available (OTC)",
  "usually sold without prescription (otc)":
    "Usually sold without prescription (OTC)",
  "usually sold over the counter (otc)": "Usually sold over the counter (OTC)",
  "available in pharmacies": "Available in pharmacies",
  "no prescription required": "No prescription required",
  "prescription required": "Prescription required",
};

function mapAvailability(value) {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";

  const key = s.toLowerCase();

  // exact
  if (AVAILABILITY_MAP[key]) return AVAILABILITY_MAP[key];

  // partial match
  for (const k of Object.keys(AVAILABILITY_MAP)) {
    if (key.includes(k)) return AVAILABILITY_MAP[k];
  }

  return s;
}

/** Convert long text into bullet points */
function toBulletList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);

  const s = String(value).trim();
  if (!s) return [];

  const parts = s
    .split(/\r?\n|•|\u2022| - |—|, +/g)
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length <= 1) return [s];
  return parts;
}

/** Title-case fallback for unknown keys */
function prettyKey(k) {
  return k
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Confidence bar supports decimal (0-1) OR percent (0-100) */
function ConfidenceBar({ confidence }) {
  const c = Number(confidence ?? 0);
  const pct = Number.isFinite(c) ? (c <= 1 ? c * 100 : c) : 0;
  const show = Math.max(0, Math.min(100, pct));

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          Confidence
        </span>
        <span className="text-sm font-extrabold text-[#2f2971]">
          {show.toFixed(1)}%
        </span>
      </div>
      <div className="mt-2 h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#2f2971] to-[#3d3086] transition-all duration-700"
          style={{ width: `${show}%` }}
        />
      </div>
    </div>
  );
}

/** Google map iframe using dynamic query (no API key) */
function AvailabilityMap({ query }) {
  const mapQuery = encodeURIComponent(query || "pharmacies in Sri Lanka");
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <iframe
        title="Google Map Search"
        width="100%"
        height="260"
        loading="lazy"
        allowFullScreen
        className="w-full"
        src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
      />
    </div>
  );
}

export default function DrugImagePredict() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, token } = useAuth();

  const [activeTab, setActiveTab] = useState("drug-image");

  const [file, setFile] = useState(null);
  const [topk, setTopk] = useState(3);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Map search states (MUST be inside component)
  const [tempSearch, setTempSearch] = useState("");
  const [mapSearch, setMapSearch] = useState("Sri Lanka pharmacies");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  // Preview URL
  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  // Cleanup preview URL on change/unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleNavigation = useCallback((path) => navigate(path), [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!isAuthenticated || !token) {
      setError("Not logged in (token not found). Please login again.");
      navigate("/login");
      return;
    }

    if (!file) {
      setError("Please select an image file.");
      return;
    }

    try {
      setLoading(true);
        const res = await predictDrugImage({
          token,
          file,
          topk: topk || 1,
        });
        
        if (!res?.accepted) {
          setResult(null);
          setError(
            res?.message ||
              "Please upload a clear medicine image (pill)."
          );
          return;
        }
        
        setResult(res);
        setTempSearch("");
    } catch (e) {
      const msg =
        e?.error || e?.details || e?.message || "Drug image prediction failed.";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  const onReset = () => {
    setFile(null);
    setResult(null);
    setError("");
    setTopk(3);
    setTempSearch("");
    setMapSearch("Sri Lanka pharmacies");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="flex">
        {/* SIDEBAR */}
        <aside className="hidden md:flex w-72 min-h-screen bg-gradient-to-b from-[#2f2971] via-[#2a246a] to-[#251f5e] text-white flex-col shadow-2xl">
          <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
            <div
              className="shrink-0 flex items-center cursor-pointer group"
              onClick={() => handleNavigation("/")}
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
                handleNavigation("/dashboard");
              }}
              className={`relative w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold transition
                ${
                  activeTab === "dashboard"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <HomeIcon className="h-5 w-5" />
              Dashboard
            </button>

            <button
              onClick={() => {
                setActiveTab("food-drug");
                handleNavigation("/advisory");
              }}
              className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                ${
                  activeTab === "food-drug"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <ShieldCheckIcon className="h-5 w-5" />
              Food Drug Interaction
            </button>

            <button
              onClick={() => {
                setActiveTab("meal-plan");
                handleNavigation("/meal-plan");
              }}
              className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                ${
                  activeTab === "meal-plan"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <ClipboardDocumentListIcon className="h-5 w-5" />
              Meal Plan Advisor
            </button>

            {/* Current page */}
            <button
              onClick={() => setActiveTab("drug-image")}
              className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                ${
                  activeTab === "drug-image"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <PhotoIcon className="h-5 w-5" />
              Drug Image Analyzer
            </button>

            <button
              onClick={() => {
                setActiveTab("symptom-drug");
                handleNavigation("/symptom-drug");
              }}
              className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                ${
                  activeTab === "symptom-drug"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <SparklesIcon className="h-5 w-5" />
              Drug Recommender
            </button>

            <button
              onClick={() => {
                setActiveTab("history");
                handleNavigation("/history");
              }}
              className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200
                ${
                  activeTab === "history"
                    ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                    : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
                }`}
            >
              <ClockIcon className="h-5 w-5" />
              History
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
                <UserCircle className="h-5 w-5" />
                My Profile
              </button>

              <button
                onClick={handleLogout}
                className="relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200 text-white hover:bg-red-500/20 rounded-r-full -ml-4 pl-10"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </nav>
        </aside>

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
                  Drug Image Analyzer
                </h1>
                <p className="text-base text-slate-600">
                  Upload a clear image of medicine packaging or tablets. Our AI
                  system will identify the medication and provide detailed
                  information.
                </p>
              </div>

              {/* Info Banner */}
              <div className="mb-8 rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">
                      Tips for Best Results
                    </h3>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 mt-0.5">•</span>
                        <span>
                          Take clear, well-lit photos with visible text or
                          markings
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 mt-0.5">•</span>
                        <span>Center the medication in the frame</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 mt-0.5">•</span>
                        <span>Supported formats: JPG, PNG, WEBP (max 10MB)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid gap-8 lg:grid-cols-3">
                {/* Left Column */}
                <div className="lg:col-span-2">
                  <section className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-[#2f2971] to-[#3d3086] p-6">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                          <PhotoIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white">
                            Upload & Predict
                          </h2>
                          <p className="text-xs text-white/70 mt-0.5">
                            Select an image to begin analysis
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 md:p-8">
                      <form onSubmit={onSubmit} className="space-y-6">
                        {/* File Upload */}
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-3">
                            Select Image
                          </label>

                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setFile(e.target.files?.[0] || null)
                            }
                            className="block w-full text-sm text-slate-600
                                     file:mr-4 file:py-3 file:px-6
                                     file:rounded-2xl file:border-0
                                     file:bg-gradient-to-r file:from-[#2f2971] file:to-[#3d3086]
                                     file:text-white file:font-semibold
                                     hover:file:from-[#3d3086] hover:file:to-[#2f2971]
                                     file:cursor-pointer file:transition-all file:duration-300
                                     file:shadow-md hover:file:shadow-lg
                                     cursor-pointer
                                     rounded-2xl border-2 border-dashed border-slate-300
                                     hover:border-[#2f2971] bg-slate-50 hover:bg-slate-100
                                     px-4 py-6 transition-all duration-200"
                          />
                        </div>



                        {/* Preview */}
                        {previewUrl && (
                          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center justify-between mb-3">
                              <label className="text-sm font-bold text-slate-700">
                                Image Preview
                              </label>
                              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                                Ready to analyze
                              </span>
                            </div>
                            <div className="rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50 p-4">
                              <img
                                src={previewUrl}
                                alt="preview"
                                className="max-w-full w-full rounded-xl shadow-lg"
                              />
                            </div>
                          </div>
                        )}

                        {/* Buttons */}
                        <div className="flex flex-wrap gap-3 pt-2">
                          <button
                            type="submit"
                            disabled={loading}
                            className={`group inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm shadow-lg
                              ${
                                loading
                                  ? "bg-slate-300 cursor-not-allowed"
                                  : "bg-gradient-to-r from-[#2f2971] to-[#3d3086] hover:from-[#3d3086] hover:to-[#2f2971] shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/50"
                              }
                              text-white transition-all duration-300 transform hover:scale-[1.02]`}
                          >
                            {loading ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <SparklesIcon className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                                Predict Drug
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={onReset}
                            className="inline-flex items-center justify-center px-6 py-3.5 rounded-2xl font-bold text-sm
                                     border-2 border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400
                                     text-slate-700 transition-all duration-200 shadow-sm hover:shadow"
                          >
                            Reset
                          </button>
                        </div>
                      </form>

                      {/* Error */}
                      {error && (
                        <div className="mt-6 rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-5 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-red-900 mb-1">
                                Error
                              </h4>
                              <p className="text-sm text-red-700">{error}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Results */}
                      {result && (
                        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-900">
                              Prediction Results
                            </h3>

                            {result?.saved && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                                <CheckCircleIcon className="h-4 w-4" />
                                Saved
                              </span>
                            )}
                          </div>

                          <div className="space-y-5">
                            {(result?.predictions || []).map((p, idx) => {
                              const title =
                                p.drug_name || p.brand_name || "Unknown Drug";

                              return (
                                <div
                                  key={idx}
                                  className="rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                                >
                                  {/* Result Header */}
                                  <div className="p-6 border-b border-slate-200 bg-slate-50/70">
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <h4 className="text-xl font-extrabold text-slate-900">
                                          {title}
                                        </h4>
                                        {(p.brand_name || p.generic_name) && (
                                          <p className="text-sm text-slate-600 mt-1">
                                            {p.generic_name ? (
                                              <>
                                                Generic: <b>{p.generic_name}</b>
                                              </>
                                            ) : (
                                              <>
                                                Brand: <b>{p.brand_name}</b>
                                              </>
                                            )}
                                          </p>
                                        )}
                                      </div>

                                      <span className="text-xs font-extrabold text-[#2f2971] bg-[#2f2971]/10 border border-[#2f2971]/20 px-3 py-1.5 rounded-full">
                                        Predicted
                                      </span>
                                    </div>

                                    <ConfidenceBar confidence={p.confidence} />
                                  </div>

                                  {/* Result Body */}
                                  <div className="p-6">
                                    <div className="grid gap-4">
                                      {Object.entries(p)
                                        .filter(
                                          ([k]) =>
                                            ![
                                              "drug_name",
                                              "brand_name",
                                              "confidence",
                                            ].includes(k)
                                        )
                                        .map(([k, v]) => {
                                          const label = LABELS[k] || prettyKey(k);
                                          const isAvailability =
                                            k === "availability_sri_lanka";

                                          const normalizedValue = isAvailability
                                            ? mapAvailability(v)
                                            : v;

                                          const bullets = toBulletList(normalizedValue);

                                          return (
                                            <div
                                              key={k}
                                              className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                                            >
                                              <div className="text-sm font-extrabold text-slate-800">
                                                {label}
                                              </div>

                                              <div className="sm:col-span-2">
                                                {isAvailability ? (
                                                  <div className="space-y-3">
                                                    {/* Availability bullets */}
                                                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                                                      {toBulletList(v).map((item, i) => (
                                                        <li key={i}>{item}</li>
                                                      ))}
                                                    </ul>

                                                    {/* Search box + button */}
                                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                                      <label className="text-xs font-extrabold text-slate-700">
                                                        Search nearby pharmacies
                                                      </label>
                                                      <div className="mt-2 flex gap-2">
                                                        <div className="relative flex-1">
                                                          <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                          <input
                                                            type="text"
                                                            value={tempSearch}
                                                            onChange={(e) => setTempSearch(e.target.value)}
                                                            placeholder="Ex: Kaduwela pharmacies"
                                                            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                          />
                                                        </div>

                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setMapSearch(
                                                              tempSearch?.trim() ||
                                                                "Sri Lanka pharmacies"
                                                            )
                                                          }
                                                          className="px-4 py-2.5 rounded-xl bg-[#2f2971] hover:bg-[#3d3086] text-white text-sm font-extrabold"
                                                        >
                                                          Search
                                                        </button>
                                                      </div>

                                                      <p className="mt-2 text-[11px] text-slate-500">
                                                        Showing map for:{" "}
                                                        <span className="font-bold text-slate-700">
                                                          {mapSearch}
                                                        </span>
                                                      </p>
                                                    </div>

                                                    {/* Map */}
                                                    <AvailabilityMap query={mapSearch} />
                                                  </div>
                                                ) : bullets.length <= 1 ? (
                                                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                                                    {bullets[0] || "—"}
                                                  </p>
                                                ) : (
                                                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                                                    {bullets.map((item, i) => (
                                                      <li key={i} className="leading-relaxed">
                                                        {item}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                             {!result?.predictions?.length && (
                               <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-center">
                                 <ExclamationTriangleIcon className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                                 <p className="text-sm font-semibold text-slate-600">
                                   Please upload a clear medicine image (pill, blister, or bottle).
                                 </p>
                               </div>
                             )}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right Column */}
                <aside className="space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-5">
                      How It Works
                    </h3>

                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="shrink-0 h-8 w-8 rounded-xl bg-purple-100 flex items-center justify-center text-sm font-bold text-[#2f2971]">
                          1
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 mb-1">
                            Upload Image
                          </p>
                          <p className="text-xs text-slate-600">
                            Select a clear photo of the medication
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="shrink-0 h-8 w-8 rounded-xl bg-purple-100 flex items-center justify-center text-sm font-bold text-[#2f2971]">
                          2
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 mb-1">
                            AI Analysis
                          </p>
                          <p className="text-xs text-slate-600">
                            Our system identifies the drug
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="shrink-0 h-8 w-8 rounded-xl bg-purple-100 flex items-center justify-center text-sm font-bold text-[#2f2971]">
                          3
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 mb-1">
                            Get Results
                          </p>
                          <p className="text-xs text-slate-600">
                            View detailed medication information
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <ShieldCheckIcon className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-2">
                          Important Notice
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          This tool is for informational purposes only. Always
                          verify medication with a licensed healthcare
                          professional before use.
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-12 pt-6 border-t border-slate-200 max-w-5xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>
                    © {new Date().getFullYear()} PharmaLink. All rights reserved.
                  </span>
                </div>
                <span>For academic and research purposes only.</span>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
