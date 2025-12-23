import React, { useMemo, useState, useEffect, useRef } from "react";
import { addHistoryEntry } from "@/utils/history";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import BrandHeader from "@/components/BrandHeader";
import {
  fetchDrugs,
  fetchFoods,
  checkFoodDrugRisk,
  fetchSafeFoods,
} from "../utils/api";
import { getUser, User } from "../utils/auth";

type DrugItem = { index: number; name: string; contains?: string };
type FoodItem = { name?: string; Food?: string; is_alcohol?: number };

type Risk = 0 | 1 | 2;
function toRisk(v: unknown): Risk {
  const n = Number(v);
  if (n === 0 || n === 1 || n === 2) return n;
  return 1;
}

const riskStyle = (risk: number) => {
  if (risk === 0)
    return {
      bg: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.25)",
      text: "#064e3b",
    };
  if (risk === 1)
    return {
      bg: "rgba(245,158,11,0.12)",
      border: "rgba(245,158,11,0.25)",
      text: "#78350f",
    };
  return {
    bg: "rgba(244,63,94,0.12)",
    border: "rgba(244,63,94,0.25)",
    text: "#881337",
  };
};

export default function FoodDrugScreen() {
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

  // inputs
  const [drugQuery, setDrugQuery] = useState("");
  const [foodQuery, setFoodQuery] = useState("");
  const [drugOptions, setDrugOptions] = useState<DrugItem[]>([]);
  const [foodOptions, setFoodOptions] = useState<FoodItem[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<DrugItem | null>(null);
  const [selectedFood, setSelectedFood] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [result, setResult] = useState<any>(null);
  const [safeFoods, setSafeFoods] = useState<any[]>([]);

  const selectedFoodLabel = useMemo(() => selectedFood || "", [selectedFood]);

  const searchDrug = async (q: string) => {
    setDrugQuery(q);
    setSelectedDrug(null);
    setResult(null);
    setSafeFoods([]);
    setError("");
    if (!q.trim()) return setDrugOptions([]);
    const res = await fetchDrugs(q.trim());
    setDrugOptions(res);
  };

  const searchFood = async (q: string) => {
    setFoodQuery(q);
    setSelectedFood("");
    setResult(null);
    setSafeFoods([]);
    setError("");
    if (!q.trim()) return setFoodOptions([]);
    const res = await fetchFoods(q.trim());
    setFoodOptions(res);
  };

  const onCheck = async () => {
    setError("");
    setResult(null);
    setSafeFoods([]);

    if (selectedDrug == null || selectedFoodLabel.trim().length === 0) {
      setError("Please select both a drug and a food item.");
      return;
    }

    try {
      setLoading(true);
      const foodName = selectedFoodLabel.trim();

      // 1) Check interaction
      const res = await checkFoodDrugRisk(selectedDrug.index, foodName);
      setResult(res);

      // 2) Save history
      const u = user ?? (await getUser());
      if (u?.email) {
        await addHistoryEntry(u.email, {
          timestamp: new Date().toISOString(),
          drugIndex: selectedDrug.index,
          drug: res.drug ?? selectedDrug.name,
          food: res.food ?? foodName,
          risk: toRisk(res.risk),
          message: res.message,
        });
      }

      // 3) Safe foods
      const safe = await fetchSafeFoods(selectedDrug.index, 20);
      const nonAlcohol = (safe?.foods || []).filter(
        (f: any) => f.is_alcohol !== 1 && f.is_alcohol !== true
      );
      setSafeFoods(nonAlcohol);
    } catch {
      setError("Error checking interaction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  //Refresh 
  const handleRefresh = () => {
    setDrugQuery("");
    setFoodQuery("");
    setDrugOptions([]);
    setFoodOptions([]);
    setSelectedDrug(null);
    setSelectedFood("");
    setResult(null);
    setSafeFoods([]);
    setError("");
    setLoading(false);
  };

  return (
    <View style={styles.screen}>
      <BrandHeader user={user} />

      {/* dropdown toggle*/}
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
                    router.push("/history" as any);
                  }}
                >
                  <Text style={styles.menuText}>History</Text>
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
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroLeft}>
              <View style={styles.heroIcon}>
                <MaterialCommunityIcons
                  name="flask-outline"
                  size={24}
                  color="#2563eb"
                />
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroTitle}>Food–Drug Interaction Check</Text>
                <Text style={styles.heroDesc}>
                  Search and select both inputs to evaluate potential
                  interactions.
                </Text>
              </View>
            </View>

            {/*Refresh button*/}
            <Pressable
              onPress={handleRefresh}
              style={({ pressed }) => [
                styles.refreshBtn,
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
          </View>
        </View>

        {/* ERROR */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* DRUG */}
        <Text style={styles.label}>Drug</Text>
        <TextInput
          value={drugQuery}
          onChangeText={searchDrug}
          placeholder="Type drug name..."
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        {drugOptions.length > 0 && (
          <View style={styles.dropdown}>
            {drugOptions.slice(0, 7).map((d) => (
              <Pressable
                key={d.index}
                onPress={() => {
                  setSelectedDrug(d);
                  setDrugQuery(d.name);
                  setDrugOptions([]);
                }}
                style={styles.option}
              >
                <Text style={styles.optionTitle}>{d.name}</Text>
                {d.contains ? (
                  <Text style={styles.optionSub}>{d.contains}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}

        {/* FOOD */}
        <Text style={[styles.label, { marginTop: 14 }]}>Food</Text>
        <TextInput
          value={foodQuery}
          onChangeText={searchFood}
          placeholder="Type food name..."
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        {foodOptions.length > 0 ? (
          <View style={styles.dropdown}>
            {foodOptions.slice(0, 7).map((f, idx) => {
              const name = (f.name || f.Food || "").toString();
              return (
                <Pressable
                  key={`${name}-${idx}`}
                  onPress={() => {
                    setSelectedFood(name);
                    setFoodQuery(name);
                    setFoodOptions([]);
                  }}
                  style={styles.option}
                >
                  <Text style={styles.optionTitle}>{name}</Text>
                  {(f as any).is_alcohol === 1 ? (
                    <Text style={styles.alcohol}>Alcohol</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* CHECK BTN */}
        <Pressable
          onPress={onCheck}
          disabled={loading}
          style={({ pressed }) => [
            styles.checkBtn,
            pressed && { opacity: 0.9 },
            loading && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.checkText}>
            {loading ? "Checking..." : "Check interaction"}
          </Text>
        </Pressable>

        {/* RESULT */}
        {result && (
          <View
            style={[
              styles.resultBox,
              {
                backgroundColor: riskStyle(result.risk).bg,
                borderColor: riskStyle(result.risk).border,
              },
            ]}
          >
            <Text
              style={[
                styles.resultBadge,
                { color: riskStyle(result.risk).text },
              ]}
            >
              {result.risk === 0
                ? "Safe"
                : result.risk === 1
                ? "Moderate risk"
                : "High risk"}
            </Text>
            <Text style={styles.resultTitle}>
              {result.drug} + {result.food}
            </Text>
            <Text style={styles.resultMsg}>{result.message}</Text>
          </View>
        )}

        {/* SAFE FOODS */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.safeHeader}>
            <Text style={styles.safeTitle}>Suggested safer foods</Text>
            <View style={styles.topPill}>
              <Text style={styles.topPicksText}>Top picks</Text>
            </View>
          </View>

          {safeFoods.length === 0 ? (
            <View style={styles.safeEmpty}>
              <Text style={styles.safeEmptyText}>
                No suggestions yet. Run an interaction check to populate this
                panel.
              </Text>
            </View>
          ) : (
            <View style={styles.safePanel}>
              <ScrollView
                style={styles.safeScroll}
                contentContainerStyle={styles.safeScrollContent}
                showsVerticalScrollIndicator
                nestedScrollEnabled
                indicatorStyle={Platform.OS === "ios" ? "black" : undefined}
              >
                {safeFoods.map((f: any, idx: number) => {
                  const name = (f.Food || f.food || f.name || "").toString();
                  const energy = Number(f.energy || 0);
                  const protein = Number(f.protein || 0);
                  const carbs = Number(f.carbs || 0);
                  const fat = Number(f.fat || 0);

                  return (
                    <View key={`${name}-${idx}`} style={styles.safeCard}>
                      <View style={styles.safeCardTopRow}>
                        <View style={styles.safeLeft}>
                          <View style={styles.safeCheck}>
                            <Text style={styles.safeCheckText}>✓</Text>
                          </View>

                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text numberOfLines={1} style={styles.safeName}>
                              {name.toUpperCase()}
                            </Text>
                            <Text style={styles.safeSubtitle}>
                              Interaction-friendly
                            </Text>
                          </View>
                        </View>

                        <View style={styles.safeKcalPill}>
                          <Text style={styles.safeKcal}>
                            {energy.toFixed(0)}
                          </Text>
                          <Text style={styles.safeKcalLabel}>kcal</Text>
                        </View>
                      </View>

                      <View style={styles.miniMacros}>
                        <View style={styles.miniMacro}>
                          <Text style={styles.miniLabel}>Protein</Text>
                          <Text style={styles.miniValue}>
                            {protein.toFixed(1)}g
                          </Text>
                        </View>

                        <View style={styles.miniMacro}>
                          <Text style={styles.miniLabel}>Carbs</Text>
                          <Text style={styles.miniValue}>
                            {carbs.toFixed(1)}g
                          </Text>
                        </View>

                        <View style={styles.miniMacro}>
                          <Text style={styles.miniLabel}>Fat</Text>
                          <Text style={styles.miniValue}>
                            {fat.toFixed(1)}g
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={{ height: 16 }} />
        <Text style={styles.footer}>
          © {new Date().getFullYear()} PharmaLink • Always consult a qualified
          professional.
        </Text>
        <View style={{ height: 22 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7ff" },
  container: { padding: 16 },

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
  refreshBtn: {
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

  // dropdown toggle
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

  // inputs
  label: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "900",
    color: "#334155",
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontWeight: "700",
    color: "#0f172a",
  },

  dropdown: {
    marginTop: 8,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,23,42,0.06)",
  },
  optionTitle: { fontWeight: "900", color: "#0f172a" },
  optionSub: {
    marginTop: 2,
    fontWeight: "700",
    color: "#64748b",
    fontSize: 12,
  },
  alcohol: { marginTop: 4, color: "#e11d48", fontWeight: "900", fontSize: 12 },

  checkBtn: {
    marginTop: 14,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  checkText: { color: "#ffffff", fontWeight: "900", fontSize: 15 },

  errorBox: {
    backgroundColor: "rgba(244,63,94,0.10)",
    borderWidth: 1,
    borderColor: "rgba(244,63,94,0.25)",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  errorText: { color: "#9f1239", fontWeight: "900" },

  resultBox: { marginTop: 14, borderWidth: 1, borderRadius: 18, padding: 14 },
  resultBadge: { fontWeight: "900", fontSize: 12 },
  resultTitle: { marginTop: 8, fontWeight: "900", color: "#0f172a", fontSize: 15 },
  resultMsg: { marginTop: 8, color: "#334155", fontWeight: "700", lineHeight: 18 },

  // safe foods
  safeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  safeTitle: { fontSize: 13.5, fontWeight: "900", color: "#0f172a" },
  topPill: {
    backgroundColor: "rgba(37,99,235,0.10)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  topPicksText: { fontSize: 12, fontWeight: "900", color: "#1d4ed8" },

  safeEmpty: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 14,
  },
  safeEmptyText: { color: "#64748b", fontWeight: "700", lineHeight: 18 },

  safePanel: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 10,
  },
  safeScroll: { maxHeight: 320 },
  safeScrollContent: { paddingBottom: 6, gap: 10 },

  safeCard: {
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.20)",
    backgroundColor: "rgba(16,185,129,0.10)",
  },
  safeCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  safeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  safeCheck: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(16,185,129,0.18)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  safeCheckText: { fontWeight: "900", color: "#065f46", fontSize: 18 },

  safeName: { fontWeight: "900", color: "#064e3b", fontSize: 13.5 },
  safeSubtitle: { marginTop: 2, fontWeight: "800", color: "#64748b", fontSize: 12 },

  safeKcalPill: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    minWidth: 54,
  },
  safeKcal: { fontWeight: "900", color: "#0f172a", fontSize: 13 },
  safeKcalLabel: { marginTop: -2, fontWeight: "800", color: "#64748b", fontSize: 11 },

  miniMacros: { marginTop: 10, flexDirection: "row", gap: 8 },
  miniMacro: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
  },
  miniLabel: { fontWeight: "800", color: "#64748b", fontSize: 11 },
  miniValue: { marginTop: 2, fontWeight: "900", color: "#0f172a", fontSize: 12.5 },

  footer: {
    marginTop: 18,
    textAlign: "center",
    color: "#94a3b8",
    fontWeight: "700",
    fontSize: 11,
  },
});
