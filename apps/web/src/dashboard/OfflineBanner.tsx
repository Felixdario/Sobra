import { WifiOff } from 'lucide-react';
import { useOnline } from '../components/useOnline';
import styles from './OfflineBanner.module.css';

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/** DESIGN.md, "Sem rede": a quiet strip saying how old the numbers on screen are. */
export function OfflineBanner({ updatedAt }: { updatedAt: number }) {
  const online = useOnline();
  if (online) return null;
  return (
    <p className={styles.banner} role="status">
      <WifiOff size={16} strokeWidth={1.75} aria-hidden="true" />
      {updatedAt > 0
        ? `Sem conexão — mostrando os dados de ${timeFormatter.format(updatedAt)}.`
        : 'Sem conexão — os dados aparecem quando a conexão voltar.'}
    </p>
  );
}
