//app/advisory/DrugImagePredict.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  StatusBar,
  Alert,
  Linking,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../../components/BrandLogo";
import { ADVISORY_API } from "../../utils/api";
import { WebView } from "react-native-webview";

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

type PredictionItem = {
  drug_name?: string;
  brand_name?: string;
  generic_name?: string;
  contains?: string;
  uses?: string | string[];
  dosage_info?: string | string[];
  warnings?: string | string[];
  side_effects?: string | string[];
  availability_sri_lanka?: string;
  confidence?: number;
  [key: string]: any;
};

// ─────────────────────────── Drawer items ───────────────────────────
const MENU_ITEMS = [
  { label: "Dashboard",             icon: "home-outline"             as const, path: "/dashboard",                    replace: true  },
  { label: "Food Drug Interaction", icon: "shield-checkmark-outline" as const, path: "/advisory/FoodDrugInteraction", replace: true  },
  { label: "Meal Plan Advisor",     icon: "clipboard-outline"        as const, path: "/advisory/PersonalizedMealPlan",            replace: true  },
  { label: "Drug Image Analyzer",   icon: "image-outline"            as const, path: "/advisory/drug-image",          replace: false },
  { label: "Patient Story Analyzer", icon: "sparkles-outline"         as const, path: "/advisory/PatientStoryAnalyzer",        replace: false },
  { label: "History",               icon: "time-outline"             as const, path: "/advisory/History",                      replace: false },
];

// ─────────────────────────── Helpers ───────────────────────────
function toTitleCase(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function prettyText(v: any) {
  return toTitleCase(String(v || ""));
}

function toBulletList(value: any): string[] {
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

function mapAvailability(value: any) {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";

  const key = s.toLowerCase();
  const AVAILABILITY_MAP: Record<string, string> = {
    "widely available": "Widely available",
    "available otc": "Available OTC",
    "commonly available otc": "Commonly available (OTC)",
    "usually sold without prescription (otc)": "Usually sold without prescription (OTC)",
    "usually sold over the counter (otc)": "Usually sold over the counter (OTC)",
    "available in pharmacies": "Available in pharmacies",
    "no prescription required": "No prescription required",
    "prescription required": "Prescription required",
  };

  if (AVAILABILITY_MAP[key]) return AVAILABILITY_MAP[key];

  for (const k of Object.keys(AVAILABILITY_MAP)) {
    if (key.includes(k)) return AVAILABILITY_MAP[k];
  }

  return s;
}

function confidencePercent(conf?: number) {
  const n = Number(conf ?? 0);
  return Math.round(n * 100);
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

function getMapSearchQuery(item: PredictionItem, manualQuery?: string) {
  const q = String(manualQuery || "").trim();
  if (q) return `${q} pharmacy Sri Lanka`;

  const drug = item?.brand_name || item?.drug_name || "pharmacy";
  return `${drug} pharmacies in Sri Lanka`;
}

function getEmbeddedMapUrl(item: PredictionItem, manualQuery?: string) {
  const query = encodeURIComponent(getMapSearchQuery(item, manualQuery));
  return `https://www.google.com/maps?q=${query}&z=7&output=embed`;
}

function getOpenMapUrl(item: PredictionItem, manualQuery?: string) {
  const query = encodeURIComponent(getMapSearchQuery(item, manualQuery));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function getSriLankaPharmacyMapUrl(drugName?: string) {
  const q = encodeURIComponent(`${drugName || "pharmacy"} pharmacies in Sri Lanka`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// ─────────────────────────── API upload helper ───────────────────────────
async function predictDrugImageMobile({
  token,
  imageUri,
  topk = 1,
}: {
  token: string;
  imageUri: string;
  topk?: number;
}) {
  const formData = new FormData();

  const imgResponse = await fetch(imageUri);
  const blob = await imgResponse.blob();

  formData.append("file", blob, "drug-image.jpg");
  formData.append("topk", String(topk));

  const res = await fetch(`${ADVISORY_API}/drug-image/predict`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.log("PREDICT ERROR RESPONSE:", data);
    throw data;
  }

  return data;
}

// ─────────────────────────── Info Section ───────────────────────────
function InfoSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;

  return (
    <View style={styles.infoSection}>
      <Text style={styles.infoSectionTitle}>{title}</Text>
      {items.map((item, idx) => (
        <View key={`${title}-${idx}`} style={styles.infoBulletRow}>
          <View style={styles.infoBulletDot} />
          <Text style={styles.infoBulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────── Result Card ───────────────────────────
function PredictionCard({ item }: { item: PredictionItem }) {
  const confMeta = confidenceMeta(item?.confidence);

  const uses = useMemo(() => toBulletList(item?.uses), [item?.uses]);
  const dosage = useMemo(() => toBulletList(item?.dosage_info), [item?.dosage_info]);
  const warnings = useMemo(() => toBulletList(item?.warnings), [item?.warnings]);
  const sideEffects = useMemo(() => toBulletList(item?.side_effects), [item?.side_effects]);

  const defaultQuery = prettyText(
    item?.brand_name || item?.drug_name || "Sri Lanka pharmacies"
  );
  const [searchText, setSearchText] = useState("");
  const [mapQuery, setMapQuery] = useState(defaultQuery);

  function handleMapSearch() {
    const q = searchText.trim();
    if (!q) {
      setMapQuery(defaultQuery);
      return;
    }
    setMapQuery(q);
  }

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultTop}>
        <View style={styles.resultIconWrap}>
          <Ionicons name="medical-outline" size={22} color="#fff" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.resultDrugName}>
            {prettyText(item?.brand_name || item?.drug_name || "Unknown Drug")}
          </Text>

          {item?.generic_name ? (
            <Text style={styles.resultSubText}>
              Generic: {prettyText(item.generic_name)}
            </Text>
          ) : null}

          {item?.contains ? (
            <Text style={styles.resultSubText}>
              Contains: {prettyText(item.contains)}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.confidenceBox,
          { backgroundColor: confMeta.bg, borderColor: confMeta.border },
        ]}
      >
        <View style={styles.confidenceRow}>
          <Text style={[styles.confidenceText, { color: confMeta.color }]}>
            {confMeta.label}
          </Text>
          <Text style={[styles.confidencePercent, { color: confMeta.color }]}>
            {confidencePercent(item?.confidence)}%
          </Text>
        </View>
      </View>

      {item?.availability_sri_lanka ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Availability in Sri Lanka</Text>
          <Text style={styles.metaValue}>
            {mapAvailability(item.availability_sri_lanka)}
          </Text>
        </View>
      ) : null}

      <View style={styles.mapCard}>
        <Text style={styles.mapTitle}>Search nearby pharmacies</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Ex: Kaduwela pharmacy"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={handleMapSearch}
            />
          </View>

          <TouchableOpacity
            style={styles.searchBtn}
            activeOpacity={0.85}
            onPress={handleMapSearch}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.mapHint}>
          Showing map for: {mapQuery}
        </Text>

        <View style={styles.mapFrame}>
          {Platform.OS === "web" ? (
            <iframe
              src={getEmbeddedMapUrl(item, mapQuery)}
              style={{ width: "100%", height: "100%", border: "0" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Sri Lanka Pharmacy Map"
            />
          ) : (
            <WebView
              source={{ uri: getEmbeddedMapUrl(item, mapQuery) }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              scrollEnabled={false}
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.openMapBtn}
          activeOpacity={0.85}
          onPress={() => Linking.openURL(getOpenMapUrl(item, mapQuery))}
        >
          <Ionicons name="open-outline" size={16} color="#fff" />
          <Text style={styles.openMapBtnText}>Open in Maps</Text>
        </TouchableOpacity>
      </View>

      <InfoSection title="Uses" items={uses} />
      <InfoSection title="Dosage Info" items={dosage} />
      <InfoSection title="Warnings" items={warnings} />
      <InfoSection title="Side Effects" items={sideEffects} />
    </View>
  );
}

// ─────────────────────────── Main Screen ───────────────────────────
export default function DrugImageScreen() {
  const { token, logout, isAuthenticated, loading } = useAuth() as AuthContextType;

  const [showSidebar, setShowSidebar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [prediction, setPrediction] = useState<PredictionItem | null>(null);

  const handleLogout = async () => {
    await logout?.();
    router.replace("/login");
  };

  React.useEffect(() => {
    if (!loading && isAuthenticated === false) router.replace("/login");
  }, [loading, isAuthenticated]);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow gallery access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImageUri(result.assets[0].uri);
      setPrediction(null);
      setErr("");
    }
  }

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImageUri(result.assets[0].uri);
      setPrediction(null);
      setErr("");
    }
  }

  function resetAll() {
    setImageUri("");
    setPrediction(null);
    setErr("");
  }

  async function handlePredict() {
    setErr("");
    setPrediction(null);

    if (!token) {
      setErr("Please login first.");
      return;
    }

    if (!imageUri) {
      setErr("Please select an image first.");
      return;
    }

    try {
      setSubmitting(true);
      const data = await predictDrugImageMobile({
        token,
        imageUri,
        topk: 1,
      });

      if (!data.accepted) {
        setPrediction(null);
      
        if (
          data.message?.includes("clear medicine object") ||
          data.message?.includes("screenshot") ||
          data.message?.includes("text image")
        ) {
          setErr("Please upload a clear medicine image (pill).");
        } else {
          setErr(data.message || "Please upload a clear medicine image (pill).");
        }
      
        return;
      }

      const first = Array.isArray(data?.predictions) ? data.predictions[0] : null;
      if (!first) {
        setErr("No prediction returned.");
        return;
      }

      setPrediction(first);
    } catch (e: any) {
      console.log("PREDICTION FAILED:", e);
      setErr(
        e?.detail?.[0]?.msg ||
        e?.error ||
        e?.details ||
        e?.message ||
        "Prediction failed"
      );
    } finally {
      setSubmitting(false);
    }
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
          <Text style={styles.pageTitle}>Drug Image Analyzer</Text>
          <Text style={styles.pageDesc}>
            Upload a medicine image to predict the likely drug and view basic details.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="image-outline" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Upload Drug Image</Text>
              <Text style={styles.cardSub}>Choose from gallery or capture using camera</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.uploadBox} activeOpacity={0.85} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.uploadInner}>
                <View style={styles.uploadIconCircle}>
                  <Ionicons name="cloud-upload-outline" size={28} color="#2f2971" />
                </View>
                <Text style={styles.uploadTitle}>Tap to select image</Text>
                <Text style={styles.uploadSub}>
                  JPG, PNG or camera image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage} activeOpacity={0.85}>
              <Ionicons name="images-outline" size={16} color="#2f2971" />
              <Text style={styles.secondaryBtnText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={openCamera} activeOpacity={0.85}>
              <Ionicons name="camera-outline" size={16} color="#2f2971" />
              <Text style={styles.secondaryBtnText}>Camera</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={resetAll}
              activeOpacity={0.85}
              style={[styles.outlineBtn, { flex: 1 }]}
            >
              <Ionicons name="refresh-outline" size={16} color="#475569" />
              <Text style={styles.outlineBtnText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePredict}
              disabled={submitting}
              activeOpacity={0.9}
              style={[styles.primaryBtn, submitting && styles.primaryBtnOff, { flex: 1 }]}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.primaryBtnText}>Predicting...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Predict Drug</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={14} color="#92400E" />
            <Text style={styles.infoText}>
              Prediction is AI-assisted and should be verified by a healthcare professional.
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
              <Ionicons name="medkit-outline" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultHeadTitle}>Prediction Result</Text>
              <Text style={styles.resultHeadSub}>Top AI prediction from uploaded image</Text>
            </View>
          </View>

          {!prediction ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="scan-outline" size={28} color="#AFA9EC" />
              </View>
              <Text style={styles.emptyTitle}>No Prediction Yet</Text>
              <Text style={styles.emptySub}>
                Upload a medicine image and tap Predict Drug.
              </Text>
            </View>
          ) : (
            <View style={styles.resultBody}>
              <PredictionCard item={prediction} />
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
                const active = item.path === "/advisory/drug-image";
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

  uploadBox: {
    minHeight: 220,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#D8D5F4",
    borderStyle: "dashed",
    backgroundColor: "#F8F9FB",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  uploadSub: {
    marginTop: 6,
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  previewImage: {
    width: "100%",
    height: 220,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#EEEDFE",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  secondaryBtnText: {
    color: "#2f2971",
    fontSize: 13,
    fontWeight: "700",
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
  primaryBtnOff: {
    opacity: 0.65,
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
  },

  resultCard: {
    backgroundColor: "#F8F9FB",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 18,
    padding: 14,
  },
  resultTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  resultIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2f2971",
    alignItems: "center",
    justifyContent: "center",
  },
  resultDrugName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
  },
  resultSubText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 18,
  },

  confidenceBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  confidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "700",
  },
  confidencePercent: {
    fontSize: 15,
    fontWeight: "800",
  },

  metaRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  metaValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
    lineHeight: 18,
  },

  mapBtn: {
    marginBottom: 12,
    backgroundColor: "#EEEDFE",
    borderWidth: 1,
    borderColor: "#D8D5F4",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapBtnText: {
    color: "#2f2971",
    fontSize: 13,
    fontWeight: "700",
  },

  infoSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
  },
  infoSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2f2971",
    marginBottom: 8,
  },
  infoBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginBottom: 6,
  },
  infoBulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#2f2971",
    marginTop: 7,
  },
  infoBulletText: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
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

  mapCard: {
  marginBottom: 12,
  backgroundColor: "#F8FAFC",
  borderWidth: 1,
  borderColor: "#E2E8F0",
  borderRadius: 16,
  padding: 12,
},

mapTitle: {
  fontSize: 13,
  fontWeight: "800",
  color: "#2f2971",
  marginBottom: 10,
},
searchRow: {
  flexDirection: "row",
  gap: 10,
  alignItems: "center",
  marginBottom: 10,
},

searchInputWrap: {
  flex: 1,
  height: 48,
  borderWidth: 1,
  borderColor: "#CBD5E1",
  backgroundColor: "#FFFFFF",
  borderRadius: 14,
  paddingHorizontal: 14,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},

searchInput: {
  flex: 1,
  fontSize: 14,
  color: "#0F172A",
},

searchBtn: {
  height: 48,
  paddingHorizontal: 20,
  borderRadius: 14,
  backgroundColor: "#2f2971",
  alignItems: "center",
  justifyContent: "center",
},
searchBtnText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "700",
},
mapHint: {
  fontSize: 11,
  color: "#64748B",
  marginBottom: 10,
  lineHeight: 16,
},

mapFrame: {
  width: "100%",
  height: 240,
  borderRadius: 14,
  overflow: "hidden",
  backgroundColor: "#E5E7EB",
  marginBottom: 12,
},

webview: {
  flex: 1,
  backgroundColor: "transparent",
},

openMapBtn: {
  backgroundColor: "#2f2971",
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 14,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},

openMapBtnText: {
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: "700",
},
});