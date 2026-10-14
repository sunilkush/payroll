// Password ke niyam (app mein): kam se kam 8 akshar aur ek ank. Server 8 se 72 akshar maangta hai;
// ank wala niyam app ka apna hai (server se sakht), isliye server ka error bhi alag se dikhana padta hai.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export const hasMinLength = (password) => password.length >= PASSWORD_MIN;
export const hasNumber = (password) => /\d/.test(password);

// Field ke neeche dikhne wala message; sahi ho to ''.
export function passwordError(password) {
  if (!hasMinLength(password)) return `Use at least ${PASSWORD_MIN} characters.`;
  if (!hasNumber(password)) return 'Add at least one number.';
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  return '';
}

// 0 se 4: strength bar ke chaar hisse. Lambai, ank, chhote + bade akshar / symbol, aur 12+ akshar.
export function passwordStrength(password) {
  if (!password) return 0;
  const checks = [
    hasMinLength(password),
    hasNumber(password),
    (/[a-z]/.test(password) && /[A-Z]/.test(password)) || /[^A-Za-z0-9]/.test(password),
    password.length >= 12,
  ];
  // 8 se chhota password kabhi "Weak" se upar nahi.
  return hasMinLength(password) ? checks.filter(Boolean).length : 1;
}

export const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
export const STRENGTH_TONE = ['ink', 'danger', 'warning', 'info', 'success'];
