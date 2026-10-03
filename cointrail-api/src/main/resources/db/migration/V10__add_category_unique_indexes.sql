CREATE UNIQUE INDEX uq_categories_system_name_type
    ON categories (LOWER(name), type)
    WHERE system = TRUE;

CREATE UNIQUE INDEX uq_categories_user_name_type
    ON categories (user_id, LOWER(name), type)
    WHERE system = FALSE;