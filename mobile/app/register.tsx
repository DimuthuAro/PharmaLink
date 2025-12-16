import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Role, setUser } from "../utils/auth";

export default function Register() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // demo/local only
  const [role, setRole] = useState<Role>("doctor");

  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return name.trim().length >= 2 && email.includes("@") && password.length >= 3;
  }, [name, email, password]);

  const onRegister = async () => {
    setError("");

    if (name.trim().length < 2) return setError("Enter your name.");
    if (!email.includes("@")) return setError("Enter a valid email.");
    if (password.length < 3) return setError("Password too short.");

    // ✅ Do NOT allow admin register from UI (security best practice)
    // only doctor/pharmacist allowed here
    if (role === "admin") return setError("Admin registration is disabled.");

    await setUser({
      name: name.trim(),
      email: email.trim(),
      role,
    });

    router.replace("/(tabs)");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.sub}>Register as Doctor or Pharmacist</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Full name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Dr. Silva"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="min 3 chars (demo)"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          style={styles.input}
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          <RolePill selected={role === "doctor"} label="Doctor" onPress={() => setRole("doctor")} />
          <RolePill
            selected={role === "pharmacist"}
            label="Pharmacist"
            onPress={() => setRole("pharmacist")}
          />
        </View>

        <Pressable
          onPress={onRegister}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.primaryBtn,
            !canSubmit && { opacity: 0.5 },
            pressed && canSubmit && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.primaryText}>Create account</Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/login")} style={styles.linkBtn}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RolePill({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.pillOn : styles.pillOff,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.pillText, selected ? { color: "white" } : { color: "#0f172a" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b1220",
    justifyContent: "center",
    padding: 18,
  },
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
  roleRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center" },
  pillOn: { backgroundColor: "#2563eb" },
  pillOff: { backgroundColor: "#e2e8f0" },
  pillText: { fontWeight: "900" },
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
});
