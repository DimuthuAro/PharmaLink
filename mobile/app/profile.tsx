import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUser, clearUser, User } from "../utils/auth";
import { useRouter } from "expo-router";
import BrandHeader from "@/components/BrandHeader";
import { Ionicons } from "@expo/vector-icons";

const PROFILE_LOG_KEY = "pharmlink_profile_log_v1";

const demoAvatars: Record<string, any> = {
  "doctor@pharmalink.com": require("../assets/images/doctor.jpg"),
  "pharmacist@pharmalink.com": require("../assets/images/pharmacist.jpg"),
  "admin@pharmalink.com": require("../assets/images/admin.jpg"),
};

type ProfileLogEntry = {
  id: string;
  timestamp: string;
  drugs: { name: string; index: number }[];
  allergies: string[];
};

const allergyLabel = (k: string) => {
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
  return map[k] || k;
};

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [log, setLog] = useState<ProfileLogEntry[]>([]);

  useEffect(() => {
    (async () => {
      const u = await getUser();
      setUser(u);
      await loadLog();
    })();
  }, []);

  const loadLog = async () => {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_LOG_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setLog(Array.isArray(parsed) ? parsed : []);
    } catch {
      setLog([]);
    }
  };

  const demoAvatar = useMemo(() => {
    const e = (user?.email || "").toLowerCase();
    return e ? demoAvatars[e] : null;
  }, [user?.email]);

  const initials = useMemo(() => {
    const n = (user?.name || "User").trim();
    const parts = n.split(" ").filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  }, [user?.name]);

  // 1) Unique Active Medications (from all checks)
  const activeMedications = useMemo(() => {
    const map = new Map<number, { name: string; index: number; lastSeen: string }>();
    for (const entry of log) {
      for (const d of entry.drugs || []) {
        const existing = map.get(d.index);
        if (!existing || new Date(entry.timestamp) > new Date(existing.lastSeen)) {
          map.set(d.index, { name: d.name, index: d.index, lastSeen: entry.timestamp });
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
  }, [log]);

  // 2) Unique Allergies (from all checks)
  const allAllergies = useMemo(() => {
    const set = new Set<string>();
    for (const entry of log) for (const a of entry.allergies || []) set.add(a);
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [log]);

  const prettyTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const roleLabel = useMemo(() => {
    const r = (user?.role || "").toLowerCase();
    if (!r) return "Healthcare Professional";
    return r.charAt(0).toUpperCase() + r.slice(1);
  }, [user?.role]);

  return (
    <View style={styles.screen}>
      <BrandHeader user={user} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile hero card */}
        <View style={styles.heroCard}>
            <Pressable
    onPress={() => router.back()}
    style={styles.heroBackBtn}
    hitSlop={12}
  >
    <Ionicons name="chevron-back" size={24} color="#2563eb" />
  </Pressable>
          <View style={styles.heroRow}>
            <View style={styles.avatarWrap}>
              {user?.avatarUri ? (
                <Image source={{ uri: user.avatarUri }} style={styles.avatarImg} />
              ) : demoAvatar ? (
                <Image source={demoAvatar} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.heroName} numberOfLines={1}>
                {user?.name || "User"}
              </Text>

              <View style={styles.heroSubRow}>
                <Ionicons name="mail-outline" size={14} color="#64748b" />
                <Text style={styles.heroSub} numberOfLines={1}>
                  {user?.email || "user@example.com"}
                </Text>
              </View>

              <View style={styles.heroSubRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#64748b" />
                <Text style={styles.heroSub} numberOfLines={1}>
                  {roleLabel}
                </Text>
              </View>

              <View style={styles.heroSubRow}>
                <Ionicons name="call-outline" size={14} color="#64748b" />
                <Text style={styles.heroSub} numberOfLines={1}>
                  {user?.phone || "—"}
                </Text>
              </View>
            </View>

            <View style={styles.securePill}>
              <Ionicons name="lock-closed" size={14} color="#047857" />
              <Text style={styles.secureText}>Secure</Text>
            </View>
          </View>
        </View>

        {/* Active meds */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active medications</Text>
          </View>

          {activeMedications.length === 0 ? (
            <Text style={styles.empty}>
              No active medications saved yet. Generate a meal plan (or run a check) to save them.
            </Text>
          ) : (
            <ScrollView
              style={styles.medsScroll}
              contentContainerStyle={styles.medsScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
            >
              {activeMedications.map((d) => (
                <View key={d.index} style={styles.miniCardBlue}>
                  <View style={styles.miniIconBlue}>
                    <Ionicons name="medkit" size={16} color="#1d4ed8" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.miniTitle} numberOfLines={1}>
                      {d.name}
                    </Text>
                    <Text style={styles.miniSub}>Last: {prettyTime(d.lastSeen)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Allergies */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Allergies</Text>

          {allAllergies.length === 0 ? (
            <Text style={styles.empty}>No allergies saved yet.</Text>
          ) : (
            <View style={styles.pillWrap}>
              {allAllergies.map((a, i) => (
                <View key={`${a}-${i}`} style={styles.pillRed}>
                  <Ionicons name="warning" size={14} color="#991b1b" />
                  <Text style={styles.pillRedText}>{allergyLabel(a)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [styles.logout, pressed && { opacity: 0.92 }]}
          onPress={async () => {
            await clearUser();
            router.replace("/welcome");
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: any }) {
  return (
    <View style={styles.statBox}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color="#2563eb" />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#eff6ff" },
  container: { padding: 14, paddingBottom: 18, gap: 12 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,23,42,0.08)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a" },

  card: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    borderRadius: 18,
    padding: 14,
  },

heroCard: {
  backgroundColor: "white",
  borderWidth: 1,
  borderColor: "rgba(15,23,42,0.10)",
  borderRadius: 22,
  padding: 20,
  position: "relative", 
},
heroBackBtn: {
  position: "absolute",
  top: -2,
  left: 10,
  width: 40,
  height: 40,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
},
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    backgroundColor: "rgba(37,99,235,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontWeight: "900", fontSize: 20, color: "#1d4ed8" },

  heroName: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  heroSubRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  heroSub: { color: "#64748b", fontWeight: "800", fontSize: 12.5, flex: 1 },

  securePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
    backgroundColor: "rgba(16,185,129,0.10)",
  },
  secureText: { color: "#047857", fontWeight: "900", fontSize: 11.5 },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    backgroundColor: "rgba(2,6,23,0.02)",
    borderRadius: 18,
    padding: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  statLabel: { marginTop: 2, fontSize: 11.5, fontWeight: "800", color: "#64748b" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontWeight: "900", color: "#0f172a", fontSize: 13 },

  empty: { marginTop: 8, color: "#64748b", fontWeight: "700", lineHeight: 18 },

  miniCardBlue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)",
    backgroundColor: "rgba(37,99,235,0.06)",
    borderRadius: 18,
    padding: 12,
    marginTop: 10,
  },
  miniIconBlue: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  miniTitle: { fontWeight: "900", color: "#0f172a" },
  miniSub: { marginTop: 4, fontWeight: "800", color: "#64748b", fontSize: 11.5 },

  medsScroll: {
    marginTop: 8,
    maxHeight: 220, 
  },
  medsScrollContent: {
    paddingRight: 6, 
    paddingBottom: 6,
  },

  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pillRed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    backgroundColor: "rgba(239,68,68,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillRedText: { color: "#991b1b", fontWeight: "900", fontSize: 12 },

  logout: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 16,
  },
  logoutText: { color: "white", fontWeight: "900" },
});
