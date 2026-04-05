
-- Пароль: admin123
INSERT INTO users (name, email, password, role)
SELECT 'Admin', 'admin@skymetrics.com', '$2a$12$8.UnVuG9HHgffUDAlk8q7OuVGUUOOE1Y9bAg.ABy6V7/P.7S5kLp2', 'ROLE_ADMIN'
    WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@skymetrics.com'
);