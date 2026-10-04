CREATE TABLE recurring_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    category_id BIGINT NOT NULL REFERENCES categories(id),
    type VARCHAR(20) NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    description VARCHAR(500),
    frequency VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    next_due_date DATE,
    status VARCHAR(20) NOT NULL,
    blocked_reason VARCHAR(200),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT chk_recurring_type CHECK (type IN ('EXPENSE','INCOME')),
    CONSTRAINT chk_recurring_amount CHECK (amount > 0),
    CONSTRAINT chk_recurring_frequency CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY','YEARLY')),
    CONSTRAINT chk_recurring_status CHECK (status IN ('ACTIVE','PAUSED','BLOCKED','CANCELLED','COMPLETED')),
    CONSTRAINT chk_recurring_dates CHECK (
        start_date BETWEEN DATE '0001-01-01' AND DATE '9999-12-31'
        AND (end_date IS NULL OR (end_date >= start_date AND end_date <= DATE '9999-12-31'))
        AND (next_due_date IS NULL OR (next_due_date >= start_date AND next_due_date <= DATE '9999-12-31'
            AND (end_date IS NULL OR next_due_date <= end_date)))),
    CONSTRAINT chk_recurring_cursor CHECK (
        (status IN ('ACTIVE','PAUSED','BLOCKED') AND next_due_date IS NOT NULL)
        OR (status IN ('CANCELLED','COMPLETED') AND next_due_date IS NULL)),
    CONSTRAINT chk_recurring_blocked_reason CHECK (
        (status = 'BLOCKED' AND blocked_reason IS NOT NULL AND LENGTH(TRIM(blocked_reason)) > 0)
        OR (status <> 'BLOCKED' AND blocked_reason IS NULL))
);
CREATE INDEX idx_recurring_user_created ON recurring_transactions(user_id, created_at DESC, id DESC);
CREATE INDEX idx_recurring_due ON recurring_transactions(status, next_due_date, id);

CREATE TABLE recurring_transaction_occurrences (
    id BIGSERIAL PRIMARY KEY,
    recurring_transaction_id BIGINT NOT NULL REFERENCES recurring_transactions(id),
    scheduled_date DATE NOT NULL,
    transaction_id BIGINT UNIQUE REFERENCES transactions(id) ON DELETE SET NULL,
    posted_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_recurring_occurrence UNIQUE (recurring_transaction_id, scheduled_date),
    CONSTRAINT chk_recurring_occurrence_date CHECK (
        scheduled_date BETWEEN DATE '0001-01-01' AND DATE '9999-12-31')
);
