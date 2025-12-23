import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileMenu from "./ProfileMenu";
import { User, DEMO_AVATARS } from "../utils/auth";

export default function BrandHeader({ user }: { user: User | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const avatarSource = useMemo(() => {
    if (user?.avatarUri) return { uri: user.avatarUri };
    if (user?.avatarKey && DEMO_AVATARS[user.avatarKey]) return DEMO_AVATARS[user.avatarKey];
    return DEMO_AVATARS.doctor;
  }, [user?.avatarUri, user?.avatarKey]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        {/* LEFT: logo + brand */}
        <View style={styles.left}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.brandWrap}>
            <Text style={styles.brand} numberOfLines={1}>
              <Text style={styles.brandMain}>Pharm</Text>
              <Text style={styles.brandAccent}>Link</Text>
            </Text>

            <Text style={styles.tag} numberOfLines={1}>
              DRUG AVAILABILITY & ACCESSIBILITY
            </Text>
          </View>
        </View>

        {/* RIGHT: bell + avatar (keep as your app) */}
        <View style={styles.right}>
          <Pressable style={({ pressed }) => [styles.bell, pressed && { opacity: 0.85 }]} onPress={() => {}}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.bellDot} />
          </Pressable>

          <Pressable
            onPress={() => setMenuOpen(true)}
            style={({ pressed }) => [styles.avatarBtn, pressed && { opacity: 0.9 }]}
          >
            <Image source={avatarSource} style={styles.avatarImg} />
          </Pressable>
        </View>
      </View>

      <ProfileMenu user={user} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: "#fff" },

  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,23,42,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  left: { flexDirection: "row", alignItems: "center", gap: 3, flex: 1, minWidth: 0 },

  logo: { width: 40, height: 40 },

  brandWrap: { flex: 1, minWidth: 0 },

  brand: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.1,
    lineHeight: 30,
  },
  brandMain: { color: "#0f172a" },
  brandAccent: { color: "#2563eb" }, 

  tag: {
    marginTop: 0,
    fontSize: 9,
    fontWeight: "900",
    color: "#94a3b8",
    letterSpacing: 1.1,
  },

  right: { flexDirection: "row", alignItems: "center", gap: 12 },

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

  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    backgroundColor: "rgba(2,6,23,0.04)",
  },
  avatarImg: { width: "100%", height: "100%" },
});
