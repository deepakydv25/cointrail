import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createAccount, getAccount, updateAccount } from '../../services/accountService';
import { accountTypes } from '../../types/account';
import type { AccountResponse, AccountType } from '../../types/account';
import { ApiError, normalizeApiError } from '../../api/errors';
import { formatMoney, monetaryNumber } from '../../api/financial';
import { FieldError, FormError } from '../../components/ui/FormFeedback';
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
    const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3';
    return <main className="mx-auto max-w-xl space-y-6 break-words px-4 py-8">
        <h1 className="text-3xl font-bold">{id ? 'Edit account' : 'Create account'}</h1>
        <Link className="text-blue-700 underline" to={id ? `/app/accounts/${id}` : '/app/accounts'}>Cancel</Link>
        {loadError ? <ErrorState message={loadError} /> : id && !account ? <LoadingState /> :
            <form noValidate className="space-y-5 rounded-xl border border-gray-200 bg-white p-6" onSubmit={async event => {
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
                <div><label htmlFor="name">Name</label><input id="name" required maxLength={100} value={name} onChange={event => setName(event.target.value)}
                    aria-invalid={!!error?.fieldErrors.name} aria-describedby="name-error" className={inputClass} /><FieldError field="name" error={error} /></div>
                <div><label htmlFor="type">Type</label><select id="type" value={type} onChange={event => setType(event.target.value as AccountType)}
                    aria-invalid={!!error?.fieldErrors.type} aria-describedby="type-error" className={inputClass}>
                    {accountTypes.map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
                </select><FieldError field="type" error={error} /></div>
                {!id && <div><label htmlFor="openingBalance">Opening balance (INR)</label><input id="openingBalance" type="text" inputMode="decimal" required
                    value={openingBalance} onChange={event => setOpeningBalance(event.target.value)} aria-invalid={!!error?.fieldErrors.openingBalance}
                    aria-describedby="openingBalance-help openingBalance-error" className={inputClass} />
                    <p id="openingBalance-help" className="text-sm text-gray-600">Signed starting amount: negative, zero or positive. Up to 17 integer digits and 2 decimal places. This cannot be changed later.</p>
                    <FieldError field="openingBalance" error={error} /></div>}
                <FormError error={error} fields={fields} />
                <button disabled={pending} className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save account'}</button>
            </form>}
    </main>;
}
