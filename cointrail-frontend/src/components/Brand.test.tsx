import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import Brand from './Brand';

it('preserves one contiguous CoinTrail wordmark and the existing decorative SVG', () => {
    const { container } = render(<Brand />);
    expect(screen.getByText('Coin').parentElement).toHaveTextContent(/^CoinTrail$/);
    expect(container.querySelector('img')).toHaveAttribute('src', '/cointrail-mark.svg');
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(container.querySelector('img')).toHaveAttribute('width', '32');
    expect(container.querySelector('img')).toHaveAttribute('height', '32');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
