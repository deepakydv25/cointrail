CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,

    type VARCHAR(20) NOT NULL,

    amount NUMERIC(19, 2) NOT NULL,

    description VARCHAR(500),

    transaction_date DATE NOT NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_transactions_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(id),

    CONSTRAINT fk_transactions_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id),

    CONSTRAINT chk_transactions_type
        CHECK (type IN ('EXPENSE', 'INCOME')),

    CONSTRAINT chk_transactions_amount
        CHECK (amount > 0)
);

CREATE INDEX idx_transactions_user_id
    ON transactions(user_id);

CREATE INDEX idx_transactions_account_id
    ON transactions(account_id);

CREATE INDEX idx_transactions_category_id
    ON transactions(category_id);

CREATE INDEX idx_transactions_transaction_date
    ON transactions(transaction_date);

CREATE INDEX idx_transactions_user_date
    ON transactions(user_id, transaction_date);