import { PageHeader } from '../../components/ui/PageHeader';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { Button } from '../../components/ui/Button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createAccount, getAccount, updateAccount } from '../../services/accountService';
import { accountTypes } from '../../types/account';
import type { AccountResponse, AccountType } from '../../types/account';
import { ApiError, normalizeApiError } from '../../api/errors';
import { formatMoney, monetaryNumber } from '../../api/financial';
import { FormError } from '../../components/ui/FormFeedback';
import { FormField } from '../../components/ui/FormField';
import { ErrorState, LoadingState } from '../../components/ui/States';

export default function AccountFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [account, setAccount] = useState<AccountResponse | null>(null);
    const [name, setName] = useState('');
    const [type, setType] = useState<AccountType>('BANK');
    const [openingBalance, setOpeningBalance] = useState('0');
    const [error, setError] = useState<ApiError | null>(null);
    const [loadError, setLoadError] = useState('');
    const [pending, setPending] = useState(false);
    const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        if (!id) return;
        const controller = new AbortController();
        getAccount(id, controller.signal).then(data => {
            if (!controller.signal.aborted) { setAccount(data); setName(data.name); setType(data.type); }
        }).catch(error => {
            if (!controller.signal.aborted && !axios.isCancel(error)) setLoadError(normalizeApiError(error).message);
        });
        return () => controller.abort();
    }, [id]);
    const fields = id ? ['name', 'type'] : ['name', 'type', 'openingBalance'];
    const inputClass = 'ct-control';
    return <main className="ct-page ct-page--narrow">
        <PageHeader title={id ? 'Edit account' : 'Create account'} back={<Link to={id ? `/app/accounts/${id}` : '/app/accounts'}>Cancel</Link>} />
        {loadError ? <ErrorState appearance="clarity" message={loadError} /> : id && !account ? <LoadingState appearance="clarity" /> :
            <SurfaceCard><form noValidate className="ct-stack" onSubmit={async event => {
                event.preventDefault(); if (pending) return; setError(null);
                if (!name.trim() || name.length > 100) {
                    setError(new ApiError('Check your input.', 'validation', 400, { name: 'Enter a name with at most 100 characters.' })); return;
                }
                try {
                    if (!id) monetaryNumber(openingBalance);
                    setPending(true);
                    const saved = id ? await updateAccount(id, { name, type }) : await createAccount({ name, type, openingBalance });
                    if (mounted.current) navigate(`/app/accounts/${saved.id}`);
                } catch (error) { if (mounted.current && !axios.isCancel(error)) setError(normalizeApiError(error)); }
                finally { if (mounted.current) setPending(false); }
            }}>
                {account && <p>{account.active ? 'Active account' : 'Inactive account — editing does not reactivate it.'} Opening balance (immutable): {formatMoney(account.openingBalance)}</p>}
                <p>Names are reserved even after deactivation. Use a different name if one already exists.</p>
                <FormField id="name" label="Name" error={error?.fieldErrors.name}>{props => <input {...props} required maxLength={100} value={name} onChange={event => setName(event.target.value)} className={inputClass} />}</FormField>
                <FormField id="type" label="Type" error={error?.fieldErrors.type}>{props => <select {...props} value={type} onChange={event => setType(event.target.value as AccountType)} className={inputClass}>
                    {accountTypes.map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
                </select>}</FormField>
                {!id && <FormField id="openingBalance" label="Opening balance (INR)" error={error?.fieldErrors.openingBalance}
                    hint="Signed starting amount: negative, zero or positive. Up to 17 integer digits and 2 decimal places. This cannot be changed later.">{props => <input {...props} type="text" inputMode="decimal" required
                        value={openingBalance} onChange={event => setOpeningBalance(event.target.value)} className={inputClass} />}</FormField>}
                <FormError appearance="clarity" error={error} fields={fields} />
                <Button type="submit" pending={pending}>{pending ? 'Saving…' : 'Save account'}</Button>
            </form></SurfaceCard>}
    </main>;
}
