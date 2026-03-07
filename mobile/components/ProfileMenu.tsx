import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { User } from "../utils/auth";
import UserAvatar from "./UserAvatar";
import { Ionicons } from "@expo/vector-icons";
import { red } from "react-native-reanimated/lib/typescript/Colors";

type Props = {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSignOut?: () => Promise<void> | void; // optional
};

export default function ProfileMenu({ user, open, onClose, onSignOut }: Props) {
  const router = useRouter();

  const name = useMemo(() => user?.name?.trim() || "User", [user?.name]);
  const email = useMemo(() => user?.email?.trim() || "user@pharmalink.com", [user?.email]);
  const role = useMemo(() => (user?.role ? capitalize(user.role) : "Doctor"), [user?.role]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      {/* Click outside to close */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          {/* Stop propagation so menu itself is clickable */}
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Header row */}
              <View style={styles.topRow}>
                <UserAvatar user={user} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {email}
                  </Text>
                  <Text style={styles.role}>{role}</Text>
                </View>

                <View style={styles.securePill}>
                  <Ionicons name="shield-checkmark" size={14} color="#166534" />
                  <Text style={styles.secureText}>Secure</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Menu items */}
              <Pressable
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                onPress={() => {
                  onClose();
                  router.push("/profile");
                }}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="person-outline" size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemText}>Profile</Text>
                  <Text style={styles.itemSub}>View & update your details</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                onPress={() => {
                  onClose();
                  router.push("/settings");
                }}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="settings-outline" size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemText}>Account settings</Text>
                  <Text style={styles.itemSub}>Security & preferences</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                onPress={async () => {
                  onClose();
                  await onSignOut?.();
                  router.replace("/welcome");
                }}
              >
                <View style={[styles.iconWrap,]}>
                  <Ionicons name="log-out-outline" size={18} color="#e11d48" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemText, { color: "#e11d48" }]}>Sign out</Text>
                  <Text style={[styles.itemSub, { color: "#fb7185" }]}>Exit your account</Text>
                </View>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.25)",
    alignItems: "flex-end",
    paddingTop: 62, 
    paddingRight: 12,
  },

  card: {
    width: 320,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: "hidden",
  },

  topRow: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    alignItems: "center",
  },

  name: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  email: { marginTop: 2, fontSize: 13, fontWeight: "700", color: "#475569" },
  role: { marginTop: 2, fontSize: 12, fontWeight: "800", color: "#64748b" },

  securePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  },
  secureText: { fontSize: 12, fontWeight: "900", color: "#166534" },

  divider: {
    height: 1,
    backgroundColor: "rgba(15,23,42,0.08)",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pressed: { backgroundColor: "rgba(148,163,184,0.12)" },

  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",

  },

  itemText: { fontSize: 15, fontWeight: "900", color: "#0f172a" },
  itemSub: { marginTop: 2, fontSize: 12, fontWeight: "700", color: "#64748b" },
});
