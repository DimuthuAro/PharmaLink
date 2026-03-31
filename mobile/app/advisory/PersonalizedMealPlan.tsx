import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { advisoryRequest, ML_API } from "../../utils/api";
import BrandLogo from "../../components/BrandLogo";
import { searchDrugs } from "../../services/catalogApi";

// ─────────────────────────── Types ───────────────────────────
type User = { id?: string; name?: string; email?: string; role?: string; avatar?: string };
type AuthContextType = { user: User | null; token: string; isAuthenticated: boolean; logout: () => Promise<void>; loading: boolean };
type DrugItem = { index?: number; name?: string; is_alcohol?: number | boolean };
type FoodSignal = { is_alcohol?: number };
type PerDrugExplanation = { explanation?: { food_signals?: FoodSignal; explanation_points?: string[] } };
type FoodItemType = {
  food?: string; quantity?: string; energy?: number; food_type?: string; image?: string;
  severity?: number; allergens_detected?: string[];
  explanation?: { food_signals?: FoodSignal; explanation_points?: string[]; per_drug?: PerDrugExplanation[] };
};
type MealType = {
  name?: string; target_kcal?: number; estimated_kcal?: number;
  main?: FoodItemType; protein?: FoodItemType; vegetable?: FoodItemType;
};
type DayPlanType = { day: number; meals: MealType[] };
type MealPlanResultType = { drug_names?: string[]; days?: DayPlanType[] };

// ─────────────────────────── Drawer items ───────────────────────────
const MENU_ITEMS = [
  { label: "Dashboard",             icon: "home-outline"             as const, path: "/dashboard",                    replace: true  },
  { label: "Food Drug Interaction", icon: "shield-checkmark-outline" as const, path: "/advisory/FoodDrugInteraction", replace: true  },
  { label: "Meal Plan Advisor",     icon: "clipboard-outline"        as const, path: "/advisory/MealPlan",            replace: true  },
  { label: "Drug Image Analyzer",   icon: "image-outline"            as const, path: "/advisory/DrugImagePredict",          replace: false },
  { label: "Drug Recommender",      icon: "sparkles-outline"         as const, path: "/advisory/symptom-drug",        replace: false },
  { label: "History",               icon: "time-outline"             as const, path: "/advisory/History",                      replace: false },
];

// ─────────────────────────── Helpers ───────────────────────────
function uniq(arr: string[]) { return Array.from(new Set((arr || []).map((x) => String(x).trim()).filter(Boolean))); }
function toTitleCase(s: string) { return String(s || "").trim().toLowerCase().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" "); }
function prettyName(n?: string) { return toTitleCase(n || "").replace(/\bKcal\b/g, "kcal").replace(/\bMg\b/g, "mg").replace(/\bG\b/g, "g"); }
function resolveImg(img?: string) { const v = String(img || "").trim(); if (!v) return ""; if (v.startsWith("http")) return v; return v.startsWith("/") ? `${ML_API}${v}` : `${ML_API}/${v}`; }
function isAlcohol(f?: FoodItemType) {
  const name = String(f?.food || "").toLowerCase();
  if (Array.isArray(f?.explanation?.per_drug) && f!.explanation!.per_drug!.some((d) => Number(d?.explanation?.food_signals?.is_alcohol) === 1)) return true;
  if (Number(f?.explanation?.food_signals?.is_alcohol) === 1) return true;
  return ["wine","beer","vodka","whisky","whiskey","rum","arrack","gin","brandy"].some((k) => name.includes(k));
}
function sevMeta(sev?: number) {
  const n = Number(sev ?? 0);
  if (n === 2) return { label: "High Risk", bg: "#FEF2F2", border: "#FCA5A5", color: "#991B1B", dot: "#EF4444" };
  if (n === 1) return { label: "Moderate",  bg: "#FFFBEB", border: "#FCD34D", color: "#92400E", dot: "#F59E0B" };
  return { label: "Safe", bg: "#ECFDF5", border: "#86EFAC", color: "#065F46", dot: "#10B981" };
}

// ─────────────────────────── AutoComplete ───────────────────────────
type ACProps<T> = { label: string; placeholder: string; value: string; onChangeValue: (v: string) => void; fetcher: (q: string) => Promise<T[] | any>; onSelect: (i: T) => void; getLabel: (i: T) => string };
function AutoComplete<T extends { is_alcohol?: number | boolean }>({ label, placeholder, value, onChangeValue, fetcher, onSelect, getLabel }: ACProps<T>) {
  const [opts, setOpts] = useState<T[]>([]); const [show, setShow] = useState(false); const [load, setLoad] = useState(false);
  useEffect(() => { if (!value.trim()) { setOpts([]); setShow(false); } }, [value]);
  const search = async (v: string) => {
    onChangeValue(v); if (!v.trim()) { setOpts([]); setShow(false); return; } setShow(true);
    try { setLoad(true); const r = await fetcher(v); setOpts(Array.isArray(r) ? r : r?.drugs || r?.foods || []); } catch { setOpts([]); } finally { setLoad(false); }
  };
  return (
    <View style={styles.autoWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputOuter}>
        <Ionicons name="search-outline" size={16} color="#94A3B8" />
        <TextInput value={value} onChangeText={search} placeholder={placeholder} placeholderTextColor="#CBD5E1" style={styles.input}
          onFocus={() => { if (opts.length > 0) setShow(true); }} onBlur={() => setTimeout(() => setShow(false), 150)} />
      </View>
      {show && (
        <View style={styles.dropdown}>
          {load ? <View style={styles.dropRow}><ActivityIndicator size="small" color="#2f2971" /><Text style={styles.dropText}>Searching...</Text></View>
            : opts.length === 0 ? <View style={styles.dropRow}><Text style={styles.dropText}>No results found</Text></View>
            : opts.map((item, i) => (
              <TouchableOpacity key={i} style={styles.dropOption} onPress={() => { onSelect(item); setShow(false); setOpts([]); }}>
                <Text style={styles.dropOptionTitle}>{getLabel(item)}</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────── Chip ───────────────────────────
function Chip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{name}</Text>
      <TouchableOpacity onPress={onRemove} style={styles.chipX}>
        <Ionicons name="close-outline" size={13} color="#2f2971" />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────── Toggle ───────────────────────────
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity onPress={() => onChange(!value)} style={styles.toggleRow} activeOpacity={0.85}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────── Compact Food Item Card ───────────────────────────
function FoodItemCard({ label, item, hideAlcohol }: { label: string; item: FoodItemType; hideAlcohol: boolean }) {
  const alc  = isAlcohol(item);
  const sev  = sevMeta(item?.severity);
  const imgUrl = resolveImg(item?.image);
  const points = Array.isArray(item?.explanation?.explanation_points) ? item.explanation!.explanation_points!.slice(0, 2) : [];
  const allergens = (item?.allergens_detected || []).map((a) => String(a).toLowerCase());

  if (hideAlcohol && alc) {
    return (
      <View style={styles.foodCardHidden}>
        <View style={styles.foodHiddenInner}>
          <Ionicons name="eye-off-outline" size={18} color="#94A3B8" />
          <View style={{ flex: 1 }}>
            <Text style={styles.foodHiddenTitle}>Alcohol item hidden</Text>
            <Text style={styles.foodHiddenSub}>Disable "Hide alcohol" to view</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.foodCard}>
      {/* Top row: image + info */}
      <View style={styles.foodTop}>
        {/* Compact image */}
        <View style={styles.foodImgWrap}>
          {imgUrl ? (
            <Image source={{ uri: imgUrl }} style={styles.foodImg} resizeMode="cover" />
          ) : (
            <View style={styles.foodImgPlaceholder}>
              <Ionicons name="restaurant-outline" size={22} color="#AFA9EC" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.foodInfo}>
          <View style={styles.foodLabelPill}>
            <Text style={styles.foodLabelText}>{label.toUpperCase()}</Text>
          </View>
          <Text style={styles.foodName}>{prettyName(item?.food)}</Text>

          {/* Pills row */}
          <View style={styles.pillsRow}>
            {item?.quantity ? (
              <View style={styles.pill}>
                <Ionicons name="resize-outline" size={10} color="#475569" />
                <Text style={styles.pillText}>{String(item.quantity)}</Text>
              </View>
            ) : null}
            {item?.food_type ? <View style={styles.pill}><Text style={styles.pillText}>{item.food_type}</Text></View> : null}
            <View style={styles.pill}>
              <Ionicons name="flame-outline" size={10} color="#F97316" />
              <Text style={styles.pillText}>{Math.round(item?.energy ?? 0)} kcal</Text>
            </View>
            <View style={[styles.pill, styles.pillSev, { backgroundColor: sev.bg, borderColor: sev.border }]}>
              <View style={[styles.sevDot, { backgroundColor: sev.dot }]} />
              <Text style={[styles.pillText, { color: sev.color }]}>{sev.label}</Text>
            </View>
            {alc ? (
              <View style={[styles.pill, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
                <Ionicons name="warning-outline" size={10} color="#991B1B" />
                <Text style={[styles.pillText, { color: "#991B1B" }]}>Alcohol</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Allergens */}
      {allergens.length > 0 && (
        <View style={styles.allergyRow}>
          <Text style={styles.allergyLabel}>Allergens: </Text>
          <Text style={styles.allergyText}>{allergens.join(", ")}</Text>
        </View>
      )}

      {/* Notes */}
      {points.length > 0 && (
        <View style={styles.notesWrap}>
          {points.map((p, i) => (
            <View key={i} style={styles.noteRow}>
              <View style={styles.noteDot} />
              <Text style={styles.noteText}>{p}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────── Main Screen ───────────────────────────
export default function PersonalizedMealPlanScreen() {
  const { token, logout, isAuthenticated, loading } = useAuth() as AuthContextType;

  const [showSidebar, setShowSidebar]           = useState(false);
  const [selectedDrugName, setSelectedDrugName] = useState("");
  const [drugNames, setDrugNames]               = useState<string[]>([]);
  const [allergyInput, setAllergyInput]         = useState("");
  const [allergies, setAllergies]               = useState<string[]>([]);
  const [days, setDays]                         = useState("2");
  const [mealsPerDay, setMealsPerDay]           = useState("3");
  const [caloriesPerDay, setCaloriesPerDay]     = useState("1800");
  const [vegetarian, setVegetarian]             = useState(false);
  const [diabeticFriendly, setDiabeticFriendly] = useState(false);
  const [lowSodium, setLowSodium]               = useState(false);
  const [hideAlcohol, setHideAlcohol]           = useState(true);
  const [submitting, setSubmitting]             = useState(false);
  const [err, setErr]                           = useState("");
  const [result, setResult]                     = useState<MealPlanResultType | null>(null);

  // Tab state
  const [activeDay, setActiveDay]     = useState(1);
  const [activeMeal, setActiveMeal]   = useState(0); // index into meals array

  const fetchDrugs = useMemo(() => async (q: string) => await searchDrugs(q, 10), []);
  const handleLogout = useCallback(async () => { await logout?.(); router.replace("/login"); }, [logout]);

  useEffect(() => { if (!loading && isAuthenticated === false) router.replace("/login"); }, [loading, isAuthenticated]);

  function addDrug(name?: string) {
    const n = String(name || "").trim(); if (!n) return;
    setDrugNames((p) => uniq([...p, n])); setSelectedDrugName("");
  }
  function addAllergy() {
    const n = String(allergyInput || "").trim().toLowerCase(); if (!n) return;
    setAllergies((p) => uniq([...p, n])); setAllergyInput("");
  }

  async function generate() {
    setErr(""); setResult(null);
    if (!token) { setErr("Please login first."); return; }
    if (drugNames.length === 0) { setErr("Please add at least 1 drug."); return; }
    try {
      setSubmitting(true);
      const data = await advisoryRequest("/meal-plan/generate", {
        method: "POST",
        body: {
          drug_names: drugNames, days: Math.max(1, Number(days || 2)),
          meals_per_day: Math.max(1, Math.min(3, Number(mealsPerDay || 3))),
          calories_per_day: Math.max(600, Number(caloriesPerDay || 1800)),
          allergies: allergies.map((x) => x.toLowerCase().trim()).filter(Boolean),
          preferences: { vegetarian, diabeticFriendly, lowSodium },
        },
        token,
      });
      setResult(data?.result || null);
      setActiveDay(1); setActiveMeal(0);
    } catch (e: any) {
      setErr(e?.error || e?.details || e?.message || "Meal plan generation failed");
    } finally { setSubmitting(false); }
  }

  const daysList       = result?.days || [];
  const activeDayData  = daysList.find((d) => Number(d.day) === Number(activeDay));
  const meals          = activeDayData?.meals || [];
  const currentMeal    = meals[activeMeal] || null;
  const foodItems      = currentMeal ? [
    { label: "Main",      item: currentMeal.main },
    { label: "Protein",   item: currentMeal.protein },
    { label: "Vegetable", item: currentMeal.vegetable },
  ].filter((f) => f.item) as { label: string; item: FoodItemType }[] : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <BrandLogo withText size={34} />
          <TouchableOpacity style={styles.menuBtn} onPress={() => setShowSidebar(true)} activeOpacity={0.8}>
            <Ionicons name="menu-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── PAGE HERO ── */}
        <View style={styles.pageHero}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>HEALTH ADVISORY CENTER</Text>
          </View>
          <Text style={styles.pageTitle}>Meal Plan Advisor</Text>
          <Text style={styles.pageDesc}>Personalized plans that avoid risky food-drug interactions based on your medications.</Text>
        </View>

        {/* ── MEDICATIONS CARD ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}><Ionicons name="flask-outline" size={18} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Medications</Text>
              <Text style={styles.cardSub}>{drugNames.length} drug{drugNames.length !== 1 ? "s" : ""} added</Text>
            </View>
          </View>
          <AutoComplete<DrugItem>
            label="Search & add medication" placeholder="Search medication name..." value={selectedDrugName}
            onChangeValue={setSelectedDrugName} fetcher={fetchDrugs} getLabel={(d) => d?.name || ""}
            onSelect={(d) => { addDrug(d?.name); }}
          />
          {drugNames.length > 0 && <View style={styles.chipWrap}>{drugNames.map((d) => <Chip key={d} name={d} onRemove={() => setDrugNames((p) => p.filter((x) => x !== d))} />)}</View>}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={14} color="#92400E" />
            <Text style={styles.infoText}>AI-assisted. Always verify with your pharmacist.</Text>
          </View>
        </View>

        {/* ── ALLERGIES CARD ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: "#DC2626" }]}><Ionicons name="warning-outline" size={18} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Allergies</Text>
              <Text style={styles.cardSub}>{allergies.length} listed</Text>
            </View>
          </View>
          <Text style={styles.inputLabel}>Add allergy</Text>
          <View style={styles.addRow}>
            <TextInput value={allergyInput} onChangeText={setAllergyInput} placeholder="e.g. dairy, peanuts..." placeholderTextColor="#CBD5E1" style={styles.addInput} onSubmitEditing={addAllergy} />
            <TouchableOpacity onPress={addAllergy} style={styles.addBtn} activeOpacity={0.8}>
              <Ionicons name="add" size={20} color="#2f2971" />
            </TouchableOpacity>
          </View>
          {allergies.length > 0 && <View style={styles.chipWrap}>{allergies.map((a) => <Chip key={a} name={a} onRemove={() => setAllergies((p) => p.filter((x) => x !== a))} />)}</View>}
        </View>

        {/* ── PLAN SETTINGS CARD ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: "#059669" }]}><Ionicons name="calendar-outline" size={18} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Plan Settings</Text>
              <Text style={styles.cardSub}>Customize your meal plan</Text>
            </View>
          </View>
          <View style={styles.settingsGrid}>
            <View style={styles.settingCol}><Text style={styles.inputLabel}>Days</Text><TextInput value={days} onChangeText={setDays} keyboardType="numeric" style={styles.settingInput} /></View>
            <View style={styles.settingCol}><Text style={styles.inputLabel}>Meals/day</Text><TextInput value={mealsPerDay} onChangeText={setMealsPerDay} keyboardType="numeric" style={styles.settingInput} /></View>
            <View style={styles.settingCol}><Text style={styles.inputLabel}>kcal/day</Text><TextInput value={caloriesPerDay} onChangeText={setCaloriesPerDay} keyboardType="numeric" style={styles.settingInput} /></View>
          </View>
          <View style={styles.togglesWrap}>
            <Toggle label="Vegetarian Diet"   value={vegetarian}       onChange={setVegetarian}       />
            <Toggle label="Diabetic Friendly" value={diabeticFriendly} onChange={setDiabeticFriendly} />
            <Toggle label="Low Sodium"        value={lowSodium}        onChange={setLowSodium}        />
          </View>
          <TouchableOpacity onPress={() => setHideAlcohol(!hideAlcohol)} style={styles.checkboxRow} activeOpacity={0.85}>
            <View style={[styles.checkbox, hideAlcohol && styles.checkboxOn]}>
              {hideAlcohol ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
            </View>
            <Text style={styles.checkboxLabel}>Hide alcohol items (recommended)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={generate} disabled={submitting} activeOpacity={0.9} style={[styles.primaryBtn, submitting && styles.primaryBtnOff]}>
            {submitting
              ? <><ActivityIndicator size="small" color="#fff" /><Text style={styles.primaryBtnText}>Generating...</Text></>
              : <><Ionicons name="sparkles-outline" size={18} color="#fff" /><Text style={styles.primaryBtnText}>Generate Meal Plan</Text></>}
          </TouchableOpacity>
        </View>

        {/* ── ERROR ── */}
        {err ? (
          <View style={styles.errorBox}>
            <View style={styles.errorIconWrap}><Ionicons name="warning-outline" size={16} color="#92400E" /></View>
            <View style={{ flex: 1 }}><Text style={styles.errorTitle}>Something went wrong</Text><Text style={styles.errorText}>{err}</Text></View>
          </View>
        ) : null}

        {/* ── RESULT PANEL ── */}
        <View style={styles.resultPanel}>
          {/* Panel header */}
          <View style={styles.resultHead}>
            <View style={styles.resultHeadIcon}><Ionicons name="heart-outline" size={18} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultHeadTitle}>Your Meal Plan</Text>
              {result?.drug_names?.length ? <Text style={styles.resultHeadSub}>Medications: {result.drug_names.join(", ")}</Text> : null}
            </View>
          </View>

          {!result ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}><Ionicons name="reader-outline" size={28} color="#AFA9EC" /></View>
              <Text style={styles.emptyTitle}>No Meal Plan Yet</Text>
              <Text style={styles.emptySub}>Add medications, set preferences, and tap Generate.</Text>
            </View>
          ) : (
            <>
              {/* ── DAY TABS ── */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabsWrap}>
                {daysList.map((d) => (
                  <TouchableOpacity key={d.day} onPress={() => { setActiveDay(d.day); setActiveMeal(0); }}
                    style={[styles.dayTab, Number(activeDay) === Number(d.day) && styles.dayTabActive]}>
                    <Text style={[styles.dayTabText, Number(activeDay) === Number(d.day) && styles.dayTabTextActive]}>Day {d.day}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* ── MEAL TABS (Breakfast / Lunch / Dinner) ── */}
              {meals.length > 0 && (
                <View style={styles.mealTabsRow}>
                  {meals.map((m, idx) => (
                    <TouchableOpacity key={idx} onPress={() => setActiveMeal(idx)}
                      style={[styles.mealTab, activeMeal === idx && styles.mealTabActive]}>
                      <Text style={[styles.mealTabText, activeMeal === idx && styles.mealTabTextActive]}>
                        {String(m?.name || `Meal ${idx + 1}`).charAt(0).toUpperCase() + String(m?.name || `Meal ${idx + 1}`).slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── MEAL BODY ── */}
              {currentMeal && (
                <View style={styles.mealBody}>
                  {/* kcal chips */}
                  <View style={styles.kcalRow}>
                    <View style={styles.kcalChip}><Text style={styles.kcalChipText}>Target: {Math.round(currentMeal.target_kcal ?? 0)} kcal</Text></View>
                    <View style={styles.kcalChip}><Text style={styles.kcalChipText}>Est: {Math.round(currentMeal.estimated_kcal ?? 0)} kcal</Text></View>
                  </View>

                  {/* Food items */}
                  {foodItems.map(({ label, item }, idx) => (
                    <FoodItemCard key={idx} label={label} item={item} hideAlcohol={hideAlcohol} />
                  ))}

                  {/* Disclaimer */}
                  <View style={styles.disclaimerBox}>
                    <Ionicons name="information-circle-outline" size={14} color="#92400E" />
                    <Text style={styles.disclaimerText}>AI-assisted recommendation. Always consult your doctor before dietary changes.</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <Text style={styles.footer}>© {new Date().getFullYear()} PharmaLink. For academic purposes only.</Text>
      </ScrollView>

      {/* ── DRAWER ── */}
      <Modal visible={showSidebar} animationType="slide" transparent onRequestClose={() => setShowSidebar(false)}>
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setShowSidebar(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <BrandLogo withText size={32} />
              <TouchableOpacity onPress={() => setShowSidebar(false)} style={styles.drawerCloseBtn}>
                <Ionicons name="close-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.drawerDivider} />
            <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
              {MENU_ITEMS.map((item) => {
                const active = item.path === "/advisory/MealPlan";
                return (
                  <TouchableOpacity key={item.path} style={[styles.drawerItem, active && styles.drawerItemActive]} activeOpacity={0.8}
                    onPress={() => { setShowSidebar(false); if (item.replace) router.replace(item.path as any); else router.push(item.path as any); }}>
                    <Ionicons name={item.icon} size={22} color={active ? "#2f2971" : "#FFFFFF"} />
                    <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.drawerDivider} />
            <View style={styles.drawerBottom}>
              <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowSidebar(false); router.push("/Profile" as any); }}>
                <Ionicons name="person-circle-outline" size={22} color="#fff" />
                <Text style={styles.drawerItemText}>My Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawerItem} onPress={async () => { setShowSidebar(false); await handleLogout(); }}>
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

  header: { backgroundColor: "#2f2971", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14 },
  menuBtn: { width: 36, height: 36, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, alignItems: "center", justifyContent: "center" },

  pageHero: { backgroundColor: "#2f2971", paddingHorizontal: 18, paddingTop: 4, paddingBottom: 28 },
  heroBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, marginBottom: 14, gap: 6 },
  heroBadgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.8)" },
  heroBadgeText: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  pageTitle: { fontSize: 30, fontWeight: "800", color: "#FFFFFF", lineHeight: 38, letterSpacing: -0.5, marginBottom: 10 },
  pageDesc: { fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 20 },

  card: { backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#EBEBEB", 
    padding: 18, margin:16, marginTop: -14 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#2f2971", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  cardSub: { fontSize: 11, color: "#94A3B8", marginTop: 1 },

  autoWrap: { marginBottom: 12, zIndex: 10 },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#0F172A", marginBottom: 6 },
  inputOuter: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FB", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12, gap: 10 },
  input: { flex: 1, fontSize: 13, color: "#0F172A", padding: 0 },
  dropdown: { marginTop: 6, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 14, overflow: "hidden" },
  dropRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  dropText: { fontSize: 12, color: "#64748B" },
  dropOption: { paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  dropOptionTitle: { fontSize: 13, fontWeight: "600", color: "#0F172A" },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, marginBottom: 4 },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: "#EEEDFE", borderRadius: 100, paddingLeft: 12, paddingRight: 8, paddingVertical: 7 },
  chipText: { fontSize: 12, color: "#2f2971", fontWeight: "600" },
  chipX: { marginLeft: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(47,41,113,0.12)", alignItems: "center", justifyContent: "center" },

  infoBox: { marginTop: 12, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FCD34D", borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "flex-start", gap: 7 },
  infoText: { flex: 1, fontSize: 11, color: "#92400E", lineHeight: 16 },

  addRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  addInput: { flex: 1, backgroundColor: "#F8F9FB", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: "#0F172A" },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EEEDFE", alignItems: "center", justifyContent: "center" },

  settingsGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  settingCol: { flex: 1 },
  settingInput: { backgroundColor: "#F8F9FB", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: "#0F172A", fontWeight: "700", textAlign: "center" },

  togglesWrap: { gap: 8, marginBottom: 10 },
  toggleRow: { borderWidth: 1, borderColor: "#EBEBEB", backgroundColor: "#F8F9FB", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLabel: { flex: 1, fontSize: 13, color: "#0F172A", fontWeight: "600", paddingRight: 12 },
  toggleTrack: { width: 42, height: 23, borderRadius: 999, backgroundColor: "#CBD5E1", justifyContent: "center", paddingHorizontal: 2 },
  toggleTrackOn: { backgroundColor: "#2f2971" },
  toggleThumb: { width: 19, height: 19, borderRadius: 10, backgroundColor: "#FFFFFF", alignSelf: "flex-start" },
  toggleThumbOn: { alignSelf: "flex-end" },

  checkboxRow: { flexDirection: "row", alignItems: "center", padding: 13, backgroundColor: "#F8F9FB", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 14, marginBottom: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  checkboxOn: { backgroundColor: "#2f2971", borderColor: "#2f2971" },
  checkboxLabel: { flex: 1, marginLeft: 10, fontSize: 13, color: "#0F172A", fontWeight: "500" },

  primaryBtn: { backgroundColor: "#2f2971", borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  primaryBtnOff: { opacity: 0.65 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  errorBox: { flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB", borderRadius: 14, padding: 12, marginHorizontal: 16, marginBottom: 12, alignItems: "flex-start" },
  errorIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  errorTitle: { fontSize: 12, fontWeight: "700", color: "#78350F", marginBottom: 2 },
  errorText: { fontSize: 12, color: "#92400E", lineHeight: 18 },

  // ── Result panel ──
  resultPanel: { backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: "#EBEBEB", overflow: "hidden", marginHorizontal: 16, marginBottom: 16, marginTop: 4 },
  resultHead: { backgroundColor: "#2f2971", paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  resultHeadIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  resultHeadTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  resultHeadSub: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  emptyBox: { padding: 28, alignItems: "center" },
  emptyIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#EEEDFE", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", textAlign: "center" },
  emptySub: { marginTop: 5, fontSize: 12, color: "#94A3B8", textAlign: "center", lineHeight: 18 },

  // ── Day tabs ──
  dayTabsWrap: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  dayTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: "#EBEBEB", backgroundColor: "#F8F9FB" },
  dayTabActive: { backgroundColor: "#2f2971", borderColor: "#2f2971" },
  dayTabText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  dayTabTextActive: { color: "#FFFFFF" },

  // ── Meal tabs ──
  mealTabsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EBEBEB", paddingHorizontal: 14 },
  mealTab: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
  mealTabActive: { borderBottomColor: "#2f2971" },
  mealTabText: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
  mealTabTextActive: { color: "#2f2971" },

  // ── Meal body ──
  mealBody: { padding: 14 },
  kcalRow: { flexDirection: "row", gap: 7, marginBottom: 12 },
  kcalChip: { backgroundColor: "#EEEDFE", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  kcalChipText: { fontSize: 10, fontWeight: "700", color: "#3C3489" },

  // ── Food item cards (compact) ──
  foodCard: { backgroundColor: "#F8F9FB", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 16, padding: 11, marginBottom: 9 },
  foodCardHidden: { backgroundColor: "#F8F9FB", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 16, padding: 11, marginBottom: 9 },
  foodHiddenInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  foodHiddenTitle: { fontSize: 12, fontWeight: "700", color: "#475569" },
  foodHiddenSub: { fontSize: 10, color: "#94A3B8", marginTop: 2 },

  foodTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  foodImgWrap: { borderRadius: 10, overflow: "hidden", flexShrink: 0 },
  foodImg: { width: 60, height: 60 },
  foodImgPlaceholder: { width: 60, height: 60, borderRadius: 10, backgroundColor: "#EEEDFE", alignItems: "center", justifyContent: "center" },

  foodInfo: { flex: 1 },
  foodLabelPill: { alignSelf: "flex-start", backgroundColor: "#EEEDFE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, marginBottom: 5 },
  foodLabelText: { fontSize: 8, fontWeight: "700", color: "#2f2971", letterSpacing: 0.8 },
  foodName: { fontSize: 13, fontWeight: "700", color: "#0F172A", marginBottom: 6, lineHeight: 18 },

  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  pill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EBEBEB", borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, color: "#475569", fontWeight: "500" },
  pillSev: { borderWidth: 1 },
  sevDot: { width: 5, height: 5, borderRadius: 3 },

  allergyRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#EBEBEB" },
  allergyLabel: { fontSize: 10, fontWeight: "700", color: "#7F1D1D" },
  allergyText: { fontSize: 10, color: "#B91C1C", fontWeight: "600" },

  notesWrap: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#EBEBEB" },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 3 },
  noteDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#2f2971", marginTop: 7, flexShrink: 0 },
  noteText: { flex: 1, fontSize: 10, color: "#64748B", lineHeight: 16 },

  disclaimerBox: { marginTop: 10, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FCD34D", borderRadius: 12, padding: 11, flexDirection: "row", alignItems: "flex-start", gap: 7 },
  disclaimerText: { flex: 1, fontSize: 10, color: "#92400E", lineHeight: 16 },

  footer: { textAlign: "center", color: "#94A3B8", fontSize: 10, lineHeight: 16, paddingHorizontal: 16, paddingBottom: 8 },

  // ── Drawer ──
  drawerOverlay: { flex: 1, flexDirection: "row" },
  drawerBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  drawer: { width: "82%", backgroundColor: "#2f2971", paddingBottom: 28 },
  drawerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  drawerCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  drawerDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: 20 },
  drawerMenu: { paddingHorizontal: 14, paddingTop: 12 },
  drawerItem: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 17, paddingHorizontal: 18, borderRadius: 999, marginBottom: 4 },
  drawerItemActive: { backgroundColor: "#FFFFFF" },
  drawerItemText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", flex: 1 },
  drawerItemTextActive: { color: "#2f2971" },
  drawerBottom: { paddingHorizontal: 14, paddingTop: 12 },
});