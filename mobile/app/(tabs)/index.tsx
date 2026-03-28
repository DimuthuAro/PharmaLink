// app/%28tabs%29/index.tsx
import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import BrandLogo from "../../components/BrandLogo";
import {router} from "expo-router";

const BASE_URL = "http://10.130.51.238:3000";

const MODULES = [
  {
    
    label: "SAFETY",
    title: "Drug Interaction & Allergy Detection",
    text: "Detect potential interactions and allergy risks before prescribing or dispensing.",
    image: require("../../assets/images/interaction.jpeg"),
  },
  {
    
    label: "NUTRITION",
    title: "Health Advisory Center",
    text: "Align diet with medication plans, suggesting safer food choices for better outcomes.",
    image: require("../../assets/images/nutrition.jpeg"),
  },
  {
    
    label: "COMPARISON",
    title: "Cross-Brand Drug Comparator",
    text: "Compare equivalent medicines across brands for affordability and availability.",
    image: require("../../assets/images/comparison.jpeg"),
  },
  {
    
    label: "AI",
    title: "AI-Powered Prescription Interpretation",
    text: "Interpret handwritten prescriptions, validate doses, and flag possible errors.",
    image: require("../../assets/images/prescription.jpeg"),
  },
];

const STATS = [
  { value: "4", label: "Integrated Modules" },
  { value: "AI", label: "Clinical Decision Support" },
  { value: "24/7", label: "Smart Assistance" },
];

export default function HomeScreen() {
  const videoRef = useRef(null);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER  ── */}
        <View style={styles.header}>
          <BrandLogo withText size={38} />
          <TouchableOpacity style={styles.loginBtn} activeOpacity={0.85} onPress={() => router.push("/login")}>
            <Text style={styles.loginText}>Log in</Text>
          </TouchableOpacity>
        </View>

        {/* ── HERO IMAGE with overlay text ── */}
        <View style={styles.heroImageContainer}>
          <Image
            source={require("../../assets/images/pharmlink-hero.jpeg")}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay}>
            <View style={styles.heroBadge}>
              <View style={styles.heroBadgeDot} />
              <Text style={styles.heroBadgeText}>
                AI-powered clinical decision support
              </Text>
            </View>
            <Text style={styles.heroTitle}>
              Smarter, safer{"\n"}medication journeys
            </Text>
            <Text style={styles.heroSubtitle}>
              Integrated drug checks, health advice, and AI-assisted
              prescription validation.
            </Text>
            <View style={styles.ctaRow}>
              <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => router.push("/register")}>
                <Text style={styles.primaryBtnText}>Get started</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.7} onPress={() => router.push("/dashboard")}>
                <Text style={styles.ghostBtnText}>View dashboard →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── STATS STRIP ── */}
        <View style={styles.statsStrip}>
          {STATS.map((s, i) => (
            <View
              key={i}
              style={[
                styles.statItem,
                i < STATS.length - 1 && styles.statBorder,
              ]}
            >
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── CHIPS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {[
            "Evidence-informed",
            "Clinician-friendly",
            "Patient-centric",
            "Safety-first",
          ].map((chip, i) => (
            <View key={i} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── MODULES SECTION ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>PLATFORM MODULES</Text>
          <Text style={styles.sectionTitle}>
            Four components,{"\n"}one connected experience.
          </Text>
        </View>

        <View style={styles.modulesGrid}>
          {MODULES.map((m, i) => (
            <ModuleCard key={i} module={m} />
          ))}
        </View>

        {/* ── ABOUT CARD ── */}
        <View style={styles.aboutCard}>
          <Video
            ref={videoRef}
            source={require("../../assets/images/Hero.mp4")}
            style={styles.aboutVideo}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted
            shouldPlay
          />
          <View style={styles.aboutOverlay} />
          <View style={styles.aboutContent}>
            <Text style={styles.aboutEyebrow}>ABOUT PHARMALINK</Text>
            <Text style={styles.aboutTitle}>
              Drug safety, nutrition &{"\n"}accessibility — unified.
            </Text>
            <Text style={styles.aboutBody}>
              PharmaLink is built for pharmacists, clinicians, and patients. We
              combine AI with curated clinical data to support safer medication
              journeys at every step of care.
            </Text>
            <View style={styles.aboutTagsRow}>
              {["Interaction checks", "Nutrition-aware", "Cross-brand", "Prescription AI"].map(
                (tag, i) => (
                  <View key={i} style={styles.aboutTag}>
                    <Text style={styles.aboutTagText}>{tag}</Text>
                  </View>
                )
              )}
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          For academic and research purposes only.{"\n"}
          Always consult a qualified healthcare professional.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModuleCard({ module }: { module: (typeof MODULES)[0] }) {
  return (
    <TouchableOpacity style={styles.moduleCard} activeOpacity={0.85}>
      {/* Left: image thumbnail */}
      <View style={styles.moduleImageWrap}>
        <Image
          source={module.image}
          style={styles.moduleImage}
          resizeMode="cover"
        />
      </View>

      {/* Right: content */}
      <View style={styles.moduleBody}>
        <View style={styles.moduleLabel}>
          <Text style={styles.moduleLabelText}>{module.label}</Text>
        </View>
        <Text style={styles.moduleCardTitle}>{module.title}</Text>
        <Text style={styles.moduleCardText}>{module.text}</Text>
        <Text style={styles.moduleArrow}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 48,
  },

  // ── Header  ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#2f2971",
  },
  loginBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  loginText: {
    color: "#2f2971",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.2,
  },

  // ── Hero image with overlay ──
  heroImageContainer: {
    position: "relative",
    height: 320,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(47, 41, 113, 0.75)",
    padding: 24,
    justifyContent: "flex-end",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 14,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.8)",
    marginRight: 6,
  },
  heroBadgeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 20,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  primaryBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 100,
    marginRight: 12,
  },
  primaryBtnText: {
    color: "#2f2971",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  ghostBtn: {
    paddingVertical: 12,
  },
  ghostBtnText: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    fontSize: 14,
  },

  // ── Stats strip ──
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  statItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2f2971",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 4,
    lineHeight: 14,
  },

  // ── Chips ──
  chipsRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  chip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    marginRight: 8,
  },
  chipText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "500",
  },

  // ── Section header ──
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#94A3B8",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 32,
    letterSpacing: -0.3,
  },

  // ── Module cards (horizontal with image) ──
  modulesGrid: {
    paddingHorizontal: 20,
  },
  moduleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
  },
  moduleImageWrap: {
    width: 90,
    minHeight: 120,
  },
  moduleImage: {
    width: "100%",
    height: "100%",
  },
  moduleBody: {
    flex: 1,
    padding: 14,
  },
  moduleLabel: {
    alignSelf: "flex-start",
    backgroundColor: "#EEEDFE",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 100,
    marginBottom: 7,
  },
  moduleLabelText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#3C3489",
  },
  moduleCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2f2971",
    marginBottom: 5,
    lineHeight: 18,
  },
  moduleCardText: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 17,
    marginBottom: 8,
  },
  moduleArrow: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2f2971",
  },

  // ── About card ──
   aboutCard: {
    marginHorizontal: 20,
    marginTop: 28,
    borderRadius: 24,
    overflow: "hidden",
    height: 280,
  },
  aboutVideo: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
aboutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(47, 41, 113, 0.82)",
  },
  aboutContent: {
    flex: 1,
    padding: 22,
    justifyContent: "flex-end",
  },
  aboutEyebrow: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 27,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  aboutBody: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 21,
    marginBottom: 16,
  },
  aboutTagsRow: { flexDirection: "row", flexWrap: "wrap" },
  aboutTag: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginRight: 7,
    marginBottom: 7,
  },
  aboutTagText: { color: "#FFFFFF", fontSize: 11, fontWeight: "500" },

  // ── Footer ──
  footer: {
    marginTop: 28,
    marginHorizontal: 20,
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
});