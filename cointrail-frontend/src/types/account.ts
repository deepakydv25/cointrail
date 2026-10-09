export const accountTypes = ['BANK', 'CASH', 'CREDIT_CARD', 'WALLET'] as const;
export type AccountType = typeof accountTypes[number];
export interface AccountResponse {
    id: string;
    name: string;
    type: AccountType;
    openingBalance: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CreateAccountRequest { name: string; type: AccountType; openingBalance: string }
export interface UpdateAccountRequest { name: string; type: AccountType }
