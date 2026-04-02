import { apiUpload } from "../utils/api";

const ADVISORY_API =
  import.meta.env.VITE_ADVISORY_API || "http://localhost:3002";

function getAuthToken(token) {
  return (
    token ||
    localStorage.getItem("pharmalink_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.error || data?.details || data?.message || `Request failed (${res.status})`
    );
  }

  return data;
}

/** Food–Drug check */
export async function foodDrugCheck({
  token,
  drug_name,
  food_name,
  safe_food_limit = 10,
  medication_time,
}) {
  const authToken = getAuthToken(token);

  const res = await fetch(`${ADVISORY_API}/food-drug/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      drug_name,
      food_name,
      safe_food_limit,
      medication_time,
    }),
  });

  return parseJsonResponse(res);
}

/** Get history (filtered) */
export async function getHistory({ token, type }) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  const authToken = getAuthToken(token);

  const res = await fetch(`${ADVISORY_API}/history${qs}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  return parseJsonResponse(res);
}

/** Delete ONE history item */
export async function deleteHistoryItem({ token, id }) {
  const authToken = getAuthToken(token);

  const res = await fetch(`${ADVISORY_API}/history/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  return parseJsonResponse(res);
}

/** Clear history by type (or all if no type) */
export async function clearHistory({ token, type }) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  const authToken = getAuthToken(token);

  const res = await fetch(`${ADVISORY_API}/history${qs}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  return parseJsonResponse(res);
}

/** View stored image (returns a Blob) */
export async function fetchHistoryImageBlob({ token, id }) {
  const authToken = getAuthToken(token);

  const res = await fetch(`${ADVISORY_API}/history/${id}/image`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!res.ok) {
    let msg = `Failed to load image (${res.status})`;
    try {
      const j = await res.json();
      msg = j?.error || j?.details || j?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return await res.blob();
}

/** Drug Image Prediction (multipart upload) */
export function predictDrugImage({ token, file, topk = 3 }) {
  const authToken = getAuthToken(token);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("topk", String(topk));

  return apiUpload("/drug-image/predict", {
    formData,
    token: authToken,
    method: "POST",
  });
}

/** Recommend Drugs From Symptoms */
export async function recommendDrugsFromSymptoms({
  token,
  symptoms,
  top_k_diseases = 3,
  patient = {},
}) {
  const authToken = getAuthToken(token);

  const res = await fetch(`${ADVISORY_API}/symptoms/recommend-drugs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      symptoms,
      top_k_diseases,
      patient,
    }),
  });

  return parseJsonResponse(res);
}

/** Analyze Patient Story */
export async function analyzePatientStory({
  token,
  text,
  use_llm = true,
  language = "en",
}) {
  const authToken = getAuthToken(token);

  const res = await fetch(`${ADVISORY_API}/patient-story/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      text,
      use_llm,
      language,
    }),
  });

  return parseJsonResponse(res);
}

export async function analyzePatientStoryDistilBert({ token, story }) {
  const authToken = getAuthToken(token);

  const res = await fetch(`${ADVISORY_API}/patient-story/analyze-distilbert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ story }),
  });

  return parseJsonResponse(res);
}