// src/utils/api.js
import axios from "axios";

// Use env var if you want, else default to local FastAPI
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// ---- Drug + food lookup ----
export const fetchDrugs = async (query = "") => {
  const res = await api.get("/drugs", {
    params: { q: query, limit: 50 },
  });
  return res.data;
};

export const fetchFoods = async (query = "") => {
  const res = await api.get("/foods", {
    params: { q: query, limit: 50 },
  });
  return res.data;
};

// ---- Risk endpoints ----
export const checkDrugRisk = async (drugIndex) => {
  const res = await api.post("/drug-risk", { drug_index: drugIndex });
  return res.data;
};

export const checkFoodDrugRisk = async (drugIndex, foodName) => {
  const res = await api.post("/food-drug-risk", {
    drug_index: drugIndex,
    food_name: foodName,
  });
  return res.data;
};

export const fetchSafeFoods = async (drugIndex, topN = 10) => {
  const res = await api.get(`/safe-foods/${drugIndex}`, {
    params: { top_n: topN },
  });
  return res.data;
};

export const generateMealPlan = async (payload) => {
  const res = await api.post("/meal-plan", payload);
  return res.data;
};