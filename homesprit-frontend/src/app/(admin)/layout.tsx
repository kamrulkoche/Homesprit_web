import type { Metadata } from 'next';

/**
 * Dashboard route group. Adds nothing to the URL; exists so `/admin/*` opts out
 * of the public site's chrome and out of search engines (with the
 * `X-Robots-Tag` header from next.config.mjs as the belt to these braces).
 *
 * The signed-in shell is NOT here: it needs the user's profile, and
 * `/admin/login` must render without one. Each signed-in page wraps itself in
 * `AdminShell` — hgs-frontend's arrangement.
 */
export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | Homesprit dashboard' },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
