import AsyncStorage from "@react-native-async-storage/async-storage";

export const PROFILE_KEYS = {
  drugs: "pharmlink_user_drugs",
  allergies: "pharmlink_user_allergies",
};

export type StoredDrug = { name: string; index: number; date?: string };

export async function saveProfileSelections(drugs: StoredDrug[], allergies: string[]) {
  await AsyncStorage.setItem(PROFILE_KEYS.drugs, JSON.stringify(drugs));
  await AsyncStorage.setItem(PROFILE_KEYS.allergies, JSON.stringify(allergies));
}

export async function loadProfileDrugs(): Promise<StoredDrug[]> {
  const raw = await AsyncStorage.getItem(PROFILE_KEYS.drugs);
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadProfileAllergies(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PROFILE_KEYS.allergies);
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
