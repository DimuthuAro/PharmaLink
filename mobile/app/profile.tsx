import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { getUser, clearUser, User } from "../utils/auth";
import { useRouter } from "expo-router";

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Profile</Text>

      <Info label="Name" value={user?.name} />
      <Info label="Email" value={user?.email} />
      <Info label="Role" value={user?.role} />

      <Pressable
        style={styles.logout}
        onPress={async () => {
          await clearUser();
          router.replace("/welcome");
        }}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
           <Text style={styles.backText}>Back</Text>
        </Pressable>
    </View>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617", padding: 20 },
  backText: { color: "#2563eb", fontWeight: "900" },
    backBtn: {
    width: 60,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(37,99,235,0.10)",
    alignItems: "center",
  },
  title: { color: "white", fontSize: 24, fontWeight: "900", marginBottom: 20 },
  row: { marginBottom: 12 },
  label: { color: "#94a3b8", fontWeight: "700" },
  value: { color: "white", fontWeight: "900" },
  logout: {
    marginTop: 30,
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  logoutText: { color: "white", fontWeight: "900" },
});
