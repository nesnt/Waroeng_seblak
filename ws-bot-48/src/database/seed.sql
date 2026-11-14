-- ==========================================
-- SQL SEEDER DATA - WAROENG SEBLAK 48
-- ==========================================

-- 1. store_settings
INSERT INTO store_settings (id, store_name, slogan, address, phone)
VALUES (1, 'Waroeng Seblak 48', 'Sensasi Seblak Prasmanan Otentik & Juara Pedas', 'Jl. Raya Sukaresmi No. 48, Bandung', '085724392492')
ON CONFLICT (id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    slogan = EXCLUDED.slogan,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone;

-- 2. categories
INSERT INTO categories (name, type, description)
VALUES 
    ('Kerupuk', 'INGREDIENT', 'Aneka kerupuk seblak mentah pilihan'),
    ('Topping & Baso', 'INGREDIENT', 'Topping cuanki, baso, sosis, dan suki'),
    ('Sayuran & Telur', 'INGREDIENT', 'Bahan segar pelengkap sayur dan telur'),
    ('Bumbu & Kuah', 'INGREDIENT', 'Bumbu kencur dan cabai racikan khas 48'),
    ('Minuman', 'MENU', 'Aneka minuman dingin pelepas dahaga'),
    ('Paket Seblak', 'MENU', 'Paket menu seblak siap saji komplit')
ON CONFLICT (name, type) DO NOTHING;

-- 3. ingredients
INSERT INTO ingredients (name, category, current_stock, min_stock, unit, last_purchase_price)
VALUES 
    ('Kerupuk Mawar', 'Kerupuk', 85, 20, 'pcs', 500),
    ('Kerupuk Bintang', 'Kerupuk', 70, 20, 'pcs', 500),
    ('Kerupuk Bawang Pelangi', 'Kerupuk', 12, 25, 'pcs', 600),
    ('Cuanki Lidah', 'Topping & Baso', 120, 30, 'pcs', 1000),
    ('Cuanki Tahu', 'Topping & Baso', 90, 30, 'pcs', 1000),
    ('Siomay Kering Mini', 'Topping & Baso', 15, 25, 'pcs', 800),
    ('Ceker Ayam Empuk', 'Topping & Baso', 45, 15, 'pcs', 1500),
    ('Bakso Sapi Urat', 'Topping & Baso', 60, 20, 'pcs', 1500),
    ('Sosis Sapi', 'Topping & Baso', 50, 20, 'pcs', 1500),
    ('Dumpling Keju', 'Topping & Baso', 35, 15, 'pcs', 1800),
    ('Chikuwa Seafood', 'Topping & Baso', 8, 15, 'pcs', 1500),
    ('Mie Kuning Basah', 'Sayuran & Telur', 50, 15, 'pcs', 1000),
    ('Telur Ayam', 'Sayuran & Telur', 40, 15, 'pcs', 2000),
    ('Sayur Sawi Hijau', 'Sayuran & Telur', 30, 10, 'pcs', 1000),
    ('Cabai Rawit Merah', 'Bumbu & Kuah', 5, 10, 'pcs', 2000),
    ('Bumbu Kencur Seblak', 'Bumbu & Kuah', 50, 10, 'pcs', 1500)
ON CONFLICT (name) DO UPDATE SET
    current_stock = EXCLUDED.current_stock,
    min_stock = EXCLUDED.min_stock;

-- 4. topping_options
INSERT INTO topping_options (name, price, amount_used, is_active)
VALUES 
    ('Cuanki Lidah', 2500, 1, true),
    ('Cuanki Tahu', 2500, 1, true),
    ('Ceker Ayam', 3000, 1, true),
    ('Bakso Sapi', 3000, 1, true),
    ('Sosis Sapi', 3000, 1, true),
    ('Dumpling Keju', 3500, 1, true),
    ('Chikuwa', 3000, 1, true),
    ('Siomay Kering Mini', 2000, 1, true),
    ('Mie Kuning', 2500, 1, true),
    ('Telur Ayam', 3500, 1, true),
    ('Kerupuk Campur', 3000, 1, true),
    ('Sayur Sawi Hijau', 2000, 1, true)
ON CONFLICT (name) DO UPDATE SET
    price = EXCLUDED.price,
    is_active = EXCLUDED.is_active;

-- 5. menu_items
INSERT INTO menu_items (name, category, base_price, description, stock, unit, is_available)
VALUES 
    ('Es Teh Manis', 'Minuman', 4000, 'Teh melati manis segar dengan es batu melimpah', 50, 'pcs', true),
    ('Es Jeruk Peras', 'Minuman', 6000, 'Jeruk peras murni asli dengan gula pasir segar', 40, 'pcs', true),
    ('Teh Tarik Dingin', 'Minuman', 7000, 'Teh tarik creamy manis pas pereda pedas', 25, 'pcs', true),
    ('Soda Gembira', 'Minuman', 10000, 'Soda segar berpadu susu kental manis dan sirup merah', 8, 'pcs', true),
    ('Air Mineral Botol', 'Minuman', 3000, 'Air mineral dingin 600ml', 60, 'pcs', true),
    ('Paket Seblak Komplit Juara', 'Paket Seblak', 25000, 'Seblak komplit ceker empuk, bakso, sosis, dumpling keju, cuanki, mie & telur', 30, 'pcs', true),
    ('Paket Seblak Hemat Pelajar', 'Paket Seblak', 15000, 'Seblak prasmanan hemat kerupuk mawar, cuanki tahu, sosis, mie dan sayur', 40, 'pcs', true)
ON CONFLICT (name) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    stock = EXCLUDED.stock,
    is_available = EXCLUDED.is_available;
