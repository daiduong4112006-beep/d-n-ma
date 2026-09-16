// Safeguard against "Cannot set property fetch of #<Window> which has only a getter"
try {
  if (typeof window !== 'undefined') {
    let currentFetch = window.fetch ? window.fetch.bind(window) : undefined;
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
    if (!desc || !desc.set) {
      Object.defineProperty(window, 'fetch', {
        get: () => currentFetch,
        set: (fn) => {
          currentFetch = fn;
        },
        configurable: true,
        enumerable: true,
      });
    }
  }
} catch {
  // Ignore if already configured
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
