// utils/api.ts

// ─────────────────────────── HOST DETECTION ───────────────────────────
const getHost = () => {
  // Web (browser)
  if (typeof window !== "undefined") {
    return window.location.hostname; // localhost or deployed domain
  }

  // Mobile (Expo / iPhone / Android)
  return process.env.EXPO_PUBLIC_API_HOST || "192.168.8.163";
};

const HOST = getHost();

// ─────────────────────────── API BASE URLS ───────────────────────────
export const AUTH_API = `http://${HOST}:3000`;
export const ADVISORY_API = `http://${HOST}:3002`;
export const ML_API = `http://${HOST}:8000`;

// ─────────────────────────── BASE REQUEST ───────────────────────────
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
  console.log("API REQUEST:", method, url);

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

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  console.log("API RESPONSE:", res.status, data);

  if (!res.ok) {
    throw data?.message ? data : { message: "Request failed" };
  }

  return data;
}

// ─────────────────────────── API FUNCTIONS ───────────────────────────
export function authRequest(path: string, opts?: any) {
  return apiBaseRequest(AUTH_API, path, opts);
}

export function advisoryRequest(path: string, opts?: any) {
  return apiBaseRequest(ADVISORY_API, path, opts);
}

export function mlRequest(path: string, opts?: any) {
  return apiBaseRequest(ML_API, path, opts);
}

// ─────────────────────────── FILE UPLOAD ───────────────────────────
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

  const url = `${ADVISORY_API}${path}`;
  console.log("📤 UPLOAD REQUEST:", method, url);

  const res = await fetch(url, {
    method,
    headers,
    body: formData,
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  console.log(" UPLOAD RESPONSE:", res.status, data);

  if (!res.ok) {
    throw data?.message ? data : { message: "Upload failed" };
  }

  return data;
}