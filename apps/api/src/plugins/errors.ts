import type { FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import type { ApiError } from '@sobra/shared';
import { Prisma } from '../lib/db';
import { AppError, type ErrorCode } from '../lib/errors';

type ValidationIssue = { field: string; in: string; message: string };

const body = (code: ErrorCode, message: string, details?: unknown): ApiError => ({
  error: details === undefined ? { code, message } : { code, message, details },
});

function toIssues(
  validation: { instancePath: string; message?: string | undefined }[],
  context: string | undefined,
): ValidationIssue[] {
  return validation.map((issue) => ({
    field: issue.instancePath.replace(/^\//, '').replaceAll('/', '.'),
    in: context ?? 'body',
    message: issue.message ?? 'Valor inválido',
  }));
}

function toAppError(error: FastifyError | Error): AppError | null {
  if (error instanceof AppError) return error;

  if (hasZodFastifySchemaValidationErrors(error)) {
    return new AppError(
      400,
      'VALIDATION_ERROR',
      'Dados inválidos',
      toIssues(error.validation, error.validationContext),
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') return new AppError(404, 'NOT_FOUND', 'Recurso não encontrado');
    if (error.code === 'P2002') return new AppError(409, 'CONFLICT', 'Registro duplicado');
    if (error.code === 'P2020') {
      return new AppError(400, 'BAD_REQUEST', 'Valor fora do intervalo permitido');
    }
    return null;
  }

  const statusCode = 'statusCode' in error ? error.statusCode : undefined;
  if (statusCode === 429) {
    return new AppError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde um pouco e tente de novo');
  }
  if (statusCode === 413) {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'O corpo da requisição é grande demais');
  }
  if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
    return new AppError(statusCode, 'BAD_REQUEST', 'Requisição inválida');
  }
  return null;
}

export const errorsPlugin = fp(
  async (app) => {
    app.setErrorHandler((error: FastifyError, request, reply) => {
      const appError = toAppError(error);
      if (appError) {
        return reply
          .code(appError.statusCode)
          .send(body(appError.code, appError.message, appError.details));
      }

      if (isResponseSerializationError(error)) {
        request.log.error({ issues: error.cause.issues }, 'resposta fora do contrato');
      } else {
        request.log.error(error);
      }
      return reply.code(500).send(body('INTERNAL_ERROR', 'Erro interno do servidor'));
    });

    app.setNotFoundHandler((request, reply) =>
      reply
        .code(404)
        .send(
          body('NOT_FOUND', `Rota ${request.method} ${request.url.split('?')[0]} não encontrada`),
        ),
    );
  },
  { name: 'errors' },
);
