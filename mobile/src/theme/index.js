// ─────────────────────────────────────────────────────────────────────────────
// PayRoster Theme — colors, typography, spacing
// Web app ki variables.css se match karta hai taaki dono platforms consistent dikhein.
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Primary
  primary: '#4f46e5',
  primaryLight: '#6366f1',
  primaryDark: '#4338ca',
  primaryBg: '#eef2ff',

  // Status
  success: '#16a34a',
  successBg: '#f0fdf4',
  warning: '#d97706',
  warningBg: '#fffbeb',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  info: '#2563eb',
  infoBg: '#eff6ff',

  // Neutrals
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  bg: '#f6f7f9',
  bgCard: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  divider: '#e2e8f0',

  // Charts
  chart1: '#8b5cf6',
  chart2: '#f43f5e',
  chart3: '#06b6d4',
  chart4: '#f59e0b',
  chartGrid: '#e2e8f0',

  // Misc
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
};

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  fontFamily: 'Inter_400Regular',
  fontFamilyMedium: 'Inter_500Medium',
  fontFamilyBold: 'Inter_600SemiBold',
  fontFamilyExtraBold: 'Inter_700Bold',

  sizes: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    heading: 32,
  },

  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
};

// React Native Paper ka theme config
export const paperTheme = {
  colors: {
    primary: colors.primary,
    primaryContainer: colors.primaryBg,
    secondary: colors.textSecondary,
    secondaryContainer: colors.borderLight,
    tertiary: colors.chart1,
    surface: colors.bgCard,
    surfaceVariant: colors.bg,
    background: colors.bg,
    error: colors.danger,
    errorContainer: colors.dangerBg,
    onPrimary: colors.white,
    onPrimaryContainer: colors.primaryDark,
    onSecondary: colors.white,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    onBackground: colors.text,
    onError: colors.white,
    outline: colors.border,
    outlineVariant: colors.borderLight,
    elevation: {
      level0: 'transparent',
      level1: colors.bgCard,
      level2: colors.bgCard,
      level3: colors.bgCard,
      level4: colors.bgCard,
      level5: colors.bgCard,
    },
  },
};
