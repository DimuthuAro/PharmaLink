// PharmaLink/backend/microservices/personalized_advisory_microservice/services/mlClient.js
const axios = require("axios");
const FormData = require("form-data");

const FASTAPI_BASE = process.env.FASTAPI_BASE || "http://127.0.0.1:8000";

const http = axios.create({
  baseURL: FASTAPI_BASE,
  timeout: 120000,
  headers: { "Content-Type": "application/json" },
});

function extractAxiosError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const detail =
    data?.detail ||
    data?.error ||
    data?.details ||
    (typeof data === "string" ? data : null);

  const msg = detail || err?.message || "FastAPI request failed";
  return { status, msg, data };
}

async function checkFoodDrug({ drug_name, food_name, safe_food_limit = 10, medication_time }) {
  try {
    const res = await http.post("/ml-food-drug-risk", {
      drug_name,
      food_name,
      medication_time: medication_time || null,
      safe_food_limit: Number(safe_food_limit || 10),
    });
    return res.data;
  } catch (err) {
    const e = extractAxiosError(err);
    throw new Error(`FastAPI /ml-food-drug-risk failed (${e.status || "?"}): ${e.msg}`);
  }
}

async function generateMealPlan(payload) {
  try {
    // FastAPI expects JSON body for POST /ml-meal-plan-generate
    const body = {
      drug_names: Array.isArray(payload.drug_names) ? payload.drug_names : [],
      days: Number(payload.days ?? 3),
      meals_per_day: Number(payload.meals_per_day ?? 3),
      calories_per_day: Number(payload.calories_per_day ?? 1800),
      meal_types: Array.isArray(payload.meal_types) ? payload.meal_types : undefined,
      allergies: Array.isArray(payload.allergies) ? payload.allergies : [],
      vegetarian: !!payload.vegetarian,
      diabetic_friendly: !!payload.diabetic_friendly,
      low_sodium: !!payload.low_sodium,
      debug_score: !!payload.debug_score,
    };

    if (!body.drug_names.length) {
      throw new Error("drug_names is required for /ml-meal-plan-generate");
    }

    const res = await http.post("/ml-meal-plan-generate", body);
    return res.data;
  } catch (err) {
    const e = extractAxiosError(err);
    throw new Error(`FastAPI /ml-meal-plan-generate failed (${e.status || "?"}): ${e.msg}`);
  }
}






async function predictDrugFromImage({ fileBuffer, filename, mimeType, topk = 3 }) {
  try {
    const form = new FormData();
    form.append("file", fileBuffer, { filename, contentType: mimeType });
    form.append("topk", String(topk));

    const res = await axios.post(`${FASTAPI_BASE}/predict-drug-from-image`, form, {
      headers: form.getHeaders(),
      timeout: 120000,
    });

    return res.data;
  } catch (err) {
    const e = extractAxiosError(err);
    throw new Error(`FastAPI /predict-drug-from-image failed (${e.status || "?"}): ${e.msg}`);
  }
}

async function listDrugs({ q = "", limit = 50 }) {
  try {
    const res = await http.get("/drugs", {
      params: { q, limit: Number(limit || 50) },
    });
    return res.data;
  } catch (err) {
    const e = extractAxiosError(err);
    throw new Error(`FastAPI /drugs failed (${e.status || "?"}): ${e.msg}`);
  }
}

async function recommendDrugsFromSymptoms(payload) {
  try {
    const body = {
      symptoms: Array.isArray(payload?.symptoms) ? payload.symptoms : [],
      top_k_diseases: Number(payload?.top_k_diseases ?? 3),
      patient: payload?.patient || {},
    };

    if (!body.symptoms.length) {
      throw new Error("symptoms is required (non-empty array) for /recommend-drugs-from-symptoms");
    }

    const res = await http.post("/recommend-drugs-from-symptoms", body);
    return res.data; // { results: [...] }
  } catch (err) {
    const e = extractAxiosError(err);
    throw new Error(
      `FastAPI /recommend-drugs-from-symptoms failed (${e.status || "?"}): ${e.msg}`
    );
  }
}


async function predictStoryDistilBert({ story }) {
  try {
    const body = { story: String(story || "").trim() };

    if (!body.story) {
      throw new Error("story is required for /predict-story-distilbert");
    }

    const res = await http.post("/predict-story-distilbert", body);
    return res.data;
  } catch (err) {
    const e = extractAxiosError(err);
    throw new Error(`FastAPI /predict-story-distilbert failed (${e.status || "?"}): ${e.msg}`);
  }
}

module.exports = {
  checkFoodDrug,
  generateMealPlan,
  predictDrugFromImage,
  listDrugs,
  recommendDrugsFromSymptoms,
  predictStoryDistilBert,
};
