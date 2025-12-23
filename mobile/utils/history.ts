import AsyncStorage from "@react-native-async-storage/async-storage";

export type HistoryEntry ={
    id: string;
    timestamp: string;
    drugIndex: number;
    drug: string;
    food: string;
    risk: 0|1|2;
    message: string;
};

const KEY_PREFIX = "pharmalink_history_";
const keyFor = (email: string) => `${KEY_PREFIX}${email}`;

function makeId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function loadHistory(email:string): Promise<HistoryEntry[]> {
    const raw = await AsyncStorage.getItem(keyFor(email));
    if (!raw) return [];
    try{
        return JSON.parse(raw) as HistoryEntry[];
    } catch {
        return [];
    }
}

export async function addHistoryEntry(
    email:string,
    entry: Omit<HistoryEntry, "id">
) : Promise<HistoryEntry[]> {
    const current = await loadHistory(email);
    const withId: HistoryEntry = {id:makeId(), ...entry};
    const updated = [withId, ...current];
    await AsyncStorage.setItem(keyFor(email), JSON.stringify(updated));
    return updated;
}

export async function clearHistory(email: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(email));
}

export async function deleteHistoryEntry(email: string, id: string): Promise<HistoryEntry[]> {
  const current = await loadHistory(email);
  const updated = current.filter((h) => h.id !== id);
  await AsyncStorage.setItem(keyFor(email), JSON.stringify(updated));
  return updated;
}