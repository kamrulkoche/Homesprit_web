import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FaqPage } from '../FaqPage';
import { FAQ_ITEMS } from '../faq.data';

describe('FaqPage', () => {
  it('renders every question', () => {
    render(<FaqPage />);
    for (const item of FAQ_ITEMS) expect(screen.getByText(item.question)).toBeInTheDocument();
  });

  it('filters by topic', async () => {
    const user = userEvent.setup();
    render(<FaqPage />);
    await user.click(screen.getByRole('button', { name: 'Renting' }));
    expect(screen.getByText('Is the rent shown per month?')).toBeInTheDocument();
    expect(screen.queryByText('Can you value my home?')).not.toBeInTheDocument();
  });

  it('searches questions and answers, and recovers from no match', async () => {
    const user = userEvent.setup();
    render(<FaqPage />);
    await user.type(screen.getByRole('searchbox'), 'deposit');
    expect(screen.getByText('Is the rent shown per month?')).toBeInTheDocument();
    expect(screen.queryByText('Do I need an account?')).not.toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'zzzz');
    expect(screen.getByText('No question matches that')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show every question' }));
    expect(screen.getByText('Do I need an account?')).toBeInTheDocument();
  });
});
