import EncryptedStorage from "react-native-encrypted-storage";

const TOKEN_KEY = "auth_token";
const ROLE_KEY  = "user_role";
const EMAIL_KEY = "user_email";

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

export async function setUserEmail(email: string): Promise<void> {
  try {
    await EncryptedStorage.setItem(EMAIL_KEY, email);
  } catch (error) {
    console.error("Storage Error (email):", error);
  }
}

export async function getUserEmail(): Promise<string | null> {
  try {
    return await EncryptedStorage.getItem(EMAIL_KEY);
  } catch (error) {
    return null;
  }
}

export async function clearAuth() {
  try {
    await EncryptedStorage.removeItem(TOKEN_KEY);
    await EncryptedStorage.removeItem(ROLE_KEY);
    await EncryptedStorage.removeItem(EMAIL_KEY);
  } catch (error) {
    console.error("Clear Storage Error:", error);
  }
}

const CAREGIVER_KEY_PREFIX = 'resident_caregiver_';

export async function setResidentCaregiver(
  residentId: string,
  caregiverId: string,
  caregiverName: string
): Promise<void> {
  try {
    await EncryptedStorage.setItem(
      `${CAREGIVER_KEY_PREFIX}${residentId}`,
      JSON.stringify({ caregiverId, caregiverName })
    );
  } catch {}
}

export async function getResidentCaregiver(
  residentId: string
): Promise<{ caregiverId: string; caregiverName: string } | null> {
  try {
    const raw = await EncryptedStorage.getItem(`${CAREGIVER_KEY_PREFIX}${residentId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const CAREGIVERS_KEY_PREFIX = 'resident_caregivers_';

export async function setResidentCaregivers(
  residentId: string,
  caregivers: Array<{ caregiverId: string; caregiverName: string }>
): Promise<void> {
  try {
    await EncryptedStorage.setItem(
      `${CAREGIVERS_KEY_PREFIX}${residentId}`,
      JSON.stringify(caregivers)
    );
  } catch {}
}

export async function getResidentCaregivers(
  residentId: string
): Promise<Array<{ caregiverId: string; caregiverName: string }>> {
  try {
    const raw = await EncryptedStorage.getItem(`${CAREGIVERS_KEY_PREFIX}${residentId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Reverse map: caregiverId → residents[] ───────────────────────────────────
// Lets the caregiver dashboard find ALL assigned residents even when the
// backend only stores one caregiverId per resident.

export type StoredResident = {
  id: string;
  name: string;
  room: string;
  dietaryRestrictions: string[];
  foodAllergies: string[];
};

const CG_RESIDENTS_KEY_PREFIX = 'caregiver_residents_';

export async function setCaregiverResidentList(
  caregiverId: string,
  residents: StoredResident[]
): Promise<void> {
  try {
    await EncryptedStorage.setItem(
      `${CG_RESIDENTS_KEY_PREFIX}${caregiverId}`,
      JSON.stringify(residents)
    );
  } catch {}
}

export async function getCaregiverResidentList(
  caregiverId: string
): Promise<StoredResident[]> {
  try {
    const raw = await EncryptedStorage.getItem(`${CG_RESIDENTS_KEY_PREFIX}${caregiverId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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