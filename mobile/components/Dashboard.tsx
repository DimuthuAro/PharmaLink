import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import BrandHeader from "./BrandHeader";
import { getUser, User } from "../utils/auth";
import DrugInteractionChecker from "./DrugInteractionChecker";
import FoodDrugInteractionChecker from "./FoodDrugInteractionChecker";
import PrescriptionAnalyzer from "./PrescriptionAnalyzer";
import CrossBrandInterpreter from "./CrossBrandInterpreter";
import TreatmentIdentifier from "./TreatmentIdentifier";

type Feature = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bgColor: string;
  borderColor: string;
  component: React.ComponentType<{ onClose: () => void }>;
};

const features: Feature[] = [
  {
    id: "drug-interaction",
    title: "Drug Interactions",
    description: "Check medicine-to-medicine interactions",
    icon: "pill",
    color: "#2563eb",
    bgColor: "rgba(37,99,235,0.12)",
    borderColor: "rgba(37,99,235,0.25)",
    component: DrugInteractionChecker,
  },
  {
    id: "food-drug",
    title: "Food-Drug Check",
    description: "Check food & medicine compatibility",
    icon: "food-apple",
    color: "#10b981",
    bgColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.25)",
    component: FoodDrugInteractionChecker,
  },
  {
    id: "prescription",
    title: "Prescription Reader",
    description: "AI-powered handwritten prescription analysis",
    icon: "file-document-outline",
    color: "#8b5cf6",
    bgColor: "rgba(139,92,246,0.12)",
    borderColor: "rgba(139,92,246,0.25)",
    component: PrescriptionAnalyzer,
  },
  {
    id: "cross-brand",
    title: "Cross-Brand Comparator",
    description: "Compare brands & find alternative medications",
    icon: "compare",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.25)",
    component: CrossBrandInterpreter,
  },
  {
    id: "treatment",
    title: "Treatment Identifier",
    description: "Find suitable treatments for your symptoms",
    icon: "hospital-box",
    color: "#a855f7",
    bgColor: "rgba(168,85,247,0.12)",
    borderColor: "rgba(168,85,247,0.25)",
    component: TreatmentIdentifier,
  },
];

const stats = [
  {
    label: "Checks Today",
    value: "24",
    icon: "checkmark-circle-outline" as keyof typeof Ionicons.glyphMap,
    bgColor: "rgba(37,99,235,0.1)",
    color: "#2563eb",
  },
  {
    label: "Interactions Found",
    value: "3",
    icon: "alert-circle-outline" as keyof typeof Ionicons.glyphMap,
    bgColor: "rgba(239,68,68,0.1)",
    color: "#ef4444",
  },
  {
    label: "Total Saved",
    value: "156",
    icon: "save-outline" as keyof typeof Ionicons.glyphMap,
    bgColor: "rgba(34,197,94,0.1)",
    color: "#16a34a",
  },
];

export default function Dashboard() {
  const [user, setUser] = React.useState<User | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const u = await getUser();
      setUser(u);
    })();
  }, []);

  const activeFeature = features.find((f) => f.id === selectedFeature);
  const ActiveComponent = activeFeature?.component;

  return (
    <View style={styles.container}>
      <BrandHeader user={user} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeBox}>
          <View>
            <Text style={styles.welcomeTitle}>Welcome back! 👋</Text>
            <Text style={styles.welcomeSubtitle}>Access all medicine safety tools</Text>
          </View>
          <View style={styles.welcomeIcon}>
            <MaterialCommunityIcons name="shield-check" size={32} color="#16a34a" />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <View key={idx} style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: stat.bgColor }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tools</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{features.length}</Text>
            </View>
          </View>

          <View style={styles.featureGrid}>
            {features.map((feature) => (
              <Pressable
                key={feature.id}
                onPress={() => setSelectedFeature(feature.id)}
                style={({ pressed }) => [
                  styles.featureCard,
                  { borderColor: feature.borderColor, backgroundColor: feature.bgColor },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.featureHeader}>
                  <View
                    style={[
                      styles.featureIconBox,
                      { backgroundColor: feature.color + "15" },
                    ]}
                  >
                    <MaterialCommunityIcons name={feature.icon} size={24} color={feature.color} />
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Quick Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Quick Tips</Text>
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#16a34a" />
              <Text style={styles.tipText}>Always verify interactions with your pharmacist</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#16a34a" />
              <Text style={styles.tipText}>Keep a list of all your current medications</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#16a34a" />
              <Text style={styles.tipText}>Report any side effects to your doctor immediately</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Feature Modal */}
      <Modal
        visible={selectedFeature !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedFeature(null)}
      >
        {ActiveComponent && (
          <ActiveComponent onClose={() => setSelectedFeature(null)} />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eff6ff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  welcomeBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 2,
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  welcomeIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(16,185,129,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  sectionBadge: {
    backgroundColor: "rgba(37,99,235,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563eb",
  },
  featureGrid: {
    gap: 10,
  },
  featureCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  featureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: "#666",
    lineHeight: 16,
  },
  tipsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  tipItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: "#555",
    lineHeight: 16,
  },
});
