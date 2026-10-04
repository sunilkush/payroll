// API ke errors [{ field, message }] ko { field: message } mein badalta hai, form fields ke neeche dikhane ke liye.
export function toFieldErrors(apiError) {
  const map = {};
  for (const { field, message } of apiError?.errors ?? []) {
    if (field && !map[field]) map[field] = message;
  }
  return map;
}
