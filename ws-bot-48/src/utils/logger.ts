/**
 * Server Error & Audit Logger
 * Mencatat seluruh detail teknis error ke terminal server atau file log,
 * sehingga TIDAK PERNAH membocorkan pesan error teknis/stack trace ke chat WhatsApp pengguna.
 */

export interface ErrorLogMetadata {
  senderJid?: string;
  senderRole?: string;
  senderName?: string;
  incomingText?: string;
  toolName?: string;
  toolArgs?: any;
  extra?: any;
}

export const logServerError = (context: string, error: any, meta?: ErrorLogMetadata) => {
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium'
  });

  const divider = '━'.repeat(65);

  console.error('\n' + divider);
  console.error(`❌ [SERVER ERROR LOG] - ${context.toUpperCase()}`);
  console.error(`🕒 Waktu      : ${timestamp} WIB`);

  if (meta?.senderJid) {
    console.error(`👤 Pengirim   : ${meta.senderName || 'Unknown'} (${meta.senderJid}) [${meta.senderRole || 'UNKNOWN'}]`);
  }
  if (meta?.incomingText) {
    console.error(`💬 Pesan User : "${meta.incomingText}"`);
  }
  if (meta?.toolName) {
    console.error(`🔧 Tool       : ${meta.toolName}`);
    if (meta.toolArgs) {
      console.error(`📥 Tool Args  : ${JSON.stringify(meta.toolArgs)}`);
    }
  }

  const errorMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
  console.error(`⚠️ Detail Pesan Error: ${errorMessage}`);

  if (error?.stack) {
    console.error(`📄 Stack Trace:`);
    console.error(error.stack);
  }

  if (meta?.extra) {
    console.error(`ℹ️ Extra Info : ${JSON.stringify(meta.extra, null, 2)}`);
  }

  console.error(divider + '\n');
};
