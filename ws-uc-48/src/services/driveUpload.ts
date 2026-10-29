/**
 * Service untuk mengunggah gambar ke Google Drive via Google Apps Script Web App
 * dan mengonversi link Google Drive ke Direct CDN Image URL (lh3.googleusercontent.com).
 */

const GAS_UPLOAD_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '';

/**
 * Cek apakah endpoint Google Apps Script sudah dikonfigurasi di .env
 */
export function isDriveUploadConfigured(): boolean {
  return Boolean(
    GAS_UPLOAD_URL &&
    GAS_UPLOAD_URL.startsWith('http') &&
    GAS_UPLOAD_URL.includes('script.google.com')
  );
}

/**
 * Helper: Mengonversi berbagai format link share Google Drive menjadi direct display URL
 * Format keluaran: https://lh3.googleusercontent.com/d/{FILE_ID}
 */
export function formatGoogleDriveDirectUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

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
  if (!isDriveUploadConfigured()) {
    return {
      success: false,
      error: 'VITE_GOOGLE_APPS_SCRIPT_URL belum diatur di file .env. Silakan atur URL Web App Google Apps Script.',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const cleanFileName = `topping_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        // Kirim dengan Content-Type: text/plain agar browser tidak melakukan CORS preflight OPTIONS request
        const res = await fetch(GAS_UPLOAD_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            fileName: cleanFileName,
            mimeType: file.type || 'image/jpeg',
            base64: base64Data,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server Google Apps Script merespons dengan HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.status === 'success' && data.imageUrl) {
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
        console.error('⚠️ [DriveUpload] Terjadi kesalahan saat upload:', err);
        resolve({
          success: false,
          error: err.message || 'Terjadi kesalahan jaringan saat mengunggah ke Google Drive.',
        });
      }
    };

    reader.onerror = (e) => {
      resolve({
        success: false,
        error: 'Gagal membaca file gambar lokal.',
      });
    };

    reader.readAsDataURL(file);
  });
}
