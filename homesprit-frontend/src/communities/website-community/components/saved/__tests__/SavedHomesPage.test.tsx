import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavedHomesPage } from '../SavedHomesPage';
import { makeProperty } from '@/__fixtures__/property';
import { SAVED_HOMES_COOKIE } from '@/helpers/properties/saved-homes';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

function setSaved(slugs: string[]) {
  document.cookie = slugs.length
    ? `${SAVED_HOMES_COOKIE}=${encodeURIComponent(slugs.join(','))}; path=/`
    : `${SAVED_HOMES_COOKIE}=; path=/; max-age=0`;
}

describe('SavedHomesPage', () => {
  it('shows the empty state with a way back to search', () => {
    setSaved([]);
    render(<SavedHomesPage properties={[]} missing={[]} unavailable={false} />);
    expect(screen.getByText('No saved homes yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse homes/i })).toHaveAttribute('href', '/properties');
  });

  it('tells a failed read apart from an empty list', () => {
    setSaved(['a-home']);
    render(<SavedHomesPage properties={[]} missing={[]} unavailable />);
    expect(screen.getByText('We could not load your saved homes')).toBeInTheDocument();
    expect(screen.queryByText('No saved homes yet')).not.toBeInTheDocument();
  });

  it('drops a card as soon as its heart is un-pressed', async () => {
    const user = userEvent.setup();
    const home = makeProperty();
    setSaved([home.slug]);
    render(<SavedHomesPage properties={[home]} missing={[]} unavailable={false} />);

    expect(screen.getByRole('link', { name: home.title })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `Remove ${home.title} from saved homes` }));
    expect(screen.queryByRole('link', { name: home.title })).not.toBeInTheDocument();
    expect(screen.getByText('No saved homes yet')).toBeInTheDocument();
  });

  it('offers to remove listings that were taken down', async () => {
    const user = userEvent.setup();
    setSaved(['gone-home']);
    render(<SavedHomesPage properties={[]} missing={['gone-home']} unavailable={false} />);

    expect(screen.getByText('One home you saved is no longer listed.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove from list' }));
    expect(document.cookie).not.toContain('gone-home');
    expect(screen.getByText('No saved homes yet')).toBeInTheDocument();
  });
});
