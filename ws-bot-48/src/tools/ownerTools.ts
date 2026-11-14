import { Type } from '@google/genai';
import { z } from 'zod';
import {
  getDailyOmset,
  getLowStockIngredients,
  getAllStock,
  updateIngredientStock,
  getRecentTransactions
} from '../services/supabaseService.js';

/**
 * Deklarasi function calling Google Gemini khusus OWNER
 */
export const ownerFunctionDeclarations = [
  {
    name: 'cek_omset_harian',
    description: 'Mengambil ringkasan omset penjualan harian, total transaksi kasir, metode pembayaran (Tunai, QRIS, Transfer), dan transaksi batal. Gunakan saat owner menanyakan omset, keuntungan, rekap harian, atau pemasukan.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        tanggal: {
          type: Type.STRING,
          description: 'Tanggal yang ingin dicek dalam format YYYY-MM-DD. Kosongkan jika menanyakan omset hari ini.'
        }
      }
    }
  },
  {
    name: 'cek_stok_kritis',
    description: 'Mengambil daftar bahan baku seblak, topping prasmanan, dan stok minuman yang menipis atau habis di bawah batas aman. Gunakan saat owner bertanya bahan apa yang mau habis, rekomendasi belanja, atau stok kritis.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        batas_minimum: {
          type: Type.NUMBER,
          description: 'Ambang batas minimum stok (opsional, default memakai batas sistem).'
        }
      }
    }
  },
  {
    name: 'cek_seluruh_stok',
    description: 'Melihat seluruh stok inventori warung. Bisa difilter khusus bahan baku/topping atau khusus minuman.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        kategori: {
          type: Type.STRING,
          description: 'Pilihan: "all" (semua), "bahan" (bahan baku & topping), atau "minuman" (katalog minuman).'
        }
      }
    }
  },
  {
    name: 'update_stok_bahan',
    description: 'Menambah atau mengurangi stok bahan baku atau minuman secara langsung melalui chat. Gunakan jika owner menginstruksikan restok baru atau pengurangan stok barang rusak.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        nama_bahan: {
          type: Type.STRING,
          description: 'Nama bahan, topping, atau minuman yang ingin diubah.'
        },
        jumlah: {
          type: Type.NUMBER,
          description: 'Jumlah kuantitas yang ditambah atau dikurang (angka positif).'
        },
        tipe: {
          type: Type.STRING,
          description: 'Pilihan: "tambah" untuk restok/barang masuk, atau "kurang" untuk pengurangan/barang keluar.'
        },
        catatan: {
          type: Type.STRING,
          description: 'Alasan atau keterangan perubahan stok (opsional).'
        }
      },
      required: ['nama_bahan', 'jumlah', 'tipe']
    }
  },
  {
    name: 'cek_transaksi_terakhir',
    description: 'Melihat daftar transaksi penjualan terbaru yang baru saja diselesaikan di kasir.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jumlah: {
          type: Type.NUMBER,
          description: 'Jumlah transaksi terakhir yang ingin ditampilkan (default 5, maksimal 10).'
        }
      }
    }
  }
];

// Zod schemas untuk validasi input tool
const cekOmsetSchema = z.object({
  tanggal: z.string().optional()
});

const cekStokKritisSchema = z.object({
  batas_minimum: z.number().optional()
});

const cekSeluruhStokSchema = z.object({
  kategori: z.enum(['all', 'bahan', 'minuman']).optional().default('all')
});

const updateStokSchema = z.object({
  nama_bahan: z.string().min(1, 'Nama bahan wajib diisi'),
  jumlah: z.number().positive('Jumlah harus angka positif'),
  tipe: z.enum(['tambah', 'kurang']),
  catatan: z.string().optional()
});

const cekTransaksiSchema = z.object({
  jumlah: z.number().int().min(1).max(10).optional().default(5)
});

/**
 * Eksekutor pemanggilan tools khusus Owner
 */
export const executeOwnerTool = async (name: string, rawArgs: any): Promise<any> => {
  console.log(`[Tool Call: Owner] Menjalankan ${name} dengan args:`, rawArgs);

  switch (name) {
    case 'cek_omset_harian': {
      const args = cekOmsetSchema.parse(rawArgs || {});
      return await getDailyOmset(args.tanggal);
    }

    case 'cek_stok_kritis': {
      const args = cekStokKritisSchema.parse(rawArgs || {});
      return await getLowStockIngredients(args.batas_minimum);
    }

    case 'cek_seluruh_stok': {
      const args = cekSeluruhStokSchema.parse(rawArgs || {});
      return await getAllStock(args.kategori as any);
    }

    case 'update_stok_bahan': {
      const args = updateStokSchema.parse(rawArgs);
      return await updateIngredientStock(args.nama_bahan, args.jumlah, args.tipe, args.catatan);
    }

    case 'cek_transaksi_terakhir': {
      const args = cekTransaksiSchema.parse(rawArgs || {});
      return await getRecentTransactions(args.jumlah);
    }

    default:
      throw new Error(`Tool Owner "${name}" tidak dikenali.`);
  }
};

