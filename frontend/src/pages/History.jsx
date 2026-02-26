// src/pages/History.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo2.jsx";
import { advisoryRequest } from "../utils/api.js";

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
  TrashIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
  SparklesIcon,
  BeakerIcon,
  HeartIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

/* ----------------------------- Tabs / Types ------------------------------ */
const TYPES = [
  { key: "food_drug", label: "Food–Drug", icon: ShieldCheckIcon },
  { key: "meal_plan", label: "Meal Plans", icon: ClipboardDocumentListIcon },
  { key: "drug_image_prediction", label: "Drug Image", icon: PhotoIcon },
  { key: "symptom_drug_reco", label: "Drug Recommender", icon: SparklesIcon },
];

/* ------------------------------ Risk styles ------------------------------ */
const riskMeta = {
  0: {
    label: "Safe",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: CheckCircleIcon,
  },
  1: {
    label: "Moderate",
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: ExclamationTriangleIcon,
  },
  2: {
    label: "High Risk",
    gradient: "from-rose-500 to-red-600",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: ExclamationTriangleIcon,
  },
};

function normalizeRisk(item) {
  const s = item?.result?.severity;
  if (Number.isFinite(Number(s))) return Number(s);
  const r = item?.result?.risk;
  if (Number.isFinite(Number(r))) return Number(r);
  return 1;
}

function confidenceMeta(conf) {
  const c = Number(conf || 0);
  if (c >= 0.8) return { label: "High", className: "bg-emerald-500 text-white" };
  if (c >= 0.6) return { label: "Medium", className: "bg-amber-500 text-white" };
  return { label: "Low", className: "bg-rose-500 text-white" };
}

function pct(conf) {
  const n = Number(conf ?? 0);
  const v = Number.isFinite(n) ? (n <= 1 ? n * 100 : n) : 0;
  return Math.max(0, Math.min(100, v));
}

function uniqStrings(arr) {
  return Array.from(
    new Set((arr || []).map((x) => String(x).trim()).filter(Boolean))
  );
}

function titleCase(str) {
  return String(str || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// removes "R1:", "R13 -", "R2." etc
function stripRulePrefix(s) {
  return String(s || "").replace(/^R\d+\s*[:.\-]\s*/i, "").trim();
}

function capSentence(s) {
  const t = stripRulePrefix(s);
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* --------------------------- Details Modal UI --------------------------- */
function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
        tones[tone] || tones.slate
      }`}
    >
      {children}
    </span>
  );
}

function DetailsModal({
  open,
  onClose,
  item,
  type,
  onViewImage,
  onRecheck,
  onDelete,
}) {
  if (!open || !item) return null;

  const created = item?.createdAt ? new Date(item.createdAt).toLocaleString() : "";
  const severity = type === "food_drug" ? normalizeRisk(item) : null;
  const meta = severity != null ? riskMeta[severity] || riskMeta[1] : null;

  // FOOD-DRUG details
  const drugName = item?.input?.drug_name || item?.result?.drug || "—";
  const foodName = item?.input?.food_name || item?.result?.food || "—";
  const summary =
    item?.result?.message ||
    item?.result?.summary ||
    "No summary available.";

  const reasons = uniqStrings(item?.result?.reasons || item?.result?.reason_codes);
  const advicePoints = uniqStrings(
    item?.result?.explanation_points ||
      item?.result?.explanation?.explanation_points ||
      item?.result?.advice ||
      []
  );

  // MEAL PLAN details
  const mpDrugs = item?.input?.drug_names || [];
  const mpDays = item?.input?.days;
  const mpMealsPerDay = item?.input?.meals_per_day;
  const mpCal = item?.input?.calories_per_day;
  const mpPrefs = item?.input?.preferences || {};
  const mpAllergies = item?.input?.allergies || [];

  // DRUG IMAGE details
  const preds = Array.isArray(item?.result?.predictions) ? item.result.predictions : [];
  const top1 = preds[0];
  const filename = item?.input?.uploadedImage?.filename || "image";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2f2971] to-[#3d3086] px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white text-lg md:text-xl font-extrabold break-words">
                  {type === "food_drug" && `${drugName} + ${foodName}`}
                  {type === "meal_plan" && "Meal Plan Generated"}
                  {type === "drug_image_prediction" && "Drug Image Analysis"}
                  {type === "symptom_drug_reco" && "Drug Recommendations From Symptoms"}
                </h3>

                {type === "food_drug" && meta && (
                  <span className="inline-flex items-center rounded-full bg-white/95 text-slate-900 px-3 py-1 text-xs font-extrabold">
                    {meta.label}
                  </span>
                )}
              </div>

              <div className="text-white/80 text-sm mt-1 flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                {created}
              </div>
            </div>

            <button
              className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              onClick={onClose}
              aria-label="close"
              title="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[78vh] overflow-y-auto p-6 bg-slate-50">
          {/* FOOD-DRUG */}
          {type === "food_drug" && (
            <div className="space-y-5">
              <Section title="Summary">
                <p className="text-slate-700 font-medium leading-relaxed">
                  {summary}
                </p>
              </Section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Section title="Drug">
                  <div className="text-slate-900 font-extrabold">{drugName}</div>
                </Section>
                <Section title="Food">
                  <div className="text-slate-900 font-extrabold">{foodName}</div>
                </Section>
              </div>

              {(reasons.length > 0 || advicePoints.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Section title="Why this risk">
                    {reasons.length ? (
                      <div className="flex flex-wrap gap-2">
                        {reasons.map((r, i) => (
                          <Pill key={i} tone={meta?.label === "High Risk" ? "rose" : meta?.label === "Moderate" ? "amber" : "emerald"}>
                            {r}
                          </Pill>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600">No reasons provided.</div>
                    )}
                  </Section>

                  <Section title="Safety notes">
                    {advicePoints.length ? (
                      <ul className="text-sm text-slate-700 space-y-2">
                        {advicePoints.slice(0, 8).map((p, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                            <span className="leading-relaxed">{p}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-600">No safety notes provided.</div>
                    )}
                  </Section>
                </div>
              )}
            </div>
          )}

          {/* MEAL PLAN */}
          {type === "meal_plan" && (
            <div className="space-y-5">
              <Section title="Medications">
                {mpDrugs?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {mpDrugs.map((d, i) => (
                      <Pill key={i} tone="purple">{d}</Pill>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">—</div>
                )}
              </Section>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Section title="Days">
                  <div className="text-slate-900 font-extrabold">{mpDays ?? "—"}</div>
                </Section>
                <Section title="Meals per day">
                  <div className="text-slate-900 font-extrabold">{mpMealsPerDay ?? "—"}</div>
                </Section>
                <Section title="Calories per day">
                  <div className="text-slate-900 font-extrabold">{mpCal ?? "—"}</div>
                </Section>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Section title="Preferences">
                  <div className="flex flex-wrap gap-2">
                    <Pill tone={mpPrefs?.vegetarian ? "emerald" : "slate"}>
                      Vegetarian: {mpPrefs?.vegetarian ? "Yes" : "No"}
                    </Pill>
                    <Pill tone={mpPrefs?.diabeticFriendly ? "emerald" : "slate"}>
                      Diabetic friendly: {mpPrefs?.diabeticFriendly ? "Yes" : "No"}
                    </Pill>
                    <Pill tone={mpPrefs?.lowSodium ? "emerald" : "slate"}>
                      Low sodium: {mpPrefs?.lowSodium ? "Yes" : "No"}
                    </Pill>
                  </div>
                </Section>

                <Section title="Allergies">
                  {mpAllergies?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {mpAllergies.map((a, i) => (
                        <Pill key={i} tone="rose">{a}</Pill>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">None</div>
                  )}
                </Section>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Meal plans are AI-assisted. Please verify with your doctor/pharmacist before making changes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DRUG IMAGE */}
          {type === "drug_image_prediction" && (
            <div className="space-y-5">
              <Section title="Uploaded file">
                <div className="text-slate-900 font-extrabold">{filename}</div>
              </Section>

              <Section title="Predictions">
                {preds.length ? (
                  <div className="space-y-4">
                    {preds.slice(0, 5).map((p, i) => {
                      const c = pct(p?.confidence);
                      const cm = confidenceMeta(p?.confidence ?? 0);
                      return (
                        <div
                          key={i}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-base font-extrabold text-slate-900">
                                {p?.drug_name || p?.brand_name || "Unknown drug"}
                              </div>
                              {(p?.generic_name || p?.brand_name) && (
                                <div className="text-sm text-slate-600 mt-1">
                                  {p?.generic_name ? (
                                    <>Generic: <b>{p.generic_name}</b></>
                                  ) : (
                                    <>Brand: <b>{p.brand_name}</b></>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-extrabold ${cm.className}`}>
                              {cm.label}
                            </span>
                          </div>

                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                              <span>Confidence</span>
                              <span className="text-[#2f2971]">{c.toFixed(1)}%</span>
                            </div>
                            <div className="mt-2 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#2f2971] to-[#3d3086]"
                                style={{ width: `${c}%` }}
                              />
                            </div>
                          </div>

                          {/* Optional extra fields if backend includes */}
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {p?.uses && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="text-xs font-extrabold text-slate-500 uppercase">Uses</div>
                                <div className="mt-1 text-slate-700 whitespace-pre-line">{String(p.uses)}</div>
                              </div>
                            )}
                            {p?.warnings && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="text-xs font-extrabold text-slate-500 uppercase">Warnings</div>
                                <div className="mt-1 text-slate-700 whitespace-pre-line">{String(p.warnings)}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">No predictions available.</div>
                )}
              </Section>
            </div>
          )}
          {/* SYMPTOM DRUG RECOMMENDER */}
{type === "symptom_drug_reco" && (() => {
  const inputSymptoms = Array.isArray(item?.input?.symptoms) ? item.input.symptoms : [];
  const diseases = Array.isArray(item?.result?.predicted_disease_recommendations)
    ? item.result.predicted_disease_recommendations
    : [];
  const symptomRecos = Array.isArray(item?.result?.direct_symptom_recommendations)
    ? item.result.direct_symptom_recommendations
    : [];

  const DrugCols = ({ r }) => (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase">
          <BeakerIcon className="h-4 w-4" />
          First Line
        </div>
        <div className="mt-1 text-sm text-slate-700">
          {(r?.first_line_drugs || []).map(titleCase).join(", ") || "—"}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase">
          <BeakerIcon className="h-4 w-4" />
          Second Line
        </div>
        <div className="mt-1 text-sm text-slate-700">
          {(r?.second_line_drugs || []).map(titleCase).join(", ") || "—"}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase">
          <ExclamationTriangleIcon className="h-4 w-4" />
          Avoid
        </div>
        <div className="mt-1 text-sm text-slate-700">
          {(r?.avoid_drugs || []).map(titleCase).join(", ") || "—"}
        </div>
      </div>
    </div>
  );

  const Warnings = ({ r }) => {
    const warns = Array.isArray(r?.safety_warnings) ? r.safety_warnings : [];
    if (!warns.length) return null;

    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-xs font-extrabold text-amber-800 uppercase">
          <ExclamationCircleIcon className="h-4 w-4" />
          Safety Warnings
        </div>
        <ul className="mt-2 space-y-2 text-sm text-amber-900">
          {warns.map((w, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-amber-600 shrink-0" />
              <span className="leading-relaxed">{capSentence(w)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <Section title="Symptoms (Input)">
        {inputSymptoms.length ? (
          <div className="flex flex-wrap gap-2">
            {inputSymptoms.map((s, i) => (
              <Pill key={i} tone="purple">{titleCase(s)}</Pill>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">—</div>
        )}
      </Section>

      <Section title="Predicted Disease Recommendations">
        {diseases.length ? (
          <div className="space-y-4">
            {diseases.slice(0, 6).map((r, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <BeakerIcon className="h-5 w-5 text-[#2f2971]" />
                      <div className="text-base font-extrabold text-slate-900">
                        {r?.disease ? titleCase(r.disease) : "—"}
                      </div>
                    </div>
                    {typeof r?.prob === "number" && (
                      <div className="text-xs text-slate-500 mt-1">
                        Match: {(r.prob * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                <DrugCols r={r} />
                <Warnings r={r} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">No disease recommendations saved.</div>
        )}
      </Section>

      <Section title="Direct Symptom Recommendations">
        {symptomRecos.length ? (
          <div className="space-y-4">
            {symptomRecos.slice(0, 6).map((r, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <HeartIcon className="h-5 w-5 text-[#2f2971]" />
                      <div className="text-base font-extrabold text-slate-900">
                        {r?.symptom ? titleCase(r.symptom) : "—"}
                      </div>
                    </div>
                    {typeof r?.prob === "number" && (
                      <div className="text-xs text-slate-500 mt-1">
                        Match: {(r.prob * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>

                <DrugCols r={r} />
                <Warnings r={r} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">No symptom recommendations saved.</div>
        )}
      </Section>
    </div>
  );
})()}
        </div>

        {/* Footer actions */}
        <div className="p-5 bg-white border-t border-slate-200 flex flex-wrap gap-3 justify-end">
          {type === "drug_image_prediction" && (
            <button
              onClick={() => onViewImage?.()}
              className="px-5 py-2.5 rounded-xl text-sm font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              View Image
            </button>
          )}

          {type === "food_drug" && (
            <button
              onClick={() => onRecheck?.()}
              className="px-5 py-2.5 rounded-xl text-sm font-extrabold bg-blue-50 text-blue-700 hover:bg-blue-100 inline-flex items-center gap-2"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              Re-check
            </button>
          )}

          <button
            onClick={() => onDelete?.()}
            className="px-5 py-2.5 rounded-xl text-sm font-extrabold bg-rose-50 text-rose-700 hover:bg-rose-100 inline-flex items-center gap-2"
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-extrabold border border-slate-300 bg-white hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Main Page ---------------------------- */
export default function History() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, token } = useAuth();

  const [activeTab, setActiveTab] = useState("history");
  const [activeType, setActiveType] = useState("food_drug");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // image preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMeta, setPreviewMeta] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const activeLabel = useMemo(
    () => TYPES.find((t) => t.key === activeType)?.label || activeType,
    [activeType]
  );

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  const handleNavigation = useCallback((path) => navigate(path), [navigate]);
  const handleLogout = useCallback(() => {
    logout?.();
    navigate("/");
  }, [logout, navigate]);

  async function loadHistory(type = activeType) {
    setLoading(true);
    setErr("");
    try {
      const data = await advisoryRequest(
        `/history?type=${encodeURIComponent(type)}`,
        { token }
      );
      setItems(data?.items || []);
    } catch (e) {
      setErr(e?.error || e?.details || e?.message || "Failed to load history");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory(activeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  function openDetails(item) {
    setSelectedItem(item);
    setDetailsOpen(true);
  }
  function closeDetails() {
    setDetailsOpen(false);
    setSelectedItem(null);
  }

  // ESC close details
  useEffect(() => {
    if (!detailsOpen) return;
    const onKeyDown = (e) => e.key === "Escape" && closeDetails();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsOpen]);

  // cleanup blob url
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function openImage(interactionId, meta) {
    setPreviewLoading(true);
    setPreviewMeta(meta);
    setPreviewOpen(true);

    try {
      const ADVISORY_API =
        import.meta.env.VITE_ADVISORY_API || "http://localhost:3002";

      const res = await fetch(`${ADVISORY_API}/history/${interactionId}/image`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let msg = "Failed to load image";
        try {
          const j = await res.json();
          msg = j?.error || j?.details || msg;
        } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (e) {
      setErr(e?.message || "Failed to load image");
      setPreviewUrl("");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewOpen(false);
    setPreviewMeta(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
  }

  async function handleDeleteOne(id) {
    if (!window.confirm("Delete this item from history?")) return;
    setErr("");

    try {
      await advisoryRequest(`/history/${id}`, {
        method: "DELETE",
        token,
      });
      setItems((prev) => prev.filter((x) => x._id !== id));

      // if deleted item is open in modal, close it
      if (selectedItem?._id === id) closeDetails();
    } catch (e) {
      setErr(e?.error || e?.details || e?.message || "Failed to delete history item");
    }
  }

  async function handleClear() {
    const label = TYPES.find((t) => t.key === activeType)?.label || "this";
    if (!window.confirm(`Clear ${label} history?`)) return;

    setErr("");
    try {
      await advisoryRequest(`/history?type=${encodeURIComponent(activeType)}`, {
        method: "DELETE",
        token,
      });
      setItems([]);
      closeDetails();
    } catch (e) {
      setErr(
        e?.error ||
          e?.details ||
          e?.message ||
          "Clear endpoint not available. Add DELETE /history in backend."
      );
    }
  }

  // For modal actions
  const modalOnViewImage = useCallback(() => {
    if (!selectedItem) return;
    openImage(selectedItem._id, {
      filename: selectedItem?.input?.uploadedImage?.filename,
      contentType: selectedItem?.input?.uploadedImage?.contentType,
      createdAt: selectedItem?.createdAt,
    });
  }, [selectedItem]);

  const modalOnRecheck = useCallback(() => {
    if (activeType !== "food_drug" || !selectedItem) return;
    closeDetails();
    navigate("/advisory", {
      state: {
        fromHistory: true,
        drugName: selectedItem?.input?.drug_name,
        foodName: selectedItem?.input?.food_name,
      },
    });
  }, [activeType, selectedItem, navigate]);

  const modalOnDelete = useCallback(() => {
    if (!selectedItem) return;
    handleDeleteOne(selectedItem._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem]);

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

            <button
              onClick={() => {
                setActiveTab("drug-image");
                handleNavigation("/drug-image");
              }}
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
              {/* Hero */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
                      History
                    </h1>
                    <p className="text-base text-slate-600">
                      Review and manage all your interactions and predictions
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => loadHistory(activeType)}
                      disabled={loading}
                      className="h-10 w-10 flex items-center justify-center rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <ArrowPathIcon
                        className={`h-5 w-5 text-slate-600 ${
                          loading ? "animate-spin" : ""
                        }`}
                      />
                    </button>

                    {items.length > 0 && (
                      <button
                        onClick={handleClear}
                        className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-3 flex-wrap">
                  {TYPES.map((t) => {
                    const Icon = t.icon;
                    const isActive = activeType === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setActiveType(t.key)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-[#2f2971] to-[#3d3086] text-white shadow-lg shadow-[#2f2971]/20"
                            : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:shadow-md"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin h-10 w-10 border-4 border-slate-200 border-t-[#2f2971] rounded-full mx-auto mb-4" />
                    <p className="text-sm text-slate-600">
                      Loading {activeLabel}...
                    </p>
                  </div>
                </div>
              ) : err ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
                  {err}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-20">
                  <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-6">
                    <ClockIcon className="h-10 w-10 text-slate-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">
                    No {activeLabel} History
                  </h2>
                  <p className="text-slate-600 max-w-md mx-auto mb-6">
                    Start using our tools to check drug interactions, generate
                    meal plans, or analyze drug images. Your activity will
                    appear here.
                  </p>
                  <button
                    onClick={() => navigate("/symptom-drug")}
                    className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#2f2971] to-[#3d3086] hover:shadow-lg transition-shadow"
                  >
                    Get Started
                  </button>
                </div>
              ) : (
                <div className="grid gap-5">
                  {items.map((it) => (
                    <HistoryCard
                      key={it._id}
                      item={it}
                      type={activeType}
                      onOpenDetails={() => openDetails(it)}
                      onViewImage={() =>
                        openImage(it._id, {
                          filename: it?.input?.uploadedImage?.filename,
                          contentType: it?.input?.uploadedImage?.contentType,
                          createdAt: it?.createdAt,
                        })
                      }
                      onRecheck={() => {
                        if (activeType !== "food_drug") return;
                        navigate("/advisory", {
                          state: {
                            fromHistory: true,
                            drugName: it?.input?.drug_name,
                            foodName: it?.input?.food_name,
                          },
                        });
                      }}
                      onDelete={() => handleDeleteOne(it._id)}
                    />
                  ))}
                </div>
              )}

              {/* Footer */}
              <footer className="mt-16 pt-6 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                  <span>
                    © {new Date().getFullYear()} PharmaLink. All rights reserved.
                  </span>
                  <span>For academic and research purposes only.</span>
                </div>
              </footer>
            </div>
          </main>

          {/* Image modal */}
          {previewOpen && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onMouseDown={closePreview}
            >
              <div
                className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-[#2f2971] to-[#3d3086] px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PhotoIcon className="h-6 w-6 text-white" />
                    <div>
                      <div className="font-semibold text-white">Uploaded Image</div>
                      <div className="text-xs text-white/70">
                        {previewMeta?.filename || "image"}
                      </div>
                    </div>
                  </div>
                  <button
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    onClick={closePreview}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6">
                  {previewLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-[#2f2971] rounded-full" />
                    </div>
                  ) : previewUrl ? (
                    <img src={previewUrl} alt="Stored" className="w-full rounded-xl" />
                  ) : (
                    <div className="p-8 text-center text-slate-600">
                      Image not available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Details modal (Nice UI – no JSON) */}
          <DetailsModal
            open={detailsOpen}
            onClose={closeDetails}
            item={selectedItem}
            type={activeType}
            onViewImage={modalOnViewImage}
            onRecheck={modalOnRecheck}
            onDelete={modalOnDelete}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Card components ---------------------------- */
function HistoryCard({ item, type, onOpenDetails, onViewImage, onRecheck, onDelete }) {
  const created = item?.createdAt ? 
  new Date(item.createdAt).toLocaleString() : 
  "";

  const severity = type === "food_drug" ? normalizeRisk(item) : null;
  const meta = severity != null ? riskMeta[severity] || riskMeta[1] : null;
  const Icon = meta?.icon;

  const preds = Array.isArray(item?.result?.predictions) 
  ? item.result.predictions : 
  [];
  const top1 = preds[0];
  const conf = top1?.confidence ?? 0;
  const confM = confidenceMeta(conf);

  return (
    <div
      onClick={onOpenDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpenDetails?.()}
      className="group relative bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      {type === "food_drug" && meta && (
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${meta.gradient}`} />
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {type === "food_drug" && Icon && (
              <div className={`h-12 w-12 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-6 w-6 ${meta.text}`} />
              </div>
            )}

            {type === "meal_plan" && (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#6059b3] to-[#2f2971] flex items-center justify-center shrink-0">
                <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
              </div>
            )}

            {type === "drug_image_prediction" && (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#6059b3] to-[#2f2971] flex items-center justify-center shrink-0">
                <PhotoIcon className="h-6 w-6 text-white" />
              </div>
            )}

            {type === "symptom_drug_reco" && (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#6059b3] to-[#2f2971] flex items-center justify-center shrink-0">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 mb-1 truncate">
                {type === "food_drug" &&
                  `${item?.input?.drug_name || "Drug"} + ${item?.input?.food_name || "Food"}`}
                  {type === "meal_plan" && (() => {
                      const meds = (item?.input?.drug_names || []).filter(Boolean);
                      const text = meds.length ? meds.join(", ") : "—";
                      return `${text}`;
                    })()}
                {type === "drug_image_prediction" && (item?.input?.uploadedImage?.filename || "Drug Image")}
                {type === "symptom_drug_reco" &&((item?.input?.symptoms || []).map(titleCase).join(", ") || "Drug Recommender")}
              </h3>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ClockIcon className="h-4 w-4" />
                {created}
              </div>
            </div>
          </div>

          {type === "food_drug" && meta && (
            <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.text} border ${meta.border}`}>
              {meta.label}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="mb-4">
          {type === "food_drug" && (
            <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
              {item?.result?.message || "—"}
            </p>
          )}

          {type === "meal_plan" && (
            <div>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span>📅 {item?.input?.days} days</span>
                <span>🍽️ {item?.input?.meals_per_day} meals/day</span>
                <span>🔥 {item?.input?.calories_per_day} cal/day</span>
              </div>
            </div>
          )}

          {type === "drug_image_prediction" && (
            <div>


              {top1 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Identified as</div>
                      <div className="text-lg font-bold text-slate-900">
                        {top1.drug_name}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-xs font-bold ${confM.className}`}>
                      {confM.label}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    {(Number(conf) * 100).toFixed(1)}% confidence
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No predictions</div>
              )}
            </div>
          )}

{type === "symptom_drug_reco" && (() => {
  const diseases = item?.result?.predicted_disease_recommendations || [];
  const symptoms = item?.result?.direct_symptom_recommendations || [];
  const top = diseases[0];

  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Top Disease</div>
          <div className="text-lg font-bold text-slate-900">
            {top?.disease ? titleCase(top.disease) : "—"}
          </div>
          {typeof top?.prob === "number" && (
            <div className="text-sm text-slate-600 mt-1">
              Match: {(top.prob * 100).toFixed(1)}%
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 items-end">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
            Diseases: {diseases.length}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
            Symptoms: {symptoms.length}
          </span>
        </div>
      </div>
    </div>
  );
})()}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
          {type === "drug_image_prediction" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewImage?.();
              }}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              View Image
            </button>
          )}

          {type === "food_drug" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecheck?.();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              Re-check
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
