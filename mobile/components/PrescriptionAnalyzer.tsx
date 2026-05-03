import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type PrescriptionData = {
  patientName: string;
  doctor: string;
  date: string;
  medicines: { name: string; dosage: string; frequency: string; duration: string }[];
  notes: string;
  confidence: number;
};

type Props = {
  onClose?: () => void;
};

const mockPrescriptionData: PrescriptionData = {
  patientName: "John Doe",
  doctor: "Dr. Smith, MD",
  date: "2025-05-03",
  medicines: [
    { name: "Amoxicillin", dosage: "500mg", frequency: "3 times daily", duration: "7 days" },
    { name: "Ibuprofen", dosage: "200mg", frequency: "As needed", duration: "14 days" },
  ],
  notes: "Take with food. Avoid dairy 2 hours after Amoxicillin",
  confidence: 0.94,
};

export default function PrescriptionAnalyzer({ onClose }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [data, setData] = useState<PrescriptionData | null>(null);

  const handleSelectImage = async () => {
    // Simulated image selection
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setImage("prescription.jpg");
    setData(mockPrescriptionData);
    setAnalyzed(true);
    setLoading(false);
  };

  const handleReset = () => {
    setImage(null);
    setData(null);
    setAnalyzed(false);
  };

  const confidenceColor =
    mockPrescriptionData.confidence > 0.9 ? "#16a34a" : mockPrescriptionData.confidence > 0.75 ? "#f59e0b" : "#ef4444";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons name="file-document-outline" size={24} color="#8b5cf6" />
          <View>
            <Text style={styles.title}>Prescription Analyzer</Text>
            <Text style={styles.subtitle}>Extract handwritten prescription data</Text>
          </View>
        </View>
        {onClose && (
          <Pressable onPress={onClose} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <MaterialCommunityIcons name="close" size={24} color="#666" />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!analyzed ? (
          <>
            {/* Upload Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upload Prescription</Text>

              <Pressable
                onPress={handleSelectImage}
                disabled={loading}
                style={({ pressed }) => [
                  styles.uploadBox,
                  pressed && { opacity: 0.8 },
                  loading && { opacity: 0.6 },
                ]}
              >
                {loading ? (
                  <View style={styles.uploadContentCenter}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text style={styles.uploadLoadingText}>Analyzing handwriting...</Text>
                  </View>
                ) : (
                  <View style={styles.uploadContentCenter}>
                    <MaterialCommunityIcons name="cloud-upload-outline" size={40} color="#8b5cf6" />
                    <Text style={styles.uploadTitle}>Take or Upload Photo</Text>
                    <Text style={styles.uploadSubtitle}>Click to select prescription image</Text>
                  </View>
                )}
              </Pressable>

              <View style={styles.tipsBox}>
                <MaterialCommunityIcons name="information-outline" size={16} color="#3b82f6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tipsTitle}>Tips for best results:</Text>
                  <Text style={styles.tipsText}>• Clear, well-lit image • Straight angle • All text visible</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Analyzed Results */}
            <View style={styles.section}>
              <View style={styles.resultHeaderTop}>
                <Text style={styles.sectionTitle}>Analysis Results</Text>
                <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + "20" }]}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={confidenceColor} />
                  <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                    {(mockPrescriptionData.confidence * 100).toFixed(0)}% Confidence
                  </Text>
                </View>
              </View>

              {/* Patient Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account-outline" size={16} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Patient</Text>
                    <Text style={styles.infoValue}>{data?.patientName}</Text>
                  </View>
                </View>
              </View>

              {/* Doctor & Date Card */}
              <View style={styles.gridCards}>
                <View style={[styles.infoCard, { flex: 1 }]}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="doctor" size={16} color="#666" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Doctor</Text>
                      <Text style={[styles.infoValue, { fontSize: 11 }]}>{data?.doctor}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.infoCard, { flex: 1 }]}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="calendar-outline" size={16} color="#666" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Date</Text>
                      <Text style={styles.infoValue}>{data?.date}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Medicines List */}
              <View style={styles.medicinesBox}>
                <View style={styles.medicinesHeader}>
                  <MaterialCommunityIcons name="pill-multiple" size={16} color="#2563eb" />
                  <Text style={styles.medicinesTitle}>Medicines ({data?.medicines.length})</Text>
                </View>

                {data?.medicines.map((med, idx) => (
                  <View key={idx} style={styles.medicineItem}>
                    <View style={styles.medicineTop}>
                      <Text style={styles.medicineName}>{med.name}</Text>
                      <View style={styles.dosageBadge}>
                        <Text style={styles.dosageText}>{med.dosage}</Text>
                      </View>
                    </View>
                    <View style={styles.medicineDetails}>
                      <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="clock-outline" size={12} color="#666" />
                        <Text style={styles.detailText}>{med.frequency}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="calendar-check-outline" size={12} color="#666" />
                        <Text style={styles.detailText}>{med.duration}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Notes */}
              {data?.notes && (
                <View style={styles.notesBox}>
                  <View style={styles.notesHeader}>
                    <MaterialCommunityIcons name="note-text-outline" size={16} color="#f59e0b" />
                    <Text style={styles.notesTitle}>Doctor's Notes</Text>
                  </View>
                  <Text style={styles.notesContent}>{data.notes}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Pressable
                  onPress={handleReset}
                  style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.8 }]}
                >
                  <MaterialCommunityIcons name="refresh" size={16} color="#8b5cf6" />
                  <Text style={styles.resetBtnText}>Analyze Another</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.verifyBtn, pressed && { opacity: 0.9 }]}
                  onPress={() => {}}
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#fff" />
                  <Text style={styles.verifyBtnText}>Confirm & Save</Text>
                </Pressable>
              </View>
            </View>
          </>
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
  uploadBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#8b5cf6",
    borderRadius: 12,
    backgroundColor: "rgba(139,92,246,0.05)",
    paddingVertical: 28,
    marginBottom: 12,
  },
  uploadContentCenter: { alignItems: "center", gap: 8 },
  uploadTitle: { fontSize: 14, fontWeight: "600", color: "#000" },
  uploadSubtitle: { fontSize: 12, color: "#666" },
  uploadLoadingText: { fontSize: 13, color: "#8b5cf6", fontWeight: "500", marginTop: 4 },
  tipsBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderRadius: 8,
    padding: 10,
  },
  tipsTitle: { fontSize: 11, fontWeight: "600", color: "#1e40af", marginBottom: 2 },
  tipsText: { fontSize: 11, color: "#1e40af", lineHeight: 16 },
  resultHeaderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: "row", gap: 4 },
  confidenceText: { fontSize: 11, fontWeight: "600" },
  infoCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  gridCards: { flexDirection: "row", gap: 10, marginBottom: 10 },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, color: "#999", fontWeight: "500" },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#000", marginTop: 2 },
  medicinesBox: {
    backgroundColor: "rgba(37,99,235,0.06)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  medicinesHeader: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 10 },
  medicinesTitle: { fontSize: 12, fontWeight: "600", color: "#000" },
  medicineItem: { backgroundColor: "#fff", borderRadius: 8, padding: 10, marginBottom: 8, gap: 6 },
  medicineTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  medicineName: { fontSize: 12, fontWeight: "600", color: "#000" },
  dosageBadge: { backgroundColor: "rgba(37,99,235,0.12)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  dosageText: { fontSize: 10, color: "#2563eb", fontWeight: "600" },
  medicineDetails: { gap: 4 },
  detailRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  detailText: { fontSize: 10, color: "#666" },
  notesBox: {
    backgroundColor: "rgba(245,158,11,0.06)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  notesHeader: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 },
  notesTitle: { fontSize: 12, fontWeight: "600", color: "#000" },
  notesContent: { fontSize: 11, color: "#666", lineHeight: 18 },
  actionButtons: { flexDirection: "row", gap: 10, marginTop: 14 },
  resetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "rgba(139,92,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
  },
  resetBtnText: { fontSize: 12, fontWeight: "600", color: "#8b5cf6" },
  verifyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#8b5cf6",
  },
  verifyBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },
});
