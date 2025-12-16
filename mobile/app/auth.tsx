import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function AuthChoice() {
  const router = useRouter();

  return (
<LinearGradient
  colors={["#00001A", "#000047","#088F8F", "#000047"]}
  style={styles.root}
>

      {/* Soft background shapes */}
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />

      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Get started</Text>
          <Text style={styles.sub}>Login or create your account</Text>
        </View>

        {/* 3D AI Character */}
        <View style={styles.imageWrap}>
          <Image
            source={require("../assets/images/ai-assistant.png")}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [
              styles.primary,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.primaryText}>Login</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondary,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.secondaryText}>Create account</Text>
          </Pressable>
        </View>

        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  safe: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 18,
  },

  blueOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 320,
},

topVignette: {
  position: "absolute",
  top: -120,
  left: -120,
  width: 360,
  height: 360,
  borderRadius: 180,
  backgroundColor: "rgba(14, 165, 233, 0.22)", // sky-blue glow
},

    logoWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 60, height: 60 },

  header: { marginTop:40, gap: 6 },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
  },
  sub: {
    color: "rgba(226,232,240,0.72)",
    fontWeight: "700",
  },

  imageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  image: {
    width: "100%",
    height: 350, // perfect balance
  },

  card: {
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    gap: 12,
  },

  primary: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  secondary: {
    backgroundColor: "rgba(2,6,23,0.35)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryText: {
    color: "rgba(226,232,240,0.95)",
    fontWeight: "900",
    fontSize: 15,
  },

  backBtn: { marginTop: 14, alignItems: "center" },
  back: { color: "#bfdbfe", fontWeight: "900" },

  pressed: { opacity: 0.85 },

  /* Decorative blobs */
  blob: {
    position: "absolute",
    backgroundColor: "rgba(37,99,235,0.18)",
    borderRadius: 999,
  },
  blobTop: {
    width: 260,
    height: 260,
    top: -100,
    right: -120,
  },
  blobBottom: {
    width: 200,
    height: 200,
    bottom: 120,
    left: -90,
  },
});
