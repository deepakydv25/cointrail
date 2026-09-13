ALTER TABLE expenses
ADD COLUMN user_id BIGINT;

ALTER TABLE expenses
ADD CONSTRAINT fk_expenses_user
FOREIGN KEY (user_id)
REFERENCES users(id);