/**
 * Barrel for the properties domain.
 *
 * Plain modules only — never `'use client'`. A slice or selector routed
 * through a client barrel becomes a client reference, and the Server
 * Component building `preloadedState` could no longer import it.
 */
export * from './properties.interface';
export * from './properties.selector';
export * from './properties.slice';
export { default as propertiesReducer } from './properties.slice';
export { default as propertiesSaga } from './properties.saga';
