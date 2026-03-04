import { GEMINI_API_KEY } from '@env';

/**
 * Gemini AI Configuration
 *
 * API key is loaded from .env via react-native-dotenv (babel plugin).
 *
 * SETUP (for new developers):
 * 1. Copy .env.example to .env
 * 2. Get a free API key at https://aistudio.google.com/apikey
 * 3. Paste your key into .env as GEMINI_API_KEY=<your key>
 * 4. Run: npx react-native start --reset-cache
 *
 * .env is gitignored so your key stays private.
 */

const PLACEHOLDER_KEYS = ['YOUR_GEMINI_API_KEY_HERE', 'REPLACE_WITH_YOUR_KEY', ''];

const envKey =
  typeof GEMINI_API_KEY === 'string' &&
  GEMINI_API_KEY.length > 0 &&
  !PLACEHOLDER_KEYS.includes(GEMINI_API_KEY)
    ? GEMINI_API_KEY
    : '';

if (!envKey) {
  console.warn(
    '[GeminiConfig] ⚠️ No Gemini API key found!\n' +
      '  1. Copy .env.example → .env\n' +
      '  2. Add your key from https://aistudio.google.com/apikey\n' +
      '  3. Restart Metro: npx react-native start --reset-cache',
  );
}

export const GEMINI_CONFIG = {
  apiKey: envKey,
  // Models to try in order — if one hits quota, fall back to next
  models: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
  ] as const,
  model: 'gemini-2.5-flash',
};
