import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import makeStore from '@/state/store';
import { asyncLoaded } from '@/interface/state.interface';
import { PropertiesPageContainer } from '../PropertiesPageContainer';
import { makeProperty, page } from '@/__fixtures__/property';
import type { IPaginated } from '@/interface/admin.interface';
import type { IProperty, IPropertySearch } from '@/interface/property.interface';

// The saga's transport — never reached in these tests, but the store starts
// the saga, so the module must load without a network.
jest.mock('@/services/api/properties.service', () => ({
  __esModule: true,
  default: { searchProperties: jest.fn(() => new Promise(() => {})), getCities: jest.fn() },
}));

function renderWith(list: IPaginated<IProperty> | null, search: IPropertySearch = {}) {
  const store = makeStore({
    properties: {
      search,
      list: asyncLoaded(list),
      cities: asyncLoaded([{ city: 'Austin', count: 1 }]),
    },
  });
  render(
    <Provider store={store}>
      <PropertiesPageContainer />
    </Provider>
  );
  return store;
}

describe('PropertiesPageContainer — the client half of the hybrid', () => {
  beforeEach(() => jest.spyOn(window.history, 'replaceState'));
  afterEach(() => jest.restoreAllMocks());

  it('renders the server-seeded page without fetching', () => {
    renderWith(page([makeProperty()]), { city: 'Austin' });
    expect(screen.getByText('1 home')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Find your next home in Austin');
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  it('tells a failed read apart from an empty result', () => {
    renderWith(null);
    expect(screen.getByText('We could not load listings')).toBeInTheDocument();
  });

  it('says so when nothing matches', () => {
    renderWith(page([]));
    expect(screen.getByText('No homes match that search')).toBeInTheDocument();
  });

  it('dispatches a new search and writes it to the URL on a filter change', async () => {
    const user = userEvent.setup();
    const store = renderWith(page([makeProperty()]));

    await user.click(screen.getByRole('radio', { name: 'Rent' }));

    expect(store.getState().properties.search).toMatchObject({ listing_type: 'rent' });
    expect(store.getState().properties.list.isLoading).toBe(true);
    expect(window.history.replaceState).toHaveBeenLastCalledWith(null, '', '/properties?listing_type=rent');
  });

  it('drops the page number when a filter changes', async () => {
    const user = userEvent.setup();
    const store = renderWith(page([makeProperty()], { page: 3, total_pages: 3, total: 30 }), { page: 3 });

    await user.selectOptions(screen.getByLabelText('City'), 'Austin');

    expect(store.getState().properties.search.page).toBeUndefined();
    expect(window.history.replaceState).toHaveBeenLastCalledWith(null, '', '/properties?city=Austin');
  });
});
