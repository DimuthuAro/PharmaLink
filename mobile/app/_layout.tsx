import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { getUser } from "@/utils/auth";
import { View, ActivityIndicator } from "react-native";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    getUser()
      .then((u) => {
        setLoggedIn(!!u);
      })
      .catch((error) => {
        console.warn("getUser error:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!loggedIn ? (
        <>
          <Stack.Screen name="splash" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="food-drug"/>
          <Stack.Screen name="history"/>
          <Stack.Screen name="meal-plan"/>
          <Stack.Screen name="meal-plan-result"/>
        </>
      ): (
          <Stack.Screen name="(tabs)" />
      )}
    </Stack>
  );
}
