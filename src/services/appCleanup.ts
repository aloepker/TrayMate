import { clearAuth } from './storage';
import { invalidateMenuCache, invalidateDrinksCache, invalidateSidesCache } from './localDataService';
import { cancelAllMealtimeReminders } from './notificationService';

export async function appCleanup(): Promise<void> {
  try { await clearAuth(); } catch (e) { /* ignore */ }
  try { invalidateMenuCache(); } catch (e) { /* ignore */ }
  try { invalidateDrinksCache(); } catch (e) { /* ignore */ }
  try { invalidateSidesCache(); } catch (e) { /* ignore */ }
  try { await cancelAllMealtimeReminders(); } catch (e) { /* ignore */ }
}
