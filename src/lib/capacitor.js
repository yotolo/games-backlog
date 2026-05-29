/**
 * Capacitor native plugin integration.
 * Guards every call so the web build works identically — plugins are no-ops
 * when running outside a native wrapper.
 */

/** True when running inside a Capacitor native app (Android/iOS). */
export const isNative = !!(window.Capacitor?.isNativePlatform?.());

// ── StatusBar ────────────────────────────────────────────────────────────────
// Match the dark theme: near-black background, light text icons.
export async function initStatusBar() {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0d0d1a' });
  } catch (e) {
    console.warn('[Capacitor] StatusBar init failed:', e);
  }
}

// ── SplashScreen ─────────────────────────────────────────────────────────────
// Manually hide after the React tree is ready (launchAutoHide: true handles
// the simple case, but calling hide() here ensures we hide as soon as the
// first meaningful render is done rather than on a fixed timer).
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
// Android hardware back button. Call once at app root; pass a callback that
// returns true if the event was handled (modal open, etc.), false to fall
// through to default exit behaviour.
export async function setupBackButton(handleBack) {
  if (!isNative) return () => {};
  try {
    const { App } = await import('@capacitor/app');
    const listener = await App.addListener('backButton', ({ canGoBack }) => {
      const handled = handleBack?.({ canGoBack });
      if (!handled && !canGoBack) {
        // No modal open and nothing to go back to — minimize the app
        App.minimizeApp();
      }
    });
    // Return cleanup function
    return () => listener.remove();
  } catch (e) {
    console.warn('[Capacitor] App backButton listener failed:', e);
    return () => {};
  }
}
