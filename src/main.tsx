import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

try {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    createRoot(rootEl).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  }
} catch (err: any) {
  console.error('Fatal initialization error in Vi Sales MNP:', err);
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="min-height:100vh;background:#dc2626;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:sans-serif;">
        <div style="width:56px;height:56px;background:#ffffff;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#dc2626;margin-bottom:16px;">V!</div>
        <h2 style="font-size:18px;font-weight:800;margin-bottom:8px;">Vi Sales MNP</h2>
        <p style="font-size:13px;max-width:360px;margin-bottom:16px;opacity:0.95;">पोर्टल लोड करने में रुकावट आई है।</p>
        <button onclick="window.location.reload()" style="padding:10px 20px;background:#ffffff;color:#dc2626;border:none;border-radius:12px;font-weight:bold;cursor:pointer;font-size:13px;">पुनः लोड करें (Reload)</button>
      </div>
    `;
  }
}
