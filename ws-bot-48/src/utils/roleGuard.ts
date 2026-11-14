import { getOwnerPhoneList } from '../config/env.js';

export type UserRole = 'OWNER' | 'CUSTOMER';

/**
 * Membersihkan format nomor telepon dan mengonversinya ke format standar internasional (62xxxx)
 * Contoh input yang didukung:
 * - "628123456789@s.whatsapp.net" -> "628123456789"
 * - "628123456789:24@s.whatsapp.net" -> "628123456789"
 * - "+62 812-3456-7890" -> "6281234567890"
 * - "081234567890" -> "6281234567890"
 */
export const normalizePhoneNumber = (raw: string): string => {
  if (!raw) return '';

  // Ambil hanya bagian sebelum '@' jika input berupa JID
  const withoutDomain = raw.split('@')[0];
  
  // Hapus port/device identifier (seperti ':12')
  const withoutDevice = withoutDomain.split(':')[0];

  // Hapus semua karakter non-digit
  let digits = withoutDevice.replace(/[^0-9]/g, '');

  // Jika diawali '08', ubah menjadi '628'
  if (digits.startsWith('08')) {
    digits = '62' + digits.slice(1);
  }

  // Jika diawali '+62', sudah menjadi '62' karena simbol '+' dibuang
  return digits;
};

/**
 * Mengecek apakah nomor pengirim terdaftar sebagai OWNER / Pemilik Warung di environment.
 * Mendukung pencocokan nomor telepon asli (PN) maupun WhatsApp LID.
 */
export const isOwner = (senderJidOrPhone: string, altJid?: string): boolean => {
  const normalizedSender = normalizePhoneNumber(senderJidOrPhone);
  const normalizedAlt = altJid ? normalizePhoneNumber(altJid) : '';
  if (!normalizedSender && !normalizedAlt) return false;

  const ownerList = getOwnerPhoneList();
  return ownerList.some(ownerPhone => {
    const normOwner = normalizePhoneNumber(ownerPhone);
    return (
      (normalizedSender && normOwner === normalizedSender) ||
      (normalizedAlt && normOwner === normalizedAlt)
    );
  });
};

/**
 * Mengembalikan role pengirim: 'OWNER' atau 'CUSTOMER'
 */
export const getSenderRole = (senderJidOrPhone: string, altJid?: string): UserRole => {
  return isOwner(senderJidOrPhone, altJid) ? 'OWNER' : 'CUSTOMER';
};

