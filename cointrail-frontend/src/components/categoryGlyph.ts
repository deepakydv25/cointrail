import type { IconName } from './ui/Icon';

const seeded: Record<string, { type: 'EXPENSE' | 'INCOME'; icon: IconName }> = {
    food: { type: 'EXPENSE', icon: 'utensils' }, travel: { type: 'EXPENSE', icon: 'suitcase' },
    shopping: { type: 'EXPENSE', icon: 'shopping-bag' }, entertainment: { type: 'EXPENSE', icon: 'film' },
    bills: { type: 'EXPENSE', icon: 'receipt' }, health: { type: 'EXPENSE', icon: 'medical' },
    education: { type: 'EXPENSE', icon: 'graduation' }, other: { type: 'EXPENSE', icon: 'tag' },
    rent: { type: 'EXPENSE', icon: 'house' }, subscription: { type: 'EXPENSE', icon: 'repeat' },
    salary: { type: 'INCOME', icon: 'briefcase' }, bonus: { type: 'INCOME', icon: 'gift' },
    freelance: { type: 'INCOME', icon: 'laptop' }, interest: { type: 'INCOME', icon: 'percent' },
    'other income': { type: 'INCOME', icon: 'tag' },
};
export function categoryGlyph({ name, type, system }: { name?: string; type?: string; system?: boolean }): IconName {
    const key = name?.trim().toLowerCase();
    const match = key && Object.hasOwn(seeded, key) ? seeded[key] : undefined;
    return system !== false && match && type === match.type ? match.icon : 'tag';
}
