/**
 * Gemini AI Configuration
 *
 * The API key used to live here (loaded from .env via react-native-dotenv),
 * but it now lives on the backend (Render env var: GEMINI_API_KEY).
 * The client just declares which models to try and lets the backend
 * forward each request to Google.
 *
 * → See src/services/geminiService.ts for the proxy helper.
 * → See backend-gemini-route.md for the matching server route + env
 *   variable to set on Render.
 *
 * No setup required for new developers — clone the repo, run the app,
 * AI features work out of the box.
 */

export const GEMINI_CONFIG = {
  // Models to try in order — if one 404s (retired) / 429s (quota) / 503s
  // (overload), the proxy path falls back to the next. The backend uses
  // whichever model the client sends in the request body. Keeping a small
  // chain means one bad model never takes the assistant offline.
  models: [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
  ] as const,
  model: 'gemini-2.5-flash',
};
