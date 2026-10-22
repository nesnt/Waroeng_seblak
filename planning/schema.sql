-- ==========================================
-- 0. FUNGSI TRIGGER UNTUK UPDATED_AT (Khusus Postgres)
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 1. TABEL MASTER & PENGATURAN
-- ==========================================

-- 1. store_settings (Hanya menyimpan profil fisik toko - 4NF)
CREATE TABLE store_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Memastikan hanya ada 1 baris
    store_name VARCHAR(100) NOT NULL,
    slogan VARCHAR(150) NULL,
    address TEXT NULL,
    phone VARCHAR(30) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_store_settings_updated_at
BEFORE UPDATE ON store_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. users (Menampung preferensi UI per akun kasir/admin - 4NF)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('KASIR', 'ADMIN')),
    account_status VARCHAR(20) DEFAULT 'Online' CHECK (account_status IN ('Online', 'Sibuk', 'Istirahat')),
    text_scale VARCHAR(20) DEFAULT 'normal' CHECK (text_scale IN ('normal', 'large', 'xlarge')),
    is_dark_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. categories (Normalisasi kategori bahan & menu - 3NF)
CREATE TABLE categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INGREDIENT', 'MENU')),
    UNIQUE (name, type)
);

-- ==========================================
-- 2. TABEL INVENTORI & MENU (3NF)
-- ==========================================

-- 4. ingredients (Kolom status menggunakan Stored Generated Column agar patuh 3NF)
CREATE TABLE ingredients (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL REFERENCES categories(id),
    name VARCHAR(100) NOT NULL,
    current_stock INT DEFAULT 0 CHECK (current_stock >= 0),
    unit VARCHAR(20) DEFAULT 'pcs' CHECK (unit IN ('pcs', 'gram', 'ml', 'porsi')),
    min_stock INT DEFAULT 20 CHECK (min_stock >= 0),
    last_purchase_price DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN current_stock <= 0 THEN 'habis'
            WHEN current_stock <= min_stock THEN 'menipis'
            ELSE 'aman'
        END
    ) STORED,
    image_url TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_ingredients_updated_at
BEFORE UPDATE ON ingredients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. menu_items
CREATE TABLE menu_items (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL REFERENCES categories(id),
    name VARCHAR(100) NOT NULL,
    base_price DECIMAL(12,2) NOT NULL CHECK (base_price >= 0),
    description TEXT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. menu_recipes (Kolom 'unit' dihapus karena merujuk langsung ke ingredients.unit)
CREATE TABLE menu_recipes (
    id VARCHAR(36) PRIMARY KEY,
    menu_item_id VARCHAR(36) NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id VARCHAR(36) NOT NULL REFERENCES ingredients(id),
    amount_needed DECIMAL(10,2) NOT NULL CHECK (amount_needed > 0),
    UNIQUE (menu_item_id, ingredient_id)
);

-- 7. topping_options
CREATE TABLE topping_options (
    id VARCHAR(36) PRIMARY KEY,
    ingredient_id VARCHAR(36) NOT NULL REFERENCES ingredients(id),
    name VARCHAR(100) NOT NULL,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    amount_used INT DEFAULT 1 CHECK (amount_used > 0),
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 3. TABEL TRANSAKSI & LOG STOK
-- ==========================================

-- 8. transactions
CREATE TABLE transactions (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    cashier_id VARCHAR(36) NOT NULL REFERENCES users(id),
    customer_name VARCHAR(100) NULL,
    dine_type VARCHAR(30) NOT NULL DEFAULT 'Makan di Sini' CHECK (dine_type IN ('Makan di Sini', 'Dibungkus')),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Tunai', 'QRIS', 'Transfer')),
    cash_received DECIMAL(12,2) NULL,
    change_amount DECIMAL(12,2) GENERATED ALWAYS AS (
        CASE 
            WHEN cash_received IS NOT NULL THEN cash_received - total_amount
            ELSE 0.00
        END
    ) STORED,
    status VARCHAR(20) DEFAULT 'Selesai' CHECK (status IN ('Selesai', 'Batal')),
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. stock_logs (Tanpa kolom 'unit', ditambah FK 'transaction_id' untuk audit trail)
CREATE TABLE stock_logs (
    id VARCHAR(36) PRIMARY KEY,
    ingredient_id VARCHAR(36) NOT NULL REFERENCES ingredients(id),
    transaction_id VARCHAR(36) NULL REFERENCES transactions(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('masuk', 'keluar')),
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    note TEXT NULL,
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. transaction_items (Tanpa 'menu_name', ditambah 'broth_type')
CREATE TABLE transaction_items (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    menu_item_id VARCHAR(36) NOT NULL REFERENCES menu_items(id),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    base_price DECIMAL(12,2) NOT NULL, -- Snapshot harga pokok menu saat transaksi
    spicy_level INT DEFAULT 0 CHECK (spicy_level BETWEEN 0 AND 5),
    broth_type VARCHAR(30) NULL CHECK (broth_type IN ('Asin Manis', 'Gurih', 'Manis', 'Tanpa Kuah')),
    subtotal DECIMAL(12,2) NOT NULL,
    item_notes TEXT NULL
);

-- 11. transaction_item_toppings (Tanpa 'topping_name')
CREATE TABLE transaction_item_toppings (
    id VARCHAR(36) PRIMARY KEY,
    transaction_item_id VARCHAR(36) NOT NULL REFERENCES transaction_items(id) ON DELETE CASCADE,
    topping_id VARCHAR(36) NOT NULL REFERENCES topping_options(id),
    price DECIMAL(12,2) NOT NULL, -- Snapshot harga jual topping saat transaksi
    quantity INT DEFAULT 1 CHECK (quantity > 0)
);

-- ==========================================
-- 4. TABEL ANTRIAN PRASMANAN (BOWL ORDERS)
-- ==========================================

-- 12. bowl_orders (Menggunakan FK transaction_id)
CREATE TABLE bowl_orders (
    id VARCHAR(36) PRIMARY KEY,
    bowl_number VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    dine_type VARCHAR(30) NOT NULL CHECK (dine_type IN ('Makan di Sini', 'Dibungkus')),
    spicy_level INT DEFAULT 0 CHECK (spicy_level BETWEEN 0 AND 5),
    spicy_request_text VARCHAR(150) NULL,
    broth_type VARCHAR(30) NOT NULL CHECK (broth_type IN ('Asin Manis', 'Gurih', 'Manis')),
    notes TEXT NULL,
    status VARCHAR(30) DEFAULT 'menunggu_hitung' CHECK (status IN ('menunggu_hitung', 'selesai', 'batal')),
    transaction_id VARCHAR(36) UNIQUE NULL REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. bowl_order_toppings (Mencatat isi topping di mangkok antrian)
CREATE TABLE bowl_order_toppings (
    id VARCHAR(36) PRIMARY KEY,
    bowl_order_id VARCHAR(36) NOT NULL REFERENCES bowl_orders(id) ON DELETE CASCADE,
    topping_id VARCHAR(36) NOT NULL REFERENCES topping_options(id),
    qty INT NOT NULL DEFAULT 1 CHECK (qty > 0)
);

-- 14. bowl_order_drinks (Tanpa 'name' & 'price' agar 3NF)
CREATE TABLE bowl_order_drinks (
    id VARCHAR(36) PRIMARY KEY,
    bowl_order_id VARCHAR(36) NOT NULL REFERENCES bowl_orders(id) ON DELETE CASCADE,
    menu_item_id VARCHAR(36) NOT NULL REFERENCES menu_items(id),
    qty INT NOT NULL DEFAULT 1 CHECK (qty > 0)
);