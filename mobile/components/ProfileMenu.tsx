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
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {email}
                  </Text>
                  <Text style={styles.role}>{role}</Text>
                </View>

                <View style={styles.securePill}>
                  <Text style={styles.secureIcon}>🛡️</Text>
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
                <Text style={styles.itemIcon}>👤</Text>
                <Text style={styles.itemText}>Profile</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                onPress={() => {
                  onClose();
                  router.push("/settings"); // create later if you want
                }}
              >
                <Text style={styles.itemIcon}>⚙️</Text>
                <Text style={styles.itemText}>Account settings</Text>
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
                <Text style={[styles.itemIcon, { color: "#ef4444" }]}>⎋</Text>
                <Text style={[styles.itemText, { color: "#ef4444", fontWeight: "900" }]}>
                  Sign out
                </Text>
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
    paddingTop: 62, // places dropdown under header
    paddingRight: 12,
  },

  card: {
    width: 310,
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
  secureIcon: { fontSize: 13 },
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
    paddingVertical: 14,
  },
  pressed: { backgroundColor: "rgba(148,163,184,0.12)" },

  itemIcon: { width: 22, textAlign: "center", fontSize: 16, color: "#64748b" },
  itemText: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
});
