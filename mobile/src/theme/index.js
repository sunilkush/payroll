// ─────────────────────────────────────────────────────────────────────────────
// Unified Modern Professional SaaS Mobile UI Design System — Index
// ─────────────────────────────────────────────────────────────────────────────

import { colors } from './colors.js';
import { typography } from './typography.js';
import { spacing } from './spacing.js';
import { radius, borderRadius } from './radius.js';

export { colors, typography, spacing, radius, borderRadius };

// Subtle elevation system — Light borders preferred over heavy shadows
export const shadows = {
  none: {
    shadowColor: 'transparent',
    elevation: 0,
  },
  level0: {
    shadowColor: 'transparent',
    elevation: 0,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};

// React Native Paper Material Design 3 Theme alignment
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

export default {
  colors,
  typography,
  spacing,
  radius,
  borderRadius,
  shadows,
  paperTheme,
};
