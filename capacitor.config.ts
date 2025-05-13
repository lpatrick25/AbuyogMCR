import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.capstone.project',
  appName: 'AbuyogMCR',
  webDir: 'www',
  server: {
    hostname: 'localhost',
    androidScheme: 'http',
    allowNavigation: ['192.168.1.2'], // Allow requests to the backend IP
    cleartext: true, // Allow cleartext HTTP (development only)
  },
};

export default config;
