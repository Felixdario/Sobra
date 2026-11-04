/**
 * Minimal structural types for the platform APIs the client uses. The package compiles with
 * `lib: ES2023` and no DOM/React Native types, so these describe only what we call; the real
 * `fetch`/`AbortSignal` of browsers, Node 18+ and React Native satisfy them.
 */

export type AbortSignalLike = {
  readonly aborted: boolean;
  addEventListener(type: 'abort', listener: () => void): void;
  removeEventListener(type: 'abort', listener: () => void): void;
};

export type FetchRequestInit = {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignalLike;
};

export type FetchResponseLike = {
  readonly status: number;
  text(): Promise<string>;
};

/** What the transport calls. */
export type FetchFn = (url: string, init: FetchRequestInit) => Promise<FetchResponseLike>;

/**
 * Any fetch-shaped function, including the platform's own `fetch` (whose `RequestInit` can't be
 * named without DOM types). It is always called with a {@link FetchRequestInit}, which is a valid
 * `RequestInit` in browsers, Node and React Native.
 */
export type FetchLike = (url: string, init: never) => Promise<FetchResponseLike>;

export function asFetchFn(fetch: FetchLike): FetchFn {
  return fetch as unknown as FetchFn;
}

type AbortControllerLike = { readonly signal: AbortSignalLike; abort(): void };

type Runtime = {
  fetch?: FetchFn;
  AbortController?: new () => AbortControllerLike;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
};

const runtime = globalThis as unknown as Runtime;

export function defaultFetch(): FetchFn {
  const { fetch } = runtime;
  if (!fetch) {
    throw new Error('fetch não está disponível neste ambiente: passe `fetch` em createApiClient');
  }
  return (url, init) => fetch(url, init);
}

export function createAbortController(): AbortControllerLike {
  if (!runtime.AbortController) {
    throw new Error('AbortController não está disponível neste ambiente');
  }
  return new runtime.AbortController();
}

export function startTimer(callback: () => void, ms: number): () => void {
  const handle = runtime.setTimeout(callback, ms);
  return () => runtime.clearTimeout(handle);
}
