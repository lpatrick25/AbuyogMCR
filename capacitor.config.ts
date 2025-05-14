import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.capstone.project',
  appName: 'AbuyogMCR',
  webDir: 'www',
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
    allowNavigation: ['192.168.100.123'], // Allow requests to the backend IP
    cleartext: true, // Allow cleartext HTTP (development only)
  },
};

export default config;
