// services/advisoryApi.ts
import { advisoryRequest, apiUpload } from "../utils/api";

type FoodDrugCheckParams = {
  token?: string;
  drug_name: string;
  food_name: string;
  safe_food_limit?: number;
};

type HistoryParams = {
  token?: string;
  type?: string;
};

type DeleteHistoryParams = {
  token?: string;
  id: string;
};

type RecommendDrugsParams = {
  token?: string;
  symptoms: string[];
  top_k_diseases?: number;
  patient?: Record<string, any>;
};

type PredictDrugImageParams = {
  token?: string;
  formData: FormData;
};

/** Food–Drug check */
export function foodDrugCheck({
  token,
  drug_name,
  food_name,
  safe_food_limit = 10,
}: FoodDrugCheckParams) {
  return advisoryRequest("/food-drug/check", {
    method: "POST",
    token,
    body: { drug_name, food_name, safe_food_limit },
  });
}

/** Get history (filtered) */
export function getHistory({ token, type }: HistoryParams) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  return advisoryRequest(`/history${qs}`, { token });
}

/** Delete one history item */
export function deleteHistoryItem({ token, id }: DeleteHistoryParams) {
  return advisoryRequest(`/history/${id}`, {
    method: "DELETE",
    token,
  });
}

/** Clear history by type or all */
export function clearHistory({ token, type }: HistoryParams) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  return advisoryRequest(`/history${qs}`, {
    method: "DELETE",
    token,
  });
}

/** Fetch history image as raw response */
export async function fetchHistoryImage({
  token,
  id,
}: {
  token?: string;
  id: string;
}) {
  return advisoryRequest(`/history/${id}/image`, {
    method: "GET",
    token,
  });
}

/** Drug image prediction */
export function predictDrugImage({
  token,
  formData,
}: PredictDrugImageParams) {
  return apiUpload("/drug-image/predict", {
    formData,
    token,
    method: "POST",
  });
}

/** Recommend drugs from symptoms */
export function recommendDrugsFromSymptoms({
  token,
  symptoms,
  top_k_diseases = 3,
  patient = {},
}: RecommendDrugsParams) {
  return advisoryRequest("/symptoms/recommend-drugs", {
    method: "POST",
    token,
    body: { symptoms, top_k_diseases, patient },
  });
}