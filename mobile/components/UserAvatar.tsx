import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { User } from "../utils/auth";

const demoAvatars: Record<string, any> = {
  "doctor@pharmalink.com": require("../assets/images/doctor.jpg"),
  "pharmacist@pharmalink.com": require("../assets/images/pharmacist.jpg"),
  "admin@pharmalink.com": require("../assets/images/admin.jpg"),
};

export default function UserAvatar({ user, size = 36 }: { user: User | null; size?: number }) {
  const initials = useMemo(() => {
    const name = user?.name?.trim() || "User";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("");
  }, [user?.name]);

  const email = (user?.email || "").toLowerCase();
  const localAvatar = email && demoAvatars[email];

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {localAvatar ? (
        <Image source={localAvatar} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={styles.initials}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
  },
  initials: { color: "#fff", fontWeight: "900" },
});
