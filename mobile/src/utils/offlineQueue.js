import AsyncStorage from '@react-native-async-storage/async-storage';
import { punchInApi, punchOutApi } from '../api/attendanceApi.js';

const STORAGE_KEY = '@payroster_offline_punches';

/**
 * Retrieve queued offline punches
 */
export async function getOfflinePunches() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to load offline punches:', err.message);
    return [];
  }
}

/**
 * Save an offline punch record to AsyncStorage
 * @param {Object} punch - { type: 'IN' | 'OUT', timestamp, lat, lng, accuracy, officeName }
 */
export async function enqueueOfflinePunch(punch) {
  try {
    const queue = await getOfflinePunches();
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: punch.type, // 'IN' or 'OUT'
      timestamp: punch.timestamp || new Date().toISOString(),
      lat: punch.lat,
      lng: punch.lng,
      accuracy: punch.accuracy,
      officeName: punch.officeName || 'Office',
    };
    queue.push(item);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    return item;
  } catch (err) {
    console.warn('Failed to enqueue offline punch:', err.message);
    throw err;
  }
}

/**
 * Remove a specific punch item by ID from the queue
 */
export async function removeOfflinePunch(id) {
  try {
    const queue = await getOfflinePunches();
    const updated = queue.filter((p) => p.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to remove offline punch:', err.message);
    return [];
  }
}

/**
 * Clear all offline punches
 */
export async function clearOfflinePunches() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return [];
  } catch (err) {
    console.warn('Failed to clear offline punches:', err.message);
    return [];
  }
}

/**
 * Synchronize all queued punches with the server sequentially
 * @returns {Promise<{ syncedCount: number, failedCount: number, errors: string[] }>}
 */
export async function syncOfflinePunches() {
  const queue = await getOfflinePunches();
  if (queue.length === 0) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  const remaining = [];
  const errors = [];

  for (const punch of queue) {
    try {
      const payload = {
        lat: punch.lat,
        lng: punch.lng,
        accuracy: punch.accuracy,
      };

      if (punch.type === 'IN') {
        await punchInApi(payload);
      } else {
        await punchOutApi(payload);
      }

      syncedCount++;
    } catch (err) {
      // If error is business logic (e.g. already punched in), or network error
      const msg = err.errors?.[0]?.message || err.message || 'Failed to sync punch';
      errors.push(msg);

      // Keep in remaining queue only if it was a network drop
      if (err.message?.includes('Network') || err.message?.includes('timeout')) {
        remaining.push(punch);
      }
    }
  }

  // Update storage with remaining punches that couldn't sync due to network
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));

  return {
    syncedCount,
    failedCount: errors.length,
    remainingCount: remaining.length,
    errors,
  };
}
