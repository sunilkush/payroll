export function toFieldErrors(apiError) {
  const map = {};
  for (const { field, message } of apiError?.errors ?? []) {
    if (field && !map[field]) map[field] = message;
  }
  return map;
}
