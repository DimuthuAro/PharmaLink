// PharmaLink/backend/microservices/personalized_advisory_microservice/services/mlClient.js
const axios = require("axios");

const ML = axios.create({
  baseURL: process.env.ML_API_BASE || "http://127.0.0.1:8000",
  timeout: 60000
});

// 1) Food-drug interaction by ML
async function checkFoodDrug({ drug_name, food_name, safe_food_limit }) {
  const { data } = await ML.post("/ml-food-drug-risk", { drug_name, food_name, safe_food_limit });
  // returns: {drug, food, severity, message, reasons, explanation}
  return data;
}

// 2) Meal plan generation (multi-drug) -> your FastAPI already has POST /meal-plan
async function generateMealPlan(payload) {
  const { data } = await ML.post("/meal-plan", payload);
  return data;
}

// Drug list to resolve indices -> names
async function listDrugs({ q = "", limit = 200 } = {}) {
  const { data } = await ML.get("/drugs", { params: { q, limit } });
  return data; // [{index,name,contains}]
}

// 3) Drug image prediction
async function predictDrugFromImage({ fileBuffer, filename, mimeType, topk }) {
  const FormData = require("form-data");
  const form = new FormData();
  form.append("file", fileBuffer, { filename: filename || "image.png", contentType: mimeType || "image/png" });
  form.append("topk", String(topk));

  const { data } = await ML.post("/predict-drug-from-image", form, {
    headers: form.getHeaders()
  });
  return data; // { predictions: [...] }
}

module.exports = {
  checkFoodDrug,
  generateMealPlan,
  predictDrugFromImage,
  listDrugs
};
