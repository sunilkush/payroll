// ─────────────────────────────────────────────────────────────────────────────
// Unified SaaS Design System — Typography
// ─────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';

export const typography = {
  fontFamily: Platform.select({
    ios: 'Inter, -apple-system, BlinkMacSystemFont, System',
    android: 'Inter, Roboto, sans-serif',
    default: 'Inter, system-ui, sans-serif',
  }),
  fontFamilyMedium: Platform.select({
    ios: 'Inter-Medium, System',
    android: 'Inter-Medium, sans-serif-medium',
    default: 'Inter, sans-serif-medium',
  }),
  fontFamilyBold: Platform.select({
    ios: 'Inter-Bold, System',
    android: 'Inter-Bold, sans-serif',
    default: 'Inter, sans-serif',
  }),

  // Heading hierarchy: 24px, 20px, 18px, 16px.
  // Body text: 14px–16px.
  // Supporting labels: 12px–13px.
  sizes: {
    caption: 12,
    label: 13,
    xs: 12,
    sm: 14,
    body: 14,
    bodyLarge: 16,
    md: 16,
    h4: 16,
    h3: 18,
    lg: 18,
    h2: 20,
    xl: 20,
    h1: 24,
    xxl: 24,
    xxxl: 30,
    heading: 32,
  },

  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  presets: {
    h1: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
      letterSpacing: -0.3,
    },
    h2: {
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 28,
      letterSpacing: -0.2,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      letterSpacing: -0.1,
    },
    h4: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    body: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
    bodySemiBold: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 18,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
    captionSemiBold: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
  },
};

export default typography;
