import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertyCard } from '../../propertylist/PropertyCard';
import { makeProperty } from '@/__fixtures__/property';
import { MAX_SAVED_HOMES, SAVED_HOMES_COOKIE } from '@/helpers/properties/saved-homes';

function clearCookie() {
  document.cookie = `${SAVED_HOMES_COOKIE}=; path=/; max-age=0`;
}

describe('saving a home from its card', () => {
  beforeEach(clearCookie);

  it('toggles the shortlist cookie and the pressed state', async () => {
    const user = userEvent.setup();
    const property = makeProperty();
    render(<PropertyCard property={property} />);

    const save = screen.getByRole('button', { name: `Save ${property.title}` });
    expect(save).toHaveAttribute('aria-pressed', 'false');

    await user.click(save);
    expect(document.cookie).toContain(`${SAVED_HOMES_COOKIE}=${property.slug}`);
    const remove = screen.getByRole('button', { name: `Remove ${property.title} from saved homes` });
    expect(remove).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Saved to your list.');

    await user.click(remove);
    expect(document.cookie).not.toContain(property.slug);
  });

  it('says so when the list is full', async () => {
    const user = userEvent.setup();
    const full = Array.from({ length: MAX_SAVED_HOMES }, (_, i) => `home-${i}`).join(',');
    document.cookie = `${SAVED_HOMES_COOKIE}=${encodeURIComponent(full)}; path=/`;
    const property = makeProperty();
    render(<PropertyCard property={property} />);

    await user.click(screen.getByRole('button', { name: `Save ${property.title}` }));
    expect(screen.getByRole('status')).toHaveTextContent(`up to ${MAX_SAVED_HOMES} homes`);
    expect(document.cookie).not.toContain(property.slug);
  });
});
