export const DEMO_CREDENTIALS = { email: 'demo@sobra.dev', password: 'demo1234' } as const;

/** Where to go after signing in: the protected page that sent the user here, or the dashboard. */
export function redirectTarget(state: unknown): string {
  if (state && typeof state === 'object' && 'from' in state) {
    const { from } = state as { from: unknown };
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) return from;
  }
  return '/';
}
