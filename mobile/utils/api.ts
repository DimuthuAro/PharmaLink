import axios from "axios";
import { Platform } from "react-native";

// Backend API base URL
// For Android emulator: 10.0.2.2 accesses host machine
// For web/iOS: use localhost
const API_BASE_URL = Platform.OS === "android" 
  ? "http://10.0.2.2:3000"
  : "http://localhost:3000";

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

//---- Drug + food lookup ----
export const fetchDrugs = async (query: string = "") => {
    const res = await api.get("/drugs", {
        params:{q: query, limit: 50},
    });
    return res.data as Array<{index: number; name: string; contains?: string}>;
};

export const fetchFoods = async (query: string = "") => {
  const res = await api.get("/foods", {
    params: { q: query, limit: 50 },
  });
  return res.data as Array<{ name: string; is_alcohol: number; is_leafy_green: number }>;
};

// ---- Risk endpoints ----
export const checkDrugRisk = async (drugIndex: number) => {
  const res = await api.post("/drug-risk", { drug_index: drugIndex });
  return res.data as { drug: string; food: string; risk: number; message: string };
};

export const checkFoodDrugRisk = async (drugIndex: number, foodName: string) => {
  const res = await api.post("/food-drug-risk", {
    drug_index: drugIndex,
    food_name: foodName,
  });
  return res.data as { drug: string; food: string; risk: number; message: string };
};

export const fetchSafeFoods = async (drugIndex: number, topN: number = 10) => {
  const res = await api.get(`/safe-foods/${drugIndex}`, {
    params: { top_n: topN },
  });
  return res.data as {
    drug: string;
    foods: Array<{
      Food: string;
      energy: number;
      protein: number;
      fat: number;
      carbs: number;
      fiber: number;
      is_alcohol?: number;
    }>;
  };
};

export const generateMealPlan = async (payload: {
  drug_indices: number[];
  dietary_restrictions?: string[];
  allergies?: string[];
  days?: number;
  meals_per_day?: number;
  calories_per_day?: number;
}) => {
  const res = await api.post("/meal-plan", payload);
  return res.data;
};

// ===== NEW BACKEND INTEGRATION ENDPOINTS =====

// Drug Interactions
export const checkDrugInteractions = async (drugs: string[]) => {
  try {
    const res = await api.post("/api/drug-interactions/check", { drugs });
    return res.data;
  } catch (error) {
    console.error("Drug interactions error:", error);
    throw error;
  }
};

// Food-Drug Interactions (Advisory)
export const checkFoodDrugInteractions = async (drug: string, food: string) => {
  try {
    const res = await api.post("/api/advisory/check", { drug, food });
    return res.data;
  } catch (error) {
    console.error("Food-drug interaction error:", error);
    throw error;
  }
};

// Prescription Analysis
export const analyzePrescription = async (imageData: string) => {
  try {
    const res = await api.post("/api/prescription/analyze", { image: imageData });
    return res.data;
  } catch (error) {
    console.error("Prescription analysis error:", error);
    throw error;
  }
};

// Cross-Brand Comparator
export const searchMedicines = async (medicineName: string) => {
  try {
    const res = await api.get("/api/comparator/search", { 
      params: { q: medicineName } 
    });
    return res.data;
  } catch (error) {
    console.error("Medicine search error:", error);
    throw error;
  }
};

export const getAllMedications = async () => {
  try {
    const res = await api.get("/api/comparator/all-medications");
    return res.data;
  } catch (error) {
    console.error("Get medications error:", error);
    throw error;
  }
};

// Treatment Identifier
export const searchTreatments = async (symptom: string) => {
  try {
    const res = await api.post("/api/treatment/search", { symptom });
    return res.data;
  } catch (error) {
    console.error("Treatment search error:", error);
    throw error;
  }
};

export const getTreatmentsByCondition = async (condition: string) => {
  try {
    const res = await api.get("/api/treatment/condition", { 
      params: { q: condition } 
    });
    return res.data;
  } catch (error) {
    console.error("Get treatments error:", error);
    throw error;
  }
};