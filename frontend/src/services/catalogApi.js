import { mlRequest } from "../utils/api";

export function searchDrugs(q, limit = 10) {
  return mlRequest(`/drugs?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export function searchFoods(q, limit = 10) {
  return mlRequest(`/foods?q=${encodeURIComponent(q)}&limit=${limit}`);
}
