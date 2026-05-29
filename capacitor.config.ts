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
      style: 'Dark',            // light status-bar text/icons on our near-black background
      backgroundColor: '#0d0d1a',
      overlaysWebView: false,   // status bar sits ABOVE the WebView; no overlap
    },
  },
};

export default config;
