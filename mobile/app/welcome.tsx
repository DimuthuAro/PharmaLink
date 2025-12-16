import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ImageBackground
        source={require("../assets/images/hero.jpg")}
        style={styles.bg}
        resizeMode="cover"
      >
        {/* Premium overlay (top darker, bottom even darker for the card) */}
        <LinearGradient
          colors={[
            "rgba(2,6,23,0.30)",
            "rgba(2,6,23,0.65)",
            "rgba(2,6,23,0.92)",
          ]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView style={styles.safe}>
          <View style={styles.content}>
            {/* TOP */}
            <View style={styles.top}>
              <View style={styles.logoWrap}>
                <Image
                  source={require("../assets/images/logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.title}>Welcome to PharmaLink</Text>
              <Text style={styles.desc}>
                Drug interactions, food guidance, meal planning, and prescription
                support — in one place.
              </Text>
            </View>

            {/* BOTTOM GLASS CARD */}
            <BlurView intensity={28} tint="dark" style={styles.card}>
              <Pressable
                onPress={() => router.push("/auth")}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryText}>Get Started</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/(tabs)")}
                style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
              >
              </Pressable>
              <Text style={styles.footerHint}>
                By continuing, you agree to our Terms & Privacy Policy.
              </Text>
            </BlurView>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  bg: { flex: 1 },
  safe: { flex: 1 },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 18,
    justifyContent: "space-between",
  },

  top: {
    paddingTop: 18,
    gap: 10,
  },

  logoWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 60, height: 60 },

  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.2,
    marginTop: 4,
  },
  desc: {
    color: "rgba(226,232,240,0.84)",
    fontSize: 14.5,
    fontWeight: "600",
    lineHeight: 20,
    maxWidth: 340,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.14)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.22)",
  },
  chipText: { color: "rgba(219,234,254,0.95)", fontWeight: "800", fontSize: 12 },

  card: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    overflow: "hidden",
    // subtle elevation
    ...Platform.select({
      android: { elevation: 10 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
    }),
  },

  primaryBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  linkBtn: { paddingVertical: 12, alignItems: "center" },
  linkText: { color: "#bfdbfe", fontWeight: "900", fontSize: 13 },

  footerHint: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 11,
    color: "rgba(148,163,184,0.85)",
    fontWeight: "600",
  },

  pressed: { opacity: 0.86 },
});
