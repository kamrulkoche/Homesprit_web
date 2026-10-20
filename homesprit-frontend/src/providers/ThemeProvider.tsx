'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Class-based theming via next-themes, as in hgs-frontend: light by default
 * (the sand ground is tuned for it), dark available from the toggle, so every
 * component carries both light and `dark:` variants.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
