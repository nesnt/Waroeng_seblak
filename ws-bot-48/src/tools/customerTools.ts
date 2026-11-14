import { Type } from '@google/genai';
import { z } from 'zod';
import {
  getCatalog,
  checkMenuAvailability,
  getStoreInfo,
  getBrochureOrPromoUrl,
  formatRupiah
} from '../services/supabaseService.js';

/**
 * Deklarasi function calling Google Gemini khusus CUSTOMER / PELANGGAN
 */
export const customerFunctionDeclarations = [
  {
    name: 'lihat_katalog_menu',
    description: 'Menampilkan katalog menu Waroeng Seblak 48 yang berisi pilihan topping seblak prasmanan, menu minuman dingin, dan varian harga. Gunakan saat pelanggan menanyakan daftar menu, daftar topping, harga makanan/minuman, atau katalog.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        kategori: {
          type: Type.STRING,
          description: 'Filter kategori menu (opsional): "topping", "minuman", atau kosongkan untuk semua menu.'
        }
      }
    }
  },
  {
    name: 'cek_ketersediaan_menu',
    description: 'Mengecek apakah menu seblak, varian topping prasmanan tertentu, atau varian minuman sedang tersedia (ready) atau habis hari ini.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        nama_item: {
          type: Type.STRING,
          description: 'Nama topping atau minuman yang ditanyakan pelanggan (contoh: "Cuanki Lidah", "Ceker", "Es Teh Manis").'
        }
      },
      required: ['nama_item']
    }
  },
  {
    name: 'info_warung_dan_lokasi',
    description: 'Memberikan informasi lokasi/alamat lengkap warung, jam buka/operasional, nomor kontak pengaduan/pesanan, dan panduan arah ke Waroeng Seblak 48.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'ambil_brosur_promo',
    description: 'Mengambil link gambar brosur menu resmi dan promo yang sedang berlaku di Waroeng Seblak 48.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'hitung_estimasi_harga',
    description: 'Menghitung perkiraan total biaya pesanan seblak berdasarkan pilihan item topping dan minuman yang diinginkan oleh pelanggan.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        item_pesanan: {
          type: Type.ARRAY,
          description: 'Daftar nama menu/topping beserta jumlah yang diinginkan.',
          items: {
            type: Type.OBJECT,
            properties: {
              nama: { type: Type.STRING, description: 'Nama item/topping/minuman' },
              qty: { type: Type.NUMBER, description: 'Jumlah item (default 1)' }
            },
            required: ['nama']
          }
        }
      },
      required: ['item_pesanan']
    }
  }
];

// Zod schemas untuk validasi input tool
const lihatKatalogSchema = z.object({
  kategori: z.string().optional()
});

const cekKetersediaanSchema = z.object({
  nama_item: z.string().min(1, 'Nama item wajib diisi')
});

const estimasiHargaSchema = z.object({
  item_pesanan: z.array(
    z.object({
      nama: z.string().min(1),
      qty: z.number().int().positive().default(1)
    })
  ).min(1, 'Minimal pilih 1 item')
});

/**
 * Eksekutor pemanggilan tools khusus Customer
 */
export const executeCustomerTool = async (name: string, rawArgs: any): Promise<any> => {
  console.log(`[Tool Call: Customer] Menjalankan ${name} dengan args:`, rawArgs);

  switch (name) {
    case 'lihat_katalog_menu': {
      const args = lihatKatalogSchema.parse(rawArgs || {});
      const catalog = await getCatalog(args.kategori);
      return {
        totalItem: catalog.length,
        items: catalog.map(c => ({
          nama: c.name,
          kategori: c.category,
          harga: formatRupiah(c.price),
          tersedia: c.isAvailable,
          deskripsi: c.description
        }))
      };
    }

    case 'cek_ketersediaan_menu': {
      const args = cekKetersediaanSchema.parse(rawArgs);
      return await checkMenuAvailability(args.nama_item);
    }

    case 'info_warung_dan_lokasi': {
      return await getStoreInfo();
    }

    case 'ambil_brosur_promo': {
      const brochureUrl = await getBrochureOrPromoUrl();
      const storeInfo = await getStoreInfo();
      return {
        urlBrosur: brochureUrl,
        namaWarung: storeInfo.storeName,
        jamOperasional: storeInfo.hours,
        pesan: 'Berikut link brosur menu & promo Waroeng Seblak 48.'
      };
    }

    case 'hitung_estimasi_harga': {
      const args = estimasiHargaSchema.parse(rawArgs);
      const catalog = await getCatalog();
      let grandTotal = 0;
      const rincian: Array<{ nama: string; qty: number; hargaSatuan: string; subtotal: string }> = [];

      for (const reqItem of args.item_pesanan) {
        const found = catalog.find(c => c.name.toLowerCase().includes(reqItem.nama.toLowerCase()));
        const unitPrice = found ? found.price : 3000; // default perkiraan topping 3k jika custom
        const subtotal = unitPrice * reqItem.qty;
        grandTotal += subtotal;

        rincian.push({
          nama: found ? found.name : reqItem.nama,
          qty: reqItem.qty,
          hargaSatuan: formatRupiah(unitPrice),
          subtotal: formatRupiah(subtotal)
        });
      }

      return {
        rincian,
        totalEstimasi: formatRupiah(grandTotal),
        catatan: 'Harga akhir akan dihitung kembali saat penimbangan/pencatatan di meja kasir prasmanan.'
      };
    }

    default:
      throw new Error(`Tool Customer "${name}" tidak dikenali.`);
  }
};

