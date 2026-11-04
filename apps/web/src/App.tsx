import { APP_NAME, cents, formatBRL } from '@financas/shared';

export function App() {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Saldo: {formatBRL(cents(0))}</p>
    </main>
  );
}
