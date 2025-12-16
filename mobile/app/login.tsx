import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { loginWithDemo } from "../utils/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onLogin = async () => {
    setError("");
    try {
      await loginWithDemo(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "Login failed");
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.sub}>Use demo accounts (doctor/admin/pharmacist)</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="doctor@pharmalink.com"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="doctor123"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          style={styles.input}
        />

        <Pressable onPress={onLogin} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Login</Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/register")} style={styles.linkBtn}>
          <Text style={styles.linkText}>Create account</Text>
        </Pressable>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.demoTitle}>Demo accounts:</Text>
          <Text style={styles.demo}>doctor@pharmalink.com / doctor123</Text>
          <Text style={styles.demo}>pharmacist@pharmalink.com / pharm123</Text>
          <Text style={styles.demo}>admin@pharmalink.com / admin123</Text>
        </View>
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b1220", justifyContent: "center", padding: 18 },
  card: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    borderRadius: 18,
    padding: 16,
  },
  title: { color: "white", fontSize: 22, fontWeight: "900" },
  sub: { color: "#94a3b8", marginTop: 6, marginBottom: 12 },
  error: {
    color: "#fecaca",
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.25)",
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    fontWeight: "700",
  },
  label: { color: "#cbd5e1", fontSize: 12, fontWeight: "800", marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: "#0b1220",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "white",
  },
  primaryBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  primaryText: { color: "white", fontWeight: "900" },
  linkBtn: { alignItems: "center", paddingVertical: 12 },
  linkText: { color: "#93c5fd", fontWeight: "800" },
  demoTitle: { color: "#e2e8f0", fontWeight: "900", marginBottom: 6 },
  demo: { color: "#94a3b8", fontWeight: "700" },
});
