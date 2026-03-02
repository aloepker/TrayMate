import {GEMINI_API_KEY} from '@env';

/**
 * Gemini AI Configuration
 *
 * API key is loaded from .env file (never hardcoded).
 * See .env.example for setup instructions.
 */
export const GEMINI_CONFIG = {
  apiKey: GEMINI_API_KEY,
  // Models to try in order — if one hits quota, fall back to next
  models: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
  ] as const,
  // Legacy field for backward compat
  model: 'gemini-2.5-flash',
};
