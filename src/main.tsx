import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { activateLocale, detectLocale } from './i18n/i18n';
import './styles/app.css';

activateLocale(detectLocale());

const container = document.getElementById('root');
if (!container) throw new Error('missing #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
