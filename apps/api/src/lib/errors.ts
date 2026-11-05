export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details);

export const unauthorized = (message = 'Autenticação necessária') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message: string) => new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Recurso não encontrado') =>
  new AppError(404, 'NOT_FOUND', message);

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, 'CONFLICT', message, details);
