// FoodDrugInteraction.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { foodDrugCheck } from "../../services/advisoryApi";
import { searchDrugs, searchFoods } from "../../services/catalogApi";
import BrandLogo from "../../components/BrandLogo";

// ─────────────────────────── Types ───────────────────────────
type User = { id?: string; name?: string; email?: string; role?: string; avatar?: string };
type AuthContextType = { user: User | null; token: string; isAuthenticated: boolean; logout: () => Promise<void>; loading: boolean };
type DrugItem = { index?: number; name?: string; is_alcohol?: number | boolean };
type FoodItem = { Food?: string; name?: string; contains?: string; is_alcohol?: number | boolean };
type ReasonDetail = { tag?: string; title?: string; generated_text?: string; advice?: string };
type ExplanationType = { explanation_points?: string[]; food_signals?: Record<string, any>; reason_details?: ReasonDetail[] };
type TimingAdviceItem = {title?: string;take_medicine_at?: string;avoid_from?: string;avoid_until?: string;food_group?: string;message?: string;};
type ResultType = { drug?: string; food?: string; message?: string; risk?: number; severity?: number; explanation?: ExplanationType; safe_foods?: any[]; timing_advice?: TimingAdviceItem[]; };


// ─────────────────────────── Risk config (semantic colors) ───────────────────────────
const riskMeta: Record<number, {
  label: string;
  borderColor: string;
  bg: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
  msgColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
}> = {
  0: {
    label: "Safe",
    borderColor: "#6EE7B7",
    bg: "#ECFDF5",
    textColor: "#065F46",
    badgeBg: "#D1FAE5",
    badgeText: "#065F46",
    iconBg: "#A7F3D0",
    iconColor: "#065F46",
    msgColor: "#047857",
    iconName: "checkmark-circle-outline",
  },
  1: {
    label: "Moderate Risk",
    borderColor: "#FCD34D",
    bg: "#FFFBEB",
    textColor: "#78350F",
    badgeBg: "#FEF3C7",
    badgeText: "#92400E",
    iconBg: "#FDE68A",
    iconColor: "#92400E",
    msgColor: "#B45309",
    iconName: "warning-outline",
  },
  2: {
    label: "High Risk",
    borderColor: "#FCA5A5",
    bg: "#FEF2F2",
    textColor: "#7F1D1D",
    badgeBg: "#FEE2E2",
    badgeText: "#991B1B",
    iconBg: "#FECACA",
    iconColor: "#DC2626",
    msgColor: "#B91C1C",
    iconName: "alert-circle-outline",
  },
};

// ─────────────────────────── Helpers ───────────────────────────
function normalizeRisk(result: ResultType | null) { return Number(result?.risk ?? result?.severity ?? 1); }
function fmt(n: any, d = 1) { return Number(n || 0).toFixed(d); }
function pickExplainPoints(obj: any): string[] { const pts = obj?.explanation?.explanation_points; return Array.isArray(pts) ? pts : []; }
function pickSignals(obj: any) { return obj?.explanation?.food_signals || {}; }
function prettifyFoodName(value?: string) {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTime12(t?: string) {
  if (!t) return "";

  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;

  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;

  return `${hour.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")} ${ampm}`;
}

function toMinutes(timeStr?: string | null) {
  if (!timeStr || typeof timeStr !== "string") return null;

  const parts = timeStr.split(":").map(Number);
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
    return null;
  }

  return parts[0] * 60 + parts[1];
}

// ─────────────────────────── SignalsGrid ───────────────────────────
function SignalsGrid({ signals }: { signals: Record<string, any> }) {
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
    <View style={styles.signalsGrid}>
      {items.map(([k, v]) => (
        <View key={String(k)} style={styles.signalCard}>
          <Text style={styles.signalKey}>{k}</Text>
          <Text style={styles.signalValue}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function TimingTimeline({
  avoidFrom,
  medTime,
  avoidUntil,
  foodGroup,
}: {
  avoidFrom?: string | null;
  medTime?: string | null;
  avoidUntil?: string | null;
  foodGroup?: string | null;
}) {
  const start = toMinutes(avoidFrom);
  const med = toMinutes(medTime);
  const end = toMinutes(avoidUntil);

  const hasWindow =
    start != null && med != null && end != null && start < med && med < end;

  if (!hasWindow) {
    return (
      <View style={styles.timelineFallback}>
        <View style={styles.timelineTitleRow}>
          <Ionicons name="time-outline" size={16} color="#7C3AED" />
          <Text style={styles.timelineFallbackTitle}>Timing window not available</Text>
        </View>
        <Text style={styles.timelineFallbackText}>
          Avoid {foodGroup || "this food group"} while using this medicine.
        </Text>
      </View>
    );
  }

  const before = med - start;
  const after = end - med;
  const total = before + after || 1;

  const beforeFlex = before / total;
  const afterFlex = after / total;

  return (
    <View style={styles.timelineWrap}>
      <View style={styles.timelineTimeRow}>
        <Text style={styles.timelineTime}>{formatTime12(avoidFrom || "")}</Text>
        <Text style={styles.timelineTimeActive}>{formatTime12(medTime || "")}</Text>
        <Text style={styles.timelineTime}>{formatTime12(avoidUntil || "")}</Text>
      </View>

      <View style={styles.timelineBarRow}>
        <View style={[styles.timelineBar, { flex: beforeFlex }]} />
        <View style={styles.timelinePillCircle}>
          <Text style={styles.timelinePillEmoji}>💊</Text>
        </View>
        <View style={[styles.timelineBar, { flex: afterFlex }]} />
      </View>

      <View style={styles.timelineLabelRow}>
        <Text style={styles.timelineLabel}>Avoid before</Text>
        <Text style={styles.timelineLabelCenter}>Take medicine</Text>
        <Text style={styles.timelineLabel}>Avoid after</Text>
      </View>

      <View style={styles.timelineSafeBadge}>
        <Text style={styles.timelineSafeBadgeText}>
          Safe to consume food after {formatTime12(avoidUntil || "")}
        </Text>
      </View>

      <View style={styles.timelineStatsRow}>
        <View style={styles.timelineStatCard}>
          <Text style={styles.timelineStatLabel}>Before medicine</Text>
          <Text style={styles.timelineStatValue}>{before} mins</Text>
        </View>

        <View style={styles.timelineStatCardPurple}>
          <Text style={styles.timelineStatLabelPurple}>Medication</Text>
          <Text style={styles.timelineStatValue}>{formatTime12(medTime || "")}</Text>
        </View>

        <View style={styles.timelineStatCardViolet}>
          <Text style={styles.timelineStatLabelViolet}>After medicine</Text>
          <Text style={styles.timelineStatValue}>{after} mins</Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────── AutoComplete ───────────────────────────
type AutoCompleteProps<T> = {
  label: string; placeholder: string; value: string;
  onChangeValue: (val: string) => void;
  fetcher: (q: string) => Promise<T[] | { drugs?: T[]; foods?: T[] }>;
  onSelect: (item: T) => void;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string | undefined;
  showAlcohol?: boolean;
};

function AutoComplete<T extends { is_alcohol?: number | boolean }>({
  label, placeholder, value, onChangeValue, fetcher, onSelect, getLabel, getSubLabel, showAlcohol = false,
}: AutoCompleteProps<T>) {
  const [options, setOptions] = useState<T[]>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!value.trim()) { setOptions([]); setShow(false); } }, [value]);

  const handleSearch = async (val: string) => {
    onChangeValue(val);
    if (!val.trim()) { setOptions([]); setShow(false); return; }
    setShow(true);
    try {
      setLoading(true);
      const res = await fetcher(val);
      setOptions(Array.isArray(res) ? res : res?.drugs || (res as any)?.foods || []);
    } catch { setOptions([]); } finally { setLoading(false); }
  };

  return (
    <View style={styles.autoWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputOuter}>
        <Ionicons name="search-outline" size={16} color="#94A3B8" />
        <TextInput
          value={value} onChangeText={handleSearch} placeholder={placeholder}
          placeholderTextColor="#CBD5E1" style={styles.input}
          onFocus={() => { if (options.length > 0) setShow(true); }}
          onBlur={() => { setTimeout(() => setShow(false), 150); }}
        />
      </View>
      {show && (
        <View style={styles.dropdown}>
          {loading ? (
            <View style={styles.dropdownLoading}>
              <ActivityIndicator size="small" color="#2f2971" />
              <Text style={styles.dropdownLoadingText}>Searching...</Text>
            </View>
          ) : options.length === 0 ? (
            <View style={styles.dropdownEmpty}><Text style={styles.dropdownEmptyText}>No results found</Text></View>
          ) : (
            options.map((item, index) => {
              const title = getLabel(item);
              const sub = getSubLabel?.(item);
              return (
                <TouchableOpacity key={`${title}-${index}`} style={styles.dropdownOption} activeOpacity={0.8}
                  onPress={() => { onSelect(item); setShow(false); setOptions([]); }}>
                  <Text style={styles.dropdownOptionTitle}>{title}</Text>
                  {sub ? <Text style={styles.dropdownOptionSub}>{sub}</Text> : null}
                  {showAlcohol && ((item as any)?.is_alcohol === 1 || (item as any)?.is_alcohol === true) ? (
                    <View style={styles.alcoholBadge}><Text style={styles.alcoholBadgeText}>Alcohol</Text></View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────── Drawer menu items ───────────────────────────
const MENU_ITEMS = [
  { label: "Dashboard",           icon: "home-outline"             as const, path: "/dashboard",                    replace: true  },
  { label: "Food Drug Interaction",icon: "shield-checkmark-outline" as const, path: "/advisory/FoodDrugInteraction", replace: true  },
  { label: "Meal Plan Advisor",   icon: "clipboard-outline"        as const, path: "/advisory/PersonalizedMealPlan", replace: false },
  { label: "Drug Image Analyzer", icon: "image-outline"            as const, path: "/advisory/DrugImagePredict",          replace: false },
  { label: "Patient Story Analyzer", icon: "sparkles-outline"         as const, path: "/advisory/PatientStoryAnalyzer",        replace: false },
  { label: "History",             icon: "time-outline"             as const, path: "/advisory/History",                      replace: false },
];

// ─────────────────────────── Main Screen ───────────────────────────
export default function FoodDrugInteractionScreen() {
  const { isAuthenticated, token, loading, logout } = useAuth() as AuthContextType;

  const [selectedDrugName, setSelectedDrugName]   = useState("");
  const [selectedFoodName, setSelectedFoodName]   = useState("");
  const [medicationTime, setMedicationTime]       = useState("");
  const [safeLimit, setSafeLimit]                 = useState("10");
  const [result, setResult]                       = useState<ResultType | null>(null);
  const [safeFoods, setSafeFoods]                 = useState<any[]>([]);
  const [loadingCheck, setLoadingCheck]           = useState(false);
  const [error, setError]                         = useState("");
  const [showResultExplain, setShowResultExplain] = useState(true);
  const [expandedSafe, setExpandedSafe]           = useState<Record<string, boolean>>({});
  const [expandedReason, setExpandedReason]       = useState<Record<string, boolean>>({});
  const [showSidebar, setShowSidebar]             = useState(false);

  useEffect(() => { if (!loading && !isAuthenticated) router.replace("/login"); }, [loading, isAuthenticated]);

  const fetchDrugs = useMemo(() => async (q: string) => await searchDrugs(q, 10), []);
  const fetchFoods = useMemo(() => async (q: string) => await searchFoods(q, 10), []);

  const resetAll = () => {
    setSelectedDrugName(""); setSelectedFoodName(""); setSafeFoods([]); setMedicationTime("");
    setResult(null); setError(""); setExpandedSafe({}); setExpandedReason({});
    setShowResultExplain(true); setSafeLimit("10");
  };

const handleCheck = async () => {
  const drug_name = selectedDrugName.trim();
  const food_name = selectedFoodName.trim();
  const medTime = medicationTime.trim();

  if (!drug_name || !food_name) {
    setError("Please select both a drug and a food item.");
    return;
  }

  if (!/^\d{2}:\d{2}$/.test(medTime)) {
    setError("Please enter medicine time in HH:MM format.");
    return;
  }

  setError("");
  setLoadingCheck(true);

  try {
    const res = await foodDrugCheck({
      token,
      drug_name,
      food_name,
      safe_food_limit: Number(safeLimit || 10),
      medication_time: medTime,
    });

    setResult(res);
    const safeFromRes = Array.isArray(res?.safe_foods) ? res.safe_foods : [];
    setSafeFoods(
      safeFromRes.filter((f: any) => f?.explanation?.food_signals?.is_alcohol !== 1)
    );
    setExpandedSafe({});
    setExpandedReason({});
    setShowResultExplain(true);
  } catch (err: any) {
    setError(err?.error || err?.details || err?.message || "Error checking interaction. Please try again.");
  } finally {
    setLoadingCheck(false);
  }
};

  const risk  = result ? normalizeRisk(result) : null;
  const rmeta = risk != null ? riskMeta[risk] || riskMeta[1] : null;
  const resultExplainPoints  = pickExplainPoints(result || {});
  const resultReasonDetails  = Array.isArray(result?.explanation?.reason_details) ? result!.explanation!.reason_details! : [];
  const resultSignals        = pickSignals(result || {});
  const timingAdvice = Array.isArray(result?.timing_advice) ? result.timing_advice : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <BrandLogo withText size={34} />
          <TouchableOpacity style={styles.menuBtn} onPress={() => setShowSidebar(true)} activeOpacity={0.8}>
            <Ionicons name="menu-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── PAGE HERO ── */}
        <View style={styles.pageHero}>
          <View style={styles.pageHeroBadge}>
            <View style={styles.pageHeroBadgeDot} />
            <Text style={styles.pageHeroBadgeText}>HEALTH ADVISORY CENTER</Text>
          </View>
          <Text style={styles.pageTitle}>Food–Drug{"\n"}Interaction Checker</Text>
          <Text style={styles.pageDesc}>
            Check potential interactions between medications and food items with AI-powered safety recommendations.
          </Text>
        </View>

        {/* ── ANALYSIS CARD ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="flask-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Interaction Analysis</Text>
              <Text style={styles.cardSub}>Select medication and food to check</Text>
            </View>
            <TouchableOpacity style={styles.resetBtn} onPress={resetAll} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={18} color="#2f2971" />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="warning-outline" size={16} color="#92400E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Input Required</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </View>
          ) : null}

          <AutoComplete<DrugItem>
            label="Medication" placeholder="Search medication name..." value={selectedDrugName}
            onChangeValue={(val) => { setSelectedDrugName(val); setResult(null); setSafeFoods([]); }}
            fetcher={fetchDrugs} getLabel={(d) => d?.name || ""}
            onSelect={(d) => { setSelectedDrugName(d?.name || ""); setResult(null); setSafeFoods([]); }}
          />

          <AutoComplete<FoodItem>
            label="Food Item" placeholder="Search food name..." value={selectedFoodName}
            onChangeValue={(val) => { setSelectedFoodName(val); setResult(null); setSafeFoods([]); }}
            fetcher={fetchFoods} getLabel={(f) => f?.name || f?.Food || ""} getSubLabel={(f) => f?.contains} showAlcohol
            onSelect={(f) => { setSelectedFoodName(f?.name || f?.Food || ""); setResult(null); setSafeFoods([]); }}
          />

          <View style={styles.limitRow}>
            <Text style={styles.inputLabel}>Safe Alternatives Limit</Text>
            <TextInput value={safeLimit} onChangeText={setSafeLimit} keyboardType="numeric" style={styles.limitInput} />
          </View>

          <View style={styles.limitRow}>
  <Text style={styles.inputLabel}>Medicine Time</Text>
  <TextInput
    value={medicationTime}
    onChangeText={setMedicationTime}
    placeholder="HH:MM"
    placeholderTextColor="#CBD5E1"
    style={styles.limitInput}
  />
</View>

          <TouchableOpacity onPress={handleCheck} disabled={loadingCheck} activeOpacity={0.9}
            style={[styles.primaryBtn, loadingCheck && styles.primaryBtnDisabled]}>
            {loadingCheck ? (
              <><ActivityIndicator size="small" color="#fff" /><Text style={styles.primaryBtnText}>Analyzing...</Text></>
            ) : (
              <><Ionicons name="sparkles-outline" size={18} color="#fff" /><Text style={styles.primaryBtnText}>Check Interaction</Text></>
            )}
          </TouchableOpacity>
        </View>

        {/* ── RESULT CARD (semantic risk colors) ── */}
        {result && risk != null && rmeta ? (
          <View style={[styles.resultCard, { backgroundColor: rmeta.bg, borderColor: rmeta.borderColor }]}>
            {/* Risk header row */}
            <View style={styles.resultHeader}>
              <View style={[styles.riskIconCircle, { backgroundColor: rmeta.iconBg }]}>
                <Ionicons name={rmeta.iconName} size={22} color={rmeta.iconColor} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={[styles.riskPill, { backgroundColor: rmeta.badgeBg }]}>
                  <Text style={[styles.riskPillText, { color: rmeta.badgeText }]}>{rmeta.label}</Text>
                </View>
                <Text style={[styles.severityText, { color: rmeta.msgColor }]}>Severity Level: {risk}</Text>
              </View>
            </View>

            <Text style={[styles.resultTitle, { color: rmeta.textColor }]}>
              {result.drug || selectedDrugName} + {result.food || selectedFoodName}
            </Text>
            <Text style={[styles.resultMessage, { color: rmeta.msgColor }]}>{result.message}</Text>

            {/* Interaction Reasons */}
            {resultReasonDetails.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="information-circle-outline" size={16} color={rmeta.iconColor} />
                  <Text style={[styles.sectionTitle, { color: rmeta.textColor }]}>Interaction Reasons</Text>
                </View>
                {resultReasonDetails.map((r, idx) => {
                  const tag  = r?.tag || `reason-${idx}`;
                  const open = !!expandedReason[tag];
                  return (
                    <View key={tag} style={[styles.reasonCard, { backgroundColor: "rgba(255,255,255,0.9)", borderColor: rmeta.borderColor }]}>
                      <View style={styles.reasonHead}>
                        <Text style={styles.reasonTitle}>{r?.title || r?.tag || "Reason"}</Text>
                        <TouchableOpacity style={[styles.reasonToggleBtn, { backgroundColor: rmeta.badgeBg }]}
                          onPress={() => setExpandedReason((prev) => ({ ...prev, [tag]: !prev[tag] }))}>
                          <Text style={[styles.reasonToggleText, { color: rmeta.badgeText }]}>{open ? "Hide" : "Details"}</Text>
                        </TouchableOpacity>
                      </View>
                      {open && (
                        <View style={styles.reasonBody}>
                          <Text style={styles.reasonText}>{r?.generated_text || "No detailed explanation available."}</Text>
                          {r?.advice && (
                            <View style={[styles.adviceBox, { backgroundColor: rmeta.badgeBg, borderColor: rmeta.borderColor }]}>
                              <Ionicons name="bulb-outline" size={14} color={rmeta.iconColor} />
                              <Text style={[styles.adviceText, { color: rmeta.textColor }]}>Recommendation: {r.advice}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.sectionBlock}>
  <View style={styles.sectionTitleRow}>
    <Ionicons name="time-outline" size={16} color={rmeta.iconColor} />
    <Text style={[styles.sectionTitle, { color: rmeta.textColor }]}>Timing Guidance</Text>
  </View>

  {timingAdvice.length > 0 ? (
    <View style={styles.timingList}>
      {timingAdvice.map((t, i) => {
        const sameTime =
          t.avoid_from &&
          t.avoid_until &&
          t.avoid_from === t.avoid_until;

        return (
          <View
            key={i}
            style={[
              styles.timingCard,
              { borderColor: rmeta.borderColor, backgroundColor: "rgba(255,255,255,0.9)" },
            ]}
          >
            <Text style={styles.timingCardTitle}>{t.title}</Text>

            <View style={styles.timingTakeRow}>
              <Ionicons name="time-outline" size={14} color="#7C3AED" />
              <Text style={styles.timingTakeText}>
                Take medicine at:{" "}
                <Text style={styles.timingTakeValue}>
                  {formatTime12(t.take_medicine_at || "")}
                </Text>
              </Text>
            </View>

            <Text style={styles.timingDesc}>
              {t.avoid_from && t.avoid_until && !sameTime ? (
                <>
                  Avoid <Text style={styles.boldText}>{t.food_group}</Text> from{" "}
                  <Text style={styles.boldText}>{formatTime12(t.avoid_from)}</Text> to{" "}
                  <Text style={styles.boldText}>{formatTime12(t.avoid_until)}</Text>
                </>
              ) : (
                <>
                  Avoid <Text style={styles.boldText}>{t.food_group}</Text> completely while using this medicine.
                </>
              )}
            </Text>

            <TimingTimeline
              avoidFrom={t.avoid_from}
              medTime={t.take_medicine_at}
              avoidUntil={t.avoid_until}
              foodGroup={t.food_group}
            />

            {!!t.message && (
              <View style={styles.timingMessageBox}>
                <Text style={styles.timingMessageText}>{t.message}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  ) : (
    <View style={styles.timingEmptyBox}>
      <Text style={styles.timingEmptyText}>
        No timing guidance available. Please select a medicine time and try again.
      </Text>
    </View>
  )}
</View>

            {/* Scientific explanation */}
            <View style={styles.sectionBlock}>
              <TouchableOpacity style={[styles.explainToggle, { backgroundColor: "rgba(255,255,255,0.6)", borderColor: rmeta.borderColor }]}
                onPress={() => setShowResultExplain((s) => !s)} activeOpacity={0.8}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="bulb-outline" size={16} color={rmeta.iconColor} />
                  <Text style={[styles.sectionTitle, { color: rmeta.textColor }]}>Scientific Explanation</Text>
                </View>
                <Ionicons name={showResultExplain ? "chevron-up-outline" : "chevron-down-outline"} size={16} color={rmeta.msgColor} />
              </TouchableOpacity>
              {showResultExplain && (
                <View style={[styles.explainBody, { borderColor: rmeta.borderColor }]}>
                  {resultExplainPoints.length > 0 ? (
                    resultExplainPoints.map((p, i) => (
                      <View key={i} style={styles.pointRow}>
                        <View style={[styles.pointDotCircle, { backgroundColor: rmeta.iconColor }]} />
                        <Text style={[styles.pointText, { color: rmeta.msgColor }]}>{p}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noDataText}>No detailed explanation points available for this interaction.</Text>
                  )}
                  <View style={styles.signalsSection}>
                    <Text style={styles.signalsTitle}>Nutritional Signals</Text>
                    <SignalsGrid signals={resultSignals} />
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* ── SAFE ALTERNATIVES CARD ── */}
        <View style={styles.safeCard}>
          <View style={styles.safeHeader}>
            <View style={styles.safeHeaderLeft}>
              <View style={styles.safeIconWrap}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
              </View>
              <Text style={styles.safeTitle}>Safe Alternatives</Text>
            </View>
            <View style={styles.safeCountBadge}>
              <Text style={styles.safeCountText}>{safeFoods.length}</Text>
            </View>
          </View>
          <Text style={styles.safeDesc}>Tap any food card to see detailed nutritional signals and safety explanation.</Text>

          {safeFoods.length === 0 ? (
            <View style={styles.emptySafeBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="leaf-outline" size={28} color="#6EE7B7" />
              </View>
              <Text style={styles.emptySafeTitle}>No safe alternatives yet</Text>
              <Text style={styles.emptySafeSub}>Run an interaction check to see safer food options</Text>
            </View>
          ) : (
            safeFoods.map((f, i) => {
              const rawName = f?.Food || f?.food || f?.name || `Food ${i + 1}`;
              const name = prettifyFoodName(rawName);
              const key   = `${name}-${i}`;
              const open  = !!expandedSafe[key];
              const explainPts = pickExplainPoints(f);
              const sig        = pickSignals(f);
              return (
                <View key={key} style={styles.safeFoodCard}>
                  <TouchableOpacity activeOpacity={0.85} onPress={() => setExpandedSafe((prev) => ({ ...prev, [key]: !prev[key] }))} style={styles.safeFoodTop}>
                    <View style={styles.safeFoodLeft}>
                      <View style={styles.safeFoodNumBadge}><Text style={styles.safeFoodNum}>{i + 1}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.safeFoodName}>{name}</Text>
                        <Text style={styles.safeFoodMeta}>Safety Level: {Number(f?.severity ?? 0)}</Text>
                      </View>
                    </View>
                    <View style={styles.safeFoodEnergyBox}>
                      <Text style={styles.safeFoodEnergy}>{fmt(f?.energy, 0)}</Text>
                      <Text style={styles.safeFoodEnergyUnit}>kcal</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.safeFoodToggle} onPress={() => setExpandedSafe((prev) => ({ ...prev, [key]: !prev[key] }))}>
                    <Text style={styles.safeFoodToggleText}>{open ? "Hide Details" : "View Details"}</Text>
                    <Ionicons name={open ? "chevron-up-outline" : "chevron-down-outline"} size={16} color="#059669" />
                  </TouchableOpacity>
                  {open && (
                    <View style={styles.safeFoodBody}>
                      <Text style={styles.safeFoodBodyTitle}>Safety Explanation</Text>
                      {explainPts.length > 0 ? (
                        explainPts.map((p, idx) => (
                          <View key={idx} style={styles.pointRow}>
                            <View style={[styles.pointDotCircle, { backgroundColor: "#059669" }]} />
                            <Text style={[styles.pointText, { color: "#047857" }]}>{p}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noDataText}>No specific explanation available.</Text>
                      )}
                      <View style={styles.signalsSection}>
                        <Text style={styles.signalsTitle}>Nutritional Profile</Text>
                        <SignalsGrid signals={sig} />
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ── FOOTER ── */}
        <Text style={styles.footer}>
          © {new Date().getFullYear()} PharmaLink. All rights reserved.{"\n"}
          For academic and research purposes only. Always consult a healthcare professional.
        </Text>
      </ScrollView>

      {/* ── DRAWER (screenshot style — rounded pill items) ── */}
      <Modal visible={showSidebar} animationType="slide" transparent onRequestClose={() => setShowSidebar(false)}>
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setShowSidebar(false)} />
          <View style={styles.drawer}>

            {/* Drawer header */}
            <View style={styles.drawerHeader}>
              <BrandLogo withText size={32} />
              <TouchableOpacity onPress={() => setShowSidebar(false)} style={styles.drawerCloseBtn}>
                <Ionicons name="close-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerDivider} />

            {/* Menu items */}
            <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
              {MENU_ITEMS.map((item) => {
                const isActive = item.path === "/advisory/FoodDrugInteraction";
                return (
                  <TouchableOpacity
                    key={item.path}
                    style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setShowSidebar(false);
                      if (item.replace) router.replace(item.path as any);
                      else router.push(item.path as any);
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={isActive ? "#2f2971" : "#FFFFFF"}
                    />
                    <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.drawerDivider} />

            {/* Bottom */}
            <View style={styles.drawerBottom}>
              <TouchableOpacity style={styles.drawerItem} activeOpacity={0.8}
                onPress={() => { setShowSidebar(false); router.push("/Profile" as any); }}>
                <Ionicons name="person-circle-outline" size={22} color="#FFFFFF" />
                <Text style={styles.drawerItemText}>My Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} activeOpacity={0.8}
                onPress={async () => { setShowSidebar(false); await logout(); router.replace("/login"); }}>
                <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
                <Text style={styles.drawerItemText}>Sign Out</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────── Styles ───────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FB" },
  container: { flex: 1 },
  content: { paddingBottom: 48 },

  // ── Header ──
  header: {
    backgroundColor: "#2f2971",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuBtn: {
    width: 36, height: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },

  // ── Page hero ──
  pageHero: { backgroundColor: "#2f2971", paddingHorizontal: 18, paddingTop: 4, paddingBottom: 28 },
  pageHeroBadge: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 100, marginBottom: 14, gap: 6,
  },
  pageHeroBadgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.8)" },
  pageHeroBadgeText: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  pageTitle: { fontSize: 30, fontWeight: "800", color: "#FFFFFF", lineHeight: 38, letterSpacing: -0.5, marginBottom: 10 },
  pageDesc: { fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 20 },

  // ── Card ──
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#EBEBEB",
    padding: 18, margin: 16, marginTop: -14,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#2f2971", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  cardSub: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  resetBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#EEEDFE", alignItems: "center", justifyContent: "center" },

  // ── Error ──
  errorBox: {
    flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB", borderRadius: 14, padding: 12, marginBottom: 14, alignItems: "flex-start",
  },
  errorIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  errorTitle: { fontSize: 12, fontWeight: "700", color: "#78350F", marginBottom: 2 },
  errorText: { fontSize: 12, color: "#92400E", lineHeight: 18 },

  // ── AutoComplete ──
  autoWrap: { marginBottom: 14, zIndex: 10 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#0F172A", marginBottom: 7, letterSpacing: 0.2 },
  inputOuter: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FB",
    borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12, gap: 10,
  },
  input: { flex: 1, fontSize: 13, color: "#0F172A", padding: 0 },
  dropdown: { marginTop: 6, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 14, overflow: "hidden" },
  dropdownLoading: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  dropdownLoadingText: { fontSize: 12, color: "#64748B" },
  dropdownEmpty: { padding: 12 },
  dropdownEmptyText: { fontSize: 12, color: "#94A3B8" },
  dropdownOption: { paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  dropdownOptionTitle: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  dropdownOptionSub: { fontSize: 11, color: "#64748B", marginTop: 2 },
  alcoholBadge: { alignSelf: "flex-start", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, marginTop: 4 },
  alcoholBadgeText: { fontSize: 10, color: "#92400E", fontWeight: "700" },

  limitRow: { marginBottom: 14 },
  limitInput: { backgroundColor: "#F8F9FB", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: "700", color: "#0F172A" },

  primaryBtn: { backgroundColor: "#2f2971", borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },

  // ── Result card ──
  resultCard: { borderWidth: 1.5, borderRadius: 22, padding: 18, marginHorizontal: 16, marginBottom: 16 },
  resultHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  riskIconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  riskPill: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  riskPillText: { fontSize: 11, fontWeight: "800" },
  severityText: { fontSize: 11, fontWeight: "500" },
  resultTitle: { fontSize: 17, fontWeight: "800", marginBottom: 8, lineHeight: 24, letterSpacing: -0.2 },
  resultMessage: { fontSize: 13, lineHeight: 20 },

  sectionBlock: { marginTop: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700" },

  reasonCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  reasonHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  reasonTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: "#0F172A" },
  reasonToggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  reasonToggleText: { fontSize: 11, fontWeight: "700" },
  reasonBody: { marginTop: 10, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 10, padding: 10 },
  reasonText: { fontSize: 12, color: "#475569", lineHeight: 18 },
  adviceBox: { marginTop: 8, flexDirection: "row", gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  adviceText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600" },

  explainToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  explainBody: { marginTop: 10, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 14, padding: 14, borderWidth: 1 },
  pointRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8, gap: 8 },
  pointDotCircle: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  pointText: { flex: 1, fontSize: 12, lineHeight: 19 },
  noDataText: { fontSize: 12, color: "#94A3B8", lineHeight: 18 },

  signalsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#EBEBEB" },
  signalsTitle: { fontSize: 12, fontWeight: "700", color: "#0F172A", marginBottom: 8 },
  signalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  signalCard: { width: "47%", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 12, padding: 10 },
  signalKey: { fontSize: 9, fontWeight: "700", color: "#94A3B8", marginBottom: 3, letterSpacing: 0.5, textTransform: "uppercase" },
  signalValue: { fontSize: 13, fontWeight: "800", color: "#0F172A" },

  // ── Safe foods ──
  safeCard: { backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#EBEBEB", padding: 18, marginHorizontal: 16, marginBottom: 16 },
  safeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  safeHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  safeIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" },
  safeTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  safeCountBadge: { backgroundColor: "#2f2971", borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5, minWidth: 32, alignItems: "center" },
  safeCountText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  safeDesc: { fontSize: 12, color: "#94A3B8", lineHeight: 18, marginBottom: 14 },

  emptySafeBox: { borderWidth: 1, borderColor: "#EBEBEB", backgroundColor: "#F8F9FB", borderRadius: 16, padding: 24, alignItems: "center" },
  emptyIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptySafeTitle: { fontSize: 13, fontWeight: "700", color: "#475569" },
  emptySafeSub: { marginTop: 4, fontSize: 11, color: "#94A3B8", textAlign: "center", lineHeight: 17 },

  safeFoodCard: { marginBottom: 10, backgroundColor: "#F8F9FB", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 16, overflow: "hidden" },
  safeFoodTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 13, gap: 10 },
  safeFoodLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  safeFoodNumBadge: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" },
  safeFoodNum: { fontSize: 11, fontWeight: "800", color: "#059669" },
  safeFoodName: { fontSize: 13, fontWeight: "700", color: "#0F172A", lineHeight: 18 },
  safeFoodMeta: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  safeFoodEnergyBox: { alignItems: "flex-end" },
  safeFoodEnergy: { fontSize: 14, fontWeight: "800", color: "#059669" },
  safeFoodEnergyUnit: { fontSize: 9, color: "#94A3B8" },
  safeFoodToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#EBEBEB", paddingHorizontal: 13, paddingVertical: 10, backgroundColor: "#FFFFFF" },
  safeFoodToggleText: { fontSize: 11, color: "#059669", fontWeight: "700" },
  safeFoodBody: { padding: 13, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#EBEBEB" },
  safeFoodBodyTitle: { fontSize: 12, fontWeight: "700", color: "#0F172A", marginBottom: 8 },

  // ── Footer ──
  footer: { textAlign: "center", color: "#94A3B8", fontSize: 10, lineHeight: 16, paddingHorizontal: 16, paddingBottom: 8 },

  // ── Drawer (screenshot style) ──
  drawerOverlay: { flex: 1, flexDirection: "row" },
  drawerBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  drawer: {
    width: "82%",
    backgroundColor: "#2f2971",
    paddingBottom: 28,
  },
  drawerHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20,
  },
  drawerCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  drawerDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: 20 },
  drawerMenu: { paddingHorizontal: 14, paddingTop: 12 },

  // Pill-style menu items (like screenshot)
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 17,
    paddingHorizontal: 18,
    borderRadius: 999,       // full pill
    marginBottom: 4,
  },
  drawerItemActive: {
    backgroundColor: "#FFFFFF",
  },
  drawerItemText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  drawerItemTextActive: {
    color: "#2f2971",
  },
  drawerBottom: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },

  timingList: {
  gap: 12,
},
timingCard: {
  borderWidth: 1,
  borderRadius: 16,
  padding: 14,
},
timingCardTitle: {
  fontSize: 14,
  fontWeight: "700",
  color: "#0F172A",
  marginBottom: 8,
},
timingTakeRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginBottom: 8,
},
timingTakeText: {
  fontSize: 12,
  color: "#475569",
},
timingTakeValue: {
  fontWeight: "800",
  color: "#6D28D9",
},
timingDesc: {
  fontSize: 12,
  color: "#475569",
  lineHeight: 18,
  marginBottom: 12,
},
boldText: {
  fontWeight: "700",
  color: "#0F172A",
},
timingMessageBox: {
  marginTop: 12,
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#DDD6FE",
  borderRadius: 12,
  padding: 10,
},
timingMessageText: {
  fontSize: 12,
  color: "#5B21B6",
  lineHeight: 18,
},
timingEmptyBox: {
  borderWidth: 1,
  borderColor: "#E2E8F0",
  backgroundColor: "#F8FAFC",
  borderRadius: 14,
  padding: 12,
},
timingEmptyText: {
  fontSize: 12,
  color: "#64748B",
},
timelineWrap: {
  marginTop: 12,
  borderWidth: 1,
  borderColor: "#DDD6FE",
  backgroundColor: "#FAF5FF",
  borderRadius: 16,
  padding: 12,
},
timelineFallback: {
  marginTop: 12,
  borderWidth: 1,
  borderColor: "#DDD6FE",
  borderStyle: "dashed",
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  padding: 12,
},
timelineTitleRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},
timelineFallbackTitle: {
  fontSize: 12,
  fontWeight: "700",
  color: "#334155",
},
timelineFallbackText: {
  marginTop: 8,
  fontSize: 12,
  color: "#475569",
  lineHeight: 18,
},
timelineTimeRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 12,
},
timelineTime: {
  fontSize: 11,
  fontWeight: "700",
  color: "#475569",
},
timelineTimeActive: {
  fontSize: 11,
  fontWeight: "800",
  color: "#6D28D9",
},
timelineBarRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},
timelineBar: {
  height: 10,
  borderRadius: 999,
  backgroundColor: "#7C3AED",
  minWidth: 48,
},
timelinePillCircle: {
  width: 40,
  height: 40,
  borderRadius: 20,
  borderWidth: 2,
  borderColor: "#C4B5FD",
  backgroundColor: "#FFFFFF",
  alignItems: "center",
  justifyContent: "center",
},
timelinePillEmoji: {
  fontSize: 16,
},
timelineLabelRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 10,
},
timelineLabel: {
  fontSize: 10,
  fontWeight: "700",
  color: "#64748B",
},
timelineLabelCenter: {
  fontSize: 10,
  fontWeight: "700",
  color: "#6D28D9",
},
timelineSafeBadge: {
  marginTop: 12,
  alignSelf: "center",
  backgroundColor: "#DCFCE7",
  borderWidth: 1,
  borderColor: "#BBF7D0",
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 6,
},
timelineSafeBadgeText: {
  fontSize: 10,
  fontWeight: "800",
  color: "#15803D",
},
timelineStatsRow: {
  flexDirection: "row",
  gap: 8,
  marginTop: 12,
},
timelineStatCard: {
  flex: 1,
  backgroundColor: "#FDF4FF",
  borderWidth: 1,
  borderColor: "#F5D0FE",
  borderRadius: 12,
  padding: 10,
},
timelineStatCardPurple: {
  flex: 1,
  backgroundColor: "#F5F3FF",
  borderWidth: 1,
  borderColor: "#DDD6FE",
  borderRadius: 12,
  padding: 10,
},
timelineStatCardViolet: {
  flex: 1,
  backgroundColor: "#F5F3FF",
  borderWidth: 1,
  borderColor: "#DDD6FE",
  borderRadius: 12,
  padding: 10,
},
timelineStatLabel: {
  fontSize: 9,
  fontWeight: "700",
  color: "#A21CAF",
  textTransform: "uppercase",
  marginBottom: 4,
},
timelineStatLabelPurple: {
  fontSize: 9,
  fontWeight: "700",
  color: "#7C3AED",
  textTransform: "uppercase",
  marginBottom: 4,
},
timelineStatLabelViolet: {
  fontSize: 9,
  fontWeight: "700",
  color: "#6D28D9",
  textTransform: "uppercase",
  marginBottom: 4,
},
timelineStatValue: {
  fontSize: 12,
  fontWeight: "800",
  color: "#0F172A",
},
});