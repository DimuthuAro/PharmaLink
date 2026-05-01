// PharmaLink/frontend/src/utils/api.js
const HOST = import.meta.env.VITE_API_HOST || window?.location?.hostname || "127.0.0.1";
const AUTH_API = import.meta.env.VITE_AUTH_API || `http://${HOST}:3000`;
const ADVISORY_API = import.meta.env.VITE_ADVISORY_API || `http://${HOST}:3002`;
const ML_API = import.meta.env.VITE_ML_API || `http://${HOST}:8000`;

export async function authRequest(path, opts) {
  return apiBaseRequest(AUTH_API, path, opts);
}

export async function advisoryRequest(path, opts) {
  return apiBaseRequest(ADVISORY_API, path, opts);
}

export async function mlRequest(path, opts) {
  return apiBaseRequest(ML_API, path, opts);
}

async function apiBaseRequest(base, path, { method="GET", body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
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
