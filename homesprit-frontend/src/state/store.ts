import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import rootReducer from './rootReducer';
import rootSaga from './rootSaga';

/**
 * The Redux store — a FACTORY, not a module singleton.
 *
 * Ported from hgs-frontend, which deviates from sp-company-ltd-ui in exactly
 * this way, for a reason that applies here too: pages render on the SERVER,
 * where a module-level store would be shared by every concurrent request (one
 * visitor's search leaking into another's render), and `preloadedState` could
 * not vary per request. `StoreProvider` calls this once per client instance.
 */
const makeStore = (preloadedState?: Partial<RootState>) => {
  const sagaMiddleware = createSagaMiddleware();

  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(sagaMiddleware),
    preloadedState,
    devTools: process.env.NODE_ENV !== 'production',
  });

  sagaMiddleware.run(rootSaga);
  return store;
};

export default makeStore;

/** The shape of the whole store, derived from the reducer map. */
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
