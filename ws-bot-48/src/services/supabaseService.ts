import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';

export interface DailyOmsetSummary {
  date: string;
  totalRevenue: number;
  totalTransactions: number;
  cashTotal: number;
  qrisTotal: number;
  transferTotal: number;
  canceledCount: number;
  formattedRevenue: string;
}

export interface StockItem {
  id?: string;
  name: string;
  category?: string;
  currentStock: number;
  minStock?: number;
  unit: string;
  status?: string;
  price?: number;
}

export interface CatalogItem {
  name: string;
  category: string;
  price: number;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  stock?: number;
  unit?: string;
}

// Format number to Rupiah string (e.g., Rp 45.000)
export const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
};

// ==========================================
// 1. OWNER QUERIES & OPERATIONS
// ==========================================

/**
 * Mengambil ringkasan omset dan performa penjualan untuk tanggal tertentu (default hari ini)
 */
export const getDailyOmset = async (dateStr?: string): Promise<DailyOmsetSummary> => {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const startOfDay = `${targetDate}T00:00:00.000Z`;
  const endOfDay = `${targetDate}T23:59:59.999Z`;

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('total_amount, payment_method, status, created_at')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (error) throw error;

    const transactions = data || [];
    let totalRevenue = 0;
    let totalTransactions = 0;
    let cashTotal = 0;
    let qrisTotal = 0;
    let transferTotal = 0;
    let canceledCount = 0;

    for (const trx of transactions) {
      if (trx.status === 'Selesai') {
        const amount = Number(trx.total_amount) || 0;
        totalRevenue += amount;
        totalTransactions += 1;

        if (trx.payment_method === 'Tunai') cashTotal += amount;
        else if (trx.payment_method === 'QRIS') qrisTotal += amount;
        else if (trx.payment_method === 'Transfer') transferTotal += amount;
      } else if (trx.status === 'Batal') {
        canceledCount += 1;
      }
    }

    return {
      date: targetDate,
      totalRevenue,
      totalTransactions,
      cashTotal,
      qrisTotal,
      transferTotal,
      canceledCount,
      formattedRevenue: formatRupiah(totalRevenue)
    };
  } catch (err: any) {
    console.error('[supabaseService.getDailyOmset Error]:', err.message);
    throw new Error(`Gagal mengambil data omset harian: ${err.message}`);
  }
};

/**
 * Mengambil daftar bahan baku & minuman yang stoknya menipis atau habis
 */
export const getLowStockIngredients = async (threshold?: number): Promise<{ ingredients: StockItem[]; drinks: StockItem[] }> => {
  try {
    // 1. Ambil bahan baku & topping dari ingredients
    const { data: ingData, error: ingError } = await supabase
      .from('ingredients')
      .select('id, name, category, current_stock, min_stock, unit, status')
      .order('current_stock', { ascending: true });

    if (ingError) throw ingError;

    const lowIngredients: StockItem[] = (ingData || [])
      .filter((item: any) => {
        const current = Number(item.current_stock) || 0;
        const min = threshold !== undefined ? threshold : (Number(item.min_stock) || 20);
        return current <= min || item.status === 'habis' || item.status === 'menipis';
      })
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category || 'Topping/Bahan',
        currentStock: Number(item.current_stock) || 0,
        minStock: Number(item.min_stock) || 20,
        unit: item.unit || 'pcs',
        status: item.status || (Number(item.current_stock) <= 0 ? 'habis' : 'menipis')
      }));

    // 2. Ambil minuman dari menu_items yang stoknya <= 10 pcs
    const { data: drinkData, error: drinkError } = await supabase
      .from('menu_items')
      .select('id, name, category, stock, unit, base_price, is_available')
      .eq('category', 'Minuman')
      .order('stock', { ascending: true });

    if (drinkError) throw drinkError;

    const lowDrinks: StockItem[] = (drinkData || [])
      .filter((item: any) => (item.stock ?? 50) <= 10 || !item.is_available)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        category: 'Minuman',
        currentStock: item.stock ?? 0,
        minStock: 10,
        unit: item.unit || 'pcs',
        status: (item.stock ?? 0) <= 0 ? 'habis' : 'menipis',
        price: Number(item.base_price) || 0
      }));

    return {
      ingredients: lowIngredients,
      drinks: lowDrinks
    };
  } catch (err: any) {
    console.error('[supabaseService.getLowStockIngredients Error]:', err.message);
    throw new Error(`Gagal mengambil data stok kritis: ${err.message}`);
  }
};

/**
 * Mengambil seluruh daftar stok bahan baku atau minuman
 */
export const getAllStock = async (type: 'all' | 'bahan' | 'minuman' = 'all'): Promise<StockItem[]> => {
  const result: StockItem[] = [];

  try {
    if (type === 'all' || type === 'bahan') {
      const { data: ingData } = await supabase
        .from('ingredients')
        .select('name, category, current_stock, min_stock, unit, status')
        .order('name');

      if (ingData) {
        for (const item of ingData) {
          result.push({
            name: item.name,
            category: item.category || 'Bahan Baku',
            currentStock: Number(item.current_stock) || 0,
            minStock: Number(item.min_stock) || 20,
            unit: item.unit || 'pcs',
            status: item.status
          });
        }
      }
    }

    if (type === 'all' || type === 'minuman') {
      const { data: drinkData } = await supabase
        .from('menu_items')
        .select('name, category, stock, unit, is_available, base_price')
        .eq('category', 'Minuman')
        .order('name');

      if (drinkData) {
        for (const item of drinkData) {
          result.push({
            name: item.name,
            category: 'Minuman',
            currentStock: item.stock ?? 0,
            unit: item.unit || 'pcs',
            status: item.is_available ? 'aman' : 'habis',
            price: Number(item.base_price) || 0
          });
        }
      }
    }

    return result;
  } catch (err: any) {
    console.error('[supabaseService.getAllStock Error]:', err.message);
    throw new Error(`Gagal mengambil data stok: ${err.message}`);
  }
};

/**
 * Mengupdate stok bahan baku (tambah atau kurang) secara langsung dari chat
 */
export const updateIngredientStock = async (
  name: string,
  amount: number,
  type: 'tambah' | 'kurang',
  note?: string
): Promise<{ success: boolean; name: string; oldStock: number; newStock: number; unit: string; message: string }> => {
  try {
    // 1. Cari di tabel ingredients
    const { data: items, error: findError } = await supabase
      .from('ingredients')
      .select('id, name, current_stock, unit')
      .ilike('name', `%${name}%`)
      .limit(1);

    if (findError) throw findError;

    if (items && items.length > 0) {
      const ing = items[0];
      const oldStock = Number(ing.current_stock) || 0;
      const change = Math.abs(amount);
      const newStock = type === 'tambah' ? oldStock + change : Math.max(0, oldStock - change);

      const { error: updateError } = await supabase
        .from('ingredients')
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', ing.id);

      if (updateError) throw updateError;

      // Opsional: Catat log stok jika tabel stock_logs tersedia
      try {
        await supabase.from('stock_logs').insert({
          ingredient_id: ing.id,
          type: type === 'tambah' ? 'masuk' : 'keluar',
          amount: change,
          balance_after: newStock,
          note: note || `Update via WhatsApp AI Agent (${type})`
        });
      } catch (logErr) {
        // Abaikan jika trigger/constraint log belum diatur
      }

      return {
        success: true,
        name: ing.name,
        oldStock,
        newStock,
        unit: ing.unit || 'pcs',
        message: `Stok ${ing.name} berhasil diubah dari ${oldStock} ${ing.unit} menjadi ${newStock} ${ing.unit}.`
      };
    }

    // 2. Jika tidak ada di ingredients, coba cari di menu_items (kategori Minuman)
    const { data: drinkItems } = await supabase
      .from('menu_items')
      .select('id, name, stock, unit')
      .ilike('name', `%${name}%`)
      .limit(1);

    if (drinkItems && drinkItems.length > 0) {
      const drink = drinkItems[0];
      const oldStock = drink.stock ?? 0;
      const change = Math.abs(amount);
      const newStock = type === 'tambah' ? oldStock + change : Math.max(0, oldStock - change);

      await supabase
        .from('menu_items')
        .update({
          stock: newStock,
          is_available: newStock > 0
        })
        .eq('id', drink.id);

      return {
        success: true,
        name: drink.name,
        oldStock,
        newStock,
        unit: drink.unit || 'pcs',
        message: `Stok Minuman ${drink.name} berhasil diubah dari ${oldStock} ${drink.unit} menjadi ${newStock} ${drink.unit}.`
      };
    }

    return {
      success: false,
      name,
      oldStock: 0,
      newStock: 0,
      unit: '',
      message: `Bahan atau minuman dengan nama "${name}" tidak ditemukan di sistem.`
    };
  } catch (err: any) {
    console.error('[supabaseService.updateIngredientStock Error]:', err.message);
    throw new Error(`Gagal mengupdate stok: ${err.message}`);
  }
};

/**
 * Mengambil transaksi terbaru dari kasir
 */
export const getRecentTransactions = async (limit: number = 5): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('invoice_number, customer_name, total_amount, payment_method, status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((t: any) => ({
      invoiceNumber: t.invoice_number,
      customerName: t.customer_name || 'Pelanggan',
      totalAmount: Number(t.total_amount) || 0,
      formattedAmount: formatRupiah(Number(t.total_amount) || 0),
      paymentMethod: t.payment_method,
      status: t.status,
      time: new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }));
  } catch (err: any) {
    console.error('[supabaseService.getRecentTransactions Error]:', err.message);
    return [];
  }
};

// ==========================================
// 2. CUSTOMER QUERIES & OPERATIONS
// ==========================================

/**
 * Mengambil seluruh katalog menu & topping untuk pelanggan
 */
export const getCatalog = async (categoryFilter?: string): Promise<CatalogItem[]> => {
  const catalog: CatalogItem[] = [];

  try {
    // 1. Ambil topping aktif dari topping_options
    if (!categoryFilter || categoryFilter.toLowerCase().includes('topping') || categoryFilter.toLowerCase().includes('seblak')) {
      const { data: toppings } = await supabase
        .from('topping_options')
        .select('name, price, is_active')
        .eq('is_active', true)
        .order('name');

      if (toppings) {
        for (const t of toppings) {
          catalog.push({
            name: t.name,
            category: 'Topping Seblak',
            price: Number(t.price) || 0,
            isAvailable: true,
            description: 'Pilihan topping prasmanan segar siap racik'
          });
        }
      }
    }

    // 2. Ambil menu minuman dan paket dari menu_items
    const { data: menuData } = await supabase
      .from('menu_items')
      .select('name, category, base_price, description, image_url, is_available, stock, unit')
      .order('category')
      .order('name');

    if (menuData) {
      for (const m of menuData) {
        if (categoryFilter && m.category?.toLowerCase() !== categoryFilter.toLowerCase()) {
          continue;
        }
        catalog.push({
          name: m.name,
          category: m.category || 'Menu',
          price: Number(m.base_price) || 0,
          description: m.description || '',
          imageUrl: m.image_url || '',
          isAvailable: m.is_available && (m.stock === null || m.stock === undefined || m.stock > 0),
          stock: m.stock,
          unit: m.unit || 'pcs'
        });
      }
    }

    return catalog;
  } catch (err: any) {
    console.error('[supabaseService.getCatalog Error]:', err.message);
    throw new Error(`Gagal mengambil katalog menu: ${err.message}`);
  }
};

/**
 * Mengecek ketersediaan suatu menu atau topping tertentu
 */
export const checkMenuAvailability = async (query: string): Promise<{ found: boolean; name?: string; category?: string; price?: number; isAvailable?: boolean; notes?: string }> => {
  try {
    // Cek menu_items terlebih dahulu
    const { data: menus } = await supabase
      .from('menu_items')
      .select('name, category, base_price, is_available, stock')
      .ilike('name', `%${query}%`)
      .limit(1);

    if (menus && menus.length > 0) {
      const m = menus[0];
      const available = m.is_available && (m.stock === null || m.stock === undefined || m.stock > 0);
      return {
        found: true,
        name: m.name,
        category: m.category || 'Menu',
        price: Number(m.base_price) || 0,
        isAvailable: available,
        notes: available ? 'Stok tersedia siap dipesan!' : 'Mohon maaf, saat ini sedang habis.'
      };
    }

    // Cek topping_options
    const { data: toppings } = await supabase
      .from('topping_options')
      .select('name, price, is_active')
      .ilike('name', `%${query}%`)
      .limit(1);

    if (toppings && toppings.length > 0) {
      const t = toppings[0];
      return {
        found: true,
        name: t.name,
        category: 'Topping Seblak',
        price: Number(t.price) || 0,
        isAvailable: t.is_active,
        notes: t.is_active ? 'Topping ready di etalase prasmanan!' : 'Topping sedang tidak aktif.'
      };
    }

    return {
      found: false,
      notes: `Menu atau topping "${query}" tidak ditemukan dalam daftar.`
    };
  } catch (err: any) {
    console.error('[supabaseService.checkMenuAvailability Error]:', err.message);
    return { found: false, notes: 'Terjadi kendala saat memeriksa ketersediaan menu.' };
  }
};

/**
 * Mengambil informasi profil warung dari database atau env fallback
 */
export const getStoreInfo = async (): Promise<{ storeName: string; address: string; hours: string; phone: string; slogan?: string }> => {
  try {
    const { data } = await supabase
      .from('store_settings')
      .select('store_name, slogan, address, phone, opening_hours')
      .limit(1);

    if (data && data.length > 0) {
      const s = data[0];
      return {
        storeName: s.store_name || env.STORE_NAME,
        address: s.address || env.STORE_ADDRESS,
        hours: s.opening_hours || env.STORE_HOURS,
        phone: s.phone || '0812-3456-7890',
        slogan: s.slogan || 'Sensasi Seblak Prasmanan Juara Pedas'
      };
    }
  } catch (err) {
    // Fallback ke env
  }

  return {
    storeName: env.STORE_NAME,
    address: env.STORE_ADDRESS,
    hours: env.STORE_HOURS,
    phone: '0812-3456-7890',
    slogan: 'Sensasi Seblak Prasmanan Juara Pedas'
  };
};

/**
 * Mengambil link brosur atau promo digital
 */
export const getBrochureOrPromoUrl = async (): Promise<string> => {
  try {
    const { data } = await supabase
      .from('store_settings')
      .select('brochure_url')
      .limit(1);

    if (data && data[0]?.brochure_url) {
      return data[0].brochure_url;
    }
  } catch (err) {
    // Fallback
  }

  return env.BROCHURE_URL || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
};

// ==========================================
// 3. AUDIT & LOGGING
// ==========================================

/**
 * Menyimpan riwayat obrolan AI ke Supabase untuk audit dan evaluasi performa
 */
export const logChatToSupabase = async (params: {
  senderJid: string;
  senderRole: 'OWNER' | 'CUSTOMER';
  senderName?: string;
  incomingMessage: string;
  aiResponse: string;
  toolCallsExecuted?: any;
}) => {
  try {
    await supabase.from('wa_chat_logs').insert({
      sender_jid: params.senderJid,
      sender_role: params.senderRole,
      sender_name: params.senderName || 'Unknown',
      incoming_message: params.incomingMessage,
      ai_response: params.aiResponse,
      tool_calls_executed: params.toolCallsExecuted || null
    });
  } catch (err) {
    // Non-blocking log error
  }
};

