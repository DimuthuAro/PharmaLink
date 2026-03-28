// app/register.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BrandLogo from "../components/BrandLogo";
import { authRequest } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen() {
  const { login } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    age: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    allowMarketing: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordStrength = useMemo(() => {
    let s = 0;
    if (form.password.length >= 8) s++;
    if (/[A-Z]/.test(form.password)) s++;
    if (/[a-z]/.test(form.password)) s++;
    if (/\d/.test(form.password)) s++;
    if (/[^A-Za-z0-9]/.test(form.password)) s++;
    return s;
  }, [form.password]);

  const strengthMeta = useMemo(() => {
    if (passwordStrength <= 1) return { label: "Weak", color: "#c0392b", width: "20%" };
    if (passwordStrength === 2) return { label: "Fair", color: "#d97706", width: "45%" };
    if (passwordStrength === 3) return { label: "Good", color: "#2563eb", width: "70%" };
    return { label: "Strong", color: "#059669", width: "100%" };
  }, [passwordStrength]);

  const update = (key: string, value: any) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: "" }));
    setGeneralError("");
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.age.trim()) e.age = "Age is required";
    else if (!/^\d+$/.test(form.age) || Number(form.age) <= 0) e.age = "Enter a valid age";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm password";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!form.acceptTerms) e.acceptTerms = "Please accept Terms & Privacy Policy";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const fullName = `${form.firstName} ${form.lastName}`.trim();

      await authRequest("/api/users/register", {
        method: "POST",
        body: {
          fullName,
          email: form.email,
          password: form.password,
          age: Number(form.age),
          phone: form.phone,
        },
      });

      const data = await authRequest("/api/users/login", {
        method: "POST",
        body: {
          email: form.email,
          password: form.password,
        },
      });

      await login({
        token: data.token,
        user: {
          id: data.user.id,
          name: data.user.fullName,
          email: data.user.email,
          phone: form.phone,
          age: Number(form.age),
        },
      });

      router.replace("/dashboard");
    } catch (err: any) {
        console.log("REGISTER ERROR:", err);
  setGeneralError(
    err?.error || err?.message || err?.details || "Registration failed. Please try again."
  );
    } finally {
      setLoading(false);
    }
  };

  const passwordMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;

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
          <Text style={styles.heroTitle}>Create your PharmaLink account.</Text>
          <Text style={styles.heroText}>
            Join a secure workspace for interaction checks, nutrition-aware guidance,
            brand comparison, and AI prescription validation.
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create account</Text>
        <Text style={styles.cardSub}>Set up your PharmaLink profile</Text>

        {!!generalError && <Text style={styles.generalError}>{generalError}</Text>}

        <Text style={styles.section}>PERSONAL INFO</Text>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              value={form.firstName}
              onChangeText={(t) => update("firstName", t)}
              placeholder="First name"
              style={[styles.input, errors.firstName && styles.inputError]}
            />
            {!!errors.firstName && <Text style={styles.fieldError}>{errors.firstName}</Text>}
          </View>

          <View style={styles.col}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              value={form.lastName}
              onChangeText={(t) => update("lastName", t)}
              placeholder="Last name"
              style={[styles.input, errors.lastName && styles.inputError]}
            />
            {!!errors.lastName && <Text style={styles.fieldError}>{errors.lastName}</Text>}
          </View>
        </View>

        <Text style={styles.label}>Email address</Text>
        <TextInput
          value={form.email}
          onChangeText={(t) => update("email", t)}
          placeholder="you@hospital.org"
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, errors.email && styles.inputError]}
        />
        {!!errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              value={form.age}
              onChangeText={(t) => update("age", t)}
              placeholder="24"
              keyboardType="numeric"
              style={[styles.input, errors.age && styles.inputError]}
            />
            {!!errors.age && <Text style={styles.fieldError}>{errors.age}</Text>}
          </View>

          <View style={styles.col}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              value={form.phone}
              onChangeText={(t) => update("phone", t)}
              placeholder="+94 7X XXX XXXX"
              style={[styles.input, errors.phone && styles.inputError]}
            />
            {!!errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}
          </View>
        </View>

        <Text style={styles.section}>SECURITY</Text>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={form.password}
            onChangeText={(t) => update("password", t)}
            placeholder="Create password"
            secureTextEntry={!showPassword}
            style={[styles.input, errors.password && styles.inputError, { paddingRight: 44 }]}
          />
          <TouchableOpacity style={styles.rightIcon} onPress={() => setShowPassword((s) => !s)}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color="#7370a0"
            />
          </TouchableOpacity>
        </View>
        {!!form.password && (
          <View style={styles.strengthRow}>
            <View style={styles.strengthTrack}>
              <View
                style={[
                  styles.strengthFill,
                  { width: strengthMeta.width as any, backgroundColor: strengthMeta.color },
                ]}
              />
            </View>
            <Text style={[styles.strengthText, { color: strengthMeta.color }]}>
              {strengthMeta.label}
            </Text>
          </View>
        )}
        {!!errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}

        <Text style={styles.label}>Confirm password</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={form.confirmPassword}
            onChangeText={(t) => update("confirmPassword", t)}
            placeholder="Confirm password"
            secureTextEntry={!showConfirmPassword}
            style={[styles.input, errors.confirmPassword && styles.inputError, { paddingRight: 44 }]}
          />
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setShowConfirmPassword((s) => !s)}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color="#7370a0"
            />
          </TouchableOpacity>
        </View>
        {!!form.confirmPassword && (
          <Text style={[styles.matchText, { color: passwordMatch ? "#059669" : "#c0392b" }]}>
            {passwordMatch ? "Passwords match" : "Passwords do not match"}
          </Text>
        )}
        {!!errors.confirmPassword && (
          <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
        )}

        <View style={styles.sectionGap}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => update("acceptTerms", !form.acceptTerms)}
          >
            <Ionicons
              name={form.acceptTerms ? "checkbox" : "square-outline"}
              size={18}
              color="#2f2971"
            />
            <Text style={styles.checkboxText}>
              I agree to the Terms and Privacy Policy
            </Text>
          </TouchableOpacity>
          {!!errors.acceptTerms && <Text style={styles.fieldError}>{errors.acceptTerms}</Text>}

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => update("allowMarketing", !form.allowMarketing)}
          >
            <Ionicons
              name={form.allowMarketing ? "checkbox" : "square-outline"}
              size={18}
              color="#2f2971"
            />
            <Text style={styles.checkboxText}>
              Send me product updates and healthcare insights
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signinRow} onPress={() => router.push("/login")}>
          <Text style={styles.signinText}>
            Already have an account? <Text style={styles.signinLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#fff", paddingBottom: 32 },
  topPanel: { height: 300, justifyContent: "flex-end" },
  topImage: { opacity: 0.95 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(47,41,113,0.72)" },
  topContent: { padding: 24 },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 24, marginBottom: 10 },
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

  section: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#7370a0",
  },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },

  label: { fontSize: 13, fontWeight: "600", color: "#3a3860", marginBottom: 6, marginTop: 8 },
  inputWrap: { position: "relative" },
  rightIcon: { position: "absolute", right: 14, top: 14 },
  input: {
    borderWidth: 1.5,
    borderColor: "#d9d7ee",
    backgroundColor: "#f6f5fc",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0e0c2a",
  },
  inputError: { borderColor: "#c0392b", backgroundColor: "#fdf3f2" },
  fieldError: { fontSize: 12, color: "#c0392b", marginTop: 4, marginBottom: 4 },

  strengthRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  strengthTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#d9d7ee",
    overflow: "hidden",
  },
  strengthFill: { height: "100%", borderRadius: 999 },
  strengthText: { fontSize: 12, fontWeight: "700" },
  matchText: { fontSize: 12, fontWeight: "700", marginTop: 6 },

  sectionGap: { marginTop: 16, marginBottom: 20, gap: 10 },
  checkboxRow: { flexDirection: "row", alignItems: "flex-start" },
  checkboxText: { marginLeft: 8, flex: 1, fontSize: 13, color: "#3a3860", lineHeight: 20 },

  submitBtn: {
    backgroundColor: "#2f2971",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  signinRow: { marginTop: 16, alignItems: "center" },
  signinText: { color: "#7370a0", fontSize: 13 },
  signinLink: { color: "#2f2971", fontWeight: "700" },
});