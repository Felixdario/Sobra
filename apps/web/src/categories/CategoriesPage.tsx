import type { Category, CategoryKind } from '@financas/shared';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import accountStyles from '../accounts/AccountsPage.module.css';
import { Button } from '../components/Button';
import { ErrorLine } from '../components/ErrorLine';
import { IdentityMark } from '../components/IdentityMark';
import { EmptyState, Page, Panel } from '../components/Page';
import { Skeleton } from '../components/Skeleton';
import { useServices } from '../lib/servicesContext';
import styles from './CategoriesPage.module.css';
import { CategorySheet, type CategoryTarget } from './CategorySheet';

const SECTIONS: { kind: CategoryKind; title: string }[] = [
  { kind: 'expense', title: 'Despesas' },
  { kind: 'income', title: 'Receitas' },
];

export function CategoriesPage() {
  const { queries } = useServices();
  const categories = useQuery(queries.categories.list());
  const [target, setTarget] = useState<CategoryTarget>(null);
  const byKind = (kind: CategoryKind) =>
    (categories.data ?? [])
      .filter((c) => c.kind === kind)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <Page title="Categorias">
      {categories.isError ? (
        <Panel>
          <ErrorLine
            what="Não deu para carregar as categorias"
            error={categories.error}
            onRetry={() => void categories.refetch()}
            retrying={categories.isFetching}
          />
        </Panel>
      ) : (
        <div className={styles.columns}>
          {SECTIONS.map(({ kind, title }) => {
            const items = byKind(kind);
            return (
              <Panel
                key={kind}
                title={title}
                titleId={`categorias-${kind}`}
                aside={
                  <Button
                    variant="secondary"
                    onClick={() => setTarget({ kind })}
                    aria-label={`Nova categoria de ${kind === 'income' ? 'receita' : 'despesa'}`}
                  >
                    <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                    Nova
                  </Button>
                }
              >
                {!categories.data ? (
                  <div className={accountStyles.loading} aria-hidden="true">
                    {Array.from({ length: 4 }, (_, i) => (
                      <Skeleton key={i} height="var(--layout-row)" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <EmptyState title={`Nenhuma categoria de ${title.toLowerCase()}.`} />
                ) : (
                  <ul className={accountStyles.list}>
                    {items.map((category: Category) => (
                      <li key={category.id}>
                        <button
                          type="button"
                          className={styles.row}
                          onClick={() => setTarget({ category })}
                          aria-label={`Editar ${category.name}`}
                        >
                          <IdentityMark color={category.color} icon={category.icon} />
                          <span className={accountStyles.name} title={category.name}>
                            {category.name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          })}
        </div>
      )}
      <CategorySheet target={target} onClose={() => setTarget(null)} />
    </Page>
  );
}
