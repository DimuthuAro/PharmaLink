import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import UserAvatar from "./UserAvatar";
import { User } from "../utils/auth";
import ProfileMenu from "./ProfileMenu";

export default function BrandHeader({ user }: { user: User | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <View style={styles.left}>
          <Image source={require("../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={styles.brand}>PharmLink</Text>
            <Text style={styles.tag}>DRUG AVAILABILITY & ACCESSIBILITY</Text>
          </View>
        </View>

        <View style={styles.right}>
          <Pressable style={styles.bell}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.bellDot} />
          </Pressable>

          {/* Avatar button */}
          <Pressable onPress={() => setMenuOpen(true)} style={({ pressed }) => pressed && { opacity: 0.9 }}>
            <UserAvatar user={user} size={38} />
          </Pressable>
        </View>
      </View>

      <ProfileMenu user={user} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,23,42,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 34, height: 34 },
  brand: { fontSize: 20, fontWeight: "900", color: "#0f172a", letterSpacing: 0.2 },
  tag: { marginTop: 2, fontSize: 10.5, fontWeight: "800", color: "#94a3b8", letterSpacing: 0.8 },

  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: { fontSize: 16 },
  bellDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#ef4444",
  },
});
