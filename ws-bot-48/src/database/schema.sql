-- ==========================================
-- SKEMA DATABASE SUPABASE / POSTGRESQL
-- UMKM WHATSAPP AI AGENT - WAROENG SEBLAK 48
-- ==========================================

-- Ekstensi pgcrypto untuk UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. TABEL UTAMA WARUNG (OPERASIONAL & MASTER)
-- ==========================================

-- 1.1 store_settings (Pengaturan Identitas Warung)
CREATE TABLE IF NOT EXISTS store_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    store_name VARCHAR(100) NOT NULL DEFAULT 'Waroeng Seblak 48',
    slogan VARCHAR(150) NULL DEFAULT 'Sensasi Seblak Prasmanan Otentik & Juara Pedas',
    address TEXT NULL DEFAULT 'Jl. Raya Sukaresmi No. 48, Bandung',
    phone VARCHAR(30) NULL DEFAULT '628123456789',
    opening_hours VARCHAR(100) DEFAULT '10:00 - 22:00 WIB',
    brochure_url TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 ingredients (Inventori Bahan Baku & Topping Seblak)
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NULL,
    name VARCHAR(100) UNIQUE NOT NULL,
    current_stock NUMERIC(12,2) DEFAULT 0 CHECK (current_stock >= 0),
    unit VARCHAR(20) DEFAULT 'pcs',
    min_stock NUMERIC(12,2) DEFAULT 20 CHECK (min_stock >= 0),
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

-- 1.3 menu_items (Menu Minuman, Paket, & Makanan Jadi)
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NULL, -- 'Minuman', 'Paket', 'Camilan'
    name VARCHAR(100) UNIQUE NOT NULL,
    base_price DECIMAL(12,2) NOT NULL CHECK (base_price >= 0),
    description TEXT NULL,
    image_url TEXT NULL,
    stock INT DEFAULT 50 CHECK (stock >= 0),
    unit VARCHAR(20) DEFAULT 'pcs',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 topping_options (Pilihan Topping Prasmanan)
CREATE TABLE IF NOT EXISTS topping_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID NULL REFERENCES ingredients(id) ON DELETE SET NULL,
    name VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    amount_used INT DEFAULT 1 CHECK (amount_used > 0),
    is_active BOOLEAN DEFAULT TRUE
);

-- 1.5 transactions (Riwayat Penjualan & Transaksi Kasir)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100) NULL,
    dine_type VARCHAR(30) NOT NULL DEFAULT 'Makan di Sini',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Tunai', 'QRIS', 'Transfer')),
    cash_received DECIMAL(12,2) NULL,
    change_amount DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'Selesai' CHECK (status IN ('Selesai', 'Batal')),
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.6 transaction_items (Rincian Item Transaksi)
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    menu_item_id UUID NULL REFERENCES menu_items(id) ON DELETE SET NULL,
    menu_name VARCHAR(100) NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    base_price DECIMAL(12,2) NOT NULL,
    spicy_level INT DEFAULT 0,
    broth_type VARCHAR(30) NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    item_notes TEXT NULL
);

-- ==========================================
-- 2. TABEL KHUSUS WHATSAPP AI AGENT
-- ==========================================

-- 2.1 wa_chat_logs (Riwayat Interaksi Bot WhatsApp & Audit Trail)
CREATE TABLE IF NOT EXISTS wa_chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_jid VARCHAR(100) NOT NULL,
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('OWNER', 'CUSTOMER')),
    sender_name VARCHAR(100) NULL,
    incoming_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    tool_calls_executed JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_chat_logs_sender ON wa_chat_logs(sender_jid);
CREATE INDEX IF NOT EXISTS idx_wa_chat_logs_created_at ON wa_chat_logs(created_at DESC);

-- 2.2 wa_customer_leads (Data Pelanggan WhatsApp untuk CRM & Promo)
CREATE TABLE IF NOT EXISTS wa_customer_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(30) UNIQUE NOT NULL,
    push_name VARCHAR(100) NULL,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    interaction_count INT DEFAULT 1,
    notes TEXT NULL
);

-- ==========================================
-- 3. STORED FUNCTIONS & PROCEDURES UNTUK TOOL AGENT
-- ==========================================

-- Fungsi untuk mengambil ringkasan omset harian
CREATE OR REPLACE FUNCTION get_daily_omset_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    total_revenue NUMERIC,
    total_transactions BIGINT,
    cash_total NUMERIC,
    qris_total NUMERIC,
    transfer_total NUMERIC,
    canceled_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'Selesai' THEN total_amount ELSE 0 END), 0) AS total_revenue,
        COUNT(CASE WHEN status = 'Selesai' THEN 1 END) AS total_transactions,
        COALESCE(SUM(CASE WHEN status = 'Selesai' AND payment_method = 'Tunai' THEN total_amount ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(CASE WHEN status = 'Selesai' AND payment_method = 'QRIS' THEN total_amount ELSE 0 END), 0) AS qris_total,
        COALESCE(SUM(CASE WHEN status = 'Selesai' AND payment_method = 'Transfer' THEN total_amount ELSE 0 END), 0) AS transfer_total,
        COUNT(CASE WHEN status = 'Batal' THEN 1 END) AS canceled_count
    FROM transactions
    WHERE DATE(created_at) = target_date;
END;
$$ LANGUAGE plpgsql;

