import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { getUser } from "@/utils/auth";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    getUser().then((u) => {
      setLoggedIn(!!u)
      setLoading(false);
    });
  }, []);

  if (loading) return null;

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
        </>
      ): (
          <Stack.Screen name="(tabs)" />
      )}
    </Stack>
  );
}
