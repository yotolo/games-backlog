import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yotolo.gamevault',
  appName: 'Game Vault',
  webDir: 'build',

  // Live-reload from production — remove for offline/store builds
  // server: {
  //   url: 'https://games-backlog.vercel.app',
  //   cleartext: true,
  // },

  android: {
    // Allow cleartext only for localhost dev server; production is HTTPS
    allowMixedContent: false,
    // Keep the status bar dark to match the app theme
    backgroundColor: '#0d0d1a',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#0d0d1a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',           // dark icons — our bg is near-black so we want light text
      backgroundColor: '#0d0d1a',
    },
  },
};

export default config;
