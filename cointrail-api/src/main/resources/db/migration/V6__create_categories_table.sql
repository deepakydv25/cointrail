CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,

    system BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,

    user_id BIGINT,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_categories_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT chk_categories_type
        CHECK (type IN ('EXPENSE', 'INCOME')),

    CONSTRAINT chk_categories_ownership
        CHECK (
            (system = TRUE AND user_id IS NULL)
            OR
            (system = FALSE AND user_id IS NOT NULL)
        )
);

CREATE INDEX idx_categories_user_id
    ON categories(user_id);

CREATE INDEX idx_categories_type
    ON categories(type);