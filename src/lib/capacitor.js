/**
 * Capacitor native plugin integration.
 * StatusBar is handled directly in index.js (static import, pre-render).
 * This module covers splash-screen and back-button only.
 */

/** True when running inside a Capacitor native app (Android/iOS). */
export const isNative = !!(window.Capacitor?.isNativePlatform?.());

// ── SplashScreen ─────────────────────────────────────────────────────────────
export async function hideSplash() {
  if (!isNative) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn('[Capacitor] SplashScreen hide failed:', e);
  }
}

// ── App / Back button ─────────────────────────────────────────────────────────
export async function setupBackButton(handleBack) {
  if (!isNative) return () => {};
  try {
    const { App } = await import('@capacitor/app');
    const listener = await App.addListener('backButton', ({ canGoBack }) => {
      const handled = handleBack?.({ canGoBack });
      if (!handled && !canGoBack) {
        App.minimizeApp();
      }
    });
    return () => listener.remove();
  } catch (e) {
    console.warn('[Capacitor] App backButton listener failed:', e);
    return () => {};
  }
}
