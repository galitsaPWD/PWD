-- ========================================
-- COMPREHENSIVE MOCK DATA FOR AQUAFLOW (ENHANCED)
-- ========================================
-- This script creates extensive realistic test data for thorough testing.

-- STEP 0: Ensure missing tables exist
CREATE TABLE IF NOT EXISTS area_boxes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#0288D1',
    barangays TEXT[] DEFAULT '{}', 
    assigned_reader_id INTEGER,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- STEP 1: Clear existing data
DELETE FROM billing;
DELETE FROM area_boxes;
DELETE FROM staff;
DELETE FROM customers;
DELETE FROM system_settings;

-- Reset sequences
ALTER SEQUENCE IF EXISTS customers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS staff_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS billing_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS area_boxes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS system_settings_id_seq RESTART WITH 1;

-- STEP 2: System Settings
INSERT INTO system_settings (
    base_rate, tier1_threshold, tier1_rate, tier2_threshold, tier2_rate, tier3_rate,
    discount_percentage, penalty_percentage, cutoff_days, admin_pin
) VALUES (
    150.00, 10, 15.00, 20, 20.00, 25.00, 20.00, 10.00, 17, '$2b$10$YourHashedPINHere'
);

-- STEP 3: Staff Accounts
INSERT INTO staff (last_name, first_name, username, password, role, contact_number, status) VALUES 
('User', 'Wana', 'wana', 'xyuuki18', 'cashier', '09123456780', 'active'),
('Deer', 'John', 'jdeer', '090603', 'cashier', '09123456789', 'active'),
('User', 'Cashier', 'cashier', 'xyuuki18', 'cashier', '09177778888', 'active'),
('System', 'Admin', 'admin', 'admin123', 'cashier', '09170000000', 'active'),
('Reader', 'One', 'reader1', 'reader123', 'reader', '09171111111', 'active'),
('Reader', 'Two', 'reader2', 'reader123', 'reader', '09172222222', 'active'),
('Reader', 'Three', 'reader3', 'reader123', 'reader', '09173333333', 'active');

-- STEP 4: Customers (50 realistic entries)
INSERT INTO customers (last_name, first_name, middle_initial, address, meter_number, contact_number, customer_type, status, has_discount) VALUES
-- Zone 1
('Reyes', 'Maria', 'S', 'Zone 1, Pulupandan', 'MTR-2024-001', '09171234567', 'residential', 'active', false),
('Santos', 'Juan', 'D', 'Zone 1, Pulupandan', 'MTR-2024-002', '09181234568', 'residential', 'active', true),
('Cruz', 'Ana', 'M', 'Zone 1, Pulupandan', 'MTR-2024-003', '09191234569', 'residential', 'active', false),
('Garcia', 'Pedro', 'L', 'Zone 1, Pulupandan', 'MTR-2024-004', '09201234570', 'residential', 'active', false),
('Mendoza', 'Rosa', 'T', 'Zone 1, Pulupandan', 'MTR-2024-005', '09211234571', 'residential', 'active', true),
-- Zone 2
('Villanueva', 'Carlos', 'R', 'Zone 2, Pulupandan', 'MTR-2024-006', '09221234572', 'residential', 'active', false),
('Aquino', 'Elena', 'V', 'Zone 2, Pulupandan', 'MTR-2024-007', '09231234573', 'residential', 'active', false),
('Ramos', 'Miguel', 'A', 'Zone 2, Pulupandan', 'MTR-2024-008', '09241234574', 'residential', 'active', false),
('Torres', 'Luz', 'C', 'Zone 2, Pulupandan', 'MTR-2024-009', '09251234575', 'residential', 'active', true),
('Fernandez', 'Jose', 'B', 'Zone 2, Pulupandan', 'MTR-2024-010', '09261234576', 'residential', 'active', false),
-- Zone 3
(' Lopez', 'Carmen', 'G', 'Zone 3, Pulupandan', 'MTR-2024-011', '09271234577', 'residential', 'active', false),
('Gonzales', 'Roberto', 'F', 'Zone 3, Pulupandan', 'MTR-2024-012', '09281234578', 'commercial-a', 'active', false),
('Bautista', 'Linda', 'H', 'Zone 3, Pulupandan', 'MTR-2024-013', '09291234579', 'residential', 'active', false),
('Dela Cruz', 'Antonio', 'J', 'Zone 3, Pulupandan', 'MTR-2024-014', '09301234580', 'residential', 'active', true),
('Morales', 'Ricardo', 'N', 'Zone 3, Pulupandan', 'MTR-2024-015', '09321234582', 'full-commercial', 'active', false),
-- Zone 4
('Rivera', 'Teresa', 'P', 'Zone 4, Pulupandan', 'MTR-2024-016', '09331234583', 'residential', 'active', false),
('Flores', 'Manuel', 'Q', 'Zone 4, Pulupandan', 'MTR-2024-017', '09341234584', 'commercial-b', 'active', false),
('Diaz', 'Sofia', 'K', 'Zone 4, Pulupandan', 'MTR-2024-018', '09351234585', 'residential', 'active', true),
('Castillo', 'Ramon', 'W', 'Zone 4, Pulupandan', 'MTR-2024-019', '09361234586', 'residential', 'active', false),
('Navarro', 'Cristina', 'E', 'Zone 4, Pulupandan', 'MTR-2024-020', '09371234587', 'residential', 'active', false),
-- Zone 5
('Ortiz', 'Daniel', 'Y', 'Zone 5, Pulupandan', 'MTR-2024-021', '09381234588', 'residential', 'active', false),
('Salazar', 'Patricia', 'U', 'Zone 5, Pulupandan', 'MTR-2024-022', '09391234589', 'residential', 'active', true),
('Herrera', 'Francisco', 'I', 'Zone 5, Pulupandan', 'MTR-2024-023', '09401234590', 'residential', 'active', false),
('Jimenez', 'Angela', 'O', 'Zone 5, Pulupandan', 'MTR-2024-024', '09411234591', 'residential', 'active', false),
('Vargas', 'Luis', 'Z', 'Zone 5, Pulupandan', 'MTR-2024-025', '09421234592', 'full-commercial', 'active', false),
-- Zone 6
('Castro', 'Isabella', 'X', 'Zone 6, Pulupandan', 'MTR-2024-026', '09431234593', 'residential', 'active', false),
('Romero', 'Gabriel', 'C', 'Zone 6, Pulupandan', 'MTR-2024-027', '09441234594', 'residential', 'active', true),
('Ruiz', 'Valentina', 'V', 'Zone 6, Pulupandan', 'MTR-2024-028', '09451234595', 'commercial-a', 'active', false),
('Alvarez', 'Diego', 'B', 'Zone 6, Pulupandan', 'MTR-2024-029', '09461234596', 'residential', 'active', false),
('Medina', 'Camila', 'N', 'Zone 6, Pulupandan', 'MTR-2024-030', '09471234597', 'residential', 'active', false),
-- Zone 7
('Gutierrez', 'Sebastian', 'M', 'Zone 7, Pulupandan', 'MTR-2024-031', '09481234598', 'residential', 'active', false),
('Perez', 'Lucia', 'L', 'Zone 7, Pulupandan', 'MTR-2024-032', '09491234599', 'residential', 'active', true),
('Sanchez', 'Mateo', 'K', 'Zone 7, Pulupandan', 'MTR-2024-033', '09501234600', 'commercial-b', 'active', false),
('Ramirez', 'Martina', 'J', 'Zone 7, Pulupandan', 'MTR-2024-034', '09511234601', 'residential', 'active', false),
('Dominguez', 'Nicolas', 'H', 'Zone 7, Pulupandan', 'MTR-2024-035', '09521234602', 'residential', 'active', false),
-- Canjusa
('Aguilar', 'Emilia', 'G', 'Canjusa, Pulupandan', 'MTR-2024-036', '09531234603', 'residential', 'active', false),
('Rojas', 'Joaquin', 'F', 'Canjusa, Pulupandan', 'MTR-2024-037', '09541234604', 'residential', 'active', true),
('Mendez', 'Renata', 'D', 'Canjusa, Pulupandan', 'MTR-2024-038', '09551234605', 'residential', 'active', false),
('Fuentes', 'Alejandro', 'S', 'Canjusa, Pulupandan', 'MTR-2024-039', '09561234606', 'residential', 'active', false),
('Soto', 'Valeria', 'A', 'Canjusa, Pulupandan', 'MTR-2024-040', '09571234607', 'full-commercial', 'active', false),
-- Utod
('Campos', 'Adrian', 'Q', 'Utod, Pulupandan', 'MTR-2024-041', '09581234608', 'residential', 'active', false),
('Vega', 'Reg Regina', 'W', 'Utod, Pulupandan', 'MTR-2024-042', '09591234609', 'residential', 'active', true),
('Guerrero', 'Samuel', 'E', 'Utod, Pulupandan', 'MTR-2024-043', '09601234610', 'residential', 'active', false),
('Nunez', 'Daniela', 'R', 'Utod, Pulupandan', 'MTR-2024-044', '09611234611', 'residential', 'active', false),
('Pena', 'Leonardo', 'T', 'Utod, Pulupandan', 'MTR-2024-045', '09621234612', 'residential', 'active', false),
-- Pag-ayon
('Silva', 'Mariana', 'Y', 'Pag-ayon, Pulupandan', 'MTR-2024-046', '09631234613', 'residential', 'active', false),
('Cortez', 'Andres', 'U', 'Pag-ayon, Pulupandan', 'MTR-2024-047', '09641234614', 'residential', 'active', true),
('Lara', 'Natalia', 'I', 'Pag-ayon, Pulupandan', 'MTR-2024-048', '09651234615', 'residential', 'active', false),
('Rios', 'Julian', 'O', 'Pag-ayon, Pulupandan', 'MTR-2024-049', '09661234616', 'residential', 'active', false),
('Mora', 'Victoria', 'P', 'Pag-ayon, Pulupandan', 'MTR-2024-050', '09671234617', 'residential', 'active', false);

-- STEP 5: Area Boxes
INSERT INTO area_boxes (name, color, barangays, assigned_reader_id) VALUES
('Zone A - North', '#0288D1', ARRAY['Zone 1', 'Zone 2'], 5),
('Zone B - East', '#00897B', ARRAY['Zone 3', 'Zone 4'], 6),
('Zone C - South', '#F57C00', ARRAY['Zone 5', 'Zone 6'], 7),
('Zone D - West', '#7B1FA2', ARRAY['Zone 7', 'Canjusa'], 5),
('Zone E - Central', '#C62828', ARRAY['Utod', 'Pag-ayon', 'Palaka Norte', 'Mabini'], 6);

-- STEP 6: Billing Records (Varied statuses and amounts)
-- December 2025 (All Paid - Historical)
INSERT INTO billing (customer_id, billing_period, previous_reading, current_reading, consumption, amount, due_date, status, balance, payment_date) VALUES
(1, 'December 2025', 85, 100, 15, 375, '2025-12-20', 'paid', 0, '2025-12-18 14:30:00'),
(2, 'December 2025', 70, 80, 10, 300, '2025-12-20', 'paid', 0, '2025-12-19 09:15:00'),
(3, 'December 2025', 90, 105, 15, 375, '2025-12-20', 'paid', 0, '2025-12-17 16:45:00'),
(4, 'December 2025', 60, 72, 12, 330, '2025-12-20', 'paid', 0, '2025-12-20 11:20:00'),
(5, 'December 2025', 75, 88, 13, 264, '2025-12-20', 'paid', 0, '2025-12-16 13:00:00');

-- January 2026 (Mix of Paid and Unpaid)
INSERT INTO billing (customer_id, billing_period, previous_reading, current_reading, consumption, amount, due_date, status, balance, payment_date) VALUES
(1, 'January 2026', 100, 115, 15, 375, '2026-01-20', 'paid', 0, '2026-01-15 10:00:00'),
(2, 'January 2026', 80, 92, 12, 264, '2026-01-20', 'paid', 0, '2026-01-16 11:30:00'),
(3, 'January 2026', 105, 118, 13, 345, '2026-01-20', 'paid', 0, '2026-01-17 14:15:00'),
(4, 'January 2026', 72, 85, 13, 345, '2026-01-20', 'paid', 0, '2026-01-18 09:45:00'),
(5, 'January 2026', 88, 100, 12, 264, '2026-01-20', 'paid', 0, '2026-01-19 15:30:00'),
(6, 'January 2026', 50, 65, 15, 375, '2026-01-20', 'overdue', 375, NULL),
(7, 'January 2026', 45, 58, 13, 345, '2026-01-20', 'overdue', 345, NULL),
(8, 'January 2026', 80, 95, 15, 375, '2026-01-20', 'overdue', 375, NULL);

-- February 2026 (Current - Mix of all statuses)
INSERT INTO billing (customer_id, billing_period, previous_reading, current_reading, consumption, amount, due_date, status, balance) VALUES
-- Paid
(1, 'February 2026', 115, 130, 15, 375, '2026-02-28', 'paid', 0),
(2, 'February 2026', 92, 105, 13, 345, '2026-02-28', 'paid', 0),
(3, 'February 2026', 118, 133, 15, 375, '2026-02-28', 'paid', 0),
-- Unpaid
(4, 'February 2026', 85, 98, 13, 345, '2026-02-28', 'unpaid', 345),
(5, 'February 2026', 100, 112, 12, 330, '2026-02-28', 'unpaid', 330),
(9, 'February 2026', 70, 85, 15, 375, '2026-02-28', 'unpaid', 375),
(10, 'February 2026', 55, 68, 13, 345, '2026-02-28', 'unpaid', 345),
(11, 'February 2026', 90, 105, 15, 375, '2026-02-28', 'unpaid', 375),
(12, 'February 2026', 65, 77, 12, 330, '2026-02-28', 'unpaid', 330),
(13, 'February 2026', 75, 90, 15, 375, '2026-02-28', 'unpaid', 375),
(14, 'February 2026', 80, 92, 12, 264, '2026-02-28', 'unpaid', 264),
(15, 'February 2026', 100, 125, 25, 625, '2026-02-28', 'unpaid', 625),
-- Overdue
(6, 'February 2026', 65, 80, 15, 375, '2026-02-05', 'overdue', 375),
(7, 'February 2026', 58, 71, 13, 345, '2026-02-05', 'overdue', 345),
(8, 'February 2026', 95, 110, 15, 375, '2026-02-05', 'overdue', 375),
(16, 'February 2026', 40, 55, 15, 375, '2026-02-05', 'overdue', 375),
(17, 'February 2026', 50, 63, 13, 345, '2026-02-05', 'overdue', 345);

-- Add more varied billing for other customers
INSERT INTO billing (customer_id, billing_period, previous_reading, current_reading, consumption, amount, due_date, status, balance) VALUES
(18, 'February 2026', 60, 75, 15, 375, '2026-02-28', 'unpaid', 375),
(19, 'February 2026', 70, 82, 12, 330, '2026-02-28', 'unpaid', 330),
(20, 'February 2026', 85, 100, 15, 375, '2026-02-28', 'paid', 0),
(21, 'February 2026', 55, 68, 13, 345, '2026-02-28', 'unpaid', 345),
(22, 'February 2026', 90, 102, 12, 264, '2026-02-28', 'paid', 0),
(23, 'February 2026', 75, 90, 15, 375, '2026-02-28', 'unpaid', 375),
(24, 'February 2026', 80, 95, 15, 375, '2026-02-28', 'unpaid', 375),
(25, 'February 2026', 120, 150, 30, 750, '2026-02-28', 'unpaid', 750),
(26, 'February 2026', 65, 78, 13, 345, '2026-02-28', 'paid', 0),
(27, 'February 2026', 70, 82, 12, 264, '2026-02-28', 'paid', 0),
(28, 'February 2026', 85, 100, 15, 375, '2026-02-28', 'unpaid', 375),
(29, 'February 2026', 90, 105, 15, 375, '2026-02-28', 'unpaid', 375),
(30, 'February 2026', 75, 88, 13, 345, '2026-02-28', 'paid', 0);
