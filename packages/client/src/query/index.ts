import { isApiError } from '../errors';

export { invalidationMap, queryKeys, type InvalidatingMutation, type QueryDomain } from './keys';
export { createQueries, type ApiQueries, type ApiQueryOptions } from './queries';
export {
  createMutations,
  invalidateAfter,
  type ApiMutationOptions,
  type ApiMutations,
} from './mutations';
export {
  confirmCreatedTransaction,
  isOptimisticId,
  matchesFilters,
  optimisticCreateTransaction,
  optimisticRemoveTransaction,
  optimisticUpdateTransaction,
  type OptimisticSnapshot,
} from './optimistic';

const MAX_RETRIES = 2;

/**
 * `retry` for the QueryClient defaults: network failures, timeouts and 5xx are retried up to
 * twice; 4xx (validation, not found, expired session) never.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  return isApiError(error) ? error.isRetryable : true;
}
