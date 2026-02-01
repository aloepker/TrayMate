// import React, { useState } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   Pressable,
//   StyleSheet,
//   useWindowDimensions,
//   Image,
// } from "react-native";
// import { router } from "expo-router";
// import { LinearGradient } from "expo-linear-gradient";

// export default function Login() {
//   const { width } = useWindowDimensions();
//   const isTablet = width >= 768;

//   const [email, setEmail] = useState("caregiver@traymate.com");
//   const [password, setPassword] = useState("");

//   return (
//     <View style={styles.page}>
//       <View style={[styles.card, isTablet && styles.cardTablet]}>
//         <Image
//           source={require("../assets/images/grandma.png")}
//           style={styles.logo}
//           resizeMode="contain"
//         />

//         <Text style={styles.title}>TrayMate</Text>
//         <Text style={styles.subtitle}>Every Meal Respects Every Need</Text>

//         <Text style={styles.label}>Email</Text>
//         <TextInput
//           value={email}
//           onChangeText={setEmail}
//           placeholder="caregiver@traymate.com"
//           placeholderTextColor="#8E8E93"
//           keyboardType="email-address"
//           autoCapitalize="none"
//           style={styles.input}
//         />

//         <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
//         <TextInput
//           value={password}
//           onChangeText={setPassword}
//           placeholder="••••••••"
//           placeholderTextColor="#8E8E93"
//           secureTextEntry
//           style={styles.input}
//         />

//         <Pressable
//           style={styles.buttonWrap}
//           onPress={() => router.replace("/(tabs)")}
//         >
//           <LinearGradient
//             colors={["#717644", "#5f653a"]}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={styles.button}
//           >
//             <Text style={styles.buttonText}>Sign In</Text>
//           </LinearGradient>
//         </Pressable>

//         <Pressable onPress={() => console.log("Forgot password")}>
//           <Text style={styles.forgot}>Forgot password?</Text>
//         </Pressable>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   page: {
//     flex: 1,
//     backgroundColor: "#cbc2b4",
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 24,
//   },

//   card: {
//     width: "100%",
//     maxWidth: 600,
//     backgroundColor: "#ffffff",
//     borderRadius: 20,
//     paddingVertical: 28,
//     paddingHorizontal: 28,
//     alignItems: "center",

//     shadowColor: "#000",
//     shadowOpacity: 0.15,
//     shadowRadius: 20,
//     shadowOffset: { width: 0, height: 10 },
//     elevation: 6,
//   },

//   cardTablet: {
//     maxWidth: 640,
//   },

//   logo: {
//     width: 90,
//     height: 90,
//     borderRadius: 45,
//     marginBottom: 10,
//   },

//   title: {
//     fontSize: 36,
//     fontWeight: "700",
//     color: "#2f2f2f",
//     marginBottom: 4,
//   },

//   subtitle: {
//     textAlign: "center",
//     fontSize: 16,
//     lineHeight: 22,
//     color: "#6b6b6b",
//     marginBottom: 26,
//   },

//   label: {
//     alignSelf: "flex-start",
//     fontSize: 14,
//     fontWeight: "700",
//     color: "#2f2f2f",
//     marginBottom: 8,
//   },

//   input: {
//     width: "100%",
//     backgroundColor: "#f3f3f3",
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 16, // taller inputs for tablet/seniors
//     fontSize: 16,
//     color: "#111111",
//   },

//   buttonWrap: {
//     width: "100%",
//     alignSelf: "stretch",
//     marginTop: 28,
//     borderRadius: 14,
//     overflow: "hidden",
//   },

//   button: {
//     width: "100%",
//     paddingVertical: 18, // bigger button
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   buttonText: {
//     color: "#ffffff",
//     fontSize: 19,
//     fontWeight: "800",
//     letterSpacing: 0.3,
//   },

//   forgot: {
//     marginTop: 18,
//     fontSize: 14,
//     color: "#717644",
//     fontWeight: "600",
//   },
// });

import { setAuth } from "../services/storage";

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
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const AUTH_BASE_URL = "https://traymate-auth.onrender.com";

export default function Login() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  //const [email, setEmail] = useState("caregiver@traymate.com");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${AUTH_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password");
      }

      // Later: store JWT/session here (SecureStore)
      //router.replace("/(tabs)");
      console.log("Login success:", data);
      // await SecureStore.setItemAsync("auth_token", data.token);
      // await SecureStore.setItemAsync("user_role", data.role);
      
      await setAuth(data.token, data.role);


      switch (data.role) {
        case "ROLE_ADMIN":
          router.replace("/admin");
          break;

        // case "ROLE_CAREGIVER":
        //   router.replace("/caregiver");
        //   break;

        // case "ROLE_KITCHEN":
        //   router.replace("/kitchen");
        //   break;

        default:
          router.replace("/(tabs)");
          // setError("Unknown role");
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={[styles.card, isTablet && styles.cardTablet]}>
        <Image
          source={require("../assets/images/grandma.png")}
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

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <Pressable
          style={styles.buttonWrap}
          onPress={handleLogin}
          disabled={loading}
        >
          <LinearGradient
            colors={["#717644", "#5f653a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => console.log("Forgot password")}>
          <Text style={styles.forgot}>Forgot password?</Text>
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

  buttonWrap: {
    width: "100%",
    alignSelf: "stretch",
    marginTop: 28,
    borderRadius: 14,
    overflow: "hidden",
  },

  button: {
    width: "100%",
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  forgot: {
    marginTop: 18,
    fontSize: 14,
    color: "#717644",
    fontWeight: "600",
  },
});
