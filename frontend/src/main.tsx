import { createRoot } from 'react-dom/client';
import { Routes } from '@generouted/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 1000,
    },
  },
});

createRoot(globalThis.document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <Routes />
  </QueryClientProvider>
);
