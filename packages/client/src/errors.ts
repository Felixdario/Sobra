/** Codes produced by the client itself; the API adds its own (`VALIDATION_ERROR`, `NOT_FOUND`…). */
export const CLIENT_ERROR_CODES = {
  network: 'NETWORK_ERROR',
  timeout: 'TIMEOUT',
  aborted: 'ABORTED',
  invalidResponse: 'INVALID_RESPONSE',
  http: 'HTTP_ERROR',
  sessionExpired: 'SESSION_EXPIRED',
} as const;

export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES];
/** Client codes autocomplete; any API code (`VALIDATION_ERROR`, `NOT_FOUND`…) is accepted. */
export type ApiErrorCode = ClientErrorCode | (string & {});

export const CLIENT_ERROR_MESSAGES = {
  network: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.',
  timeout: 'O servidor demorou demais para responder. Tente de novo.',
  aborted: 'A requisição foi cancelada.',
  invalidResponse: 'O servidor respondeu num formato inesperado. Tente de novo mais tarde.',
  sessionExpired: 'Sua sessão expirou. Entre de novo para continuar.',
} as const;

const HTTP_MESSAGES: Record<number, string> = {
  400: 'Requisição inválida.',
  401: 'Você precisa entrar para continuar.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontrado.',
  409: 'Conflito com o estado atual. Atualize e tente de novo.',
  413: 'O conteúdo enviado é grande demais.',
  429: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
};

export function httpErrorMessage(status: number): string {
  return (
    HTTP_MESSAGES[status] ??
    (status >= 500 ? 'Erro no servidor. Tente de novo mais tarde.' : 'Erro inesperado.')
  );
}

/**
 * Every failure of the client is an `ApiError`: API errors keep the server's `code`, `message`
 * (pt-BR) and `details`; network, timeout and contract failures get a client code and `status: 0`
 * (or the HTTP status, for an unexpected response body).
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: unknown;

  constructor(init: {
    status: number;
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    cause?: unknown;
  }) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
  }

  /** Network failure, timeout or 5xx: worth retrying. Client errors (4xx) are not. */
  get isRetryable(): boolean {
    return (
      this.code === CLIENT_ERROR_CODES.network ||
      this.code === CLIENT_ERROR_CODES.timeout ||
      this.status >= 500
    );
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
