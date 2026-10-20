'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

const emptySubscribe = () => () => {};

/**
 * Light/dark switch.
 *
 * The theme is only known after hydration, so the server pass renders a
 * same-sized placeholder. `useSyncExternalStore` for the mounted flag is
 * hgs-frontend's approach: it avoids the `setState` inside an effect that
 * `react-hooks/set-state-in-effect` rejects.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return <span className="inline-block h-10 w-10" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="grid h-10 w-10 place-items-center rounded-full text-ink-body transition-colors hover:bg-ink/5 dark:text-slate-300 dark:hover:bg-white/10"
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
