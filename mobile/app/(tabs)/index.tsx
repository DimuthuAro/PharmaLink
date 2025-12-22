import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import BrandHeader from "../../components/BrandHeader";
import { getUser, User } from "../../utils/auth";

type Stat = {
  label: string;
  value: string;
  change: string;
  progress: number; // 0..1
};

type Action = {
  title: string;
  desc: string;
  route: string;
};

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
    const n = user?.name?.trim() || "User";
    return n.split(" ").filter(Boolean)[0] || "User";
  }, [user?.name]);

  const roleLabel = useMemo(() => {
    const r = user?.role || "doctor";
    if (r === "doctor") return "Doctor";
    if (r === "pharmacist") return "Pharmacist";
    if (r === "admin") return "Admin";
    return "User";
  }, [user?.role]);

  // You can later replace these with real API stats
  const stats: Stat[] = useMemo(
    () => [
      { label: "Prescriptions Processed", value: "1,247", change: "+12%", progress: 0.35 },
      { label: "Interactions Checked", value: "8,923", change: "+8%", progress: 0.55 },
      { label: "Cost Savings", value: "$45,600", change: "+23%", progress: 0.75 },
      { label: "Accuracy Rate", value: "98.7%", change: "+0.3%", progress: 0.9 },
    ],
    []
  );

  const actions: Action[] = useMemo(
    () => [
      {
        title: "Drug Interaction Check",
        desc: "Check interactions between medicines and allergy risks.",
        route: "/explore", 
      },
      {
        title: "Drug & Food  Interaction Check",
        desc: "Check for potential drug & food interactions quickly",
        route: "/food-drug", 
      },
      {
        title: "Cross-Brand Comparator",
        desc: "Compare drug alternatives and costs",
        route: "/explore",
      },
      {
        title: "Prescription Interpreter",
        desc: "AI-powered handwritten prescription analysis",
        route: "/explore",
      },
    ],
    []
  );

  return (
    <View style={styles.screen}>
      <BrandHeader user={user} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Welcome back, {firstName}.</Text>
          <Text style={styles.welcomeSub}>
            {roleLabel === "Doctor"
              ? "Here's what's happening with your patients today."
              : roleLabel === "Pharmacist"
              ? "Monitor prescriptions and drug interactions."
              : "Manage your platform operations."}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ gap: 14 }}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statChange}>{s.change}</Text>
              </View>

              <Text style={styles.statValue}>{s.value}</Text>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(s.progress * 100)}%` }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={{ marginTop: 18 }}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSub}>Jump to the main modules.</Text>

          <View style={{ gap: 12, marginTop: 12 }}>
            {actions.map((a) => (
              <Pressable
                key={a.title}
                onPress={() => router.push(a.route as any)}
                style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.9 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>{a.title}</Text>
                  <Text style={styles.actionDesc}>{a.desc}</Text>
                </View>

                <Text style={styles.openText}>Open</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ height: 16 }} />

        <Text style={styles.footer}>© {new Date().getFullYear()} PharmaLink • Academic/Research use only</Text>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7ff" },
  container: { padding: 16, paddingBottom: 22 },

  welcome: { paddingVertical: 12 },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  welcomeSub: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    lineHeight: 21,
  },

  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 16,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  statLabel: { color: "#334155", fontSize: 13, fontWeight: "800" },
  statChange: { color: "#16a34a", fontSize: 13, fontWeight: "900" },
  statValue: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: "900",
    color: "#0f172a",
  },
  progressTrack: {
    marginTop: 12,
    height: 9,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.35)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2563eb",
  },

  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  sectionSub: { marginTop: 4, fontSize: 13, fontWeight: "700", color: "#64748b" },

  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionTitle: { fontSize: 14.5, fontWeight: "900", color: "#0f172a" },
  actionDesc: { marginTop: 6, fontSize: 13, fontWeight: "700", color: "#64748b", lineHeight: 18 },
  openText: { color: "#2563eb", fontSize: 13.5, fontWeight: "900" },

  footer: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },
});
