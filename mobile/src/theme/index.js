// ─────────────────────────────────────────────────────────────────────────────
// PayRoster Theme — colors, typography, spacing
// Web app ki variables.css se match karta hai taaki dono platforms consistent dikhein.
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Primary (Royal Blue FinTech)
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  primaryBg: '#eff6ff',

  // Status
  success: '#16a34a',
  successBg: '#f0fdf4',
  warning: '#d97706',
  warningBg: '#fffbeb',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  info: '#0284c7',
  infoBg: '#f0f9ff',

  // Neutrals (Slate / FinTech Clean)
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  bg: '#f8fafc',
  bgCard: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  divider: '#e2e8f0',

  // Accent / FinTech Elements
  accent: '#0ea5e9',
  accentBg: '#f0fdfa',
  cardHighlight: '#1e293b',

  // Charts
  chart1: '#2563eb',
  chart2: '#10b981',
  chart3: '#f59e0b',
  chart4: '#8b5cf6',
  chartGrid: '#f1f5f9',

  // Misc
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(15, 23, 42, 0.6)',
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
