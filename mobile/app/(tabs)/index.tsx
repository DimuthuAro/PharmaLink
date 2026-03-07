import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import BrandHeader from "../../components/BrandHeader";
import { getUser, User } from "../../utils/auth";

/* ---------------- Types ---------------- */

type Stat = {
  label: string;
  value: string;
  change: string;
  progress: number;
  icon: keyof typeof Ionicons.glyphMap;
};

type Accent = "blue" | "emerald" | "violet" | "amber";

type Action = {
  title: string;
  desc: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: Accent;
};

/* ---------------- Accent Styles (FIXED) ---------------- */

const accentViewStyle: Record<Accent, any> = {
  blue: {
    backgroundColor: "rgba(37,99,235,0.12)",
    borderColor: "rgba(37,99,235,0.25)",
  },
  emerald: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.25)",
  },
  violet: {
    backgroundColor: "rgba(139,92,246,0.12)",
    borderColor: "rgba(139,92,246,0.25)",
  },
  amber: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.25)",
  },
};

const accentIconColor: Record<Accent, string> = {
  blue: "#1d4ed8",
  emerald: "#047857",
  violet: "#6d28d9",
  amber: "#b45309",
};

/* ---------------- Screen ---------------- */

export default function DashboardTabHome() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getUser();
      setUser(u);
    })();
  }, []);

  const firstName = useMemo(() => {
    const n = user?.name || "User";
    return n.split(" ")[0];
  }, [user?.name]);

  const roleLabel = useMemo(() => {
    const r = user?.role || "doctor";
    return r.charAt(0).toUpperCase() + r.slice(1);
  }, [user?.role]);

  const stats: Stat[] = [
    {
      label: "Prescriptions Processed",
      value: "1,247",
      change: "+12%",
      progress: 0.35,
      icon: "document-text-outline",
    },
    {
      label: "Interactions Checked",
      value: "8,923",
      change: "+8%",
      progress: 0.55,
      icon: "pulse-outline",
    },
    {
      label: "Cost Savings",
      value: "$45,600",
      change: "+23%",
      progress: 0.75,
      icon: "cash-outline",
    },
    {
      label: "Accuracy Rate",
      value: "98.7%",
      change: "+0.3%",
      progress: 0.9,
      icon: "shield-checkmark-outline",
    },
  ];

  const actions: Action[] = [
    {
      title: "Drug Interaction Check",
      desc: "Check interactions between medicines and allergy risks.",
      route: "/explore",
      icon: "medkit-outline",
      accent: "blue",
    },
    {
      title: "Drug & Food Interaction",
      desc: "Check food–drug interactions quickly.",
      route: "/food-drug",
      icon: "restaurant-outline",
      accent: "emerald",
    },
    {
      title: "Cross-Brand Comparator",
      desc: "Compare alternatives and pricing.",
      route: "/explore",
      icon: "git-compare-outline",
      accent: "violet",
    },
    {
      title: "Prescription Interpreter",
      desc: "AI handwritten prescription analysis.",
      route: "/explore",
      icon: "scan-outline",
      accent: "amber",
    },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <BrandHeader user={user} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Welcome back, {firstName}</Text>
            <Text style={styles.heroSub}>
              Monitor prescriptions, interactions, and insights.
            </Text>
          </View>

          <View style={styles.rolePill}>
            <Ionicons name="person-outline" size={14} color="#1d4ed8" />
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>

        {/* STATS */}
        <Text style={styles.sectionTitle}>Today Overview</Text>

        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={styles.statTop}>
                <View style={styles.statIcon}>
                  <Ionicons name={s.icon} size={18} color="#1d4ed8" />
                </View>
                <Text style={styles.statChange}>{s.change}</Text>
              </View>

              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(s.progress * 100)}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* ACTIONS */}
        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
          Quick Actions
        </Text>

        <View style={{ gap: 12 }}>
          {actions.map((a) => (
            <Pressable
              key={a.title}
              onPress={() => router.push(a.route as any)}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && { opacity: 0.92 },
              ]}
            >
              <View
                style={[
                  styles.actionIconWrap,
                  accentViewStyle[a.accent],
                ]}
              >
                <Ionicons
                  name={a.icon}
                  size={18}
                  color={accentIconColor[a.accent]}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>{a.title}</Text>
                <Text style={styles.actionDesc}>{a.desc}</Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#2563eb"
              />
            </Pressable>
          ))}
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} PharmaLink • Academic use only
        </Text>
      </ScrollView>
    </View>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7ff" },
  container: { padding: 16, paddingBottom: 24 },

  hero: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 16,
    marginBottom: 16,
  },
  heroTitle: { fontSize: 26, fontWeight: "900", color: "#0f172a" },
  heroSub: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    backgroundColor: "rgba(37,99,235,0.10)",
  },
  roleText: { fontWeight: "900", fontSize: 12, color: "#1d4ed8" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 10,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 14,
  },
  statTop: { flexDirection: "row", justifyContent: "space-between" },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.10)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  statChange: { color: "#16a34a", fontWeight: "900", fontSize: 12 },
  statValue: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
  },
  statLabel: { marginTop: 6, fontWeight: "800", color: "#475569" },

  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.3)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 999,
  },

  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 14,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { fontSize: 14.5, fontWeight: "900", color: "#0f172a" },
  actionDesc: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#64748b",
  },

  footer: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },
});
