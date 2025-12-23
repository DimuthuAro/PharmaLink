import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import BrandHeader from "@/components/BrandHeader";
import { getUser, User } from "../../utils/auth";
import {
  loadHistory,
  clearHistory,
  deleteHistoryEntry,
  HistoryEntry,
} from "../../utils/history";

const riskMeta = {
  0: {
    label: "Safe",
    cardBg: "rgba(34,197,94,0.10)",
    cardBorder: "rgba(34,197,94,0.25)",
    pillBg: "rgba(34,197,94,0.12)",
    pillBorder: "rgba(34,197,94,0.22)",
    pillText: "#166534",
    icon: "shield-check-outline",
    iconBg: "rgba(34,197,94,0.12)",
    iconColor: "#16a34a",
  },
  1: {
    label: "Moderate",
    cardBg: "rgba(245,158,11,0.10)",
    cardBorder: "rgba(245,158,11,0.30)",
    pillBg: "rgba(245,158,11,0.12)",
    pillBorder: "rgba(245,158,11,0.22)",
    pillText: "#92400e",
    icon: "alert-circle-outline",
    iconBg: "rgba(245,158,11,0.12)",
    iconColor: "#f59e0b",
  },
  2: {
    label: "High",
    cardBg: "rgba(239,68,68,0.10)",
    cardBorder: "rgba(239,68,68,0.30)",
    pillBg: "rgba(239,68,68,0.12)",
    pillBorder: "rgba(239,68,68,0.22)",
    pillText: "#991b1b",
    icon: "alert-octagon-outline",
    iconBg: "rgba(239,68,68,0.12)",
    iconColor: "#ef4444",
  },
} as const;

export default function HistoryScreen() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    (async () => {
      const u = await getUser();
      setUser(u);
    })();
  }, []);

  // menu
  const [menuOpen, setMenuOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setMenuOpen(false));
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // data
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const u = await getUser();
      if (!u?.email) {
        setEmail(null);
        setHistory([]);
        return;
      }
      setEmail(u.email);
      const h = await loadHistory(u.email);
      setHistory(h);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const formatted = useMemo(() => {
    return history.map((h) => ({
      ...h,
      time: new Date(h.timestamp).toLocaleString(),
    }));
  }, [history]);

  const onClear = () => {
    if (!email) return;
    Alert.alert(
      "Clear history",
      "Clear all interaction history for this account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearHistory(email);
            setHistory([]);
          },
        },
      ]
    );
  };

  const onDeleteOne = (entry: HistoryEntry) => {
    if (!email) return;
    Alert.alert("Delete item", "Delete this interaction from history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = await deleteHistoryEntry(email, entry.id);
          setHistory(updated);
        },
      },
    ]);
  };

  // recheck button 
  // const onRecheck = (entry: HistoryEntry) => {
  //   router.push({
  //     pathname: "/food-drug",
  //     params: {
  //       drugIndex: String(entry.drugIndex),
  //       drugName: entry.drug,
  //       foodName: entry.food,
  //       fromHistory: "1",
  //     },
  //   });
  // };

  return (
    <View style={styles.screen}>
      <BrandHeader user={user} />

      {/* dropdown toggle */}
      <Pressable
        onPress={menuOpen ? closeMenu : openMenu}
        style={styles.dropBtn}
        hitSlop={10}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <View style={styles.chevron} />
        </Animated.View>
      </Pressable>

      {/* menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.menuCard}>
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuPressed,
                  ]}
                  onPress={() => {
                    closeMenu();
                    router.push("/(tabs)" as any);
                  }}
                >
                  <Text style={styles.menuText}>Home</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuPressed,
                  ]}
                  onPress={() => {
                    closeMenu();
                    router.push("/meal-plan" as any);
                  }}
                >
                  <Text style={styles.menuText}>Meal Plan</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuPressed,
                  ]}
                  onPress={() => {
                    closeMenu();
                    router.push("/food-drug" as any);
                  }}
                >
                  <Text style={styles.menuText}>Food-Drug Interaction Check</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroLeft}>
              <View style={styles.heroIcon}>
                <MaterialCommunityIcons
                  name="history"
                  size={24}
                  color="#2563eb"
                />
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroTitle}>Interaction History</Text>
                <Text style={styles.heroDesc}>
                  Review and manage your past food–drug interaction checks.
                </Text>
              </View>
            </View>

            {/* Right actions */}
            <View style={styles.heroActions}>
              <Pressable
                onPress={refresh}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && { opacity: 0.75 },
                ]}
                hitSlop={10}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={22}
                  color="#2563eb"
                />
              </Pressable>

              {history.length > 0 ? (
                <Pressable
                  onPress={onClear}
                  style={({ pressed }) => [
                    styles.iconBtnDanger,
                    pressed && { opacity: 0.75 },
                  ]}
                  hitSlop={10}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
                    color="#e11d48"
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {/* BODY */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading history…</Text>
          </View>
        ) : formatted.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={22}
                color="#2563eb"
              />
            </View>
            <Text style={styles.emptyTitle}>No interactions yet</Text>
            <Text style={styles.emptyDesc}>
              Start by checking a food–drug interaction. Your results will appear
              here automatically.
            </Text>

            <Pressable
              onPress={() => router.push("/food-drug" as any)}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.primaryText}>Go to interaction checker</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {formatted.map((entry) => {
              const meta = riskMeta[entry.risk as 0 | 1 | 2] ?? riskMeta[1];

              return (
                <View
                  key={entry.id}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: meta.cardBg,
                      borderColor: meta.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.itemTop}>
                    <View style={[styles.itemIconBubble, { backgroundColor: meta.iconBg }]}>
                      <MaterialCommunityIcons
                        name={meta.icon}
                        size={20}
                        color={meta.iconColor}
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.titleLine}>
                        <Text style={styles.pairTitle} numberOfLines={2}>
                          {entry.drug} + {entry.food}
                        </Text>

                        <View
                          style={[
                            styles.pill,
                            {
                              backgroundColor: meta.pillBg,
                              borderColor: meta.pillBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.pillText, { color: meta.pillText }]}>
                            {meta.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.msg}>{entry.message}</Text>

                      <View style={styles.metaRow}>
                        <View style={styles.metaChip}>
                          <MaterialCommunityIcons
                            name="clock-outline"
                            size={14}
                            color="#475569"
                          />
                          <Text style={styles.timeText} numberOfLines={1}>
                            {entry.time}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => onDeleteOne(entry)}
                      style={({ pressed }) => [
                        styles.deleteBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={18}
                        color="#e11d48"
                      />
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>

                    {/* 
                    <Pressable
                      onPress={() => onRecheck(entry)}
                      style={({ pressed }) => [
                        styles.recheckBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="magnify"
                        size={18}
                        color="#1d4ed8"
                      />
                      <Text style={styles.recheckText}>Recheck</Text>
                    </Pressable>
                    */}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.footer}>
          © {new Date().getFullYear()} PharmaLink • Always consult a qualified
          professional.
        </Text>

        <View style={{ height: 18 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#eff6ff" },
  container: { padding: 14, paddingBottom: 18 },

  // ✅ HERO (same style vibe as Food-Drug)
  hero: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 16,
    marginBottom: 10,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.12)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  heroDesc: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    lineHeight: 18,
  },
  heroActions: { flexDirection: "row", gap: 10, alignItems: "center" },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.12)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBtnDanger: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.10)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.22)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // menu
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.18)",
    alignItems: "flex-start",
    paddingTop: 118,
    paddingLeft: 12,
  },
  menuCard: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuPressed: { backgroundColor: "rgba(148,163,184,0.12)" },
  menuText: { fontSize: 14.5, fontWeight: "900", color: "#0f172a" },

  dropBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  chevron: {
    width: 14,
    height: 14,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#0f172a",
    transform: [{ rotate: "45deg" }],
    marginTop: -2,
  },

  // loading / empty
  loadingWrap: { paddingVertical: 18, alignItems: "center" },
  loadingText: {
    textAlign: "center",
    marginTop: 8,
    color: "#64748b",
    fontWeight: "700",
  },

  emptyWrap: { paddingVertical: 18, alignItems: "center" },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontWeight: "900", color: "#0f172a", fontSize: 14 },
  emptyDesc: {
    marginTop: 6,
    textAlign: "center",
    color: "#475569",
    fontWeight: "700",
    lineHeight: 18,
    maxWidth: 320,
    fontSize: 12.5,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  primaryText: { color: "white", fontWeight: "900" },

  // item cards
  itemCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  itemTop: { flexDirection: "row", gap: 10 },

  itemIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },

  titleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  pairTitle: { flex: 1, fontWeight: "900", color: "#0f172a", fontSize: 13.5 },

  pill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { fontWeight: "900", fontSize: 11.5 },

  msg: {
    marginTop: 6,
    color: "#0f172a",
    fontWeight: "700",
    lineHeight: 18,
    fontSize: 12.5,
  },

  metaRow: { marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "rgba(255,255,255,0.70)",
  },
  timeText: { color: "#475569", fontWeight: "800", fontSize: 11.5 },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    justifyContent: "flex-end",
  },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  deleteText: { color: "#e11d48", fontWeight: "900" },

  recheckBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  recheckText: { color: "#1d4ed8", fontWeight: "900" },

  footer: {
    textAlign: "center",
    marginTop: 18,
    fontSize: 11,
    color: "#64748b",
    fontWeight: "700",
  },
});
