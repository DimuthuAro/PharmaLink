// app/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BrandLogo from "../components/BrandLogo";
import { authRequest } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: { email?: string; password?: string } = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password.trim()) e.password = "Password is required";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    setGeneralError("");
    if (!validate()) return;

    try {
      setLoading(true);

      const data = await authRequest("/api/users/login", {
        method: "POST",
        body: { email, password },
      });

      await login({
        token: data.token,
        user: {
          id: data.user.id,
          name: data.user.fullName,
          email: data.user.email,
          role: "user",
        },
      });

      router.replace("/dashboard");
    } catch (err: any) {
      console.log("LOGIN ERROR:", err);
      setGeneralError(
    err?.error || err?.message || err?.details || "Invalid email or password."
  );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ImageBackground
        source={require("../assets/images/Loginn.jpeg")}
        style={styles.topPanel}
        imageStyle={styles.topImage}
      >
        <View style={styles.overlay} />
        <View style={styles.topContent}>
          <BrandLogo withText size={42} />
          <Text style={styles.heroTitle}>Sign in to continue your workflow.</Text>
          <Text style={styles.heroText}>
            Centralize interaction checks, nutrition-aware guidance, brand comparison,
            and prescription validation in one secure workspace.
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome back</Text>
        <Text style={styles.cardSub}>Sign in to access your account</Text>

        {!!generalError && <Text style={styles.generalError}>{generalError}</Text>}

        <Text style={styles.label}>Email address</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color="#7370a0" style={styles.leftIcon} />
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
            placeholder="you@hospital.org"
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, fieldErrors.email && styles.inputError]}
          />
        </View>
        {!!fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#7370a0" style={styles.leftIcon} />
          <TextInput
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            style={[styles.input, fieldErrors.password && styles.inputError]}
          />
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setShowPassword((s) => !s)}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color="#7370a0"
            />
          </TouchableOpacity>
        </View>
        {!!fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}

        <View style={styles.rowBetween}>
          <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
            <Ionicons
              name={rememberMe ? "checkbox" : "square-outline"}
              size={18}
              color="#2f2971"
            />
            <Text style={styles.rememberText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity>
            <Text style={styles.linkText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Sign in</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push("/register")}>
          <Text style={styles.secondaryText}>Create a new account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#fff", paddingBottom: 32 },
  topPanel: { height: 320, justifyContent: "flex-end" },
  topImage: { opacity: 0.95 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(47,41,113,0.72)" },
  topContent: { padding: 24 },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 24, marginBottom: 10 },
  heroText: { color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 22 },

  card: {
    marginHorizontal: 20,
    marginTop: -24,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#d9d7ee",
  },
  cardTitle: { fontSize: 28, fontWeight: "800", color: "#0e0c2a", textAlign: "center" },
  cardSub: { fontSize: 14, color: "#7370a0", textAlign: "center", marginTop: 6, marginBottom: 20 },
  generalError: {
    backgroundColor: "#fdf3f2",
    color: "#c0392b",
    borderWidth: 1,
    borderColor: "#f5c6c2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#3a3860", marginBottom: 6, marginTop: 8 },
  inputWrap: { position: "relative", marginBottom: 4 },
  leftIcon: { position: "absolute", left: 14, top: 15, zIndex: 2 },
  rightIcon: { position: "absolute", right: 14, top: 15, zIndex: 2 },
  input: {
    borderWidth: 1.5,
    borderColor: "#d9d7ee",
    backgroundColor: "#f6f5fc",
    borderRadius: 12,
    paddingLeft: 42,
    paddingRight: 42,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0e0c2a",
  },
  inputError: { borderColor: "#c0392b", backgroundColor: "#fdf3f2" },
  fieldError: { fontSize: 12, color: "#c0392b", marginTop: 4, marginBottom: 4 },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  rememberRow: { flexDirection: "row", alignItems: "center" },
  rememberText: { marginLeft: 8, fontSize: 13, color: "#3a3860" },
  linkText: { fontSize: 13, fontWeight: "600", color: "#2f2971" },

  submitBtn: {
    backgroundColor: "#2f2971",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: "#d9d7ee",
    backgroundColor: "#f6f5fc",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: "#2f2971", fontWeight: "700", fontSize: 15 },
});