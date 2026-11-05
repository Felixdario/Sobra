import { QueryClientProvider } from '@tanstack/react-query';
import { createContext, use, type ReactNode } from 'react';
import type { Services } from './services';

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: Services;
  children: ReactNode;
}) {
  return (
    <ServicesContext value={services}>
      <QueryClientProvider client={services.queryClient}>{children}</QueryClientProvider>
    </ServicesContext>
  );
}

export function useServices(): Services {
  const value = use(ServicesContext);
  if (!value) throw new Error('useServices precisa de <ServicesProvider>');
  return value;
}
