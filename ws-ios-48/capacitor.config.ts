import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waroengseblak48.pos',
  appName: 'Waroeng Seblak 48',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Memindai printer thermal Bluetooth...',
        cancel: 'Batal',
        availableDevices: 'Printer Tersedia',
        noDeviceFound: 'Tidak ada printer ditemukan',
      },
    },
  },
};

export default config;
