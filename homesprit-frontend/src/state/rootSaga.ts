import { all } from 'typed-redux-saga';

import propertiesSaga from './features/properties/properties.saga';

/** Every domain saga, started once when the store is created. */
export default function* rootSaga() {
  yield* all([propertiesSaga()]);
}
