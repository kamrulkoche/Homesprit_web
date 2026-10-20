import { render, screen } from '@testing-library/react';
import { PropertyCard } from '../PropertyCard';
import { makeProperty } from '@/__fixtures__/property';

describe('PropertyCard', () => {
  it('shows the price, place, facts and a link named by the title', () => {
    render(<PropertyCard property={makeProperty()} />);

    expect(screen.getByText('$1,250,000')).toBeInTheDocument();
    expect(screen.getByText('Zilker, Austin')).toBeInTheDocument();
    expect(screen.getByText('4 beds')).toBeInTheDocument();
    expect(screen.getByText('3 baths')).toBeInTheDocument();
    expect(screen.getByText('2,850 sq ft')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Modern family home in Zilker' });
    expect(link).toHaveAttribute('href', '/properties/modern-family-home-zilker');
  });

  it('uses the lowest display_order photo as the cover', () => {
    render(<PropertyCard property={makeProperty()} />);
    expect(screen.getByRole('img', { name: 'Front of the house' })).toBeInTheDocument();
  });

  it('marks a rental as monthly and labels its status', () => {
    render(<PropertyCard property={makeProperty({ listing_type: 'rent', price: 3200, status: 'under_offer' })} />);
    expect(screen.getByText('$3,200/mo')).toBeInTheDocument();
    expect(screen.getByText('For rent')).toBeInTheDocument();
    expect(screen.getByText('Under offer')).toBeInTheDocument();
  });

  it('omits bedrooms and bathrooms for land, and shows a placeholder without photos', () => {
    render(
      <PropertyCard
        property={makeProperty({ property_type: 'land', images: [], area_sqft: null, title: 'Five-acre plot' })}
      />
    );
    expect(screen.queryByText(/bed/)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Five-acre plot — no photo yet' })).toBeInTheDocument();
  });
});
