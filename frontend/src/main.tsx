import { createRoot } from 'react-dom/client';
import { Routes } from '@generouted/react-router';
import { AppQueryClientProvider } from './app/providers';
import './index.css';

createRoot(globalThis.document.getElementById('root')!).render(
  <AppQueryClientProvider>
    <Routes />
  </AppQueryClientProvider>
);
