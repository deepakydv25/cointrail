import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/errors';
import { FieldError, FormError } from './FormFeedback';

describe('form feedback', () => {
    it('renders field associations and unmatched errors without interpreting HTML', () => {
        const error = new ApiError('Validation Failed', 'validation', 400, { email: 'Invalid email', other: '<script>unsafe</script>' });
        render(<><label htmlFor="email">Email</label><input id="email" aria-invalid="true" aria-describedby="email-error" />
            <FieldError field="email" error={error} /><FormError error={error} fields={['email']} /></>);
        expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Invalid email');
        expect(screen.getByRole('alert')).toHaveTextContent('Validation Failed');
        expect(screen.getByText('<script>unsafe</script>')).toBeInTheDocument();
        expect(document.querySelector('script')).toBeNull();
    });
});
