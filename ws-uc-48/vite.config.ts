import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { defineConfig, Plugin } from 'vite';

function thermalPrintApiPlugin(): Plugin {
  const handlePrintRequest = (req: any, res: any) => {
    // Add CORS headers for mobile & cross-origin access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const tempFile = path.join(os.tmpdir(), `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
          fs.writeFileSync(tempFile, JSON.stringify(payload), 'utf8');

          const scriptPath = path.resolve(import.meta.dirname, 'scripts', 'print_receipt.ps1');
          execFile('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-JsonPath', tempFile], (error, stdout, stderr) => {
            try { fs.unlinkSync(tempFile); } catch (_) {}
            
            res.setHeader('Content-Type', 'application/json');
            if (error) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: stderr || error.message }));
              return;
            }
            try {
              const result = JSON.parse(stdout.trim());
              res.end(JSON.stringify(result));
            } catch {
              res.end(JSON.stringify({ success: true, raw: stdout }));
            }
          });
        } catch (err: any) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    } else {
      res.statusCode = 405;
      res.end('Method Not Allowed');
    }
  };

  return {
    name: 'thermal-print-api',
    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = (req.url || '').split('?')[0];
        if (url === '/api/print-thermal' || url === '/api/print-thermal/') {
          handlePrintRequest(req, res);
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = (req.url || '').split('?')[0];
        if (url === '/api/print-thermal' || url === '/api/print-thermal/') {
          handlePrintRequest(req, res);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), thermalPrintApiPlugin()],
  // Hanya ekspos variabel VITE_ ke bundle publik (mencegah kebocoran SUPABASE_SERVICE_ROLE_KEY)
  envPrefix: ['VITE_'],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    hmr: process.env.DISABLE_HMR !== 'true',
    // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
