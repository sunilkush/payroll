import * as SecureStore from 'expo-secure-store';
import { punchInApi, punchOutApi } from '../api/endpoints.js';

// Network na ho to punch phone mein jama rehta hai aur network aate hi server ko jata hai,
// us waqt ke GPS aur time (clientTime) ke saath. Server use "offline" nishaan ke saath rakhta hai
// aur sirf usi din ka punch leta hai, isliye jama punch jaldi bhej dena zaroori hai.

const KEY = 'payroll_offline_punches';
const API = { in: punchInApi, out: punchOutApi };

// [{ type: 'in' | 'out', position: { lat, lng, accuracy }, clientTime: ISO string }]
export async function getQueue() {
  try {
    return JSON.parse((await SecureStore.getItemAsync(KEY)) ?? '[]');
  } catch {
    return [];
  }
}

const saveQueue = (queue) => SecureStore.setItemAsync(KEY, JSON.stringify(queue));

export async function enqueuePunch(type, position) {
  const queue = [...(await getQueue()), { type, position, clientTime: new Date().toISOString() }];
  await saveQueue(queue);
  return queue;
}

// Logout par: ek user ke jama punch doosre ke naam se na chale jayein.
export const clearQueue = () => SecureStore.deleteItemAsync(KEY);

// Jama punch usi order mein bhejta hai. Return: { queue (jo abhi bhi bache), rejected: [message] }.
//   network abhi bhi nahi / server ki gadbad (5xx)  -> ruk jao, baad mein phir
//   server ne mana kiya (4xx: range ke bahar, purana din...) -> wo punch hata do aur wajah batao
let syncing = null;
export function syncQueue() {
  syncing ??= (async () => {
    let queue = await getQueue();
    const rejected = [];
    while (queue.length) {
      const [{ type, position, clientTime }] = queue;
      try {
        await API[type]({ ...position, clientTime });
      } catch (error) {
        if (!error.status || error.status >= 500 || error.status === 401) break;
        rejected.push(error.message);
      }
      queue = queue.slice(1);
      await saveQueue(queue);
    }
    return { queue, rejected };
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}
