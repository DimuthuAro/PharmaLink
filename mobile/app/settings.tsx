import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Image,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import BrandHeader from "@/components/BrandHeader";
import { getUser, clearUser, setUser, User } from "../utils/auth";

// -------------------- Storage Keys --------------------
const PROFILE_LOG_KEY = "pharmlink_profile_log_v1";
const SETTINGS_KEY = "pharmlink_settings_v1";
const SETTINGS_NOTIF_KEY = "pharmalink_settings_notifications";
const DARK_MODE_KEY = "pharmalink_dark_mode";

// -------------------- Demo avatar map --------------------
const demoAvatars: Record<string, any> = {
  "doctor@pharmalink.com": require("../assets/images/doctor.jpg"),
  "pharmacist@pharmalink.com": require("../assets/images/pharmacist.jpg"),
  "admin@pharmalink.com": require("../assets/images/admin.jpg"),
};

// -------------------- Types --------------------
type ProfileLogEntry = {
  id: string;
  timestamp: string;
  drugs: { name: string; index: number }[];
  allergies: string[];
};

type LocalSettings = {
  notifications: boolean;
  darkMode: boolean;
};

type Status = { type: "" | "ok" | "err"; msg: string };

// -------------------- Helpers --------------------
const prettyTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const allergyLabel = (k: string) => {
  const map: Record<string, string> = {
    peanut: "Peanut",
    tree_nut: "Tree nuts",
    milk: "Milk / Dairy",
    egg: "Egg",
    fish: "Fish",
    shellfish: "Shellfish",
    soy: "Soy",
    wheat: "Wheat / Gluten",
    sesame: "Sesame",
  };
  return map[k] || k;
};

export default function SettingsScreen() {
  const router = useRouter();

  const [user, setUserState] = useState<User | null>(null);

  const [status, setStatus] = useState<Status>({ type: "", msg: "" });
  const setOk = (msg: string) => setStatus({ type: "ok", msg });
  const setErr = (msg: string) => setStatus({ type: "err", msg });

  const [log, setLog] = useState<ProfileLogEntry[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // profile form
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // password demo
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const themeBg = darkMode ? "#020617" : "#eff6ff";
  const themeText = darkMode ? "#e2e8f0" : "#0f172a";
  const cardBg = darkMode ? "#0b1220" : "#ffffff";
  const borderCol = darkMode ? "rgba(148,163,184,0.16)" : "rgba(15,23,42,0.08)";

  const roleLabel = useMemo(() => {
    const r = (user?.role || "").toLowerCase();
    if (!r) return "Healthcare Professional";
    return r.charAt(0).toUpperCase() + r.slice(1);
  }, [user?.role]);

  const demoAvatar = useMemo(() => {
    const e = (user?.email || "").toLowerCase();
    return e ? demoAvatars[e] : null;
  }, [user?.email]);

  const loadLog = async () => {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_LOG_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setLog(Array.isArray(parsed) ? parsed : []);
    } catch {
      setLog([]);
    }
  };

  const loadSettings = async () => {
    try {
      const rawCombined = await AsyncStorage.getItem(SETTINGS_KEY);
      if (rawCombined) {
        const parsed = JSON.parse(rawCombined) as Partial<LocalSettings>;
        if (typeof parsed.darkMode === "boolean") setDarkMode(parsed.darkMode);
        if (typeof parsed.notifications === "boolean") setNotifications(parsed.notifications);
        return;
      }

      const [rawNotif, rawDark] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_NOTIF_KEY),
        AsyncStorage.getItem(DARK_MODE_KEY),
      ]);

      if (rawNotif) setNotifications(JSON.parse(rawNotif));
      if (rawDark) setDarkMode(rawDark === "true");
    } catch {}
  };

  useEffect(() => {
    (async () => {
      const u = await getUser();
      setUserState(u);

      setDisplayName(u?.name || "");
      setPhone(u?.phone || "");
      setEmail(u?.email || "");
      setAvatarPreview(u?.avatarUri || null);

      await Promise.all([loadLog(), loadSettings()]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const next: LocalSettings = { darkMode, notifications };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      await AsyncStorage.setItem(SETTINGS_NOTIF_KEY, JSON.stringify(notifications));
      await AsyncStorage.setItem(DARK_MODE_KEY, String(darkMode));
    })();
  }, [darkMode, notifications]);

  const pickImage = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          setErr("Permission required to pick an image.");
          return;
        }
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      setAvatarPreview(uri);
      setOk("Image selected. Save changes to apply.");
    } catch {
      setErr("Failed to pick image.");
    }
  };

  const saveProfileSettings = async () => {
    try {
      if (!user) return setErr("No user found. Please login again.");

      const trimmed = displayName.trim();
      if (!trimmed) return setErr("Display name cannot be empty.");

      const cleanEmail = email.trim();
      if (!cleanEmail || !cleanEmail.includes("@")) return setErr("Please enter a valid email.");

      const nextUser: User = {
        id: user.id,
        role: user.role,
        name: trimmed,
        email: cleanEmail,
        phone: phone.trim(),
        avatarUri: avatarPreview || null,
      };

      await setUser(nextUser);
      setUserState(nextUser);

      setOk("Profile saved successfully.");
    } catch {
      setErr("Failed to save settings.");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return setErr("Fill all password fields.");
    if (newPassword.length < 6) return setErr("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setErr("Passwords do not match.");

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOk("Password updated (demo/local).");
  };

  const resetEverythingAndLogout = () => {
    Alert.alert("Reset & Sign out", "This will remove PharmaLink local data and sign you out. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset & Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            const keys = await AsyncStorage.getAllKeys();
            const pharmaKeys = keys.filter((k) => k.startsWith("pharmalink_") || k.startsWith("pharmlink_"));
            if (pharmaKeys.length) await AsyncStorage.multiRemove(pharmaKeys);

            await clearUser();
            router.replace("/welcome");
          } catch {
            setErr("Failed to reset data.");
          }
        },
      },
    ]);
  };

  const clearSavedChecks = () => {
    Alert.alert("Clear", "Clear saved checks (medications + allergies)?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(PROFILE_LOG_KEY);
          setLog([]);
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: themeBg }]}>
      <BrandHeader user={user} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {!!status.msg && (
          <View style={[styles.status, { borderColor: borderCol, backgroundColor: cardBg }]}>
            <Text style={[styles.statusText, { color: themeText }]}>{status.msg}</Text>
            <Pressable onPress={() => setStatus({ type: "", msg: "" })} style={styles.statusClose}>
              <Ionicons name="close" size={16} color={themeText} />
            </Pressable>
          </View>
        )}

        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          {/* ✅ Back button LEFT + Title SAME ROW (like your screenshot) */}
          <View style={styles.cardHeaderRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backPill, pressed && { opacity: 0.8 }]}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={22} color="#2563eb" />
            </Pressable>

            <Text style={[styles.cardHeaderTitle, { color: themeText }]} numberOfLines={1}>
              Profile
            </Text>

            {/* right spacer to keep title perfectly centered */}
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.profileRow}>
            <View style={[styles.avatarBox, { borderColor: borderCol }]}>
              {avatarPreview ? (
                <Image source={{ uri: avatarPreview }} style={styles.avatarImg} />
              ) : demoAvatar ? (
                <Image source={demoAvatar} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarFallback}>U</Text>
              )}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.profileName, { color: themeText }]} numberOfLines={1}>
                {user?.name || "User"}
              </Text>

              <View style={styles.subRow}>
                <Ionicons name="mail-outline" size={14} color="#64748b" />
                <Text style={styles.subText} numberOfLines={1}>
                  {user?.email || "user@example.com"}
                </Text>
              </View>

              <View style={styles.subRow}>
                <Ionicons name="call-outline" size={14} color="#64748b" />
                <Text style={styles.subText} numberOfLines={1}>
                  {user?.phone || "—"}
                </Text>
              </View>

              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#065f46" />
                  <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Form */}
          <View style={{ marginTop: 14 }}>
            <Input
              label="Display name"
              icon="person-outline"
              value={displayName}
              onChangeText={setDisplayName}
              dark={darkMode}
            />
            <Input
              label="Phone number"
              icon="call-outline"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              dark={darkMode}
            />
            <Input
              label="Email address"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              dark={darkMode}
            />

            <Text style={[styles.fieldLabel, { color: themeText }]}>Upload profile image</Text>
            <Pressable onPress={pickImage} style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.92 }]}>
              <Ionicons name="image-outline" size={18} color="#1d4ed8" />
              <Text style={styles.uploadText}>Choose image</Text>
            </Pressable>

            <View style={{ alignItems: "flex-end", marginTop: 12 }}>
              <Pressable onPress={saveProfileSettings} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.92 }]}>
                <Text style={styles.saveBtnText}>Save changes</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Security */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.cardTitle, { color: themeText }]}>Security</Text>

          <Input
            label="Current password"
            icon="key-outline"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            dark={darkMode}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry dark={darkMode} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Confirm" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry dark={darkMode} />
            </View>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Pressable onPress={handleChangePassword} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.92 }]}>
              <Text style={styles.secondaryBtnText}>Update password</Text>
            </Pressable>
          </View>
        </View>

        {/* Display */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.cardTitle, { color: themeText }]}>Display settings</Text>

          <Toggle title="Dark mode" subtitle="Enable dark theme across the app." value={darkMode} onChange={setDarkMode} />
          <Toggle title="Notifications" subtitle="Show tips and reminders." value={notifications} onChange={setNotifications} />
        </View>

        {/* Saved checks */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.historyHeader}>
            <Text style={[styles.cardTitle, { color: themeText, marginBottom: 0 }]}>Saved checks</Text>

            {log.length > 0 ? (
              <Pressable onPress={clearSavedChecks} style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>

          {log.length === 0 ? (
            <Text style={[styles.empty, { marginTop: 10 }]}>No saved checks yet.</Text>
          ) : (
            // ✅ Scrollbar ONLY inside Saved checks
            <ScrollView
              style={styles.savedChecksScroll}
              contentContainerStyle={styles.savedChecksScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
            >
              <View style={{ gap: 12 }}>
                {log.map((entry) => (
                  <View key={entry.id} style={styles.logCard}>
                    <Text style={styles.time}>{prettyTime(entry.timestamp)}</Text>

                    <Text style={styles.subTitle}>Medications</Text>
                    <View style={styles.pillWrap}>
                      {(entry.drugs || []).map((d, i) => (
                        <View key={`${d.index}-${i}`} style={styles.pillBlue}>
                          <Text style={styles.pillBlueText}>{d.name}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={[styles.subTitle, { marginTop: 10 }]}>Allergies</Text>
                    <View style={styles.pillWrap}>
                      {(entry.allergies || []).length ? (
                        entry.allergies.map((a, i) => (
                          <View key={`${a}-${i}`} style={styles.pillRed}>
                            <Text style={styles.pillRedText}>{allergyLabel(a)}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.muted}>None</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Danger */}
        <View style={styles.cardDanger}>
          <Text style={styles.dangerTitle}>Reset & Sign out</Text>
          <Text style={styles.dangerDesc}>This will clear app data and log you out.</Text>

          <Pressable onPress={resetEverythingAndLogout} style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.92 }]}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.dangerBtnText}>Reset & Sign out</Text>
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

/* ---------------- Reusable components ---------------- */

function Input({
  label,
  icon,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  dark,
}: {
  label: string;
  icon?: any;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
  dark: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: dark ? "#e2e8f0" : "#0f172a" }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: dark ? "rgba(2,6,23,0.55)" : "#fff" }]}>
        {icon ? <Ionicons name={icon} size={18} color="#64748b" style={{ marginRight: 10 }} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={[styles.input, { color: dark ? "#e2e8f0" : "#0f172a" }]}
          keyboardType={keyboardType || "default"}
          secureTextEntry={secureTextEntry}
          placeholderTextColor={dark ? "rgba(226,232,240,0.55)" : "#94a3b8"}
        />
      </View>
    </View>
  );
}

function Toggle({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSub}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 14, paddingBottom: 18, gap: 12 },

  status: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  statusText: { fontWeight: "800", flex: 1 },
  statusClose: { padding: 6, borderRadius: 999 },

  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },

  // ✅ Perfect header row like screenshot: back left + title centered
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backPill: {
    width: 44,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 44,
    height: 38,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    flex: 1,
  },

  cardTitle: { fontSize: 13, fontWeight: "900", marginBottom: 12 },

  profileRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "rgba(37,99,235,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: { fontWeight: "900", fontSize: 18, color: "#1d4ed8" },

  profileName: { fontWeight: "900", fontSize: 16 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  subText: { color: "#64748b", fontWeight: "700", fontSize: 12 },

  badgeRow: { marginTop: 8, flexDirection: "row" },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.30)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  roleBadgeText: { color: "#065f46", fontWeight: "900", fontSize: 12 },

  fieldLabel: { fontSize: 12, fontWeight: "900", marginBottom: 8 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 12, fontWeight: "800" },

  uploadBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
    backgroundColor: "rgba(37,99,235,0.10)",
    paddingVertical: 12,
    borderRadius: 16,
  },
  uploadText: { fontWeight: "900", color: "#1d4ed8" },

  saveBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  saveBtnText: { color: "white", fontWeight: "900" },

  secondaryBtn: {
    marginTop: 10,
    backgroundColor: "#0f172a",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  secondaryBtnText: { color: "#fff", fontWeight: "900" },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.06)",
  },
  toggleTitle: { fontWeight: "900", color: "#0f172a" },
  toggleSub: { marginTop: 2, fontWeight: "700", color: "#64748b", fontSize: 12 },

  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    backgroundColor: "white",
  },
  clearBtnText: { color: "#e11d48", fontWeight: "900" },

  empty: { color: "#64748b", fontWeight: "700" },
  muted: { color: "#64748b", fontWeight: "700", marginTop: 6 },

  // ✅ Saved checks scrollbar area (adjust maxHeight if you want)
  savedChecksScroll: {
    marginTop: 10,
    maxHeight: 320,
  },
  savedChecksScrollContent: {
    paddingRight: 6,
    paddingBottom: 6,
  },

  logCard: {
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.30)",
    backgroundColor: "rgba(2,6,23,0.02)",
    borderRadius: 18,
    padding: 12,
  },
  time: { color: "#334155", fontWeight: "900", fontSize: 12 },
  subTitle: { marginTop: 10, color: "#0f172a", fontWeight: "900", fontSize: 12 },

  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pillBlue: {
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.20)",
    backgroundColor: "rgba(37,99,235,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillBlueText: { color: "#1d4ed8", fontWeight: "900", fontSize: 12 },
  pillRed: {
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    backgroundColor: "rgba(239,68,68,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillRedText: { color: "#991b1b", fontWeight: "900", fontSize: 12 },

  cardDanger: {
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    backgroundColor: "rgba(239,68,68,0.10)",
    borderRadius: 22,
    padding: 14,
  },
  dangerTitle: { fontWeight: "900", color: "#7f1d1d", fontSize: 13 },
  dangerDesc: { marginTop: 6, color: "#991b1b", fontWeight: "700" },
  dangerBtn: {
    marginTop: 12,
    backgroundColor: "#e11d48",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dangerBtnText: { color: "white", fontWeight: "900" },
});
