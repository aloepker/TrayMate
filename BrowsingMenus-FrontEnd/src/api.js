export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://<YOUR_IP>:8000";

function buildUrl(path, params) {
  const search = new URLSearchParams(params);
  return `${API_BASE_URL}${path}?${search.toString()}`;
}

async function parseJson(res) {
  if (res.ok) {
    return res.json();
  }
  const text = await res.text();
  throw new Error(text || "Request failed");
}

export async function fetchMenu(residentId, period) {
  const params = { resident_id: String(residentId) };
  if (period) {
    params.period = period;
  }
  const res = await fetch(buildUrl("/menu", params));
  return parseJson(res);
}

export async function fetchRecommendation(residentId) {
  const params = { resident_id: String(residentId) };
  const res = await fetch(buildUrl("/menu/recommendation", params));
  return parseJson(res);
}
