// Dashboard ek saath kai API bulata hai. Koi ek fail ho (jaise leave OFF hone par 403) to baaki
// dashboard phir bhi dikhna chahiye, isliye har call ka result alag se: data ya null.
export async function loadAll(calls) {
  const results = await Promise.allSettled(calls);
  return results.map((result) => (result.status === 'fulfilled' ? result.value?.data ?? null : null));
}
