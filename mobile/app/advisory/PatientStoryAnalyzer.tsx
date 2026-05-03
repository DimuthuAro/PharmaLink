import React, { useEffect, useMemo, useRef, useState } from "react";
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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { analyzePatientStoryDistilBert } from "../../services/advisoryApi";
import DoctorSceneExact from "@/components/DoctorSceneExact";
import BrandLogo from "../../components/BrandLogo";

type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  token?: string | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  loading: boolean;
};

type StoryResponse = {
  message?: string;
  interaction_category?: string;
  severity?: number;
  confidence?: number;
  explanation?: string;
  advice?: string;
  timing_window?: string;
  reasons?: string[];
};

type ChatMessage = {
  type: "bot" | "user";
  text: string;
  meta?: StoryResponse | { severity?: number; interaction_category?: string; confidence?: number };
};

const MENU_ITEMS = [
  { label: "Dashboard", icon: "home-outline" as const, path: "/dashboard", replace: true },
  { label: "Food Drug Interaction", icon: "shield-checkmark-outline" as const, path: "/advisory/FoodDrugInteraction", replace: true },
  { label: "Meal Plan Advisor", icon: "clipboard-outline" as const, path: "/advisory/PersonalizedMealPlan", replace: false },
  { label: "Drug Image Analyzer", icon: "image-outline" as const, path: "/advisory/DrugImagePredict", replace: false },
  { label: "Patient Story Analyzer", icon: "sparkles-outline" as const, path: "/advisory/PatientStoryAnalyzer", replace: false },
  { label: "History", icon: "time-outline" as const, path: "/advisory/History", replace: false },
];

function prettyCategory(category?: string) {
  const map: Record<string, string> = {
    absorption_effect: "Absorption concern",
    possible_interaction: "Possible interaction",
    side_effect: "Side effect concern",
    better_with_food: "Better taken with food",
    missed_dose: "Missed dose",
    overdose: "Overdose concern",
    insufficient_information: "Need more details",
    no_clear_interaction: "No clear interaction",
  };
  return map[category || ""] || "Medicine advice";
}

function prettyTiming(timing?: string, data?: StoryResponse) {
  if (!timing) return "";
  const t = timing.toLowerCase();
  if (data?.reasons?.includes("glycemic_control")) {
    return "Eat before taking this medicine to avoid low blood sugar";
  }
  if (t.includes("24")) return "Avoid this for the rest of the day";
  if (t.includes("immediate")) return "Get medical advice immediately";
  if (t.includes("meal")) return "Take this medicine with food (do not skip meals)";
  if (t.includes("empty")) return "Take on an empty stomach";
  return timing;
}

function buildFriendlyBotText(data: StoryResponse) {
  if (data.message) return data.message;

  let intro = "";
  if (data.interaction_category === "overdose") {
    intro = "It sounds like you may have taken more medicine than intended.";
  } else if (data.interaction_category === "missed_dose") {
    intro = "It sounds like you may have missed a dose of your medicine.";
  } else if (data.interaction_category === "possible_interaction") {
    intro = "This combination may cause a medicine-related problem.";
  } else if (data.interaction_category === "absorption_effect") {
    intro = "This may affect how well the medicine is absorbed or works.";
  } else if (data.interaction_category === "side_effect") {
    intro = "This may increase the chance of unwanted symptoms or side effects.";
  } else if (data.interaction_category === "insufficient_information") {
    intro = "I do not have enough details to assess this properly.";
  } else if (data.interaction_category === "better_with_food") {
    intro = "This medicine works better when taken with food.";
  } else if (data.interaction_category === "no_clear_interaction") {
    intro = "No clear interaction could be identified from the information provided.";
  } else {
    intro = prettyCategory(data.interaction_category);
  }

  const friendlyTitle =
    data.severity === 2 ? "High risk" : data.severity === 1 ? "Please be careful" : "Good to know";

  return [
    `${friendlyTitle}: ${intro}`,
    data.explanation || "",
    data.advice ? `What you should do: ${data.advice}` : "",
    data.timing_window && data.timing_window !== "unknown"
      ? `When to be careful: ${prettyTiming(data.timing_window, data)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function getSeverityConfig(severity?: number) {
  if (severity === 2) {
    return {
      bubbleBg: "#FEF2F2",
      bubbleBorder: "#FECACA",
      tagBg: "#FEE2E2",
      tagText: "#B91C1C",
      badgeBg: "#FEE2E2",
      badgeText: "#B91C1C",
      dot: "#EF4444",
      label: "High risk",
    };
  }
  if (severity === 1) {
    return {
      bubbleBg: "#FFFBEB",
      bubbleBorder: "#FDE68A",
      tagBg: "#FEF3C7",
      tagText: "#B45309",
      badgeBg: "#FEF3C7",
      badgeText: "#92400E",
      dot: "#F59E0B",
      label: "Moderate risk",
    };
  }
  return {
    bubbleBg: "#ECFDF5",
    bubbleBorder: "#A7F3D0",
    tagBg: "#D1FAE5",
    tagText: "#047857",
    badgeBg: "#D1FAE5",
    badgeText: "#065F46",
    dot: "#10B981",
    label: "Low risk",
  };
}

function TypingDots() {
  return (
    <View style={styles.typingRow}>
      <ActivityIndicator size="small" color="#8B5CF6" />
      <Text style={styles.typingText}>Analyzing your story...</Text>
    </View>
  );
}

export default function PatientStoryAnalyzerScreen() {
  const { isAuthenticated, token, loading: authLoading, logout } = useAuth() as AuthContextType;

  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: "bot",
      text: "Hello! Tell me what medicine you took, what you ate or drank, and when it happened — I'll assess any potential risks.",
    },
  ]);

  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  const examplePrompts = useMemo(
    () => [
      "I took my antibiotic and then drank milk",
      "I drank alcohol after taking my sleeping pill",
      "I skipped breakfast and took my diabetes medicine",
      "I accidentally took my medicine twice this morning",
    ],
    []
  );

  const handleSend = async () => {
    const trimmed = story.trim();
    if (!trimmed || loading) return;

    if (!token) {
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text: "Your session is missing. Please log in again.",
          meta: { severity: 1 },
        },
      ]);
      return;
    }

    setMessages((prev) => [...prev, { type: "user", text: trimmed }]);
    setStory("");
    setLoading(true);
    setSpeaking(true);

    try {
      const data = await analyzePatientStoryDistilBert({ token, story: trimmed });
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const botText = buildFriendlyBotText(data);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: botText.trim(), meta: data },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text:
            err?.error ||
            err?.details ||
            err?.message ||
            "Something went wrong while analyzing the story.",
          meta: { severity: 1 },
        },
      ]);
    } finally {
      setLoading(false);
      setSpeaking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BrandLogo withText size={34} />
          </View>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setShowSidebar(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="menu-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ── HERO ── */}
          <View style={styles.pageHero}>
            <View style={styles.pageHeroBadge}>
              <View style={styles.pageHeroBadgeDot} />
              <Text style={styles.pageHeroBadgeText}>PHARMALINK ADVISORY</Text>
            </View>
            <Text style={styles.pageTitle}>Patient Story{"\n"}Analyzer</Text>
            <Text style={styles.pageDesc}>
              Describe what medicine you took, what you ate or drank, and what happened after.
            </Text>
          </View>

          {/* ── DOCTOR STATUS CARD ── */}
          <View style={styles.doctorStatusCard}>
            <View style={styles.doctorAvatarWrap}>
              <Ionicons name="medkit-outline" size={24} color="#6D5EF5" />
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>Story Assistant</Text>
              <View style={styles.doctorStatusRow}>
                <View style={[styles.statusDot, loading && styles.statusDotLoading]} />
                <Text style={styles.doctorStatusText}>
                  {loading ? "Analyzing..." : speaking ? "Responding..." : "Ready to analyze"}
                </Text>
              </View>
            </View>
            <View style={styles.modelChip}>
              <View style={styles.modelChipDot} />
              <Text style={styles.modelChipText}>Active</Text>
            </View>
          </View>

          {/* ── SCENE CARD ── */}
          <View style={styles.leftPanelCard}>
            <DoctorSceneExact speaking={speaking && !loading} />
          </View>

          {/* ── EXAMPLES ── */}
          <View style={styles.examplesCard}>
            <Text style={styles.examplesTitle}>Quick examples</Text>
            {examplePrompts.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={styles.exampleBtn}
                activeOpacity={0.85}
                onPress={() => setStory(prompt)}
              >
                <View style={styles.exampleBtnInner}>
                  <Ionicons name="flash-outline" size={14} color="#8B7CF6" style={{ marginRight: 8 }} />
                  <Text style={styles.exampleBtnText}>{prompt}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#C4B8FF" />
              </TouchableOpacity>
            ))}
          </View>

          {/* ── CHAT CARD ── */}
          <View style={styles.chatCard}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Story Chat</Text>
              <View style={styles.modelBadge}>
                <View style={styles.modelDot} />
                <Text style={styles.modelBadgeText}>Model Active</Text>
              </View>
            </View>

            {messages.map((msg, idx) => {
              const sev = msg.meta ? getSeverityConfig(msg.meta.severity) : null;
              const isUser = msg.type === "user";

              return (
                <View
                  key={`${msg.type}-${idx}`}
                  style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}
                >
                  <View style={[styles.avatar, isUser ? styles.userAvatar : styles.botAvatar]}>
                    <Text style={styles.avatarText}>{isUser ? "U" : "A"}</Text>
                  </View>

                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? styles.userBubble
                        : msg.meta?.severity !== undefined
                        ? { backgroundColor: sev?.bubbleBg, borderColor: sev?.bubbleBorder }
                        : styles.defaultBotBubble,
                    ]}
                  >
                    {!isUser && msg.meta?.severity !== undefined && sev && (
                      <View style={[styles.severityTag, { backgroundColor: sev.tagBg }]}>
                        <View style={[styles.severityDot, { backgroundColor: sev.dot }]} />
                        <Text style={[styles.severityTagText, { color: sev.tagText }]}>
                          {sev.label}
                        </Text>
                      </View>
                    )}

                    <Text
                      style={[
                        styles.messageText,
                        isUser ? styles.userMessageText : styles.botMessageText,
                        !isUser && msg.meta?.severity !== undefined && styles.botMessageTextColored,
                      ]}
                    >
                      {msg.text}
                    </Text>

                    {!isUser && msg.meta?.interaction_category && sev && (
                      <View style={styles.metaRow}>
                        <View style={[styles.metaBadge, { backgroundColor: sev.badgeBg }]}>
                          <Text style={[styles.metaBadgeText, { color: sev.badgeText }]}>
                            {prettyCategory(msg.meta.interaction_category)}
                          </Text>
                        </View>
                        {msg.meta?.confidence ? (
                          <View style={[styles.metaBadge, styles.confidenceBadge]}>
                            <Text style={styles.confidenceText}>
                              {(msg.meta.confidence * 100).toFixed(0)}% confidence
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={styles.messageRow}>
                <View style={[styles.avatar, styles.botAvatar]}>
                  <Text style={styles.avatarText}>A</Text>
                </View>
                <View style={[styles.messageBubble, styles.defaultBotBubble]}>
                  <TypingDots />
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* ── INPUT AREA ── */}
        <View style={styles.inputArea}>
          <View style={[styles.inputWrap, story.trim() ? styles.inputWrapActive : null]}>
            <TextInput
              value={story}
              onChangeText={setStory}
              placeholder="Describe the patient story… e.g. I drank alcohol after taking a sedative"
              placeholderTextColor="#475569"
              multiline
              style={styles.input}
              textAlignVertical="top"
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={loading || !story.trim()}
              activeOpacity={0.85}
              style={[styles.sendBtn, (loading || !story.trim()) && styles.sendBtnDisabled]}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            Every response includes a medicine-safety explanation when enough details are provided.
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* ── SIDEBAR MODAL (unchanged from original) ── */}
      <Modal
        visible={showSidebar}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSidebar(false)}
      >
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setShowSidebar(false)} />

          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <BrandLogo withText size={32} />
              <TouchableOpacity
                onPress={() => setShowSidebar(false)}
                style={styles.drawerCloseBtn}
              >
                <Ionicons name="close-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerDivider} />

            <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
              {MENU_ITEMS.map((item) => {
                const isActive = item.path === "/advisory/PatientStoryAnalyzer";
                return (
                  <TouchableOpacity
                    key={item.path}
                    style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setShowSidebar(false);
                      if (item.replace) router.replace(item.path as any);
                      else router.push(item.path as any);
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={isActive ? "#2f2971" : "#FFFFFF"}
                    />
                    <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.drawerDivider} />

            <View style={styles.drawerBottom}>
              <TouchableOpacity
                style={styles.drawerItem}
                activeOpacity={0.8}
                onPress={() => {
                  setShowSidebar(false);
                  router.push("/Profile" as any);
                }}
              >
                <Ionicons name="person-circle-outline" size={22} color="#FFFFFF" />
                <Text style={styles.drawerItemText}>My Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                activeOpacity={0.8}
                onPress={async () => {
                  setShowSidebar(false);
                  await logout();
                  router.replace("/login");
                }}
              >
                <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
                <Text style={styles.drawerItemText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#0D0F1E" },

  // ─── HEADER ───────────────────────────────────────────────
  header: {
    backgroundColor: "#0D0F1E",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerLeft: { flex: 1 },
  menuBtn: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1E2340",
  },

  // ─── SCROLL ───────────────────────────────────────────────
  container: { flex: 1, backgroundColor: "#0D0F1E" },
  content: { paddingBottom: 28 },

  // ─── HERO ─────────────────────────────────────────────────
  pageHero: {
    backgroundColor: "#0D0F1E",
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 28,
  },
  pageHeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(109,94,245,0.25)",
    borderWidth: 1,
    borderColor: "rgba(109,94,245,0.4)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginBottom: 14,
    gap: 6,
  },
  pageHeroBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#8B7CF6",
  },
  pageHeroBadgeText: {
    color: "#A99EFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  pageDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.50)",
    lineHeight: 20,
  },

  // ─── DOCTOR STATUS CARD ───────────────────────────────────
  doctorStatusCard: {
    backgroundColor: "#151828",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1E2340",
    marginHorizontal: 14,
    marginTop: -14,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  doctorAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(109,94,245,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  doctorInfo: { flex: 1 },
  doctorName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  doctorStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  statusDotLoading: {
    backgroundColor: "#F59E0B",
  },
  doctorStatusText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  modelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.10)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.20)",
  },
  modelChipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },
  modelChipText: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "700",
  },

  // ─── DOCTOR SCENE CARD ────────────────────────────────────
  leftPanelCard: {
    backgroundColor: "#151828",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E2340",
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },

  // ─── EXAMPLES ─────────────────────────────────────────────
  examplesCard: {
    backgroundColor: "#151828",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E2340",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    marginHorizontal: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  examplesTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4B5280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  exampleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1A1F35",
    borderWidth: 1,
    borderColor: "#252B45",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  exampleBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 6,
  },
  exampleBtnText: {
    fontSize: 12.5,
    color: "#CBD5E1",
    fontWeight: "500",
    flex: 1,
  },

  // ─── CHAT CARD ────────────────────────────────────────────
  chatCard: {
    backgroundColor: "#0E1120",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1F2540",
    padding: 14,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2540",
  },
  chatTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  modelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.10)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.22)",
  },
  modelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },
  modelBadgeText: {
    color: "#34D399",
    fontSize: 10,
    fontWeight: "700",
  },

  // ─── MESSAGES ─────────────────────────────────────────────
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
    gap: 8,
  },
  botRow: { justifyContent: "flex-start" },
  userRow: { justifyContent: "flex-end" },

  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  botAvatar: { backgroundColor: "#6D5EF5" },
  userAvatar: { backgroundColor: "#475569" },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: "#6D5EF5",
    borderColor: "#5B4FD4",
    borderBottomRightRadius: 4,
  },
  defaultBotBubble: {
    backgroundColor: "#1A2035",
    borderColor: "#2A3250",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  botMessageText: {
    color: "#C8D0E4",
  },
  botMessageTextColored: {
    color: "#1A1A1A",
  },

  severityTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
    gap: 5,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  severityTagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.07)",
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metaBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  confidenceBadge: {
    backgroundColor: "#EFF6FF",
  },
  confidenceText: {
    color: "#2563EB",
    fontSize: 10.5,
    fontWeight: "700",
  },

  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  typingText: {
    color: "#94A3B8",
    fontSize: 12,
  },

  // ─── INPUT AREA ───────────────────────────────────────────
  inputArea: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "#0D0F1E",
    borderTopWidth: 1,
    borderTopColor: "#1E2340",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
    backgroundColor: "#151828",
    borderWidth: 1.5,
    borderColor: "#252B45",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputWrapActive: {
    borderColor: "#6D5EF5",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 19,
    paddingTop: 2,
    paddingBottom: 2,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#6D5EF5",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  helperText: {
    marginTop: 8,
    fontSize: 10.5,
    color: "#3D4466",
    paddingHorizontal: 2,
    lineHeight: 15,
  },

  // ─── SIDEBAR (unchanged from original) ────────────────────
  drawerOverlay: { flex: 1, flexDirection: "row" },
  drawerBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  drawer: {
    width: "82%",
    backgroundColor: "#2f2971",
    paddingBottom: 28,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  drawerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 20,
  },
  drawerMenu: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 17,
    paddingHorizontal: 18,
    borderRadius: 999,
    marginBottom: 4,
  },
  drawerItemActive: {
    backgroundColor: "#FFFFFF",
  },
  drawerItemText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  drawerItemTextActive: {
    color: "#2f2971",
  },
  drawerBottom: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
});