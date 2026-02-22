import EncryptedStorage from "react-native-encrypted-storage";

const TOKEN_KEY = "auth_token";
const ROLE_KEY = "user_role";

export async function setAuth(token: string, role: string) {
  try {
    await EncryptedStorage.setItem(TOKEN_KEY, token);
    await EncryptedStorage.setItem(ROLE_KEY, role);
  } catch (error) {
    console.error("Storage Error:", error);
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await EncryptedStorage.getItem(TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

export async function clearAuth() {
  try {
    await EncryptedStorage.removeItem(TOKEN_KEY);
    await EncryptedStorage.removeItem(ROLE_KEY);
  } catch (error) {
    console.error("Clear Storage Error:", error);
  }
}

/*import { Platform } from "react-native";
import EncryptedStorage from "react-native-encrypted-storage";

const TOKEN_KEY = "auth_token";
const ROLE_KEY = "user_role";

export async function setAuth(token: string, role: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
  } else {
    try {
      await EncryptedStorage.setItem(TOKEN_KEY, token);
      await EncryptedStorage.setItem(ROLE_KEY, role);
    } catch (error) {
      console.error("Storage Error:", error);
    }
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return await EncryptedStorage.getItem(TOKEN_KEY);
}

export async function clearAuth() {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  } else {
    await EncryptedStorage.removeItem(TOKEN_KEY);
    await EncryptedStorage.removeItem(ROLE_KEY);
  }
} */



/*
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
const ROLE_KEY = "user_role";

export async function setAuth(token: string, role: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(ROLE_KEY, role);
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearAuth() {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(ROLE_KEY);
  }
}
*/