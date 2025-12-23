import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BrandHeader from "@/components/BrandHeader";
import { fetchDrugs, generateMealPlan } from "../utils/api";
import { getUser, User } from "../utils/auth";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type DrugItem = { index: number; name: string; contains?: string };

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

type AllergyKey =
  | "peanut"
  | "tree_nut"
  | "milk"
  | "egg"
  | "fish"
  | "shellfish"
  | "soy"
  | "wheat"
  | "sesame";

const ALLERGY_OPTIONS: { key: AllergyKey; label: string; icon: any }[] = [
  { key: "peanut", label: "Peanut", icon: "peanut" },
  { key: "tree_nut", label: "Tree nuts", icon: "pine-tree" },
  { key: "milk", label: "Milk / Dairy", icon: "cup-water" },
  { key: "egg", label: "Egg", icon: "egg" },
  { key: "fish", label: "Fish", icon: "fish" },
  { key: "shellfish", label: "Shellfish", icon: "shrimp" },
  { key: "soy", label: "Soy", icon: "leaf" },
  { key: "wheat", label: "Wheat / Gluten", icon: "grain" },
  { key: "sesame", label: "Sesame", icon: "seed" },
];

const PROFILE_LOG_KEY = "pharmlink_profile_log_v1";

type ProfileLogEntry = {
  id: string;
  timestamp: string; // ISO date time
  drugs: { name: string; index: number }[];
  allergies: string[];
};

async function appendProfileLog(entry: ProfileLogEntry) {
  const raw = await AsyncStorage.getItem(PROFILE_LOG_KEY);
  const current = raw ? JSON.parse(raw) : [];
  const list = Array.isArray(current) ? current : [];
  const updated = [entry, ...list];
  await AsyncStorage.setItem(PROFILE_LOG_KEY, JSON.stringify(updated));
}

const STORAGE_KEYS = {
  drugs: "pharmlink_user_drugs",
  allergies: "pharmlink_user_allergies",
  mealPlanLatestId: "pharmlink_mealplan_latest_id",
  mealPlanByIdPrefix: "pharmlink_mealplan_",
  profileSnapshots: "pharmlink_profile_snapshots",
};

type ProfileSnapshot = {
  id: string;
  timestamp: string; // ISO
  drugs: { name: string; index: number }[];
  allergies: string[];
  preferences: {
    noAlcohol: boolean;
    vegetarian: boolean;
    caloriesPerDay: number;
    days: number;
    mealsPerDay: number;
  };
};

const clampInt = (val: string, fallback: number, min: number, max: number) => {
  const n = Math.floor(Number(val));
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

const emptyAllergies = (): Record<AllergyKey, boolean> => ({
  peanut: false,
  tree_nut: false,
  milk: false,
  egg: false,
  fish: false,
  shellfish: false,
  soy: false,
  wheat: false,
  sesame: false,
});

function StepperInput({
  label,
  value,
  min = 1,
  max = 10,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const increase = () => {
    if (value < max) onChange(value + 1);
  };

  const decrease = () => {
    if (value > min) onChange(value - 1);
  };

  return (
    <View style={stepper.labelWrap}>
      <Text style={stepper.label}>{label}</Text>

      <View style={stepper.box}>
        <Pressable onPress={decrease} style={({ pressed }) => [stepper.btn, pressed && { opacity: 0.6 }]}>
          <Text style={stepper.btnText}>−</Text>
        </Pressable>

        <View style={stepper.valueBox}>
          <Text style={stepper.value}>{value}</Text>
        </View>

        <Pressable onPress={increase} style={({ pressed }) => [stepper.btn, pressed && { opacity: 0.6 }]}>
          <Text style={stepper.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const stepper = StyleSheet.create({
  labelWrap: { flex: 1 },
  label: { marginBottom: 6, fontSize: 12, fontWeight: "900", color: "#334155" },
  box: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.15)",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  btn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37,99,235,0.08)",
  },
  btnText: { fontSize: 20, fontWeight: "900", color: "#2563eb", marginTop: -2 },
  valueBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
});

export default function MealPlanScreen() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    (async () => {
      const u = await getUser();
      setUser(u);
    })();
  }, []);

  const [drugQuery, setDrugQuery] = useState("");
  const [drugOptions, setDrugOptions] = useState<DrugItem[]>([]);
  const [selectedDrugs, setSelectedDrugs] = useState<DrugItem[]>([]);
  const [drugLoading, setDrugLoading] = useState(false);

  const [caloriesPerDay, setCaloriesPerDay] = useState(2000);
  const [noAlcohol, setNoAlcohol] = useState(true);
  const [vegetarian, setVegetarian] = useState(false);
  const [days, setDays] = useState(3);
  const [mealsPerDay, setMealsPerDay] = useState(3);

  const [allergies, setAllergies] = useState<Record<AllergyKey, boolean>>(emptyAllergies);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // reset when screen focused
  useFocusEffect(
    useCallback(() => {
      setDrugQuery("");
      setDrugOptions([]);
      setSelectedDrugs([]);
      setError("");
      setLoading(false);

      (async () => {
        try {
          const allergiesRaw = await AsyncStorage.getItem(STORAGE_KEYS.allergies);
          if (allergiesRaw) {
            const arr = JSON.parse(allergiesRaw);
            if (Array.isArray(arr)) {
              setAllergies((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((k) => ((next as any)[k] = false));
                arr.forEach((k: any) => {
                  if (k in next) (next as any)[k] = true;
                });
                return next;
              });
            } else {
              setAllergies(emptyAllergies());
            }
          } else {
            setAllergies(emptyAllergies());
          }
        } catch {
          setAllergies(emptyAllergies());
        }
      })();

      return () => {};
    }, [])
  );

  const selectedAllergies = useMemo(
    () =>
      Object.entries(allergies)
        .filter(([, v]) => v)
        .map(([k]) => k) as AllergyKey[],
    [allergies]
  );

  const searchDrugs = useCallback(async (q: string) => {
    setDrugQuery(q);
    setError("");

    if (!q.trim()) {
      setDrugOptions([]);
      return;
    }

    try {
      setDrugLoading(true);
      const res = await fetchDrugs(q.trim());
      setDrugOptions(res || []);
    } catch {
      setDrugOptions([]);
    } finally {
      setDrugLoading(false);
    }
  }, []);

  const addDrug = (d: DrugItem) => {
    setSelectedDrugs((prev) => {
      if (prev.some((x) => x.index === d.index)) return prev;
      return [...prev, d];
    });
    setDrugQuery("");
    setDrugOptions([]);
  };

  const removeDrug = (index: number) => {
    setSelectedDrugs((prev) => prev.filter((d) => d.index !== index));
  };

  const onGenerate = async () => {
    setError("");

    if (selectedDrugs.length === 0) {
      setError("Please add at least one active medication.");
      return;
    }

    const dietary: string[] = [];
    if (noAlcohol) dietary.push("no_alcohol");
    if (vegetarian) dietary.push("vegetarian");

    const payload = {
      drug_indices: selectedDrugs.map((d) => d.index),
      dietary_restrictions: dietary,
      allergies: selectedAllergies,
      days,
      meals_per_day: mealsPerDay,
      calories_per_day: caloriesPerDay,
    };

    try {
      setLoading(true);

      const res = (await generateMealPlan(payload)) as MealPlanResponse;

      const id = `${Date.now()}-${Math.random()}`;
      await AsyncStorage.setItem(`${STORAGE_KEYS.mealPlanByIdPrefix}${id}`, JSON.stringify(res));
      await AsyncStorage.setItem(STORAGE_KEYS.mealPlanLatestId, id);

      await AsyncStorage.setItem(STORAGE_KEYS.allergies, JSON.stringify(selectedAllergies));

      const snapshot: ProfileSnapshot = {
        id,
        timestamp: new Date().toISOString(),
        drugs: selectedDrugs.map((d) => ({ name: d.name, index: d.index })),
        allergies: selectedAllergies,
        preferences: { noAlcohol, vegetarian, caloriesPerDay, days, mealsPerDay },
      };

      const entry: ProfileLogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        drugs: selectedDrugs.map((d) => ({ name: d.name, index: d.index })),
        allergies: selectedAllergies,
      };
      await appendProfileLog(entry);

      const raw = await AsyncStorage.getItem(STORAGE_KEYS.profileSnapshots);
      const current = raw ? JSON.parse(raw) : [];
      const updated = [snapshot, ...(Array.isArray(current) ? current : [])];
      await AsyncStorage.setItem(STORAGE_KEYS.profileSnapshots, JSON.stringify(updated));

      router.push({ pathname: "/meal-plan-result", params: { id } } as any);
    } catch (e: any) {
      setError(e?.message || "Failed to generate meal plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BrandHeader user={user} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.heroBackBtn, pressed && { opacity: 0.8 }]} hitSlop={12}>
              <MaterialCommunityIcons name="chevron-left" size={22} color="#2563eb" />
            </Pressable>

            <View style={styles.heroTopSpacer} />
          </View>

          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#2563eb" />
            </View>

            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Generate Meal Plan</Text>
              <Text style={styles.heroDesc}>
                Create interaction-aware meals based on active medications, calories, preferences, and allergies.
              </Text>
            </View>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Step 1 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>1 — Active medications</Text>
                <Text style={styles.stepDesc}>
                  Your meal plan respects food–drug interactions for these medicines.
                </Text>
              </View>
            </View>

            <View style={styles.cardHeaderIcon}>
              <MaterialCommunityIcons name="pill" size={18} color="#2563eb" />
            </View>
          </View>

          <Text style={styles.label}>Add a drug</Text>
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              value={drugQuery}
              onChangeText={searchDrugs}
              placeholder="Type drug name…"
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
            />
          </View>

          {drugLoading ? <Text style={styles.mutedSmall}>Searching…</Text> : null}

          {drugOptions.length > 0 && (
            <View style={styles.dropdown}>
              {drugOptions.slice(0, 7).map((d) => (
                <Pressable
                  key={d.index}
                  onPress={() => addDrug(d)}
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                >
                  <View style={styles.optionRow}>
                    <View style={styles.optionIcon}>
                      <MaterialCommunityIcons name="pill" size={16} color="#1d4ed8" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.optionTitle}>{d.name}</Text>
                      {!!d.contains && <Text style={styles.optionSub}>{d.contains}</Text>}
                    </View>
                    <MaterialCommunityIcons name="plus" size={18} color="#2563eb" />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <View style={{ marginTop: 10, gap: 8 }}>
            {selectedDrugs.length === 0 ? (
              <View style={styles.emptyDrugRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#64748b" />
                <Text style={styles.emptyDrugText}>No drugs added yet. Add at least one.</Text>
              </View>
            ) : (
              selectedDrugs.map((d) => (
                <View key={d.index} style={styles.selectedRow}>
                  <View style={styles.selectedLeft}>
                    <View style={styles.selectedDot} />
                    <Text style={styles.selectedName} numberOfLines={1}>
                      {d.name}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeDrug(d.index)} style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.85 }]}>
                    <MaterialCommunityIcons name="close" size={16} color="#e11d48" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Step 2 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>2 — Preferences & allergies</Text>
                <Text style={styles.stepDesc}>Customize calories, diet and allergens for safer meals.</Text>
              </View>
            </View>

            <View style={styles.cardHeaderIcon}>
              <MaterialCommunityIcons name="tune-variant" size={18} color="#2563eb" />
            </View>
          </View>

          <Text style={styles.label}>Calories per day</Text>
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="fire" size={18} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              value={String(caloriesPerDay)}
              onChangeText={(t) => setCaloriesPerDay(clampInt(t, caloriesPerDay, 100, 10000))}
              keyboardType="number-pad"
              style={styles.searchInput}
            />
            <Text style={styles.unitText}>kcal</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>General preferences</Text>

          <ToggleRow label="No alcohol" icon="glass-cocktail-off" value={noAlcohol} onToggle={() => setNoAlcohol((s) => !s)} />
          <ToggleRow label="Vegetarian" icon="leaf" value={vegetarian} onToggle={() => setVegetarian((s) => !s)} />

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Allergies</Text>
          <Text style={styles.sectionDesc}>Foods containing these allergens will be excluded.</Text>

          <View style={styles.allergyGrid}>
            {ALLERGY_OPTIONS.map((a) => (
              <Pressable
                key={a.key}
                onPress={() => setAllergies((prev) => ({ ...prev, [a.key]: !prev[a.key] }))}
                style={({ pressed }) => [styles.allergyPill, allergies[a.key] && styles.allergyPillOn, pressed && { opacity: 0.9 }]}
              >
                <MaterialCommunityIcons name={a.icon} size={16} color={allergies[a.key] ? "#991b1b" : "#0f172a"} />
                <Text style={[styles.allergyText, allergies[a.key] && styles.allergyTextOn]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.rowInputs}>
            <StepperInput label="Days" value={days} min={1} max={7} onChange={setDays} />
            <StepperInput label="Meals / day" value={mealsPerDay} min={1} max={3} onChange={setMealsPerDay} />
          </View>

          <Pressable
            onPress={onGenerate}
            disabled={loading}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }, loading && { opacity: 0.6 }]}
          >
            <MaterialCommunityIcons name="magic-staff" size={18} color="#ffffff" />
            <Text style={styles.primaryText}>{loading ? "Generating…" : "Generate Meal Plan"}</Text>
          </Pressable>

          {loading && (
            <View style={{ marginTop: 10 }}>
              <ActivityIndicator />
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} PharmaLink • Always consult a qualified healthcare professional.
        </Text>
        <View style={{ height: 18 }} />
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  label,
  icon,
  value,
  onToggle,
}: {
  label: string;
  icon: any;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.92 }]}>
      <View style={styles.toggleLeft}>
        <View style={styles.toggleIcon}>
          <MaterialCommunityIcons name={icon} size={18} color="#2563eb" />
        </View>
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>

      <View style={[styles.checkbox, value && styles.checkboxOn]}>
        <Text style={[styles.checkboxTick, value && { opacity: 1 }]}>✓</Text>
      </View>
    </Pressable>
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

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: -20,
  },
  heroBackBtn: {
    width: 40,
    height: 40,

  },
  heroTopSpacer: { width: 40, height: 40 },

  heroHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  heroTitle: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  heroDesc: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    lineHeight: 18,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 14,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  cardHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.10)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },

  stepTitle: { fontSize: 14, fontWeight: "900", color: "#0f172a" },
  stepDesc: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    lineHeight: 17,
  },

  label: { marginTop: 10, marginBottom: 8, fontSize: 12, fontWeight: "900", color: "#334155" },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontWeight: "800",
    color: "#0f172a",
    paddingVertical: 2,
  },
  unitText: { fontWeight: "900", color: "#64748b" },

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
  optionPressed: { backgroundColor: "rgba(37,99,235,0.06)" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  optionIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: "rgba(37,99,235,0.10)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontWeight: "900", color: "#0f172a" },
  optionSub: { marginTop: 2, fontWeight: "700", color: "#64748b", fontSize: 12 },

  mutedSmall: { marginTop: 8, color: "#64748b", fontWeight: "700", fontSize: 12 },

  emptyDrugRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  emptyDrugText: { color: "#64748b", fontWeight: "700", fontSize: 12 },

  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "rgba(2,6,23,0.03)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  selectedDot: { width: 10, height: 10, borderRadius: 99, backgroundColor: "#2563eb", opacity: 0.9 },
  selectedName: { flex: 1, color: "#0f172a", fontWeight: "900" },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.10)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  divider: { height: 1, backgroundColor: "rgba(15,23,42,0.08)", marginVertical: 12 },

  sectionTitle: { fontSize: 13, fontWeight: "900", color: "#0f172a" },
  sectionDesc: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#64748b", lineHeight: 17 },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    backgroundColor: "rgba(2,6,23,0.02)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.10)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLabel: { fontWeight: "900", color: "#0f172a" },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.20)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  checkboxOn: { backgroundColor: "rgba(37,99,235,0.12)", borderColor: "rgba(37,99,235,0.35)" },
  checkboxTick: { fontWeight: "900", color: "#1d4ed8", opacity: 0.0 },

  allergyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  allergyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(148,163,184,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  allergyPillOn: { borderColor: "rgba(239,68,68,0.40)", backgroundColor: "rgba(239,68,68,0.12)" },
  allergyText: { fontWeight: "900", color: "#0f172a", fontSize: 12 },
  allergyTextOn: { color: "#991b1b" },

  rowInputs: { flexDirection: "row", gap: 10 },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexDirection: "row",
  },
  primaryText: { color: "#ffffff", fontWeight: "900", fontSize: 15 },

  errorBox: {
    backgroundColor: "rgba(239,68,68,0.10)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  errorText: { color: "#9f1239", fontWeight: "900" },

  footer: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 11,
    color: "#64748b",
    fontWeight: "700",
  },
});
