// PharmaLink/frontend/src/services/advisoryApi.js
import { advisoryRequest , apiUpload} from "../utils/api";

/** Food–Drug check */
export function foodDrugCheck({ token, drug_name, food_name, safe_food_limit = 10 }) {
  return advisoryRequest("/food-drug/check", {
    method: "POST",
    token,
    body: { drug_name, food_name, safe_food_limit },
  });
}

/** Get history (filtered) */
export function getHistory({ token, type }) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  return advisoryRequest(`/history${qs}`, { token });
}

/** Delete ONE history item */
export function deleteHistoryItem({ token, id }) {
  return advisoryRequest(`/history/${id}`, {
    method: "DELETE",
    token,
  });
}

/** Clear history by type (or all if no type) */
export function clearHistory({ token, type }) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  return advisoryRequest(`/history${qs}`, {
    method: "DELETE",
    token,
  });
}

/**
 * View stored image (returns a Blob)
 * Use this in History modal
 */
export async function fetchHistoryImageBlob({ token, id }) {
  const ADVISORY_API = import.meta.env.VITE_ADVISORY_API || "http://localhost:3002";

  const res = await fetch(`${ADVISORY_API}/history/${id}/image`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let msg = "Failed to load image";
    try {
      const j = await res.json();
      msg = j?.error || j?.details || msg;
    } catch {}
    throw new Error(msg);
  }

  return await res.blob();
}

/** Drug Image Prediction (multipart upload) */
export function predictDrugImage({ token, file, topk = 3 }) {
  const formData = new FormData();
  formData.append("file", file);         // must be "file"
  formData.append("topk", String(topk)); // backend reads req.body.topk

  return apiUpload("/drug-image/predict", {
    formData,
    token,
    method: "POST",
  });
}
