import axios from "axios";

const API_BASE_URL = "http://10.0.2.2:8000";

export const api = axios.create({
    baseURL:API_BASE_URL,
    timeout:20000,
})

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
  days?: number;
  meals_per_day?: number;
  calories_per_day?: number;
}) => {
  const res = await api.post("/meal-plan", payload);
  return res.data;
};