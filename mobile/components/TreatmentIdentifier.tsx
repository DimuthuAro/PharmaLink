import React, { useState } from "react";
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

type Treatment = {
  id: string;
  condition: string;
  medication: string;
  dosage: string;
  duration: string;
  effectiveness: "high" | "medium" | "low";
  sideEffects: string[];
};

type Props = {
  onClose?: () => void;
};

const mockTreatments: Treatment[] = [
  {
    id: "1",
    condition: "Headache",
    medication: "Paracetamol",
    dosage: "500-1000mg",
    duration: "Every 4-6 hours",
    effectiveness: "high",
    sideEffects: ["Rare: Liver damage with overdose"],
  },
  {
    id: "2",
    condition: "Headache",
    medication: "Ibuprofen",
    dosage: "200-400mg",
    duration: "Every 6-8 hours",
    effectiveness: "high",
    sideEffects: ["GI upset", "Increased bleeding risk"],
  },
  {
    id: "3",
    condition: "Headache",
    medication: "Aspirin",
    dosage: "325-650mg",
    duration: "Every 4-6 hours",
    effectiveness: "medium",
    sideEffects: ["Stomach irritation", "Bleeding risk"],
  },
];

const effectivenessStyles = {
  high: { bg: "rgba(34,197,94,0.12)", text: "#166534", label: "Highly Effective" },
  medium: { bg: "rgba(245,158,11,0.12)", text: "#92400e", label: "Moderately Effective" },
  low: { bg: "rgba(239,68,68,0.12)", text: "#991b1b", label: "Limited Effectiveness" },
};

export default function TreatmentIdentifier({ onClose }: Props) {
  const [symptom, setSymptom] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Treatment[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!symptom.trim()) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setResults(mockTreatments);
    setSearched(true);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons name="hospital-box" size={24} color="#8b5cf6" />
          <View>
            <Text style={styles.title}>Treatment Identifier</Text>
            <Text style={styles.subtitle}>Find treatments for your symptoms</Text>
          </View>
        </View>
        {onClose && (
          <Pressable onPress={onClose} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <MaterialCommunityIcons name="close" size={24} color="#666" />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.label}>Describe Your Symptom</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="e.g., Headache, Fever, Cough"
              value={symptom}
              onChangeText={setSymptom}
              editable={!loading}
              placeholderTextColor="#999"
            />
            <Pressable
              onPress={handleSearch}
              disabled={loading || !symptom.trim()}
              style={({ pressed }) => [
                styles.searchBtn,
                pressed && { opacity: 0.8 },
                (loading || !symptom.trim()) && { opacity: 0.5 },
              ]}
            >
              {loading ? (
                <ActivityIndicator size={20} color="#fff" />
              ) : (
                <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerBox}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#8b5cf6" />
          <Text style={styles.disclaimerText}>
            Always consult with a healthcare professional before starting any treatment.
          </Text>
        </View>

        {/* Results */}
        {searched && results.length > 0 && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Found {results.length} Treatments</Text>
              <Text style={styles.resultsSubtitle}>For: {symptom}</Text>
            </View>

            {results.map((treatment, idx) => {
              const eff = effectivenessStyles[treatment.effectiveness];

              return (
                <View key={idx} style={styles.treatmentCard}>
                  <View style={styles.treatmentTop}>
                    <View style={styles.treatmentInfo}>
                      <Text style={styles.medication}>{treatment.medication}</Text>
                      <Text style={styles.condition}>{treatment.condition}</Text>
                    </View>
                    <View style={[styles.effectivenessBadge, { backgroundColor: eff.bg }]}>
                      <Text style={[styles.effectivenessText, { color: eff.text }]}>
                        {eff.label}
                      </Text>
                    </View>
                  </View>

                  {/* Dosage & Duration */}
                  <View style={styles.dosageSection}>
                    <View style={styles.dosageItem}>
                      <Text style={styles.dosageLabel}>Dosage</Text>
                      <Text style={styles.dosageValue}>{treatment.dosage}</Text>
                    </View>
                    <View style={styles.dosageDivider} />
                    <View style={styles.dosageItem}>
                      <Text style={styles.dosageLabel}>Frequency</Text>
                      <Text style={styles.dosageValue}>{treatment.duration}</Text>
                    </View>
                  </View>

                  {/* Side Effects */}
                  {treatment.sideEffects.length > 0 && (
                    <View style={styles.sideEffectsSection}>
                      <Text style={styles.sideEffectsTitle}>⚠ Side Effects</Text>
                      {treatment.sideEffects.map((effect, i) => (
                        <Text key={i} style={styles.sideEffect}>
                          • {effect}
                        </Text>
                      ))}
                    </View>
                  )}

                  <Pressable style={styles.detailsBtn}>
                    <Text style={styles.detailsBtnText}>View Full Details</Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={16}
                      color="#8b5cf6"
                      style={{ marginLeft: 4 }}
                    />
                  </Pressable>
                </View>
              );
            })}
          </>
        )}

        {searched && results.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No treatments found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with a different symptom description
            </Text>
          </View>
        )}

        {!searched && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="hospital-box" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>Search for a treatment</Text>
            <Text style={styles.emptySubtitle}>Describe your symptoms to find suitable treatments</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000",
  },
  searchBtn: {
    backgroundColor: "#8b5cf6",
    borderRadius: 8,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(139,92,246,0.08)",
    borderLeftWidth: 3,
    borderLeftColor: "#8b5cf6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  resultsSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  treatmentCard: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  treatmentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  treatmentInfo: {
    flex: 1,
  },
  medication: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  condition: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  effectivenessBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  effectivenessText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dosageSection: {
    flexDirection: "row",
    backgroundColor: "rgba(139,92,246,0.05)",
    borderRadius: 8,
    marginBottom: 12,
  },
  dosageItem: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dosageLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  dosageValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  dosageDivider: {
    width: 1,
    backgroundColor: "#e5e5e5",
  },
  sideEffectsSection: {
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(239,68,68,0.05)",
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
    borderRadius: 6,
  },
  sideEffectsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#991b1b",
    marginBottom: 6,
  },
  sideEffect: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    lineHeight: 16,
  },
  detailsBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(139,92,246,0.1)",
    borderWidth: 1,
    borderColor: "#8b5cf6",
    borderRadius: 8,
    paddingVertical: 10,
  },
  detailsBtnText: {
    color: "#8b5cf6",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
    maxWidth: 280,
  },
});
