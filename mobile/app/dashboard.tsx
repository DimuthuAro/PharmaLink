import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  StatusBar,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";

const drugImg = require("../assets/images/drug-interaction.png");
const healthImg = require("../assets/images/food-drug.jpeg");
const comparatorImg = require("../assets/images/comparator.jpeg");
const prescriptionImg = require("../assets/images/prescription.jpeg");

type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
};

type Stats = {
  prescriptionsProcessed: number;
  interactionsChecked: number;
  costSavings: number;
  accuracyRate: number;
};

type QuickAction = {
  id: number;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
  stats: string;
  priority: "high" | "medium" | "low";
  image: any;
};

type Metric = {
  name: string;
  value: string;
  change: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type AuthContextType = {
  user: User | null;
  token: string;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  loading: boolean;
};

function UserAvatar({ user, size = 44 }: { user?: User | null; size?: number }) {
  const initials = useMemo(() => {
    const name = user?.name?.trim() || "User";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user?.name]);

  if (user?.avatar) {
    return (
      <Image
        source={{ uri: user.avatar }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: "rgba(255,255,255,0.3)",
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, logout, isAuthenticated, loading } = useAuth() as AuthContextType;

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    prescriptionsProcessed: 0,
    interactionsChecked: 0,
    costSavings: 0,
    accuracyRate: 0,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      setStats({
        prescriptionsProcessed: 1247,
        interactionsChecked: 8923,
        costSavings: 45600,
        accuracyRate: 98.7,
      });
      setIsLoading(false);
    };
    loadData();
  }, []);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        id: 1,
        title: "Drug Interaction Check",
        description: "Check for potential drug interactions and allergies.",
        icon: "shield-checkmark-outline",
        path: "/interaction-check",
        stats: `${stats.interactionsChecked.toLocaleString()} checks`,
        priority: "high",
        image: drugImg,
      },
      {
        id: 2,
        title: "Health Advisory Center",
        description: "Food-drug safety, personalized nutrition,pill identification & patient story assistant",
        icon: "bulb-outline",
        path: "/advisory/FoodDrugInteraction",
        stats: "AI-Powered",
        priority: "medium",
        image: healthImg,
      },
      {
        id: 3,
        title: "Cross-Brand Comparator",
        description: "Compare drug alternatives, prices, and availability.",
        icon: "git-compare-outline",
        path: "/comparator",
        stats: "Save up to 80%",
        priority: "medium",
        image: comparatorImg,
      },
      {
        id: 4,
        title: "Treatment Identifier",
        description: "AI-powered prescription analysis and treatment recommendations.",
        icon: "document-text-outline",
        path: "/prescription",
        stats: `${stats.accuracyRate}% accuracy`,
        priority: "high",
        image: prescriptionImg,
      },
    ],
    [stats]
  );

  const metrics = useMemo<Metric[]>(
    () => [
      { name: "API Response Time", value: "124ms", change: "+2.1%", icon: "trending-up-outline" },
      { name: "Model Accuracy", value: "98.7%", change: "+0.3%", icon: "analytics-outline" },
      { name: "Uptime", value: "99.9%", change: "0.0%", icon: "pulse-outline" },
      { name: "Active Users", value: "247", change: "+12.4%", icon: "people-outline" },
    ],
    []
  );

  const statCards = useMemo(
    () => [
      {
        label: "Prescriptions\nProcessed",
        value: stats.prescriptionsProcessed.toLocaleString(),
        change: "+12%",
        progress: 0.25,
      },
      {
        label: "Interactions\nChecked",
        value: stats.interactionsChecked.toLocaleString(),
        change: "+8%",
        progress: 0.5,
      },
      {
        label: "Cost Savings\n(LKR)",
        value: stats.costSavings.toLocaleString(),
        change: "+23%",
        progress: 0.75,
      },
      {
        label: "Accuracy\nRate",
        value: `${stats.accuracyRate}%`,
        change: "+0.3%",
        progress: 0.99,
      },
    ],
    [stats]
  );

  const firstName = useMemo(() => user?.name?.split(" ")[0] || "User", [user?.name]);
  const roleLabel = useMemo(() => {
    const r = (user?.role || "").trim();
    return r || "Healthcare Professional";
  }, [user?.role]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2f2971" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER (same style as landing page) ── */}
<View style={styles.header}>
  <View style={styles.headerLeft}>
    <BrandLogo withText size={32} />
  </View>

  <View style={styles.headerRight}>
    <TouchableOpacity style={styles.notifBtn} activeOpacity={0.8}>
      <Ionicons name="notifications-outline" size={18} color="#fff" />
      <View style={styles.notifDot} />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.profileAvatarOnly}
      activeOpacity={0.8}
      onPress={() => setShowProfileMenu((prev) => !prev)}
    >
      <UserAvatar user={user} size={40} />
    </TouchableOpacity>
  </View>
</View>
{showProfileMenu && (
  <>
    <Pressable
      style={styles.profileMenuBackdrop}
      onPress={() => setShowProfileMenu(false)}
    />
    <View style={styles.profileDropdown}>
      <View style={styles.profileDropdownTop}>
        <UserAvatar user={user} size={54} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.dropdownName}>{user?.name || "User"}</Text>
          <Text style={styles.dropdownEmail}>{user?.email || "user@example.com"}</Text>
          <Text style={styles.dropdownRole}>{roleLabel}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.dropdownItem}
        onPress={() => {
          setShowProfileMenu(false);
          router.push("/profile" as any);
        }}
      >
        <Ionicons name="person-outline" size={20} color="#94A3B8" />
        <Text style={styles.dropdownItemText}>Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dropdownItem}
        onPress={() => {
          setShowProfileMenu(false);
          router.push("/settings" as any);
        }}
      >
        <Ionicons name="settings-outline" size={20} color="#94A3B8" />
        <Text style={styles.dropdownItemText}>Account settings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.dropdownItem, styles.dropdownLogout]}
        onPress={() => {
          setShowProfileMenu(false);
          handleLogout();
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.dropdownLogoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  </>
)}       
{/* ── SEARCH BAR ── */}
<View style={styles.searchRow}>
  <TouchableOpacity
    style={styles.bodyMenuBtn}
    activeOpacity={0.8}
    onPress={() => {
      setShowProfileMenu(false);
      setShowSidebar(true);
    }}
  >
    <Ionicons name="menu-outline" size={22} color="#2f2971" />
  </TouchableOpacity>

  <View style={styles.searchWrap}>
    <Ionicons
      name="search-outline"
      size={16}
      color="#94A3B8"
      style={styles.searchIcon}
    />
    <TextInput
      value={searchQuery}
      onChangeText={setSearchQuery}
      placeholder="Search patients, prescriptions, drugs..."
      placeholderTextColor="#CBD5E1"
      style={styles.searchInput}
    />
  </View>
</View>

        {/* ── USER CARD ── */}


        {/* ── WELCOME HERO ── */}
        <View style={styles.welcomeCard}>
          <View style={[styles.wcCircle, { width: 110, height: 110, top: -30, right: -20 }]} />
          <View style={[styles.wcCircle, { width: 65, height: 65, bottom: -20, left: 20 }]} />
          <Text style={styles.welcomeEyebrow}>DASHBOARD</Text>
          <Text style={styles.welcomeTitle}>Welcome back,{"\n"}{firstName} 👋</Text>
          <Text style={styles.welcomeSub}>
            Your healthcare management overview for today.
          </Text>
        </View>

        {/* ── OVERVIEW STATS ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>OVERVIEW</Text>
          <Text style={styles.sectionTitle}>Platform statistics</Text>
        </View>

        <View style={styles.statsGrid}>
          {statCards.map((item, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={styles.statValue}>{isLoading ? "…" : item.value}</Text>
              <View style={styles.statBadge}>
                <Text style={styles.statBadgeText}>{item.change}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${item.progress * 100}%` as any }]} />
              </View>
            </View>
          ))}
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>QUICK ACTIONS</Text>
          <Text style={styles.sectionTitle}>Core workflows</Text>
          <Text style={styles.sectionSub}>Jump into key features quickly.</Text>
        </View>

        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            activeOpacity={0.9}
            onPress={() => router.push(action.path as any)}
          >
            <View style={styles.actionImgWrap}>
              <Image source={action.image} style={styles.actionImg} resizeMode="cover" />
              {action.priority === "high" && (
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityBadgeText}>Priority</Text>
                </View>
              )}
            </View>
            <View style={styles.actionBody}>
              <View style={styles.actionIconWrap}>
                <Ionicons name={action.icon} size={20} color="#2f2971" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDesc}>{action.description}</Text>
                <View style={styles.actionFooter}>
                  <Text style={styles.actionStats}>{action.stats}</Text>
                  <View style={styles.actionOpen}>
                    <Text style={styles.actionOpenText}>Open</Text>
                    <Ionicons name="chevron-forward" size={12} color="#2f2971" />
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* ── SYSTEM METRICS ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>SYSTEM PERFORMANCE</Text>
          <Text style={styles.sectionTitle}>Live platform metrics</Text>
        </View>

        <View style={styles.metricsGrid}>
          {metrics.map((metric, i) => (
            <View key={i} style={styles.metricCard}>
              <View style={styles.metricTop}>
                <Text style={styles.metricName}>{metric.name}</Text>
                <Ionicons name={metric.icon} size={16} color="#2f2971" />
              </View>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricChange}>↑ {metric.change}</Text>
            </View>
          ))}
        </View>

        {/* ── ALERT CARD ── */}
        <View style={styles.alertCard}>
          <View style={styles.alertIconWrap}>
            <Ionicons name="warning-outline" size={20} color="#2f2971" />
          </View>
          <View style={styles.alertContent}>
            <View style={styles.alertHeaderRow}>
              <Text style={styles.alertTitle}>High Priority Alert</Text>
              <View style={styles.alertUrgentBadge}>
                <Text style={styles.alertUrgentText}>Urgent</Text>
              </View>
            </View>
            <Text style={styles.alertDesc}>
              3 potential drug interactions detected in the last hour requiring immediate review.
            </Text>
            <TouchableOpacity
              style={styles.alertPrimaryBtn}
              onPress={() => router.push("/interaction-check" as any)}
            >
              <Text style={styles.alertPrimaryBtnText}>Review Interactions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.alertSecondaryBtn}>
              <Text style={styles.alertSecondaryBtnText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── BOTTOM ACTIONS ── */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => router.push("/profile" as any)}
          >
            <Ionicons name="person-outline" size={16} color="#2f2971" />
            <Text style={styles.bottomBtnText}>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => router.push("/settings" as any)}
          >
            <Ionicons name="settings-outline" size={16} color="#2f2971" />
            <Text style={styles.bottomBtnText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} PharmaLink. All rights reserved.{"\n"}
          For academic and research purposes only.
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
        <BrandLogo withText size={30} />
        <TouchableOpacity onPress={() => setShowSidebar(false)}>
          <Ionicons name="close-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.drawerMenu}>
        <TouchableOpacity style={[styles.drawerItem, styles.drawerItemActive]}>
          <Ionicons name="home-outline" size={22} color="#2f2971" />
          <Text style={[styles.drawerItemText, styles.drawerItemTextActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem}>
          <Ionicons name="bar-chart-outline" size={22} color="#fff" />
          <Text style={styles.drawerItemText}>Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
          <Text style={styles.drawerItemText}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem}>
          <Ionicons name="help-circle-outline" size={22} color="#fff" />
          <Text style={styles.drawerItemText}>Help & Support</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.drawerBottom}>
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            setShowSidebar(false);
            router.push("/profile" as any);
          }}
        >
          <Ionicons name="person-circle-outline" size={22} color="#fff" />
          <Text style={styles.drawerItemText}>My Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            setShowSidebar(false);
            handleLogout();
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FB" },
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FB",
  },
  loadingText: { marginTop: 12, color: "#475569", fontSize: 14, fontWeight: "500" },

  // ── Header (same as landing page) ──

  notifBtn: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#2f2971",
  },

  // ── Search ──
  searchWrap: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    padding: 0,
  },

  // ── User card ──
  userCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 18,
    marginHorizontal: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  userLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  userName: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  userRole: { fontSize: 11, fontWeight: "600", color: "#2f2971", marginTop: 2 },
  userEmail: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  avatarFallback: {
    backgroundColor: "#EEEDFE",
    borderWidth: 1,
    borderColor: "#AFA9EC",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#3C3489", fontWeight: "800", fontSize: 14 },
  logoutBtn: {
    width: 34,
    height: 34,
    backgroundColor: "#EEEDFE",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Welcome card ──
  welcomeCard: {
    backgroundColor: "#2f2971",
    borderRadius: 20,
    marginHorizontal: 14,
    padding: 20,
    marginBottom: 18,
    overflow: "hidden",
    position: "relative",
  },
  wcCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  welcomeEyebrow: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 30,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  welcomeSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 18 },

  // ── Section header ──
  sectionHeader: { paddingHorizontal: 14, paddingBottom: 12 },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#94A3B8",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSub: { fontSize: 12, color: "#94A3B8", marginTop: 3 },

  // ── Stats grid ──
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    width: "47.5%",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
    marginBottom: 6,
    lineHeight: 15,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  statBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEEDFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    marginBottom: 10,
  },
  statBadgeText: { color: "#3C3489", fontSize: 9, fontWeight: "700" },
  progressTrack: {
    height: 3,
    backgroundColor: "#F1F1F1",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2f2971",
    borderRadius: 999,
  },

  // ── Action cards ──
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    overflow: "hidden",
    marginHorizontal: 14,
    marginBottom: 12,
  },
  actionImgWrap: { position: "relative" },
  actionImg: { width: "100%", height: 150 },
  priorityBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#2f2971",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  priorityBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  actionBody: { padding: 14, flexDirection: "row", gap: 12 },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: { flex: 1 },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
    lineHeight: 20,
  },
  actionDesc: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 10,
  },
  actionFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actionStats: { fontSize: 11, color: "#475569", fontWeight: "600" },
  actionOpen: { flexDirection: "row", alignItems: "center", gap: 3 },
  actionOpenText: { color: "#2f2971", fontSize: 11, fontWeight: "700" },

  // ── Metrics grid ──
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    width: "47.5%",
  },
  metricTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  metricName: { fontSize: 10, color: "#94A3B8", fontWeight: "500", flex: 1, lineHeight: 14 },
  metricValue: { fontSize: 22, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  metricChange: { fontSize: 10, fontWeight: "700", color: "#3C3489" },

  // ── Alert card ──
  alertCard: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#AFA9EC",
    borderRadius: 18,
    marginHorizontal: 14,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  alertIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
  },
  alertContent: { flex: 1 },
  alertHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  alertTitle: { fontSize: 14, fontWeight: "800", color: "#26215C" },
  alertUrgentBadge: {
    backgroundColor: "#2f2971",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  alertUrgentText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
  alertDesc: { fontSize: 12, color: "#3C3489", lineHeight: 18, marginBottom: 12 },
  alertPrimaryBtn: {
    backgroundColor: "#2f2971",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  alertPrimaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  alertSecondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#AFA9EC",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  alertSecondaryBtnText: { color: "#2f2971", fontWeight: "700", fontSize: 12 },

  // ── Bottom actions ──
  bottomActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  bottomBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  bottomBtnText: { color: "#2f2971", fontSize: 12, fontWeight: "700" },

  // ── Footer ──
  footer: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 10,
    lineHeight: 16,
    paddingHorizontal: 14,
  },

  header: {
  backgroundColor: "#2f2971",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 14,
  paddingVertical: 14,
},

headerLeft: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
},

headerRight: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
},


profileAvatarOnly: {
  alignItems: "center",
  justifyContent: "center",
},



profileMenuBackdrop: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 20,
},

profileDropdown: {
  position: "absolute",
  top: 78,
  right: 14,
  width: 280,
  backgroundColor: "#FFFFFF",
  borderRadius: 24,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  zIndex: 30,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 18,
  elevation: 10,
  overflow: "hidden",
},

profileDropdownTop: {
  flexDirection: "row",
  alignItems: "center",
  padding: 18,
  borderBottomWidth: 1,
  borderBottomColor: "#F1F5F9",
},

dropdownName: {
  fontSize: 15,
  fontWeight: "800",
  color: "#0F172A",
},

dropdownEmail: {
  fontSize: 12,
  color: "#64748B",
  marginTop: 4,
},

dropdownRole: {
  fontSize: 12,
  fontWeight: "700",
  color: "#2f2971",
  marginTop: 4,
},

dropdownItem: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingHorizontal: 18,
  paddingVertical: 16,
},

dropdownItemText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#475569",
},

dropdownLogout: {
  borderTopWidth: 1,
  borderTopColor: "#F1F5F9",
},

dropdownLogoutText: {
  fontSize: 14,
  fontWeight: "700",
  color: "#EF4444",
},

drawerOverlay: {
  flex: 1,
  flexDirection: "row",
},

drawerBackdrop: {
  flex: 1,
  backgroundColor: "rgba(15,23,42,0.3)",
},

drawer: {
  width: "82%",
  backgroundColor: "#2f2971",
  paddingTop: 20,
  paddingHorizontal: 18,
  paddingBottom: 28,
  justifyContent: "space-between",
},

drawerHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: 18,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255,255,255,0.12)",
},

drawerMenu: {
  marginTop: 24,
  gap: 14,
},

drawerBottom: {
  borderTopWidth: 1,
  borderTopColor: "rgba(255,255,255,0.12)",
  paddingTop: 18,
  gap: 10,
},

drawerItem: {
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
  paddingVertical: 16,
  paddingHorizontal: 14,
  borderRadius: 999,
},

drawerItemActive: {
  backgroundColor: "#FFFFFF",
},

drawerItemText: {
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: "700",
},

drawerItemTextActive: {
  color: "#2f2971",
},

bodyMenuBtn: {
  width: 46,
  height: 46,
  borderRadius: 12,
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#EBEBEB",
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 8,
  elevation: 3,
  flexShrink: 0,
},
searchRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  marginHorizontal: 14,
  marginTop: 1,
  marginBottom: 1,
},
});