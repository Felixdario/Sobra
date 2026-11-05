import { createContext, use } from 'react';
import type { Services } from './services';

export const ServicesContext = createContext<Services | null>(null);

export function useServices(): Services {
  const services = use(ServicesContext);
  if (!services) throw new Error('useServices precisa de <ServicesContext>');
  return services;
}
