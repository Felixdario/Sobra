import type { Account } from '@financas/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { ErrorLine } from '../components/ErrorLine';
import { IdentityMark } from '../components/IdentityMark';
import { EmptyState, Page, Panel } from '../components/Page';
import { Skeleton } from '../components/Skeleton';
import { money, spokenMoney } from '../lib/format';
import { useServices } from '../lib/servicesContext';
import { AccountSheet } from './AccountSheet';
import { ACCOUNT_TYPE_LABELS } from './labels';
import styles from './AccountsPage.module.css';

/** A credit card's negative balance is a debt: red, with the minus and the word "fatura". */
function Balance({ account }: { account: Account }) {
  const debt = account.balance < 0;
  return (
    <span className={styles.balanceCell}>
      <span
        className={`${styles.balance} ${debt ? styles.debt : account.balance === 0 ? styles.zero : ''} num`}
        aria-label={spokenMoney(account.balance)}
      >
        {money(account.balance)}
      </span>
      {debt && account.type === 'credit_card' ? (
        <span className={styles.note}>fatura em aberto</span>
      ) : null}
    </span>
  );
}

function AccountRow({ account, onEdit }: { account: Account; onEdit: (a: Account) => void }) {
  const { mutations } = useServices();
  const restore = useMutation(mutations.accounts.update);
  return (
    <li className={styles.row} data-archived={account.archived || undefined}>
      <button
        type="button"
        className={styles.main}
        onClick={() => onEdit(account)}
        aria-label={`Editar ${account.name}`}
      >
        <IdentityMark color={account.color} icon={account.icon} />
        <span className={styles.text}>
          <span className={styles.name} title={account.name}>
            {account.name}
          </span>
          <span className={styles.meta}>
            {ACCOUNT_TYPE_LABELS[account.type]}
            {account.archived ? ' · arquivada' : ''}
          </span>
        </span>
      </button>
      {account.archived ? (
        <Button
          variant="secondary"
          loading={restore.isPending}
          onClick={() =>
            restore.mutate(
              { id: account.id, body: { archived: false } },
              { onSuccess: () => toast.success(`${account.name} voltou para as contas ativas.`) },
            )
          }
        >
          Reativar
        </Button>
      ) : null}
      <Balance account={account} />
    </li>
  );
}

export function AccountsPage() {
  const { queries } = useServices();
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const accounts = useQuery(queries.accounts.list({ includeArchived: true }));
  const active = (accounts.data ?? []).filter((a) => !a.archived);
  const archived = (accounts.data ?? []).filter((a) => a.archived);
  const total = active.reduce((sum, a) => sum + a.balance, 0);

  return (
    <Page
      title="Contas"
      actions={
        <Button variant="primary" onClick={() => setEditing('new')}>
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          Nova conta
        </Button>
      }
    >
      <Panel
        title="Contas ativas"
        titleId="contas-ativas"
        aside={
          accounts.data ? (
            <span className={`${styles.total} num`}>
              Saldo total <strong>{money(total)}</strong>
            </span>
          ) : null
        }
      >
        {accounts.isError ? (
          <ErrorLine
            what="Não deu para carregar as contas"
            error={accounts.error}
            onRetry={() => void accounts.refetch()}
            retrying={accounts.isFetching}
          />
        ) : !accounts.data ? (
          <div className={styles.loading} aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} height="var(--layout-row-tall)" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <EmptyState title="Nenhuma conta ativa.">
            <Button variant="secondary" onClick={() => setEditing('new')}>
              Criar a primeira conta
            </Button>
          </EmptyState>
        ) : (
          <ul className={styles.list}>
            {active.map((account) => (
              <AccountRow key={account.id} account={account} onEdit={setEditing} />
            ))}
          </ul>
        )}
      </Panel>
      {archived.length > 0 ? (
        <Panel
          title={`Arquivadas (${archived.length})`}
          titleId="contas-arquivadas"
          aside={
            <Button
              variant="ghost"
              aria-expanded={showArchived}
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? 'Ocultar' : 'Mostrar'}
            </Button>
          }
        >
          {showArchived ? (
            <ul className={styles.list}>
              {archived.map((account) => (
                <AccountRow key={account.id} account={account} onEdit={setEditing} />
              ))}
            </ul>
          ) : null}
        </Panel>
      ) : null}
      <AccountSheet target={editing} onClose={() => setEditing(null)} />
    </Page>
  );
}
