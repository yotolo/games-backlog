import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { hideSplash } from './lib/capacitor';

// ── Status bar — direct static import, no lazy loading, no isNative guard.
// Called synchronously before the React tree renders so the bar position is
// locked before the first layout paint. @capacitor/status-bar is a no-op in
// the browser; it only acts when the native bridge is present.
import { StatusBar, Style } from '@capacitor/status-bar';

const setStatusBar = async () => {
  await StatusBar.setOverlaysWebView({ overlay: false });
  await StatusBar.setBackgroundColor({ color: '#0d0d1a' });
  await StatusBar.setStyle({ style: Style.Dark });
};
setStatusBar();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// Hide the splash screen once React has painted the first frame
requestAnimationFrame(() => requestAnimationFrame(hideSplash));
