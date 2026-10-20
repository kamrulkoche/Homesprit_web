import { combineReducers } from '@reduxjs/toolkit';

import propertiesSlice from './features/properties/properties.slice';

/**
 * Every slice in the app, in one map — mirrors hgs-frontend and
 * sp-company-ltd-ui. A new domain is not live until it is registered HERE and
 * its saga in `rootSaga.ts`; miss either and it fails silently.
 */
const rootReducer = combineReducers({
  properties: propertiesSlice,
});

export default rootReducer;
