import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initStatusBar, hideSplash } from './lib/capacitor';

// Initialize native chrome immediately — safe no-ops in the browser
initStatusBar();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// Hide the splash screen once React has painted the first frame
requestAnimationFrame(() => requestAnimationFrame(hideSplash));
