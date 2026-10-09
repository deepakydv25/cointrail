export interface ChartAmount { id: string; label: string; amount: string; tooltipLabel?: string; tone?: 'income' | 'expense' }

export function minorUnits(amount: string): bigint {
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount)) throw new Error('Expected a nonnegative exact decimal amount.');
    const [integer, fraction = ''] = amount.split('.');
    return BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0'));
}
export function chartData(items: ChartAmount[]) {
    const units = items.map(item => minorUnits(item.amount));
    const maximum = units.reduce((max, amount) => amount > max ? amount : max, 0n);
    return items.map((item, index) => ({ ...item,
        // Only bounded coordinates become Number. Original financial strings stay exact.
        coordinate: maximum === 0n ? 0 : Number(units[index] * 1_000_000n / maximum),
    }));
}
