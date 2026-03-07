// src/utils/api.js
import axios from "axios";

// ============ API Base URLs ============
const AUTH_API = import.meta.env.VITE_AUTH_API || "http://localhost:3000";
const ADVISORY_API = import.meta.env.VITE_ADVISORY_API || "http://localhost:3002";
const ML_API = import.meta.env.VITE_ML_API || "http://127.0.0.1:8000";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ============ Axios Instance ============
export const api = axios.create({
  baseURL: API_BASE_URL,
});

// ============ Generic Request Helpers ============
export async function authRequest(path, opts) {
  return apiBaseRequest(AUTH_API, path, opts);
}

export async function advisoryRequest(path, opts) {
  return apiBaseRequest(ADVISORY_API, path, opts);
}

export async function mlRequest(path, opts) {
  return apiBaseRequest(ML_API, path, opts);
}

async function apiBaseRequest(base, path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

export async function apiUpload(path, { formData, token, method = "POST" }) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${ADVISORY_API}${path}`, {
    method,
    headers,
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

// ============ Drug + Food Lookup ============
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

// ============ Risk Endpoints ============
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