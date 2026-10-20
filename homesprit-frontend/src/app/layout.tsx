import type { Metadata } from 'next';
import '@/style/globals.css';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { siteConfig } from '@/config/siteConfig';

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    locale: 'en_US',
    type: 'website',
  },
};

/**
 * Root layout: only `<html>`, `<body>` and the theme provider.
 *
 * Chrome lives in the route-group layouts, as in hgs-frontend — a child layout
 * cannot remove what a parent rendered, so the public site's navbar and footer
 * sit in `(marketing)/layout.tsx` and the dashboard has its own shell.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="flex min-h-screen flex-col bg-sand text-ink transition-colors duration-300 dark:bg-ink dark:text-white"
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
