import { z } from 'zod';

export const APP_NAME = 'Finanças';
export const LOCALE = 'pt-BR';
export const CURRENCY = 'BRL';
export const TIME_ZONE = 'America/Sao_Paulo';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

const brlFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });

export function formatBRL(value: number): string {
  return brlFormatter.format(value);
}
