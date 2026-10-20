import { Navbar } from '@/shared/components/Navbar';
import { Footer } from '@/shared/components/Footer';

/**
 * Chrome for the public site. `(marketing)` is a route group — it adds nothing
 * to the URL — and exists so the dashboard can have a different shell.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
