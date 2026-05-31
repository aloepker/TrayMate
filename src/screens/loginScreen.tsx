import { setAuth, setUserEmail } from "../services/storage";
import { getResidents, getCaregiverResidents } from "../services/api";
import { setResidentsCache } from "../services/localDataService";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

const AUTH_BASE_URL = "https://traymate-auth.onrender.com";

// Mock users for offline / dev fallback (when backend is unreachable)
const MOCK_USERS: Record<string, { token: string; role: string }> = {
  "admin@traymate.com":      { token: "mock-admin-token",     role: "ROLE_ADMIN" },
  "caregiver@traymate.com":  { token: "mock-caregiver-token", role: "ROLE_CAREGIVER" },
  "kitchen@traymate.com":    { token: "mock-kitchen-token",   role: "ROLE_KITCHEN_STAFF" },
  "salimova.s@traymate.com": { token: "mock-caregiver-token", role: "ROLE_CAREGIVER" },
};

export default function Login({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigateByRole = (role: string) => {
    switch (role) {
      case "ROLE_ADMIN":        navigation.replace("AdminDashboard"); break;
      case "ROLE_CAREGIVER":    navigation.replace("CaregiverDashboard"); break;
      case "ROLE_KITCHEN":      navigation.replace("KitchenDashboard"); break;
      case "ROLE_KITCHEN_STAFF":navigation.replace("KitchenDashboard"); break;
      // Residents land on Upcoming Meals (the per-period summary). The
      // menu is reachable from there via the Order Breakfast / Lunch
      // / Dinner cards, keeping the daily "what am I eating today"
      // question one screen away.
      default:                  navigation.replace("UpcomingMeals");
    }
  };

  // Render free-tier servers spin down after inactivity and return an empty
  // body on the first wake-up request. Retry with backoff so the user sees
  // a friendly "waking up" message instead of a raw JSON parse error.
  const loginWithRetry = async (): Promise<{ token: string; role: string }> => {
    const DELAYS = [7000, 14000]; // 2 retries: 7 s, 14 s
    let lastErr: any;
    for (let attempt = 0; attempt <= DELAYS.length; attempt++) {
      if (attempt > 0) {
        setError(`Server is waking up… retrying (${attempt}/${DELAYS.length})`);
        await new Promise(r => setTimeout(r, DELAYS[attempt - 1]));
      }
      try {
        const response = await fetch(`${AUTH_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const text = await response.text();

        // Empty body = server still spinning up → retry
        if (!text.trim()) {
          lastErr = new Error("empty_response");
          continue;
        }

        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          lastErr = new Error("invalid_response");
          continue;
        }

        if (!response.ok) {
          throw new Error(data?.message || "Invalid email or password");
        }
        return data as { token: string; role: string };
      } catch (err: any) {
        lastErr = err;
        const isNetwork = err?.message === "Network request failed";
        const isWakeUp = err?.message === "empty_response" || err?.message === "invalid_response";
        if ((isNetwork || isWakeUp) && attempt < DELAYS.length) continue;
        throw err;
      }
    }
    throw lastErr ?? new Error("Server unavailable. Please try again.");
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await loginWithRetry();

      await setAuth(data.token, data.role);
      await setUserEmail(email.trim().toLowerCase());

      // Prime the local resident cache from the backend so every
      // resident-facing screen reads real data instead of the demo seed.
      // Pick the endpoint that matches the logged-in role; swallow errors
      // because login itself has already succeeded.
      try {
        const list =
          data.role === "ROLE_ADMIN"
            ? await getResidents()
            : data.role === "ROLE_CAREGIVER"
            ? await getCaregiverResidents()
            : [];
        setResidentsCache(list as any);
      } catch (e) {
        console.warn("Failed to prime residents cache after login:", e);
      }

      setError("");
      navigateByRole(data.role);
    } catch (err: any) {
      // Network unreachable — try mock credentials
      if (err.message === "Network request failed") {
        const key = email.trim().toLowerCase();
        const mock = MOCK_USERS[key];
        if (mock) {
          await setAuth(mock.token, mock.role);
          await setUserEmail(key);
          navigateByRole(mock.role);
          return;
        }
        setError("Server unreachable. Use a demo account (e.g. admin@traymate.com).");
      } else {
        const raw = err?.message ?? "";
        const isWakeUp = raw === "empty_response" || raw === "invalid_response" || raw === "Server unavailable after retries";
        setError(
          isWakeUp
            ? "Server took too long to wake up. Please try again in a moment."
            : raw || "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.page}>
            <View style={[styles.card, isTablet && styles.cardTablet]}>
              <Image
                source={require("../styles/pictures/grandma.png")}
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={styles.title}>TrayMate</Text>
              <Text style={styles.subtitle}>Every Meal Respects Every Need</Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@traymate.com"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                style={styles.input}
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#8E8E93"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={styles.input}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#cbc2b4",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  page: {
    flex: 1,
    backgroundColor: "#cbc2b4",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 600,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardTablet: {
    maxWidth: 640,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#2f2f2f",
    marginBottom: 4,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 22,
    color: "#6b6b6b",
    marginBottom: 26,
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 14,
    fontWeight: "700",
    color: "#2f2f2f",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    backgroundColor: "#f3f3f3",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#111111",
  },
  errorText: {
    color: "#d32f2f",
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    width: "100%",
    marginTop: 28,
    borderRadius: 14,
    backgroundColor: "#717644",
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
