import React, { useMemo, useState, useEffect, useRef } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import BrandHeader from "@/components/BrandHeader";
import { fetchDrugs, fetchFoods, checkFoodDrugRisk, fetchSafeFoods } from "../utils/api";
import { getUser, User } from "../utils/auth";

type DrugItem = { index: number; name: string; contains?: string };
type FoodItem = { name?: string; Food?: string; is_alcohol?: number };

const riskStyle = (risk: number) => {
  if (risk === 0) return { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", text: "#064e3b" };
  if (risk === 1) return { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", text: "#78350f" };
  return { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.25)", text: "#881337" };
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
    if (!q.trim()) return setDrugOptions([]);
    const res = await fetchDrugs(q.trim());
    setDrugOptions(res);
  };

  const searchFood = async (q: string) => {
    setFoodQuery(q);
    setSelectedFood("");
    setResult(null);
    if (!q.trim()) return setFoodOptions([]);
    const res = await fetchFoods(q.trim());
    setFoodOptions(res);
  };

  const onCheck = async () => {
    setError("");
    setResult(null);
    setSafeFoods([]);

    if (!selectedDrug?.index || !selectedFoodLabel.trim()) {
      setError("Please select both a drug and a food item.");
      return;
    }

    try {
      setLoading(true);
      const res = await checkFoodDrugRisk(selectedDrug.index, selectedFoodLabel.trim());
      setResult(res);

      const safe = await fetchSafeFoods(selectedDrug.index, 20);
      const nonAlcohol = (safe?.foods || []).filter((f: any) => f.is_alcohol !== 1 && f.is_alcohol !== true);
      setSafeFoods(nonAlcohol);
    } catch (e) {
      setError("Error checking interaction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const go = (path: string) => {
    setMenuOpen(false);
    router.push(path as any);
  };

  return (
    <View style={styles.screen}>
      <BrandHeader user={user} />
      
        <Pressable onPress={menuOpen ? closeMenu : openMenu} style={styles.dropBtn}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <View style={styles.chevron} />
          </Animated.View>
        </Pressable>
      

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.menuCard}>
                <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuPressed]} onPress={() => { closeMenu(); router.push("/(tabs)" as any); }}>
                  <Text style={styles.menuText}>Dashboard</Text>
                </Pressable>
      
                <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuPressed]} onPress={() => { closeMenu(); router.push("/meal-plan" as any); }}>
                  <Text style={styles.menuText}>Meal Plan</Text>
                </Pressable>
      
                <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuPressed]} onPress={() => { closeMenu(); router.push("/history" as any); }}>
                  <Text style={styles.menuText}>History</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>


      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Food–Drug Interaction Check</Text>
          <Text style={styles.heroDesc}>Search and select both inputs to evaluate potential interactions.</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Drug */}
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
                {d.contains ? <Text style={styles.optionSub}>{d.contains}</Text> : null}
              </Pressable>
            ))}
          </View>
        )}

        {/* Food */}
        <Text style={[styles.label, { marginTop: 14 }]}>Food</Text>
        <TextInput
          value={foodQuery}
          onChangeText={searchFood}
          placeholder="Type food name..."
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        {foodOptions.length > 0 && (
          <View style={styles.dropdown}>
            {foodOptions.slice(0, 7).map((f, idx) => {
              const name = (f.name || f.Food || "").toString();
              return (
                <Pressable
                  key={name + idx}
                  onPress={() => {
                    setSelectedFood(name);
                    setFoodQuery(name);
                    setFoodOptions([]);
                  }}
                  style={styles.option}
                >
                  <Text style={styles.optionTitle}>{name}</Text>
                  {(f as any).is_alcohol === 1 ? <Text style={styles.alcohol}>Alcohol</Text> : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={onCheck}
          disabled={loading}
          style={({ pressed }) => [styles.checkBtn, pressed && { opacity: 0.9 }, loading && { opacity: 0.6 }]}
        >
          <Text style={styles.checkText}>{loading ? "Checking..." : "Check interaction"}</Text>
        </Pressable>

        {/* Result */}
        {result && (
          <View style={[styles.resultBox, { backgroundColor: riskStyle(result.risk).bg, borderColor: riskStyle(result.risk).border }]}>
            <Text style={[styles.resultBadge, { color: riskStyle(result.risk).text }]}>
              {result.risk === 0 ? "Safe" : result.risk === 1 ? "Moderate risk" : "High risk"}
            </Text>
            <Text style={styles.resultTitle}>
              {result.drug} + {result.food}
            </Text>
            <Text style={styles.resultMsg}>{result.message}</Text>
          </View>
        )}

        {/* Safe foods */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.safeHeader}>
            <Text style={styles.safeTitle}>Suggested safer foods</Text>
            <Text style={styles.topPicks}>Top picks</Text>
          </View>

          {safeFoods.length === 0 ? (
            <View style={styles.safeEmpty}>
              <Text style={styles.safeEmptyText}>No suggestions yet. Run an interaction check to populate this panel.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {safeFoods.map((f: any) => {
                const name = f.Food || f.food || f.name;
                return (
                  <View key={name} style={styles.safeCard}>
                    <View style={styles.safeRow}>
                      <Text style={styles.safeName}>{String(name).toUpperCase()}</Text>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.kcal}>{Number(f.energy || 0).toFixed(1)}</Text>
                        <Text style={styles.kcalLabel}>kcal</Text>
                      </View>
                    </View>

                    <Text style={styles.macro}>
                      Protein: <Text style={styles.bold}>{Number(f.protein || 0).toFixed(2)}g</Text> • Carbs:{" "}
                      <Text style={styles.bold}>{Number(f.carbs || 0).toFixed(2)}g</Text> • Fat:{" "}
                      <Text style={styles.bold}>{Number(f.fat || 0).toFixed(2)}g</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 16 }} />
        <Text style={styles.footer}>© {new Date().getFullYear()} PharmaLink • Always consult a qualified professional.</Text>
        <View style={{ height: 22 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7ff" },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,23,42,0.08)",
  },

  dropBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 14,
},

dropBtnText: {
  fontWeight: "900",
  color: "#0f172a",
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

  appsBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsGrid: {
    width: 18,
    height: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignContent: "space-between",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#0f172a",
    opacity: 0.75,
  },

  backBtn: {
    width: 70,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.10)",
    alignItems: "center",
  },
  backText: { color: "#2563eb", fontWeight: "900" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.18)",
    alignItems: "flex-start",
    paddingTop: 118, // below BrandHeader + topRow
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
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  menuPressed: { backgroundColor: "rgba(148,163,184,0.12)" },
  menuIcon: { width: 22, textAlign: "center", fontSize: 16 },
  menuText: { fontSize: 14.5, fontWeight: "900", color: "#0f172a" },

  container: { padding: 16 },

  hero: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 16,
    marginBottom: 12,
  },
  heroTitle: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  heroDesc: { marginTop: 6, fontSize: 13.5, fontWeight: "700", color: "#64748b", lineHeight: 18 },

  label: { marginTop: 8, marginBottom: 8, fontSize: 12, fontWeight: "900", color: "#334155" },
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
  option: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(15,23,42,0.06)" },
  optionTitle: { fontWeight: "900", color: "#0f172a" },
  optionSub: { marginTop: 2, fontWeight: "700", color: "#64748b", fontSize: 12 },
  alcohol: { marginTop: 4, color: "#e11d48", fontWeight: "900", fontSize: 12 },

  checkBtn: { marginTop: 14, backgroundColor: "#2563eb", paddingVertical: 14, borderRadius: 16, alignItems: "center" },
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

  safeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  safeTitle: { fontSize: 13, fontWeight: "900", color: "#0f172a" },
  topPicks: {
    fontSize: 12,
    fontWeight: "900",
    color: "#475569",
    backgroundColor: "rgba(148,163,184,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  safeEmpty: { backgroundColor: "#ffffff", borderRadius: 18, borderWidth: 1, borderColor: "rgba(15,23,42,0.08)", padding: 14 },
  safeEmptyText: { color: "#64748b", fontWeight: "700", lineHeight: 18 },

  safeCard: { backgroundColor: "rgba(16,185,129,0.10)", borderWidth: 1, borderColor: "rgba(16,185,129,0.22)", borderRadius: 18, padding: 14 },
  safeRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  safeName: { flex: 1, fontWeight: "900", color: "#064e3b" },
  kcal: { fontWeight: "900", color: "#0f172a" },
  kcalLabel: { marginTop: -2, fontWeight: "800", color: "#64748b", fontSize: 11 },
  macro: { marginTop: 8, fontWeight: "700", color: "#0f172a", fontSize: 12.5 },
  bold: { fontWeight: "900" },

  footer: { marginTop: 16, textAlign: "center", color: "#94a3b8", fontWeight: "700", fontSize: 11 },
});
