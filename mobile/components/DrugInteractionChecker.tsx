import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type InteractionRisk = "safe" | "moderate" | "high";

type Interaction = {
  drug1: string;
  drug2: string;
  risk: InteractionRisk;
  description: string;
  recommendation: string;
};

type Props = {
  onClose?: () => void;
};

const mockInteractions: Interaction[] = [
  {
    drug1: "Aspirin",
    drug2: "Warfarin",
    risk: "high",
    description: "Increased bleeding risk",
    recommendation: "Avoid combination or closely monitor PT/INR",
  },
  {
    drug1: "Lisinopril",
    drug2: "Potassium",
    risk: "moderate",
    description: "Risk of hyperkalemia",
    recommendation: "Monitor potassium levels regularly",
  },
];

const riskStyles = {
  safe: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.25)", text: "#166534", icon: "#16a34a" },
  moderate: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.30)", text: "#92400e", icon: "#f59e0b" },
  high: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.30)", text: "#991b1b", icon: "#ef4444" },
};

const riskLabels = { safe: "✓ Safe", moderate: "⚠ Moderate Risk", high: "✕ High Risk" };

export default function DrugInteractionChecker({ onClose }: Props) {
  const [drugs, setDrugs] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Interaction[]>([]);
  const [checked, setChecked] = useState(false);

  const handleAddDrug = () => {
    if (drugs.length < 5) setDrugs([...drugs, ""]);
  };

  const handleRemoveDrug = (idx: number) => {
    if (drugs.length > 2) setDrugs(drugs.filter((_, i) => i !== idx));
  };

  const handleUpdateDrug = (idx: number, value: string) => {
    const updated = [...drugs];
    updated[idx] = value;
    setDrugs(updated);
  };

  const handleCheck = async () => {
    const filled = drugs.filter((d) => d.trim());
    if (filled.length < 2) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800)); // Simulate API call
    setResults(mockInteractions);
    setChecked(true);
    setLoading(false);
  };

  const highRiskCount = useMemo(() => results.filter((r) => r.risk === "high").length, [results]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons name="pills" size={24} color="#2563eb" />
          <View>
            <Text style={styles.title}>Drug Interaction Checker</Text>
            <Text style={styles.subtitle}>Check for medicine interactions</Text>
          </View>
        </View>
        {onClose && (
          <Pressable onPress={onClose} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <MaterialCommunityIcons name="close" size={24} color="#666" />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Drugs Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Drugs</Text>
          <View style={{ gap: 10 }}>
            {drugs.map((drug, idx) => (
              <View key={idx} style={styles.drugInputWrap}>
                <TextInput
                  style={styles.drugInput}
                  placeholder={`Drug ${idx + 1}`}
                  value={drug}
                  onChangeText={(v) => handleUpdateDrug(idx, v)}
                  placeholderTextColor="#999"
                />
                {drugs.length > 2 && (
                  <Pressable
                    onPress={() => handleRemoveDrug(idx)}
                    style={({ pressed }) => [styles.removeBtnSmall, pressed && { opacity: 0.6 }]}
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          {drugs.length < 5 && (
            <Pressable
              onPress={handleAddDrug}
              style={({ pressed }) => [styles.addDrugBtn, pressed && { opacity: 0.8 }]}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#2563eb" />
              <Text style={styles.addDrugText}>Add Drug</Text>
            </Pressable>
          )}
        </View>

        {/* Check Button */}
        <Pressable
          onPress={handleCheck}
          disabled={loading || drugs.filter((d) => d.trim()).length < 2}
          style={({ pressed }) => [
            styles.checkBtn,
            (loading || drugs.filter((d) => d.trim()).length < 2) && { opacity: 0.5 },
            pressed && { opacity: 0.9 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="magnify" size={18} color="#fff" />
              <Text style={styles.checkBtnText}>Check Interactions</Text>
            </>
          )}
        </Pressable>

        {/* Results */}
        {checked && (
          <View style={styles.section}>
            <View style={styles.resultHeader}>
              <Text style={styles.sectionTitle}>Results</Text>
              <View
                style={[
                  styles.riskBadge,
                  highRiskCount > 0
                    ? { backgroundColor: "rgba(239,68,68,0.12)" }
                    : { backgroundColor: "rgba(34,197,94,0.12)" },
                ]}
              >
                <Text
                  style={{
                    color: highRiskCount > 0 ? "#991b1b" : "#166534",
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  {highRiskCount} High Risk
                </Text>
              </View>
            </View>

            {results.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="check-circle" size={32} color="#16a34a" />
                <Text style={styles.emptyText}>No significant interactions found</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {results.map((inter, idx) => (
                  <View key={idx} style={[styles.resultCard, { borderColor: riskStyles[inter.risk].border }]}>
                    <View style={styles.resultCardTop}>
                      <View style={styles.resultDrugs}>
                        <Text style={styles.resultDrugName}>{inter.drug1}</Text>
                        <MaterialCommunityIcons name="plus" size={16} color="#999" />
                        <Text style={styles.resultDrugName}>{inter.drug2}</Text>
                      </View>
                      <View
                        style={[styles.riskPill, { backgroundColor: riskStyles[inter.risk].bg }]}
                      >
                        <MaterialCommunityIcons
                          name={inter.risk === "safe" ? "check" : inter.risk === "moderate" ? "alert" : "alert-circle"}
                          size={14}
                          color={riskStyles[inter.risk].icon}
                        />
                        <Text style={[styles.riskPillText, { color: riskStyles[inter.risk].text }]}>
                          {riskLabels[inter.risk]}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.resultDesc}>{inter.description}</Text>
                    <View style={styles.recommendBox}>
                      <MaterialCommunityIcons name="lightbulb-outline" size={14} color="#2563eb" />
                      <Text style={styles.recommendText}>{inter.recommendation}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
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
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#000", marginBottom: 10 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  drugInputWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  drugInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#f9fafb",
  },
  removeBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "rgba(239,68,68,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  addDrugBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 8,
    backgroundColor: "rgba(37,99,235,0.06)",
  },
  addDrugText: { fontSize: 13, fontWeight: "600", color: "#2563eb" },
  checkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  checkBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderRadius: 10,
    gap: 8,
  },
  emptyText: { fontSize: 13, color: "#166534", fontWeight: "500" },
  resultCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f9fafb",
    gap: 8,
  },
  resultCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  resultDrugs: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  resultDrugName: { fontSize: 13, fontWeight: "600", color: "#000" },
  riskPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskPillText: { fontSize: 11, fontWeight: "600" },
  resultDesc: { fontSize: 12, color: "#555", lineHeight: 18 },
  recommendBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(37,99,235,0.08)",
    padding: 8,
    borderRadius: 6,
  },
  recommendText: { flex: 1, fontSize: 11, color: "#1e40af", lineHeight: 16 },
});
