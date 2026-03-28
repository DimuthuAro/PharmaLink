// services/catalogApi.ts
import { mlRequest } from "../utils/api";

export function searchDrugs(q: string, limit: number = 10): Promise<any> {
  return mlRequest(`/drugs?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export function searchFoods(q: string, limit: number = 10): Promise<any> {
  return mlRequest(`/foods?q=${encodeURIComponent(q)}&limit=${limit}`);
}