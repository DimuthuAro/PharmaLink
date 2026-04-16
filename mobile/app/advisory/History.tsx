import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  StatusBar,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../../components/BrandLogo";
import {
  getHistory,
  deleteHistoryItem,
  clearHistory,
} from "../../services/advisoryApi";

// ─────────────────────────── Types ───────────────────────────
type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  token: string;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  loading: boolean;
};

type HistoryType =
  | "food_drug"
  | "meal_plan"
  | "drug_image_prediction"
  | "symptom_drug_reco";

type HistoryItem = {
  _id?: string;
  id?: string;
  type: HistoryType;
  input?: any;
  result?: any;
  createdAt?: string;
};

// ─────────────────────────── Drawer items ───────────────────────────
const MENU_ITEMS = [
  { label: "Dashboard", icon: "home-outline" as const, path: "/dashboard", replace: true },
  { label: "Food Drug Interaction", icon: "shield-checkmark-outline" as const, path: "/advisory/FoodDrugInteraction", replace: true },
  { label: "Meal Plan Advisor", icon: "clipboard-outline" as const, path: "/advisory/PersonalizedMealPlan", replace: true },
  { label: "Drug Image Analyzer", icon: "image-outline" as const, path: "/advisory/drug-image", replace: false },
  { label: "Patient Story Analyzer", icon: "sparkles-outline"         as const, path: "/advisory/PatientStoryAnalyzer", replace: false },
  { label: "History", icon: "time-outline" as const, path: "/advisory/History", replace: false },
];

const HISTORY_TABS: {
  key: HistoryType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "food_drug", label: "Food Drug", icon: "shield-checkmark-outline" },
  { key: "meal_plan", label: "Meal Plans", icon: "clipboard-outline" },
  { key: "drug_image_prediction", label: "Drug Image", icon: "image-outline" },
  { key: "symptom_drug_reco", label: "Drug Recommender", icon: "sparkles-outline" },
];

// ─────────────────────────── Helpers ───────────────────────────
function titleCase(s: string) {
  return String(s || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(v?: string) {
  if (!v) return "";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function confidencePercent(conf?: number) {
  const n = Number(conf ?? 0);
  return Math.round((n <= 1 ? n * 100 : n));
}

function confidenceMeta(conf?: number) {
  const p = confidencePercent(conf);
  if (p >= 85) {
    return { label: "High confidence", color: "#065F46", bg: "#ECFDF5", border: "#86EFAC" };
  }
  if (p >= 60) {
    return { label: "Moderate confidence", color: "#92400E", bg: "#FFFBEB", border: "#FCD34D" };
  }
  return { label: "Low confidence", color: "#991B1B", bg: "#FEF2F2", border: "#FCA5A5" };
}

function riskMeta(sev?: number) {
  if (Number(sev) === 0) {
    return { label: "Safe", color: "#065F46", bg: "#ECFDF5", border: "#86EFAC" };
  }
  if (Number(sev) === 2) {
    return { label: "High Risk", color: "#991B1B", bg: "#FEF2F2", border: "#FCA5A5" };
  }
  return { label: "Moderate", color: "#92400E", bg: "#FFFBEB", border: "#FCD34D" };
}

function getHistoryTitle(item: HistoryItem, type: HistoryType) {
  if (type === "food_drug") {
    return `${item?.input?.drug_name || "Drug"} + ${item?.input?.food_name || "Food"}`;
  }

  if (type === "meal_plan") {
    const drugs = item?.input?.drug_names || [];
    return drugs.length ? drugs.join(", ") : "Meal Plan";
  }

  if (type === "drug_image_prediction") {
    const pred = item?.result?.predictions?.[0];
    return pred?.brand_name || pred?.drug_name || "Drug Image Prediction";
  }

  if (type === "symptom_drug_reco") {
    const symptoms = item?.input?.symptoms || [];
    return symptoms.length ? symptoms.map(titleCase).join(", ") : "Drug Recommender";
  }

  return "History";
}

function getHistorySubtitle(item: HistoryItem, type: HistoryType) {
  if (type === "food_drug") {
    return item?.result?.message || "Food-drug interaction result";
  }

  if (type === "meal_plan") {
    return `${item?.input?.days || 0} days • ${item?.input?.meals_per_day || 0} meals/day`;
  }

  if (type === "drug_image_prediction") {
    const pred = item?.result?.predictions?.[0];
    return pred
      ? `${pred?.generic_name || "Prediction"} • ${confidencePercent(pred?.confidence)}%`
      : "No prediction";
  }

  if (type === "symptom_drug_reco") {
    const top = item?.result?.predicted_disease_recommendations?.[0];
    return top?.disease ? `Top disease: ${titleCase(top.disease)}` : "Recommendation result";
  }

  return "";
}

// ─────────────────────────── Tab Button ───────────────────────────
function TabButton({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
      <Ionicons name={icon} size={16} color={active ? "#fff" : "#2f2971"} />
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────── History Card ───────────────────────────
function HistoryCard({
  item,
  type,
  onOpen,
  onDelete,
}: {
  item: HistoryItem;
  type: HistoryType;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const title = getHistoryTitle(item, type);
  const subtitle = getHistorySubtitle(item, type);
  const createdAt = formatDate(item?.createdAt);

  const pred = item?.result?.predictions?.[0];
  const risk = type === "food_drug" ? riskMeta(item?.result?.severity) : null;
  const conf = type === "drug_image_prediction" && pred ? confidenceMeta(pred?.confidence) : null;

  return (
    <View style={styles.historyCard}>
      <TouchableOpacity activeOpacity={0.9} onPress={onOpen}>
        <View style={styles.historyTop}>
          <View style={styles.historyIconWrap}>
            <Ionicons
              name={
                type === "food_drug"
                  ? "shield-checkmark-outline"
                  : type === "meal_plan"
                  ? "clipboard-outline"
                  : type === "drug_image_prediction"
                  ? "image-outline"
                  : "sparkles-outline"
              }
              size={20}
              color="#fff"
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.historyTitleRow}>
              <Text style={styles.historyTitle}>{title}</Text>

              {risk ? (
                <View style={[styles.tagBox, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                  <Text style={[styles.tagText, { color: risk.color }]}>{risk.label}</Text>
                </View>
              ) : null}

              {conf ? (
                <View style={[styles.tagBox, { backgroundColor: conf.bg, borderColor: conf.border }]}>
                  <Text style={[styles.tagText, { color: conf.color }]}>
                    {confidencePercent(pred?.confidence)}%
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.historyDate}>{createdAt}</Text>
            <Text style={styles.historySub}>{subtitle}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.historyActionRow}>
        <TouchableOpacity style={styles.smallBtn} onPress={onOpen} activeOpacity={0.85}>
          <Ionicons name="eye-outline" size={15} color="#2f2971" />
          <Text style={styles.smallBtnText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallBtn, styles.smallDeleteBtn]}
          onPress={onDelete}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={15} color="#991B1B" />
          <Text style={[styles.smallBtnText, { color: "#991B1B" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────── Detail Modal ───────────────────────────
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailBox}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "—"}</Text>
    </View>
  );
}

function DetailsModal({
  visible,
  item,
  type,
  onClose,
}: {
  visible: boolean;
  item: HistoryItem | null;
  type: HistoryType;
  onClose: () => void;
}) {
  if (!visible || !item) return null;

  const pred = item?.result?.predictions?.[0];
  const disease = item?.result?.predicted_disease_recommendations?.[0];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.drawerOverlay}>
        <Pressable style={styles.drawerBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>History Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.drawerCloseBtn}>
              <Ionicons name="close-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 30 }}>
            <Text style={styles.modalDate}>{formatDate(item?.createdAt)}</Text>

            {type === "food_drug" && (
              <>
                <DetailRow label="Drug" value={String(item?.input?.drug_name || "")} />
                <DetailRow label="Food" value={String(item?.input?.food_name || "")} />
                <DetailRow label="Message" value={String(item?.result?.message || "")} />
                <DetailRow
                  label="Reasons"
                  value={Array.isArray(item?.result?.reasons) ? item.result.reasons.join(", ") : ""}
                />
              </>
            )}

            {type === "meal_plan" && (
              <>
                <DetailRow
                  label="Drug Names"
                  value={Array.isArray(item?.input?.drug_names) ? item.input.drug_names.join(", ") : ""}
                />
                <DetailRow label="Days" value={String(item?.input?.days || "")} />
                <DetailRow label="Meals Per Day" value={String(item?.input?.meals_per_day || "")} />
                <DetailRow label="Calories Per Day" value={String(item?.input?.calories_per_day || "")} />
              </>
            )}

            {type === "drug_image_prediction" && (
              <>
                <DetailRow label="Prediction" value={String(pred?.brand_name || pred?.drug_name || "")} />
                <DetailRow label="Generic Name" value={String(pred?.generic_name || "")} />
                <DetailRow label="Contains" value={String(pred?.contains || "")} />
                <DetailRow label="Confidence" value={`${confidencePercent(pred?.confidence)}%`} />
                <DetailRow label="Warnings" value={String(pred?.warnings || "")} />
              </>
            )}

            {type === "symptom_drug_reco" && (
              <>
                <DetailRow
                  label="Symptoms"
                  value={Array.isArray(item?.input?.symptoms) ? item.input.symptoms.map(titleCase).join(", ") : ""}
                />
                <DetailRow label="Top Disease" value={String(disease?.disease ? titleCase(disease.disease) : "")} />
                <DetailRow
                  label="Top Disease Probability"
                  value={disease?.prob != null ? `${Math.round(Number(disease.prob) * 100)}%` : ""}
                />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────── Main Screen ───────────────────────────
export default function HistoryScreen() {
  const { token, logout, isAuthenticated, loading } = useAuth() as AuthContextType;

  const [showSidebar, setShowSidebar] = useState(false);
  const [activeType, setActiveType] = useState<HistoryType>("food_drug");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const activeLabel = useMemo(
    () => HISTORY_TABS.find((x) => x.key === activeType)?.label || "History",
    [activeType]
  );

  const handleLogout = async () => {
    await logout?.();
    router.replace("/login");
  };

  useEffect(() => {
    if (!loading && isAuthenticated === false) router.replace("/login");
  }, [loading, isAuthenticated]);

  const loadHistory = useCallback(async () => {
    if (!token) return;

    try {
      setSubmitting(true);
      setErr("");

      const data = await getHistory({ token, type: activeType });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      setItems([]);
      setErr(e?.error || e?.details || e?.message || "Failed to load history.");
    } finally {
      setSubmitting(false);
    }
  }, [token, activeType]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

async function handleDelete(id: string) {
  const runDelete = async () => {
    try {
      await deleteHistoryItem({ token, id });

      setItems((prev) => prev.filter((x) => (x._id ?? x.id) !== id));

      if ((selectedItem?._id ?? selectedItem?.id) === id) {
        setSelectedItem(null);
        setShowDetails(false);
      }
    } catch (e: any) {
      console.log("DELETE ERROR:", e);
      setErr(e?.error || e?.details || e?.message || "Failed to delete history.");
    }
  };

  if (Platform.OS === "web") {
    const ok = window.confirm("Are you sure you want to delete this item?");
    if (!ok) return;
    await runDelete();
    return;
  }

  Alert.alert("Delete History", "Are you sure you want to delete this item?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: () => {
        runDelete();
      },
    },
  ]);
}

async function handleClear() {
  const runClear = async () => {
    try {
      await clearHistory({ token, type: activeType });

      setItems([]);

      if (selectedItem) {
        setSelectedItem(null);
        setShowDetails(false);
      }
    } catch (e: any) {
      console.log("CLEAR ERROR:", e);
      setErr(e?.error || e?.details || e?.message || "Failed to clear history.");
    }
  };

  // WEB FIX
  if (Platform.OS === "web") {
    const ok = window.confirm("Are you sure you want to clear all history?");
    if (!ok) return;
    await runClear();
    return;
  }

  // MOBILE
  Alert.alert("Clear History", "Are you sure you want to clear all history?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Clear",
      style: "destructive",
      onPress: () => {
        runClear();
      },
    },
  ]);
}

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BrandLogo withText size={34} />
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setShowSidebar(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="menu-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.pageHero}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>HEALTH ADVISORY CENTER</Text>
          </View>
          <Text style={styles.pageTitle}>History</Text>
          <Text style={styles.pageDesc}>
            Review and manage your saved interactions, meal plans, predictions, and recommendations.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="time-outline" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>History Manager</Text>
              <Text style={styles.cardSub}>Browse and manage saved records by category</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}
          >
            {HISTORY_TABS.map((tab) => (
              <TabButton
                key={tab.key}
                active={activeType === tab.key}
                label={tab.label}
                icon={tab.icon}
                onPress={() => setActiveType(tab.key)}
              />
            ))}
          </ScrollView>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={loadHistory}
              activeOpacity={0.85}
              style={[styles.outlineBtn, { flex: 1 }]}
            >
              <Ionicons name="refresh-outline" size={16} color="#475569" />
              <Text style={styles.outlineBtnText}>Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClear}
              activeOpacity={0.9}
              style={[styles.primaryBtn, { flex: 1 }]}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Clear {activeLabel}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={14} color="#92400E" />
            <Text style={styles.infoText}>
              Your saved records are grouped by tool type. Tap any card to view details.
            </Text>
          </View>
        </View>

        {err ? (
          <View style={styles.errorBox}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="warning-outline" size={16} color="#92400E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorText}>{err}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.resultPanel}>
          <View style={styles.resultHead}>
            <View style={styles.resultHeadIcon}>
              <Ionicons name="folder-open-outline" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultHeadTitle}>{activeLabel} History</Text>
              <Text style={styles.resultHeadSub}>Saved records from this category</Text>
            </View>
          </View>

          {submitting ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="large" color="#2f2971" />
              <Text style={styles.emptyTitle}>Loading...</Text>
              <Text style={styles.emptySub}>Please wait while fetching your history.</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="time-outline" size={28} color="#AFA9EC" />
              </View>
              <Text style={styles.emptyTitle}>No {activeLabel} History</Text>
              <Text style={styles.emptySub}>
                Start using the tools and your activity will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.resultBody}>
              {items.map((item, index) => (
  <HistoryCard
    key={item._id ?? item.id ?? String(index)}
    item={item}
    type={activeType}
    onOpen={() => {
      setSelectedItem(item);
      setShowDetails(true);
    }}
    onDelete={() => {
      const historyId = item._id ?? item.id;
      if (!historyId) return;
      handleDelete(historyId);
    }}
  />
))}
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} PharmaLink. For academic purposes only.
        </Text>
      </ScrollView>

      <Modal
        visible={showSidebar}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSidebar(false)}
      >
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setShowSidebar(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <BrandLogo withText size={32} />
              <TouchableOpacity
                onPress={() => setShowSidebar(false)}
                style={styles.drawerCloseBtn}
              >
                <Ionicons name="close-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerDivider} />

            <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
              {MENU_ITEMS.map((item) => {
                const active = item.path === "/advisory/History";
                return (
                  <TouchableOpacity
                    key={item.path}
                    style={[styles.drawerItem, active && styles.drawerItemActive]}
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
                      color={active ? "#2f2971" : "#FFFFFF"}
                    />
                    <Text
                      style={[styles.drawerItemText, active && styles.drawerItemTextActive]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.drawerDivider} />

            <View style={styles.drawerBottom}>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  setShowSidebar(false);
                  router.push("/Profile" as any);
                }}
              >
                <Ionicons name="person-circle-outline" size={22} color="#fff" />
                <Text style={styles.drawerItemText}>My Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={async () => {
                  setShowSidebar(false);
                  await handleLogout();
                }}
              >
                <Ionicons name="log-out-outline" size={22} color="#fff" />
                <Text style={styles.drawerItemText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DetailsModal
        visible={showDetails}
        item={selectedItem}
        type={activeType}
        onClose={() => {
          setShowDetails(false);
          setSelectedItem(null);
        }}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────── Styles ───────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FB" },
  container: { flex: 1 },
  content: { paddingBottom: 48 },

  header: {
    backgroundColor: "#2f2971",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuBtn: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  pageHero: {
    backgroundColor: "#2f2971",
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 28,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginBottom: 14,
    gap: 6,
  },
  heroBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  heroBadgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  pageDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    padding: 18,
    margin: 16,
    marginTop: -14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2f2971",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },

  tabScroll: {
    gap: 10,
    paddingBottom: 2,
  },
  tabBtn: {
    backgroundColor: "#EEEDFE",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    marginRight: 10,
  },
  tabBtnActive: {
    backgroundColor: "#2f2971",
  },
  tabBtnText: {
    color: "#2f2971",
    fontSize: 13,
    fontWeight: "700",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  outlineBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  outlineBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  primaryBtn: {
    backgroundColor: "#2f2971",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  infoBox: {
    marginTop: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    lineHeight: 16,
  },

  errorBox: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  errorIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#78350F",
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
  },

  resultPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
  },
  resultHead: {
    backgroundColor: "#2f2971",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resultHeadIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultHeadTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  resultHeadSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },

  emptyBox: {
    padding: 28,
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 8,
  },
  emptySub: {
    marginTop: 5,
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
  resultBody: {
    padding: 14,
    gap: 12,
  },

  historyCard: {
    backgroundColor: "#F8F9FB",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 18,
    overflow: "hidden",
  },
  historyTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    padding: 14,
  },
  historyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#2f2971",
    alignItems: "center",
    justifyContent: "center",
  },
  historyTitleRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  historyTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 21,
  },
  historyDate: {
    marginTop: 4,
    fontSize: 11,
    color: "#94A3B8",
  },
  historySub: {
    marginTop: 8,
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  tagBox: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  historyActionRow: {
    borderTopWidth: 1,
    borderTopColor: "#EAEAEA",
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  smallBtn: {
    flex: 1,
    backgroundColor: "#EEEDFE",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  smallDeleteBtn: {
    backgroundColor: "#FEF2F2",
  },
  smallBtnText: {
    color: "#2f2971",
    fontSize: 12,
    fontWeight: "700",
  },

  footer: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 10,
    lineHeight: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  drawer: {
    width: "82%",
    backgroundColor: "#2f2971",
    paddingBottom: 28,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  drawerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 20,
  },
  drawerMenu: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 17,
    paddingHorizontal: 18,
    borderRadius: 999,
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

  modalSheet: {
    width: "82%",
    backgroundColor: "#F8F9FB",
  },
  modalHeader: {
    backgroundColor: "#2f2971",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalDate: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 10,
  },
  detailBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 10,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
    lineHeight: 20,
  },
});