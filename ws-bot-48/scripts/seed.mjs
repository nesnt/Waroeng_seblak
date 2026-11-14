import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!rawUrl || !key) {
  console.error('Error: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env');
  process.exit(1);
}

const supabaseUrl = new URL(rawUrl.trim()).origin;
const supabase = createClient(supabaseUrl, key);

async function runSeeder() {
  console.log('🚀 Memulai proses seeding data ke Supabase:', supabaseUrl);

  try {
    // 1. store_settings
    console.log('\n1. Seeding store_settings...');
    const { error: storeErr } = await supabase.from('store_settings').upsert({
      id: 1,
      store_name: 'Waroeng Seblak 48',
      slogan: 'Sensasi Seblak Prasmanan Otentik & Juara Pedas',
      address: 'Jl. Raya Sukaresmi No. 48, Bandung',
      phone: '085724392492'
    }, { onConflict: 'id' });
    if (storeErr) console.warn('store_settings warning:', storeErr.message);
    else console.log('✅ store_settings berhasil.');

    // 2. categories
    console.log('\n2. Seeding categories...');
    const categoriesData = [
      { name: 'Kerupuk', type: 'INGREDIENT', description: 'Aneka kerupuk seblak mentah pilihan' },
      { name: 'Topping & Baso', type: 'INGREDIENT', description: 'Topping cuanki, baso, sosis, dan suki' },
      { name: 'Sayuran & Telur', type: 'INGREDIENT', description: 'Bahan segar pelengkap sayur dan telur' },
      { name: 'Bumbu & Kuah', type: 'INGREDIENT', description: 'Bumbu kencur dan cabai racikan khas 48' },
      { name: 'Minuman', type: 'MENU', description: 'Aneka minuman dingin pelepas dahaga' },
      { name: 'Paket Seblak', type: 'MENU', description: 'Paket menu seblak siap saji komplit' }
    ];
    for (const cat of categoriesData) {
      const { error: catErr } = await supabase.from('categories').upsert(cat, { onConflict: 'name,type' });
      if (catErr) console.warn(`category ${cat.name} warning:`, catErr.message);
    }
    console.log('✅ categories berhasil.');

    // 3. ingredients
    console.log('\n3. Seeding ingredients (Bahan Baku & Topping)...');
    const ingredientsData = [
      { name: 'Kerupuk Mawar', category: 'Kerupuk', current_stock: 85, min_stock: 20, unit: 'pcs', last_purchase_price: 500 },
      { name: 'Kerupuk Bintang', category: 'Kerupuk', current_stock: 70, min_stock: 20, unit: 'pcs', last_purchase_price: 500 },
      { name: 'Kerupuk Bawang Pelangi', category: 'Kerupuk', current_stock: 12, min_stock: 25, unit: 'pcs', last_purchase_price: 600 }, // menipis
      { name: 'Cuanki Lidah', category: 'Topping & Baso', current_stock: 120, min_stock: 30, unit: 'pcs', last_purchase_price: 1000 },
      { name: 'Cuanki Tahu', category: 'Topping & Baso', current_stock: 90, min_stock: 30, unit: 'pcs', last_purchase_price: 1000 },
      { name: 'Siomay Kering Mini', category: 'Topping & Baso', current_stock: 15, min_stock: 25, unit: 'pcs', last_purchase_price: 800 }, // menipis
      { name: 'Ceker Ayam Empuk', category: 'Topping & Baso', current_stock: 45, min_stock: 15, unit: 'pcs', last_purchase_price: 1500 },
      { name: 'Bakso Sapi Urat', category: 'Topping & Baso', current_stock: 60, min_stock: 20, unit: 'pcs', last_purchase_price: 1500 },
      { name: 'Sosis Sapi', category: 'Topping & Baso', current_stock: 50, min_stock: 20, unit: 'pcs', last_purchase_price: 1500 },
      { name: 'Dumpling Keju', category: 'Topping & Baso', current_stock: 35, min_stock: 15, unit: 'pcs', last_purchase_price: 1800 },
      { name: 'Chikuwa Seafood', category: 'Topping & Baso', current_stock: 8, min_stock: 15, unit: 'pcs', last_purchase_price: 1500 }, // menipis
      { name: 'Mie Kuning Basah', category: 'Sayuran & Telur', current_stock: 50, min_stock: 15, unit: 'pcs', last_purchase_price: 1000 },
      { name: 'Telur Ayam', category: 'Sayuran & Telur', current_stock: 40, min_stock: 15, unit: 'pcs', last_purchase_price: 2000 },
      { name: 'Sayur Sawi Hijau', category: 'Sayuran & Telur', current_stock: 30, min_stock: 10, unit: 'pcs', last_purchase_price: 1000 },
      { name: 'Cabai Rawit Merah', category: 'Bumbu & Kuah', current_stock: 5, min_stock: 10, unit: 'pcs', last_purchase_price: 2000 }, // kritis
      { name: 'Bumbu Kencur Seblak', category: 'Bumbu & Kuah', current_stock: 50, min_stock: 10, unit: 'pcs', last_purchase_price: 1500 }
    ];
    for (const ing of ingredientsData) {
      const { error: ingErr } = await supabase.from('ingredients').upsert(ing, { onConflict: 'name' });
      if (ingErr) console.warn(`ingredient ${ing.name} warning:`, ingErr.message);
    }
    console.log('✅ ingredients berhasil.');

    // 4. topping_options
    console.log('\n4. Seeding topping_options...');
    const toppingOptionsData = [
      { name: 'Cuanki Lidah', price: 2500, amount_used: 1, is_active: true },
      { name: 'Cuanki Tahu', price: 2500, amount_used: 1, is_active: true },
      { name: 'Ceker Ayam', price: 3000, amount_used: 1, is_active: true },
      { name: 'Bakso Sapi', price: 3000, amount_used: 1, is_active: true },
      { name: 'Sosis Sapi', price: 3000, amount_used: 1, is_active: true },
      { name: 'Dumpling Keju', price: 3500, amount_used: 1, is_active: true },
      { name: 'Chikuwa', price: 3000, amount_used: 1, is_active: true },
      { name: 'Siomay Kering Mini', price: 2000, amount_used: 1, is_active: true },
      { name: 'Mie Kuning', price: 2500, amount_used: 1, is_active: true },
      { name: 'Telur Ayam', price: 3500, amount_used: 1, is_active: true },
      { name: 'Kerupuk Campur', price: 3000, amount_used: 1, is_active: true },
      { name: 'Sayur Sawi Hijau', price: 2000, amount_used: 1, is_active: true }
    ];
    for (const top of toppingOptionsData) {
      const { error: topErr } = await supabase.from('topping_options').upsert(top, { onConflict: 'name' });
      if (topErr) console.warn(`topping ${top.name} warning:`, topErr.message);
    }
    console.log('✅ topping_options berhasil.');

    // 5. menu_items (Minuman & Paket)
    console.log('\n5. Seeding menu_items (Minuman & Paket)...');
    const menuItemsData = [
      {
        name: 'Es Teh Manis',
        category: 'Minuman',
        base_price: 4000,
        description: 'Teh melati manis segar dengan es batu melimpah',
        stock: 50,
        unit: 'pcs',
        is_available: true
      },
      {
        name: 'Es Jeruk Peras',
        category: 'Minuman',
        base_price: 6000,
        description: 'Jeruk peras murni asli dengan gula pasir segar',
        stock: 40,
        unit: 'pcs',
        is_available: true
      },
      {
        name: 'Teh Tarik Dingin',
        category: 'Minuman',
        base_price: 7000,
        description: 'Teh tarik creamy manis pas pereda pedas',
        stock: 25,
        unit: 'pcs',
        is_available: true
      },
      {
        name: 'Soda Gembira',
        category: 'Minuman',
        base_price: 10000,
        description: 'Soda segar berpadu susu kental manis dan sirup merah',
        stock: 8, // menipis
        unit: 'pcs',
        is_available: true
      },
      {
        name: 'Air Mineral Botol',
        category: 'Minuman',
        base_price: 3000,
        description: 'Air mineral dingin 600ml',
        stock: 60,
        unit: 'pcs',
        is_available: true
      },
      {
        name: 'Paket Seblak Komplit Juara',
        category: 'Paket Seblak',
        base_price: 25000,
        description: 'Seblak komplit ceker empuk, bakso, sosis, dumpling keju, cuanki, mie & telur',
        stock: 30,
        unit: 'pcs',
        is_available: true
      },
      {
        name: 'Paket Seblak Hemat Pelajar',
        category: 'Paket Seblak',
        base_price: 15000,
        description: 'Seblak prasmanan hemat kerupuk mawar, cuanki tahu, sosis, mie dan sayur',
        stock: 40,
        unit: 'pcs',
        is_available: true
      }
    ];
    for (const menu of menuItemsData) {
      const { error: menuErr } = await supabase.from('menu_items').upsert(menu, { onConflict: 'name' });
      if (menuErr) console.warn(`menu ${menu.name} warning:`, menuErr.message);
    }
    console.log('✅ menu_items berhasil.');

    // 6. transactions (Sample data transaksi hari ini)
    console.log('\n6. Seeding transactions & transaction_items...');
    const today = new Date().toISOString().split('T')[0];
    const transactionsData = [
      {
        invoice_number: `INV-${today.replace(/-/g, '')}-001`,
        customer_name: 'Kak Rizky',
        dine_type: 'Makan di Sini',
        total_amount: 28000,
        payment_method: 'QRIS',
        cash_received: 28000,
        change_amount: 0,
        status: 'Selesai',
        notes: 'Seblak Level 3 Kuah Kencur + Es Teh Manis',
        created_at: `${today}T11:30:00.000Z`
      },
      {
        invoice_number: `INV-${today.replace(/-/g, '')}-002`,
        customer_name: 'Kak Anisa',
        dine_type: 'Dibungkus',
        total_amount: 35000,
        payment_method: 'Tunai',
        cash_received: 40000,
        change_amount: 5000,
        status: 'Selesai',
        notes: 'Paket Seblak Komplit Juara Level 5 + Soda Gembira',
        created_at: `${today}T12:15:00.000Z`
      },
      {
        invoice_number: `INV-${today.replace(/-/g, '')}-003`,
        customer_name: 'Kak Budi Santoso',
        dine_type: 'Makan di Sini',
        total_amount: 21000,
        payment_method: 'Transfer',
        cash_received: 21000,
        change_amount: 0,
        status: 'Selesai',
        notes: 'Seblak prasmanan ceker + cuanki lidah + Es Jeruk',
        created_at: `${today}T13:00:00.000Z`
      }
    ];

    for (const trx of transactionsData) {
      const { data: insertedTrx, error: trxErr } = await supabase
        .from('transactions')
        .upsert(trx, { onConflict: 'invoice_number' })
        .select('id')
        .single();

      if (trxErr) {
        console.warn(`transaction ${trx.invoice_number} warning:`, trxErr.message);
      } else if (insertedTrx?.id) {
        // Masukkan transaction_items contoh
        await supabase.from('transaction_items').upsert([
          {
            transaction_id: insertedTrx.id,
            menu_name: trx.notes,
            quantity: 1,
            base_price: trx.total_amount,
            spicy_level: 3,
            broth_type: 'Kuah Kencur Asli',
            subtotal: trx.total_amount
          }
        ]);
      }
    }
    console.log('✅ transactions & transaction_items berhasil.');

    // 7. bowl_orders (Antrian mangkok prasmanan)
    console.log('\n7. Seeding bowl_orders...');
    const bowlOrdersData = [
      {
        bowl_number: 'Mangkok 01',
        customer_name: 'Kak Citra',
        dine_type: 'Makan di Sini',
        spicy_level: 2,
        broth_type: 'Kuah Kencur Sedang',
        status: 'menunggu_hitung',
        notes: 'Tambah kencur lebih harum'
      },
      {
        bowl_number: 'Mangkok 02',
        customer_name: 'Kak Dimas',
        dine_type: 'Dibungkus',
        spicy_level: 5,
        broth_type: 'Kuah Rawit Juara',
        status: 'menunggu_hitung',
        notes: 'Pisah kerupuknya di plastik kecil'
      }
    ];
    for (const bowl of bowlOrdersData) {
      const { error: bowlErr } = await supabase.from('bowl_orders').insert(bowl);
      if (bowlErr) console.warn('bowl_order warning:', bowlErr.message);
    }
    console.log('✅ bowl_orders berhasil.');

    console.log('\n🎉 PROSES SEEDING BERHASIL 100%! Seluruh data awal telah masuk ke database Supabase Waroeng Seblak 48.');
  } catch (err) {
    console.error('\n❌ Error fatal saat menjalankan seeder:', err);
  }
}

runSeeder();
