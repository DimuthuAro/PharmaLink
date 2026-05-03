import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { checkFoodDrugInteractions } from "../utils/api";

type FoodDrugInteraction = {
  food: string;
  drug: string;
  effect: string;
  severity: "mild" | "moderate" | "severe";
  advice: string;
};

type Props = {
  onClose?: () => void;
};

const severityStyles = {
  mild: {
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
    text: "#1e40af",
    icon: "#3b82f6",
  },
  moderate: {
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.30)",
    text: "#92400e",
    icon: "#f59e0b",
  },
  severe: {
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.30)",
    text: "#991b1b",
    icon: "#ef4444",
  },
};

const severityLabels = {
  mild: "ℹ Mild Interaction",
  moderate: "⚠ Moderate Interaction",
  severe: "✕ Severe Interaction",
};

export default function FoodDrugInteractionChecker({ onClose }: Props) {
  const [drug, setDrug] = useState("");
  const [food, setFood] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FoodDrugInteraction[]>([]);
  const [checked, setChecked] = useState(false);

  const handleCheck = async () => {
    if (!drug.trim() || !food.trim()) return;

    setLoading(true);
    try {
      const response = await checkFoodDrugInteractions(drug, food);
      setResults(response.interactions || [response] || []);
      setChecked(true);
    } catch (error) {
      console.error("Error checking food-drug interaction:", error);
      setResults([]);
      setChecked(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setDrug("");
    setFood("");
    setResults([]);
    setChecked(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons name="food-apple" size={24} color="#10b981" />
          <View>
            <Text style={styles.title}>Food-Drug Interactions</Text>
            <Text style={styles.subtitle}>Check food & medicine compatibility</Text>
          </View>
        </View>
        {onClose && (
          <Pressable onPress={onClose} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <MaterialCommunityIcons name="close" size={24} color="#666" />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medicine Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Warfarin, Metformin..."
              value={drug}
              onChangeText={setDrug}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Food Item</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Grapefruit, Dairy, Spinach..."
              value={food}
              onChangeText={setFood}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleCheck}
              disabled={loading || !drug.trim() || !food.trim()}
              style={({ pressed }) => [
                styles.checkBtn,
                (loading || !drug.trim() || !food.trim()) && { opacity: 0.5 },
                pressed && { opacity: 0.9 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="magnify" size={16} color="#fff" />
                  <Text style={styles.checkBtnText}>Check</Text>
                </>
              )}
            </Pressable>

            {checked && (
              <Pressable
                onPress={handleClear}
                style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialCommunityIcons name="refresh" size={16} color="#666" />
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Results Section */}
        {checked && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Found {results.length} Interactions</Text>

            {results.length === 0 ? (
              <View style={styles.noResultBox}>
                <MaterialCommunityIcons name="check-circle" size={32} color="#10b981" />
                <Text style={styles.noResultText}>No interactions found. Safe combination!</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {results.map((interaction, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.interactionCard,
                      { borderColor: severityStyles[interaction.severity].border },
                    ]}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.foodDrugPair}>
                        <View style={styles.itemBadge}>
                          <MaterialCommunityIcons name="food" size={12} color="#10b981" />
                          <Text style={styles.itemText}>{interaction.food}</Text>
                        </View>
                        <MaterialCommunityIcons name="plus" size={14} color="#999" />
                        <View style={styles.itemBadge}>
                          <MaterialCommunityIcons name="pill" size={12} color="#2563eb" />
                          <Text style={styles.itemText}>{interaction.drug}</Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.severityPill,
                          { backgroundColor: severityStyles[interaction.severity].bg },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            interaction.severity === "mild"
                              ? "information"
                              : interaction.severity === "moderate"
                                ? "alert"
                                : "alert-circle"
                          }
                          size={12}
                          color={severityStyles[interaction.severity].icon}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: severityStyles[interaction.severity].text,
                          }}
                        >
                          {severityLabels[interaction.severity]}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardSection}>
                      <Text style={styles.cardLabel}>What happens:</Text>
                      <Text style={styles.cardValue}>{interaction.effect}</Text>
                    </View>

                    <View
                      style={[
                        styles.adviceBox,
                        { backgroundColor: severityStyles[interaction.severity].bg },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="lightbulb-outline"
                        size={14}
                        color={severityStyles[interaction.severity].icon}
                      />
                      <Text
                        style={[
                          styles.adviceText,
                          { color: severityStyles[interaction.severity].text },
                        ]}
                      >
                        {interaction.advice}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  titleWrap: { flexDirection: "row", gap: 12, flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: "#000" },
  subtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#000", marginBottom: 12 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "600", color: "#333", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#f9fafb",
    color: "#000",
  },
  buttonRow: { flexDirection: "row", gap: 10 },
  checkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  clearBtnText: { fontSize: 12, fontWeight: "500", color: "#666" },
  noResultBox: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "rgba(16,185,129,0.08)",
    borderRadius: 10,
    gap: 8,
  },
  noResultText: { fontSize: 13, color: "#047857", fontWeight: "500" },
  interactionCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f9fafb",
    gap: 10,
  },
  cardTop: { gap: 10 },
  foodDrugPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  itemBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 6,
  },
  itemText: { fontSize: 11, fontWeight: "600", color: "#333" },
  severityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardSection: { gap: 4 },
  cardLabel: { fontSize: 11, fontWeight: "600", color: "#666" },
  cardValue: { fontSize: 12, color: "#333", lineHeight: 18 },
  adviceBox: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    alignItems: "flex-start",
  },
  adviceText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 16,
  },
});
