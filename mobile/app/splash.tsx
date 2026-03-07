import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  StatusBar,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function Splash() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(() => {
      router.replace("/welcome");
    }, 2200);

    return () => clearTimeout(t);
  }, []);

  return (
    <LinearGradient
      colors={["#020617", "#020617", "#030a1f"]}
      style={styles.screen}
    >
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[
          styles.center,
          { opacity: fade, transform: [{ scale }] },
        ]}
      >
        <View style={styles.logoWrap}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>PharmaLink</Text>
        <Text style={styles.sub}>Drug availability & accessibility</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  center: {
    alignItems: "center",
    gap: 10,
  },

  logoWrap: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  logo: { width: 70, height: 70 },

  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  sub: {
    color: "rgba(226,232,240,0.78)",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
