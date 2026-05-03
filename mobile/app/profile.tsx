import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";
import { authRequest } from "../utils/api";

// ─────────────────────────── Types ───────────────────────────
type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string | null;
  lastLogin?: string;
  allergies?: string[];
  dietaryPreferences?: {
    vegetarian?: boolean;
    diabeticFriendly?: boolean;
    lowSodium?: boolean;
  };
  activeMedicationNames?: string[];
};

type AuthContextType = {
  user: User | null;
  token: string;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  loading: boolean;
};

type MedItem = {
  name: string;
  index?: number | null;
  lastIso?: string;
};

// ─────────────────────────── Drawer items ───────────────────────────
const MENU_ITEMS = [
  { label: "Dashboard", icon: "home-outline" as const, path: "/dashboard", replace: true },
  { label: "Food Drug Interaction", icon: "shield-checkmark-outline" as const, path: "/advisory/FoodDrugInteraction", replace: true },
  { label: "Meal Plan Advisor", icon: "clipboard-outline" as const, path: "/advisory/PersonalizedMealPlan", replace: true },
  { label: "Drug Image Analyzer", icon: "image-outline" as const, path: "/advisory/drug-image", replace: false },
  { label: "Drug Recommender", icon: "sparkles-outline" as const, path: "/advisory/symptom-drug", replace: false },
  { label: "History", icon: "time-outline" as const, path: "/advisory/History", replace: false },
];

// ─────────────────────────── Helpers ───────────────────────────
function prettyTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function normalizeAllergyLabel(key: string) {
  const map: Record<string, string> = {
    peanut: "Peanut",
    tree_nut: "Tree nuts",
    milk: "Milk / Dairy",
    egg: "Egg",
    fish: "Fish",
    shellfish: "Shellfish",
    soy: "Soy",
    wheat: "Wheat / Gluten",
    sesame: "Sesame",
  };
  return map[key] || key;
}

function getRoleLabel(role?: string) {
  const r = String(role || "").toLowerCase();
  if (!r) return "Healthcare Professional";
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function getInitials(name?: string) {
  const value = String(name || "User")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
  return value || "U";
}

// ─────────────────────────── Small UI Components ───────────────────────────
function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function Chip({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "red" | "emerald" | "blue" | "purple";
}) {
  const toneStyle =
    tone === "red"
      ? { bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" }
      : tone === "emerald"
      ? { bg: "#ECFDF5", border: "#A7F3D0", text: "#047857" }
      : tone === "blue"
      ? { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" }
      : tone === "purple"
      ? { bg: "#F3E8FF", border: "#D8B4FE", text: "#7E22CE" }
      : { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569" };

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: toneStyle.bg,
          borderColor: toneStyle.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: toneStyle.text }]}>{label}</Text>
    </View>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color="#fff" />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#64748B" style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────── Main Screen ───────────────────────────
export default function ProfileScreen() {
  const { user: authUser, logout, isAuthenticated, loading, token } = useAuth() as AuthContextType;
  const [user, setUser] = useState<any>(authUser || null);

  useEffect(() => {
  if (authUser) {
    setUser(authUser);
  }
}, [authUser]);

useEffect(() => {
  const loadProfile = async () => {
    if (!token) return;

    try {
      setProfileLoading(true);

      const data = await authRequest("/api/users/me", { token });
      console.log("USER DATA:", data);

      const u = data?.user || {};

      setUser((prev: any) => ({
        ...(prev || {}),
        id: u.id || u._id || prev?.id,
        name: u.fullName || prev?.name || "User",
        email: u.email || prev?.email || "",
        age: u.age ?? prev?.age,
        phone: u.phone ?? prev?.phone,
        allergies: Array.isArray(u.allergies) ? u.allergies : prev?.allergies || [],
        dietaryPreferences: u.dietaryPreferences || prev?.dietaryPreferences || {
          vegetarian: false,
          diabeticFriendly: false,
          lowSodium: false,
        },
        activeMedicationNames: Array.isArray(u.activeMedicationNames)
          ? u.activeMedicationNames
          : prev?.activeMedicationNames || [],
        role: prev?.role || "user",
        lastLogin: u.updatedAt || prev?.lastLogin || "",
        avatar: prev?.avatar || null,
      }));
    } catch (err) {
      console.log("PROFILE ERROR:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  loadProfile();
}, [token]);

  const [showSidebar, setShowSidebar] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated === false) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated]);

  const initials = useMemo(() => getInitials(user?.name), [user?.name]);
  const roleLabel = useMemo(() => getRoleLabel(user?.role), [user?.role]);
  const allergies = Array.isArray(user?.allergies) ? user!.allergies! : [];
 const meds: MedItem[] = Array.isArray(user?.activeMedicationNames)
  ? user!.activeMedicationNames!.map((name: string) => ({
      name,
      lastIso: user?.lastLogin,
    }))
  : [];

  const handleLogout = async () => {
    await logout?.();
    router.replace("/login");
  };

  const goSettings = () => {
    Alert.alert("Settings", "Settings page can be connected next.");
  };

  const goHealthAdvisory = () => router.push("/dashboard");
  const goInteraction = () => router.push("/advisory/FoodDrugInteraction");
  const goMealPlan = () => router.push("/advisory/PersonalizedMealPlan");
  const goDrugImage = () => router.push("/advisory/DrugImagePredict");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
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

        {/* Hero */}
        <View style={styles.pageHero}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>PROFILE & ACCOUNT</Text>
          </View>
          <Text style={styles.pageTitle}>My Profile</Text>
          <Text style={styles.pageDesc}>
            View your account details, medication summary, allergies, and quick actions.
          </Text>
        </View>

        {/* Main Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileCover} />

          <View style={styles.profileBody}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {user?.avatar ? (
                  <Text style={styles.avatarText}>IMG</Text>
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
            </View>

            <Text style={styles.profileName}>{user?.name || "User"}</Text>
            <Text style={styles.profileEmail}>{user?.email || "user@example.com"}</Text>

            <View style={styles.badgeRow}>
              <Chip label="Verified Account" tone="emerald" />
              {profileLoading ? <Chip label="Loading..." tone="purple" /> : null}
            </View>

            <View style={styles.profileActionRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={goSettings} activeOpacity={0.85}>
                <Ionicons name="settings-outline" size={16} color="#2f2971" />
                <Text style={styles.secondaryBtnText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleLogout} activeOpacity={0.85}>
                <Ionicons name="log-out-outline" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <StatCard icon="person-outline" label="Role" value={roleLabel} />
              <StatCard icon="shield-checkmark-outline" label="Module Access" value="All Features" />
              <StatCard icon="time-outline" label="Last Login" value={prettyTime(user?.lastLogin).split(",")[0] || "Recent"} />
            </View>
          </View>
        </View>

        {/* Account Information */}
        <SectionCard title="Account Information" icon="person-circle-outline">
          <InfoRow icon="mail-outline" label="Email" value={user?.email || ""} />
          <InfoRow icon="person-outline" label="Full Name" value={user?.name || ""} />
          <InfoRow icon="id-card-outline" label="Role" value={roleLabel} />
        </SectionCard>

        {/* Platform Access */}
        <SectionCard title="Platform Access" icon="briefcase-outline">
          <Text style={styles.paragraph}>
            Your workspace supports food–drug interaction checks, intelligent meal plan generation,
            and image-based drug prediction tools.
          </Text>

          <View style={styles.chipRow}>
            {user?.dietaryPreferences?.vegetarian ? <Chip label="Vegetarian" tone="purple" /> : null}
            {user?.dietaryPreferences?.diabeticFriendly ? <Chip label="Diabetic-friendly" tone="purple" /> : null}
            {user?.dietaryPreferences?.lowSodium ? <Chip label="Low Sodium" tone="purple" /> : null}

            {!user?.dietaryPreferences?.vegetarian &&
            !user?.dietaryPreferences?.diabeticFriendly &&
            !user?.dietaryPreferences?.lowSodium ? (
              <Chip label="No dietary preferences set" tone="slate" />
            ) : null}
          </View>

          <View style={styles.noticeBox}>
            <Ionicons name="warning-outline" size={16} color="#92400E" />
            <Text style={styles.noticeText}>
              Always validate clinical decisions with a licensed healthcare professional.
            </Text>
          </View>
        </SectionCard>

        {/* Active Medications */}
        <SectionCard title="Active Medications" icon="flask-outline">
          {meds.length === 0 ? (
            <View style={styles.emptyMini}>
              <Ionicons name="warning-outline" size={18} color="#94A3B8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyMiniTitle}>No medications recorded</Text>
                <Text style={styles.emptyMiniSub}>Generate a meal plan to add medications.</Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {meds.map((m, i) => (
                <View key={`${m.name}-${i}`} style={styles.medCard}>
                  <View style={styles.medIcon}>
                    <Ionicons name="flask-outline" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{m.name}</Text>
                    <Text style={styles.medDate}>{prettyTime(m.lastIso)}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        {/* Allergies */}
        <SectionCard title="Allergies" icon="warning-outline">
          {allergies.length === 0 ? (
            <View style={styles.emptyMini}>
              <Ionicons name="alert-circle-outline" size={18} color="#94A3B8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyMiniTitle}>No allergies recorded</Text>
                <Text style={styles.emptyMiniSub}>Select allergies on the Meal Plan page.</Text>
              </View>
            </View>
          ) : (
            <View style={styles.chipRow}>
              {allergies.map((a: string, idx: number) => (
                <Chip key={`${a}-${idx}`} label={normalizeAllergyLabel(a)} tone="red" />
              ))}
            </View>
          )}
        </SectionCard>

        {/* Quick Actions */}
        <SectionCard title="Quick Actions" icon="flash-outline">
          <View style={{ gap: 10 }}>
            <TouchableOpacity style={styles.quickBtn} onPress={goInteraction} activeOpacity={0.9}>
              <Text style={styles.quickBtnText}>Drug Interaction Check</Text>
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} onPress={goHealthAdvisory} activeOpacity={0.9}>
              <Text style={styles.quickBtnText}>Health Advisory Center</Text>
              <Ionicons name="medkit-outline" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} onPress={goMealPlan} activeOpacity={0.9}>
              <Text style={styles.quickBtnText}>Meal Plan Advisor</Text>
              <Ionicons name="clipboard-outline" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtn} onPress={goDrugImage} activeOpacity={0.9}>
              <Text style={styles.quickBtnText}>Drug Image Analyzer</Text>
              <Ionicons name="image-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* Security Notice */}
        <View style={styles.securityCard}>
          <View style={styles.securityIcon}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Secure & Private</Text>
            <Text style={styles.securityText}>
              Your health data is handled securely. Always verify important outcomes with a healthcare professional.
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} PharmaLink. For academic purposes only.
        </Text>
      </ScrollView>

      {/* Sidebar */}
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
                const active = item.path === "/Profile";
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
                    <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.drawerDivider} />

            <View style={styles.drawerBottom}>
              <TouchableOpacity
                style={[styles.drawerItem, styles.drawerItemActive]}
                onPress={() => {
                  setShowSidebar(false);
                  router.push("/Profile" as any);
                }}
              >
                <Ionicons name="person-circle-outline" size={22} color="#2f2971" />
                <Text style={[styles.drawerItemText, styles.drawerItemTextActive]}>My Profile</Text>
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

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    margin: 16,
    marginTop: -14,
    overflow: "hidden",
  },
  profileCover: {
    height: 100,
    backgroundColor: "#2f2971",
  },
  profileBody: {
    padding: 18,
    alignItems: "center",
  },
  avatarWrap: {
    marginTop: -50,
    marginBottom: 10,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: "#2f2971",
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  profileEmail: {
    marginTop: 5,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },

  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "700",
  },

  profileActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    width: "100%",
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
  primaryBtn: {
    flex: 1,
    backgroundColor: "#2f2971",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  statsGrid: {
    marginTop: 18,
    width: "100%",
    gap: 10,
  },
  statCard: {
    backgroundColor: "#F8F9FB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#2f2971",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2f2971",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  infoRow: {
    backgroundColor: "#F8F9FB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 13,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
    lineHeight: 20,
  },

  paragraph: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },

  noticeBox: {
    marginTop: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    lineHeight: 16,
  },

  emptyMini: {
    backgroundColor: "#F8F9FB",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  emptyMiniTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 3,
  },
  emptyMiniSub: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },

  medCard: {
    backgroundColor: "#F8F9FB",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  medIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#2f2971",
    alignItems: "center",
    justifyContent: "center",
  },
  medName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  medDate: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },

  quickBtn: {
    backgroundColor: "#2f2971",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  securityCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46",
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: "#047857",
    lineHeight: 18,
    flex: 1,
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
});