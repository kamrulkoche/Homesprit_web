'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, CircleUser, ExternalLink, Inbox, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';
import { cn } from '@/helpers/utils/utils';
import { USER_ROLE_LABELS } from '@/helpers/properties/labels';
import { Logo } from '@/shared/components/Logo';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import type { IUser } from '@/interface/admin.interface';
import { ToastProvider } from '../ui/Toast';
import { activeNavHref, navFor, type NavIcon } from './admin.data';

const ICONS: Record<NavIcon, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  properties: Building2,
  inquiries: Inbox,
  users: Users,
  account: CircleUser,
};

interface AdminShellProps {
  /** Read on the server and passed down — the barrel makes this a client component. */
  user: IUser;
  children: React.ReactNode;
}

/**
 * Sidebar + header around every signed-in dashboard page — hgs-frontend's
 * AdminShell, trimmed to Homesprit's five screens.
 *
 * It also owns the toast region, so any screen can confirm a save with
 * `useToast()`. It lives here rather than in `(admin)/layout.tsx` because the
 * login page shares that layout and has nothing to toast.
 */
export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const items = navFor(user.role);
  const active = activeNavHref(pathname, items);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const signOut = async () => {
    setIsSigningOut(true);
    // The route clears the cookie whatever the backend says, so this cannot
    // leave someone signed in after pressing Sign out.
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/admin/login');
    router.refresh();
  };

  const nav = (
    <nav aria-label="Dashboard" className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 flex items-center justify-between px-2 pt-1">
        <Logo href="/admin/dashboard" />
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-ink/5 lg:hidden dark:text-slate-400"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
              isActive
                ? 'bg-brand-600 text-white'
                : 'text-ink-body hover:bg-ink/5 dark:text-slate-300 dark:hover:bg-white/10'
            )}
          >
            <Icon size={18} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto space-y-1 border-t border-ink/[0.08] pt-4 dark:border-white/[0.08]">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-body hover:bg-ink/5 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <ExternalLink size={18} aria-hidden="true" />
          View site
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#f6f7f5] dark:bg-ink">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-ink/[0.08] bg-white dark:border-white/[0.08] dark:bg-ink-soft lg:block">
        {nav}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setIsOpen(false)}
          />
          <aside className="relative h-full w-72 bg-white shadow-2xl dark:bg-ink-soft">{nav}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-ink/[0.08] bg-white/90 px-4 backdrop-blur dark:border-white/[0.08] dark:bg-ink-soft/90 md:px-8">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg text-ink hover:bg-ink/5 dark:text-white lg:hidden"
            onClick={() => setIsOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/admin/account"
              className="hidden rounded-lg px-2 py-1 text-right hover:bg-ink/5 dark:hover:bg-white/10 sm:block"
            >
              <span className="block text-sm font-bold leading-tight text-ink dark:text-white">{user.name}</span>
              <span className="block text-xs text-ink-muted dark:text-slate-400">{USER_ROLE_LABELS[user.role]}</span>
            </Link>
            <button type="button" onClick={signOut} disabled={isSigningOut} className="btn-ghost px-3">
              <LogOut size={17} aria-hidden="true" />
              <span className="hidden sm:inline">{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </div>
        </header>
        {/* min-w-0 stops a wide table forcing the row wider than the viewport. */}
        <main id="main" className="min-w-0 flex-1 px-4 py-8 md:px-8 md:py-10">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
