import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InquiryForm } from '../InquiryForm';

function mockFetch(body: unknown, status = 200) {
  const fn = jest.fn().mockResolvedValue({ status, json: () => Promise.resolve(body) });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Priya Raman');
  await user.type(screen.getByLabelText('Email'), 'priya@example.com');
  await user.type(screen.getByLabelText('Message'), 'Could I view it on Saturday?');
}

describe('InquiryForm', () => {
  it('shows per-field errors without sending an invalid form', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({});
    render(<InquiryForm propertySlug="home" />);

    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('posts to this app, not the backend, with the listing slug, and confirms', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({ success: true, message: 'Thanks — your message has been sent.' });
    render(<InquiryForm propertySlug="modern-family-home-zilker" />);

    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Thanks — your message has been sent.');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/inquiries');
    expect(JSON.parse(init.body)).toMatchObject({
      property_slug: 'modern-family-home-zilker',
      name: 'Priya Raman',
      email: 'priya@example.com',
    });
  });

  it('shows the server error and the fields it names', async () => {
    const user = userEvent.setup();
    mockFetch({ success: false, error: 'This home is no longer on the market.', fields: { message: 'Too long' } }, 422);
    render(<InquiryForm propertySlug="sold-home" />);

    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This home is no longer on the market.');
    expect(screen.getByText('Too long')).toBeInTheDocument();
  });

  it('clears a field error as soon as the field is edited', async () => {
    const user = userEvent.setup();
    mockFetch({});
    render(<InquiryForm />);

    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name'), 'P');
    expect(screen.queryByText('Name must be at least 2 characters')).not.toBeInTheDocument();
  });
});
