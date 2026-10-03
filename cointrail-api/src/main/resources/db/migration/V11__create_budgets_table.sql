CREATE TABLE budgets (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,

    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_budgets_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_budgets_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id),

    CONSTRAINT chk_budgets_year
        CHECK (year BETWEEN 1 AND 9999),

    CONSTRAINT chk_budgets_month
        CHECK (month BETWEEN 1 AND 12),

    CONSTRAINT chk_budgets_amount
        CHECK (amount > 0),

    CONSTRAINT uq_budgets_user_category_period
        UNIQUE (user_id, category_id, year, month)
);

CREATE INDEX idx_budgets_user_period
    ON budgets(user_id, year, month);
