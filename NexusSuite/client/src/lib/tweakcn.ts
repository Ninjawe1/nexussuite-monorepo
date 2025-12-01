import { type ClassValue } from 'clsx';
import { cn } from './utils';

/**
 * tweakcn: Small utility to centralize theme tokens and class merging.
 * - Provides design tokens that mirror CSS variables defined in index.css.
 * - Exposes a helper to merge Tailwind classes consistently (alias of cn).
 *
 * Intent: keep UI-only, no backend logic touched.
 */

export const themeTokens = {
  colors: {
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    border: 'hsl(var(--border))',
    card: 'hsl(var(--card))',
    cardForeground: 'hsl(var(--card-foreground))',
    popover: 'hsl(var(--popover))',
    popoverForeground: 'hsl(var(--popover-foreground))',
    primary: 'hsl(var(--primary))',
    primaryForeground: 'hsl(var(--primary-foreground))',
    secondary: 'hsl(var(--secondary))',
    secondaryForeground: 'hsl(var(--secondary-foreground))',
    muted: 'hsl(var(--muted))',
    mutedForeground: 'hsl(var(--muted-foreground))',
    accent: 'hsl(var(--accent))',
    accentForeground: 'hsl(var(--accent-foreground))',
    destructive: 'hsl(var(--destructive))',
    destructiveForeground: 'hsl(var(--destructive-foreground))',
    ring: 'hsl(var(--ring))',
  },
  charts: {
    1: 'hsl(var(--chart-1))',
    2: 'hsl(var(--chart-2))',
    3: 'hsl(var(--chart-3))',
    4: 'hsl(var(--chart-4))',
    5: 'hsl(var(--chart-5))',
  },
  fonts: {
    sans: 'var(--font-sans)',
    heading: 'var(--font-heading)',
    mono: 'var(--font-mono)',
  },
  radius: {
    base: 'var(--radius)',
  },
  shadows: {
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
  },
};

export function tweakcn(...inputs: ClassValue[]) {
  return cn(...inputs);
}

/**
 * Example usage:
 *   import { tweakcn, themeTokens } from "@/lib/tweakcn";
 *   const styles = tweakcn("bg-background text-foreground", "rounded-xl");
 *   // Tokens: style={{ color: themeTokens.colors.foreground }}
 */
