/**
 * Service untuk mengunggah gambar ke Google Drive via Google Apps Script Web App
 * dan mengonversi link Google Drive ke Direct CDN Image URL (lh3.googleusercontent.com).
 */

const GAS_UPLOAD_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '';
const UPLOAD_SECRET_TOKEN = import.meta.env.VITE_GOOGLE_UPLOAD_TOKEN || '';

export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // Maksimal 2 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Cek apakah endpoint Google Apps Script sudah dikonfigurasi di .env
 */
export function isDriveUploadConfigured(): boolean {
  return Boolean(
    GAS_UPLOAD_URL &&
      GAS_UPLOAD_URL.startsWith('https://') &&
      GAS_UPLOAD_URL.includes('script.google.com')
  );
}

/**
 * Validasi keamanan file gambar sebelum pratinjau atau unggah (Mencegah SVG XSS & Storage DoS)
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Gunakan foto berformat JPG, PNG, WEBP, atau GIF.',
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Ukuran foto terlalu besar (${sizeMb} MB). Maksimal ukuran foto adalah 2 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Helper: Mengonversi berbagai format link share Google Drive menjadi direct display URL
 * sekaligus memvalidasi protokol URL agar aman dari skema berbahaya (javascript:, data:text/html, dll).
 */
export function formatGoogleDriveDirectUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Tolak skema berbahaya (hanya izinkan http:// atau https:// untuk input URL eksternal)
  if (!/^https?:\/\//i.test(trimmed)) {
    return '';
  }

  // Pola 1: https://drive.google.com/file/d/{FILE_ID}/view...
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    return `https://lh3.googleusercontent.com/d/${matchFileD[1]}`;
  }

  // Pola 2: https://drive.google.com/open?id={FILE_ID} atau ?id={FILE_ID}
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) {
    return `https://lh3.googleusercontent.com/d/${matchIdParam[1]}`;
  }

  // Pola 3: Sudah dalam format lh3.googleusercontent.com
  if (trimmed.includes('lh3.googleusercontent.com/d/')) {
    return trimmed;
  }

  return trimmed;
}

export interface UploadResult {
  success: boolean;
  imageUrl?: string;
  fileId?: string;
  error?: string;
}

/**
 * Mengunggah file gambar ke Google Drive dan mengembalikan direct link URL
 */
export async function uploadImageToGoogleDrive(file: File): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  if (!isDriveUploadConfigured()) {
    return {
      success: false,
      error:
        'VITE_GOOGLE_APPS_SCRIPT_URL belum diatur. Silakan atur URL Web App Google Apps Script atau gunakan link gambar eksternal.',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const safeExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
        const cleanFileName = `img_${Date.now()}.${safeExt.slice(0, 5)}`;

        const payload: Record<string, string> = {
          fileName: cleanFileName,
          mimeType: file.type,
          base64: base64Data,
        };
        if (UPLOAD_SECRET_TOKEN) {
          payload.token = UPLOAD_SECRET_TOKEN;
        }

        // Kirim dengan Content-Type: text/plain agar kompatibel dengan CORS Google Apps Script
        const res = await fetch(GAS_UPLOAD_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`Server Google Apps Script merespons dengan HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.status === 'success' && data.imageUrl && /^https:\/\//i.test(data.imageUrl)) {
          resolve({
            success: true,
            imageUrl: data.imageUrl,
            fileId: data.fileId,
          });
        } else {
          resolve({
            success: false,
            error: data.message || 'Gagal menyimpan foto di Google Drive.',
          });
        }
      } catch (err: any) {
        resolve({
          success: false,
          error: err.message || 'Terjadi kesalahan jaringan saat mengunggah ke Google Drive.',
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Gagal membaca file gambar lokal.',
      });
    };

    reader.readAsDataURL(file);
  });
}
