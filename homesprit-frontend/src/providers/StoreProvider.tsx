'use client';

import { useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import makeStore, { type AppStore, type RootState } from '@/state/store';

interface StoreProviderProps {
  children: ReactNode;
  /**
   * State fetched on the SERVER for this route, used to seed the store before
   * the first client render.
   *
   * This is what keeps the listings crawler-readable: the markup React
   * produces on the server already contains the first page of results, so
   * there is no skeleton frame and no post-hydration fetch for the initial
   * view. Sagas handle every subsequent read.
   */
  preloadedState?: Partial<RootState>;
}

/**
 * Wraps a route's client tree in the Redux store.
 *
 * Ported from hgs-frontend. `sp-company-ltd-ui` mounts this ONCE in the root
 * layout around a singleton store; hgs-frontend, and Homesprit after it, mount
 * it PER PAGE instead, and the reason is `preloadedState`: a layout
 * cannot see the data its page fetched, so a single provider up top could only
 * ever seed an empty store. Rendering the provider in the page — where the
 * fetched rows are in scope — is what lets each route hand the store its own
 * server-fetched data.
 *
 * The lazy `useState` initializer guarantees ONE store per client instance —
 * calling `makeStore()` inline would build a fresh store on every re-render
 * and discard everything dispatched into the old one. The Redux docs' Next.js
 * example reaches for `useRef` here; this repo's `react-hooks/refs` rule
 * rejects reading `.current` during render, and a lazy initializer is the
 * render-safe equivalent (the factory runs exactly once, on first render).
 *
 */
const StoreProvider = ({ children, preloadedState }: StoreProviderProps) => {
  const [store] = useState<AppStore>(() => makeStore(preloadedState));

  return <Provider store={store}>{children}</Provider>;
};

export default StoreProvider;
