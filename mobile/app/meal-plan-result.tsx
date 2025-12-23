// app/meal-plan-result.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import BrandHeader from "@/components/BrandHeader";
import { getUser, User } from "../utils/auth";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type MealPlanItem = {
  food: string;
  energy?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
};
type MealPlanMeal = { name: string; items: MealPlanItem[] };
type MealPlanDay = { day: number; meals: MealPlanMeal[] };
type MealPlanResponse = { days: MealPlanDay[] };

const STORAGE_KEYS = {
  mealPlanByIdPrefix: "pharmlink_mealplan_",
};

const aggMeal = (meal: MealPlanMeal) =>
  (meal.items || []).reduce(
    (acc, item) => ({
      energy: acc.energy + (item.energy ?? 0),
      protein: acc.protein + (item.protein ?? 0),
      fat: acc.fat + (item.fat ?? 0),
      carbs: acc.carbs + (item.carbs ?? 0),
    }),
    { energy: 0, protein: 0, fat: 0, carbs: 0 }
  );

const aggDay = (day: MealPlanDay) =>
  (day.meals || []).reduce(
    (acc, meal) => {
      const m = aggMeal(meal);
      return {
        energy: acc.energy + m.energy,
        protein: acc.protein + m.protein,
        fat: acc.fat + m.fat,
        carbs: acc.carbs + m.carbs,
      };
    },
    { energy: 0, protein: 0, fat: 0, carbs: 0 }
  );

export default function MealPlanResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    (async () => {
      const u = await getUser();
      setUser(u);
    })();
  }, []);

  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [activeDay, setActiveDay] = useState<number>(-1);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      if (!id) {
        setMealPlan(null);
        return;
      }
      const raw = await AsyncStorage.getItem(`${STORAGE_KEYS.mealPlanByIdPrefix}${id}`);
      if (!raw) {
        setMealPlan(null);
        return;
      }
      const parsed = JSON.parse(raw);
      setMealPlan(parsed);
      setActiveDay(1);
    } catch {
      setMealPlan(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const daysList = useMemo(() => mealPlan?.days || [], [mealPlan]);

  const visibleDays = useMemo(() => {
    if (!daysList.length) return [];
    if (activeDay === -1) return daysList;
    return daysList.filter((d) => d.day === activeDay);
  }, [daysList, activeDay]);

  return (
    <View style={styles.screen}>
      <BrandHeader user={user} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            {/* Left */}
            <View style={styles.heroLeft}>
              <View style={styles.heroIcon}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#2563eb" />
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroTitle}>Meal Plan Results</Text>
                <Text style={styles.heroDesc}>
                  Browse your generated meal plan by day and meal.
                </Text>
              </View>
            </View>

            {/* Right: Refresh */}
            <Pressable
              onPress={loadPlan}
              style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
            >
              <MaterialCommunityIcons name="refresh" size={22} color="#2563eb" />
            </Pressable>
          </View>

          {/* Back pill */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backPill, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color="#2563eb" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading meal plan…</Text>
          </View>
        ) : !mealPlan ? (
          <View style={styles.card}>
            <Text style={styles.errTitle}>No meal plan found</Text>
            <Text style={styles.muted}>Please generate a new meal plan first.</Text>

            <Pressable
              onPress={() => router.replace("/meal-plan")}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.primaryText}>Go to Meal Plan</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Day selector */}
            <View style={styles.card}>
              <View style={styles.dayHeader}>
                <Text style={styles.sectionTitle}>Quick Day View</Text>

                <Pressable
                  onPress={() => setActiveDay(-1)}
                  style={({ pressed }) => [
                    styles.dayPill,
                    activeDay === -1 && styles.dayPillOnBlue,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Text style={[styles.dayPillText, activeDay === -1 && styles.dayPillTextOn]}>
                    All Days
                  </Text>
                </Pressable>
              </View>

              <View style={styles.dayWrap}>
                {daysList.map((d) => (
                  <Pressable
                    key={d.day}
                    onPress={() => setActiveDay(d.day)}
                    style={({ pressed }) => [
                      styles.dayPill,
                      activeDay === d.day && styles.dayPillOnGreen,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayPillText,
                        activeDay === d.day && styles.dayPillTextOn,
                      ]}
                    >
                      Day {d.day}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Days */}
            {visibleDays.map((day) => {
              const totals = aggDay(day);
              return (
                <View key={day.day} style={styles.card}>
                  <Text style={styles.dayTitle}>DAY {day.day}</Text>

                  <View style={styles.macroGrid}>
                    <Macro label="Calories" value={`${totals.energy.toFixed(0)}`} />
                    <Macro label="Protein" value={`${totals.protein.toFixed(1)}g`} />
                    <Macro label="Fat" value={`${totals.fat.toFixed(1)}g`} />
                    <Macro label="Carbs" value={`${totals.carbs.toFixed(1)}g`} />
                  </View>

                  <View style={{ gap: 14, marginTop: 10 }}>
                    {day.meals.map((meal, idx) => {
                      const m = aggMeal(meal);
                      return (
                        <View key={`${day.day}-${idx}`} style={styles.mealBox}>
                          <View style={styles.mealHeader}>
                            <Text style={styles.mealTitle}>{meal.name.toUpperCase()}</Text>
                            <View style={styles.mealBadge}>
                              <Text style={styles.mealBadgeText}>{m.energy.toFixed(0)} kcal</Text>
                            </View>
                          </View>

                          <View style={styles.macroRowSmall}>
                            <Text style={styles.macroSmall}>{m.protein.toFixed(1)}g protein</Text>
                            <Text style={styles.macroSmall}>{m.fat.toFixed(1)}g fat</Text>
                            <Text style={styles.macroSmall}>{m.carbs.toFixed(1)}g carbs</Text>
                          </View>

                          <View style={{ gap: 8, marginTop: 10 }}>
                            {(meal.items || []).map((item, i) => (
                              <View key={i} style={styles.itemBox}>
                                <Text style={styles.itemFood}>{item.food}</Text>
                                <Text style={styles.itemMeta}>
                                  {Math.round(item.energy ?? 0)} kcal • {(item.protein ?? 0).toFixed(1)}g P •{" "}
                                  {(item.fat ?? 0).toFixed(1)}g F • {(item.carbs ?? 0).toFixed(1)}g C
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.footer}>
          © {new Date().getFullYear()} PharmaLink • Always consult a qualified healthcare professional.
        </Text>

        <View style={{ height: 18 }} />
      </ScrollView>
    </View>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroBox}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#eff6ff" },
  container: { padding: 14, paddingBottom: 20 },

  hero: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 16,
    marginBottom: 12,
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
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.12)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  heroDesc: { marginTop: 3, fontSize: 13, fontWeight: "700", color: "#64748b", lineHeight: 18 },

  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.12)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  backPill: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.10)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.20)",
  },
  backText: { color: "#2563eb", fontWeight: "900" },

  center: { paddingVertical: 20, alignItems: "center" },
  muted: { marginTop: 8, color: "#64748b", fontWeight: "700" },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 14,
    marginBottom: 12,
  },

  errTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a" },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryText: { color: "white", fontWeight: "900" },

  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: "#0f172a" },
  dayWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },

  dayPill: {
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  dayPillOnBlue: {
    borderColor: "rgba(37,99,235,0.45)",
    backgroundColor: "rgba(37,99,235,0.10)",
  },
  dayPillOnGreen: {
    borderColor: "rgba(16,185,129,0.45)",
    backgroundColor: "rgba(16,185,129,0.10)",
  },
  dayPillText: { fontWeight: "900", color: "#0f172a", fontSize: 12 },
  dayPillTextOn: { color: "#0f172a" },

  dayTitle: { fontSize: 18, fontWeight: "900", color: "#0f172a" },

  macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  macroBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    borderRadius: 14,
    padding: 10,
    backgroundColor: "rgba(2,6,23,0.02)",
  },
  macroLabel: { color: "#64748b", fontWeight: "800", fontSize: 11 },
  macroValue: { marginTop: 4, color: "#0f172a", fontWeight: "900", fontSize: 14 },

  mealBox: { borderTopWidth: 1, borderTopColor: "rgba(15,23,42,0.08)", paddingTop: 12 },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  mealTitle: { fontWeight: "900", color: "#0f172a", letterSpacing: 0.5 },
  mealBadge: {
    backgroundColor: "rgba(37,99,235,0.10)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  mealBadgeText: { fontWeight: "900", color: "#1d4ed8", fontSize: 11.5 },

  macroRowSmall: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  macroSmall: { fontSize: 11.5, fontWeight: "800", color: "#475569" },

  itemBox: {
    backgroundColor: "rgba(2,6,23,0.03)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemFood: { fontWeight: "900", color: "#0f172a" },
  itemMeta: { marginTop: 4, fontWeight: "700", color: "#64748b", fontSize: 11.5 },

  footer: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 11,
    color: "#64748b",
    fontWeight: "700",
  },
});
