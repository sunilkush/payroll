// ─────────────────────────────────────────────────────────────────────────────
// Google Material Design 3 (Material You) Theme — PayRoster Mobile
// Tokens for colors, typography, shapes, elevation, and accessibility
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // MD3 Primary Palette
  primary: '#2563eb',
  onPrimary: '#ffffff',
  primaryContainer: '#dbeafe',
  onPrimaryContainer: '#1e40af',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  primaryBg: '#dbeafe', // alias

  // MD3 Secondary & Neutral Variants
  secondary: '#64748b',
  onSecondary: '#ffffff',
  secondaryContainer: '#e2e8f0',
  onSecondaryContainer: '#0f172a',

  // MD3 Surface & Background
  background: '#f8fafc',
  onBackground: '#0f172a',
  surface: '#ffffff',
  onSurface: '#0f172a',
  surfaceVariant: '#f1f5f9',
  onSurfaceVariant: '#64748b',
  surfaceContainer: '#ffffff',
  surfaceContainerHigh: '#f8fafc',

  // MD3 Outline
  outline: '#cbd5e1',
  outlineVariant: '#e2e8f0',

  // Status & Semantic Tones
  success: '#16a34a',
  onSuccess: '#ffffff',
  successContainer: '#dcfce7',
  onSuccessContainer: '#14532d',
  successBg: '#dcfce7', // alias

  warning: '#d97706',
  onWarning: '#ffffff',
  warningContainer: '#fef3c7',
  onWarningContainer: '#78350f',
  warningBg: '#fef3c7', // alias

  danger: '#dc2626',
  error: '#dc2626',
  onError: '#ffffff',
  errorContainer: '#fee2e2',
  onErrorContainer: '#7f1d1d',
  dangerBg: '#fee2e2', // alias

  info: '#0284c7',
  onInfo: '#ffffff',
  infoContainer: '#e0f2fe',
  infoBg: '#e0f2fe', // alias

  // Legacy/Convenience Aliases
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  bg: '#f8fafc',
  bgCard: '#ffffff',
  border: '#cbd5e1',
  borderLight: '#e2e8f0',
  divider: '#e2e8f0',

  // Misc
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(15, 23, 42, 0.6)',
  ripple: 'rgba(37, 99, 235, 0.12)',
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

// MD3 Shape System
export const borderRadius = {
  xs: 4,
  sm: 8,      // MD3 Small: text fields, chips
  md: 12,     // MD3 Medium: cards, dialogs
  lg: 16,     // MD3 Large: cards, bottom sheet
  xl: 24,     // MD3 Extra Large: floating action buttons, large cards
  pill: 28,   // MD3 Navigation pills, buttons
  full: 9999, // MD3 Full rounded
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

// MD3 Elevation System (Level 0 - Level 5)
export const shadows = {
  level0: {
    shadowColor: 'transparent',
    elevation: 0,
  },
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1, // MD3 Level 1
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2, // MD3 Level 2
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4, // MD3 Level 3
  },
};

// React Native Paper Material Design 3 Theme
export const paperTheme = {
  version: 3,
  colors: {
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    primaryContainer: colors.primaryContainer,
    onPrimaryContainer: colors.onPrimaryContainer,
    secondary: colors.secondary,
    onSecondary: colors.onSecondary,
    secondaryContainer: colors.secondaryContainer,
    onSecondaryContainer: colors.onSecondaryContainer,
    background: colors.background,
    onBackground: colors.onBackground,
    surface: colors.surface,
    onSurface: colors.onSurface,
    surfaceVariant: colors.surfaceVariant,
    onSurfaceVariant: colors.onSurfaceVariant,
    outline: colors.outline,
    outlineVariant: colors.outlineVariant,
    error: colors.error,
    onError: colors.onError,
    errorContainer: colors.errorContainer,
    onErrorContainer: colors.onErrorContainer,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surfaceVariant,
      level3: colors.surface,
      level4: colors.surface,
      level5: colors.surface,
    },
  },
};
