//utils/api.ts
import { Platform } from "react-native";

export const AUTH_API =
  Platform.OS === "web"
    ? "http://localhost:3000"
    : "http://10.130.51.238:3000";

export const ADVISORY_API =
  Platform.OS === "web"
    ? "http://localhost:3002"
    : "http://10.130.51.238:3002";

export const ML_API =
  Platform.OS === "web"
    ? "http://localhost:8000"
    : "http://10.130.51.238:8000";

async function apiBaseRequest(
  base: string,
  path: string,
  {
    method = "GET",
    body,
    token,
  }: { method?: string; body?: any; token?: string } = {}
) {
  const headers: Record<string, string> = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const url = `${base}${path}`;
  console.log("API REQUEST:", method, url, body);

  let res: Response;

  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error: any) {
    console.log("NETWORK ERROR:", error);
    throw {
      message: "Cannot connect to server. Check backend, IP, port, and CORS.",
    };
  }

  const data = await res.json().catch(() => ({}));
  console.log("API RESPONSE:", res.status, data);

  if (!res.ok) throw data;
  return data;
}

export function authRequest(path: string, opts?: any) {
  return apiBaseRequest(AUTH_API, path, opts);
}

export function advisoryRequest(path: string, opts?: any) {
  return apiBaseRequest(ADVISORY_API, path, opts);
}

export function mlRequest(path: string, opts?: any) {
  return apiBaseRequest(ML_API, path, opts);
}

export async function apiUpload(
  path: string,
  {
    formData,
    token,
    method = "POST",
  }: {
    formData: FormData;
    token?: string;
    method?: string;
  }
) {
  const headers: Record<string, string> = {};

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