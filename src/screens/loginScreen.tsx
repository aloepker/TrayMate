import { setAuth, setUserEmail } from "../services/storage";
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
} from "react-native";

const AUTH_BASE_URL = "https://traymate-auth.onrender.com";

// Mock users for offline / dev fallback (when backend is unreachable)
const MOCK_USERS: Record<string, { token: string; role: string }> = {
  "admin@traymate.com":      { token: "mock-admin-token",     role: "ROLE_ADMIN" },
  "caregiver@traymate.com":  { token: "mock-caregiver-token", role: "ROLE_CAREGIVER" },
  "kitchen@traymate.com":    { token: "mock-kitchen-token",   role: "ROLE_KITCHEN" },
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
      case "ROLE_KITCHEN":      navigation.replace("KitchenBoard"); break;
      case "ROLE_KITCHEN_STAFF":navigation.replace("KitchenDashboard"); break;
      default:                  navigation.replace("Home");
    }
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${AUTH_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password");
      }

      await setAuth(data.token, data.role);
      await setUserEmail(email.trim().toLowerCase());
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
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
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
          placeholder="caregiver@traymate.com"
          placeholderTextColor="#8E8E93"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#8E8E93"
          secureTextEntry
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
  );
}

const styles = StyleSheet.create({
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
