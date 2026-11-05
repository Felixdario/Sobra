import { z } from 'zod';
import { apiErrorSchema, idSchema } from '@sobra/shared';

z.globalRegistry.add(apiErrorSchema, { id: 'ApiError' });

export const idParamsSchema = z.object({ id: idSchema });

const ERROR_DESCRIPTIONS = {
  400: 'Dados inválidos',
  401: 'Não autenticado',
  403: 'Proibido (por exemplo, token CSRF ausente ou diferente do cookie)',
  404: 'Não encontrado (ou pertence a outro usuário)',
  409: 'Conflito com o estado atual',
  429: 'Limite de requisições excedido',
} as const;

type ErrorStatus = keyof typeof ERROR_DESCRIPTIONS;

type ErrorResponse = {
  description: string;
  content: { 'application/json': { schema: typeof apiErrorSchema } };
};

/** Error responses for a route's `schema.response`, all in the `apiErrorSchema` format. */
export function errorResponses<const S extends ErrorStatus[]>(
  ...statuses: S
): Record<S[number], ErrorResponse> {
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      {
        description: ERROR_DESCRIPTIONS[status],
        content: { 'application/json': { schema: apiErrorSchema } },
      },
    ]),
  ) as Record<S[number], ErrorResponse>;
}

/** Marks a route as protected in the OpenAPI document. */
export const bearerAuth = [{ bearerAuth: [] }];
