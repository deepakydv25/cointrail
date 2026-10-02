CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,

    opening_balance NUMERIC(19, 2) NOT NULL DEFAULT 0.00,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_accounts_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT chk_accounts_type
        CHECK (type IN (
            'BANK',
            'CASH',
            'CREDIT_CARD',
            'WALLET'
        ))
);

CREATE INDEX idx_accounts_user_id
    ON accounts(user_id);

CREATE INDEX idx_accounts_type
    ON accounts(type);

CREATE UNIQUE INDEX uq_accounts_user_name
    ON accounts(user_id, LOWER(name));