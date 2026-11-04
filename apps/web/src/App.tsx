import { APP_NAME, formatBRL } from '@financas/shared';

export function App() {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Saldo: {formatBRL(0)}</p>
    </main>
  );
}
