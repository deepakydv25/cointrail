import { useRef, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, ButtonLink } from './Button';
import { FormField } from './FormField';
import { PageHeader } from './PageHeader';
import { SurfaceCard } from './SurfaceCard';
import { MetricCard } from './MetricCard';
import { FinancialRow } from './FinancialRow';
import { ConfirmationPanel } from './ConfirmationPanel';
import { LoadingState, EmptyState, ErrorState } from './States';
import { FormError } from './FormFeedback';
import { ApiError } from '../../api/errors';
import CategoryIcon from '../CategoryIcon';

afterEach(cleanup);
describe('Clarity primitives', () => {
    it.each(['primary', 'secondary', 'ghost', 'danger'] as const)('preserves %s semantics, focusability and disabled/loading behavior', async variant => {
        const action = vi.fn();
        const view = render(<MemoryRouter><Button variant={variant} onClick={action}>Action</Button><ButtonLink variant={variant} to="/app/accounts">Destination</ButtonLink></MemoryRouter>);
        const button = screen.getByRole('button', { name: 'Action' });
        expect(button).toHaveClass('ct-button', `ct-button--${variant}`);
        expect(screen.getByRole('link', { name: 'Destination' })).toHaveClass(`ct-button--${variant}`);
        expect(screen.getByRole('link', { name: 'Destination' })).toHaveAttribute('href', '/app/accounts');
        await userEvent.tab(); expect(button).toHaveFocus();
        await userEvent.keyboard('{Enter}'); expect(action).toHaveBeenCalledOnce();
        view.rerender(<MemoryRouter><Button variant={variant} pending onClick={action}>Action</Button></MemoryRouter>);
        expect(button).toBeDisabled(); expect(button).toHaveAttribute('aria-busy', 'true');
        await userEvent.click(button); expect(action).toHaveBeenCalledOnce();
    });
    it('does not submit by default and blocks pending actions', async () => {
        const submit = vi.fn(event => event.preventDefault()); const action = vi.fn();
        const view = render(<form onSubmit={submit}><Button onClick={action}>Refresh</Button></form>);
        await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
        expect(action).toHaveBeenCalledOnce(); expect(submit).not.toHaveBeenCalled();
        view.rerender(<form onSubmit={submit}><Button type="submit" pending onClick={action}>Saving account…</Button></form>);
        const pending = screen.getByRole('button', { name: 'Saving account…' });
        expect(pending).toBeDisabled(); expect(pending).toHaveAttribute('aria-busy', 'true');
        await userEvent.click(pending); expect(action).toHaveBeenCalledOnce(); expect(submit).not.toHaveBeenCalled();
    });
    it('keeps exact identifiers and filters in action links', () => {
        render(<MemoryRouter><ButtonLink to="/app/transactions/9223372036854775807/edit?type=INCOME&page=2">Edit transaction</ButtonLink></MemoryRouter>);
        expect(screen.getByRole('link', { name: 'Edit transaction' })).toHaveAttribute('href', '/app/transactions/9223372036854775807/edit?type=INCOME&page=2');
    });
    it('associates only existing hints/errors and preserves caller descriptions', () => {
        const view = render(<><p id="extra">Starting amount</p><FormField id="amount" label="Amount" describedBy="extra" hint="Exact decimals" error="Must be positive">{props => <input {...props} />}</FormField></>);
        expect(screen.getByLabelText('Amount')).toHaveAccessibleDescription('Starting amount Exact decimals Must be positive');
        expect(screen.getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true');
        view.rerender(<FormField id="amount" label="Amount">{props => <input {...props} />}</FormField>);
        expect(screen.getByLabelText('Amount')).not.toHaveAttribute('aria-describedby');
        expect(screen.getByLabelText('Amount')).not.toHaveAttribute('aria-invalid');
    });
    it('keeps native select and textarea labels, feedback and keyboard editing accessible', async () => {
        render(<div className="ct-shell"><FormField id="kind" label="Account type" hint="Choose a recorded account type">
            {props => <select {...props} className="ct-control"><option value="BANK">Bank</option><option value="CASH">Cash</option></select>}
        </FormField><FormField id="notes" label="Notes" hint="Optional details" error="Shorten these notes">
            {props => <textarea {...props} className="ct-control" />}
        </FormField><Button pending>Saving</Button></div>);
        const select = screen.getByRole('combobox', { name: 'Account type' });
        expect(select).toHaveAccessibleDescription('Choose a recorded account type');
        await userEvent.selectOptions(select, 'CASH'); expect(select).toHaveValue('CASH');
        const notes = screen.getByRole('textbox', { name: 'Notes' });
        expect(notes).toHaveAccessibleDescription('Optional details Shorten these notes');
        expect(notes).toHaveAttribute('aria-invalid', 'true');
        await userEvent.type(notes, 'Recorded'); expect(notes).toHaveValue('Recorded');
        expect(screen.getByRole('button', { name: 'Saving' })).toBeDisabled();
    });
    it('keeps one h1 and does not turn a static surface into an action', () => {
        render(<><PageHeader title="Accounts" description="Starting balances" /><SurfaceCard aria-labelledby="section"><h2 id="section">Savings</h2></SurfaceCard></>);
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByRole('heading', { name: 'Accounts' })).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
    });
    it.each(['neutral', 'income', 'expense'] as const)('renders a supplied metric exactly with %s tone and no calculation', tone => {
        render(<MetricCard label="Opening balance" value="-₹99,99,99,99,99,99,99,999.99" tone={tone} explanation="Immutable starting amount" />);
        expect(screen.getByText('-₹99,99,99,99,99,99,99,999.99')).toHaveClass(`ct-amount--${tone}`);
        expect(screen.getByText('Immutable starting amount')).toBeInTheDocument();
    });
    it.each(['EXPENSE', 'INCOME'] as const)('keeps the complete positive %s amount, type and historical category', type => {
        render(<MemoryRouter><FinancialRow title="Recorded transaction" to="/app/transactions/9223372036854775807?sort=amount,asc" type={type}
            amount="₹99,99,99,99,99,99,99,999.99" category="Category: Renamed custom 日本語" metadata="Recorded account" /></MemoryRouter>);
        expect(screen.getByText('₹99,99,99,99,99,99,99,999.99')).toHaveClass(`ct-amount--${type.toLowerCase()}`);
        expect(screen.getByText(type)).toBeInTheDocument(); expect(screen.getByText('Category: Renamed custom 日本語')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', '/app/transactions/9223372036854775807?sort=amount,asc');
        expect(screen.queryByRole('img')).toBeNull();
    });
    it('keeps category glyphs decorative and uniformly neutral at both sizes', () => {
        const { container } = render(<><CategoryIcon /><CategoryIcon size="small" /></>);
        const icons = container.querySelectorAll('.ct-category-icon'); expect(icons).toHaveLength(2);
        expect([...icons].every(icon => icon.getAttribute('aria-hidden') === 'true')).toBe(true);
        expect(icons[0].querySelector('path')?.getAttribute('d')).toBe(icons[1].querySelector('path')?.getAttribute('d'));
        expect(screen.queryByRole('img')).toBeNull();
    });
    it('retains status, empty headings and safe alert/retry semantics with opt-in appearance', async () => {
        const retry = vi.fn();
        render(<><LoadingState appearance="clarity" message="Loading accounts…" /><EmptyState appearance="clarity" title="No accounts">Create one</EmptyState>
            <ErrorState appearance="clarity" message="<script>unsafe</script>" onRetry={retry} /></>);
        expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
        expect(screen.getByRole('heading', { name: 'No accounts' })).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('<script>unsafe</script>'); expect(document.querySelector('script')).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(retry).toHaveBeenCalledOnce();
    });
    it('keeps legacy feedback defaults and unmatched Clarity form errors visible', () => {
        const view = render(<ErrorState message="Failed" />); expect(screen.getByRole('alert')).toHaveClass('bg-red-50');
        view.rerender(<FormError appearance="clarity" error={new ApiError('Check input', 'validation', 400, { other: '<b>Unknown field</b>' })} fields={['name']} />);
        expect(screen.getByRole('alert')).toHaveClass('ct-feedback--error'); expect(screen.getByText('<b>Unknown field</b>')).toBeInTheDocument();
        expect(document.querySelector('b')).toBeNull();
    });
});

function ConfirmationHarness({ pending = false, confirm }: { pending?: boolean; confirm: () => void }) {
    const [open, setOpen] = useState(false); const trigger = useRef<HTMLButtonElement>(null);
    return <><Button ref={trigger} hidden={open} onClick={() => setOpen(true)}>Delete record</Button>
        {open && <ConfirmationPanel title="Permanently delete?" keepLabel="Keep record" confirmLabel={pending ? 'Deleting…' : 'Confirm deletion'} pending={pending}
            triggerRef={trigger} onCancel={() => setOpen(false)} onConfirm={event => { event.preventDefault(); confirm(); }}><p>Cannot be undone.</p></ConfirmationPanel>}</>;
}
describe('inline confirmation', () => {
    it.each(['Escape', 'keep'])('focuses the safe action and restores trigger on %s without mutating', async action => {
        const confirm = vi.fn(); render(<ConfirmationHarness confirm={confirm} />);
        await userEvent.click(screen.getByRole('button', { name: 'Delete record' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Keep record' })).toHaveFocus());
        expect(screen.getByRole('form', { name: 'Permanently delete?' })).toHaveTextContent('Cannot be undone');
        expect(screen.queryByRole('dialog')).toBeNull();
        if (action === 'Escape') await userEvent.keyboard('{Escape}'); else await userEvent.click(screen.getByRole('button', { name: 'Keep record' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Delete record' })).toHaveFocus()); expect(confirm).not.toHaveBeenCalled();
    });
    it('requires explicit submit and blocks confirmation/cancel while pending', async () => {
        const confirm = vi.fn(); const view = render(<ConfirmationHarness confirm={confirm} />);
        await userEvent.click(screen.getByRole('button', { name: 'Delete record' })); expect(confirm).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole('button', { name: 'Confirm deletion' })); expect(confirm).toHaveBeenCalledOnce();
        view.rerender(<ConfirmationHarness confirm={confirm} pending />);
        expect(screen.getByRole('button', { name: 'Keep record' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
        fireEvent.keyDown(screen.getByRole('form'), { key: 'Escape' }); fireEvent.submit(screen.getByRole('form'));
        expect(screen.getByRole('form')).toBeInTheDocument(); expect(confirm).toHaveBeenCalledOnce();
    });
});
