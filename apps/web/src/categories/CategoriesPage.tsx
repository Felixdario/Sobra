import { categoryName } from '@sobra/i18n';
import type { Category, CategoryKind } from '@sobra/shared';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import accountStyles from '../accounts/AccountsPage.module.css';
import { Button } from '../components/Button';
import { ErrorLine } from '../components/ErrorLine';
import { IdentityMark } from '../components/IdentityMark';
import { EmptyState, Page, Panel } from '../components/Page';
import { Skeleton } from '../components/Skeleton';
import { useI18n } from '../i18n/i18nContext';
import { useServices } from '../lib/servicesContext';
import styles from './CategoriesPage.module.css';
import { CategorySheet, type CategoryTarget } from './CategorySheet';

const SECTIONS = [
  {
    kind: 'expense',
    title: 'web.categories.expenses',
    empty: 'web.categories.emptyExpense',
    create: 'web.categories.newExpense',
  },
  {
    kind: 'income',
    title: 'web.categories.incomes',
    empty: 'web.categories.emptyIncome',
    create: 'web.categories.newIncome',
  },
] as const satisfies readonly {
  kind: CategoryKind;
  title: string;
  empty: string;
  create: string;
}[];

export function CategoriesPage() {
  const { queries } = useServices();
  const categories = useQuery(queries.categories.list());
  const { t, locale } = useI18n();
  const [target, setTarget] = useState<CategoryTarget>(null);
  const byKind = (kind: CategoryKind) =>
    (categories.data ?? [])
      .filter((c) => c.kind === kind)
      .map((category) => ({ category, name: categoryName(t, category) }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <Page title={t('nav.categories')}>
      {categories.isError ? (
        <Panel>
          <ErrorLine
            what={t('web.categories.failed')}
            error={categories.error}
            onRetry={() => void categories.refetch()}
            retrying={categories.isFetching}
          />
        </Panel>
      ) : (
        <div className={styles.columns}>
          {SECTIONS.map(({ kind, title, empty, create }) => {
            const items = byKind(kind);
            return (
              <Panel
                key={kind}
                title={t(title)}
                titleId={`categorias-${kind}`}
                aside={
                  <Button
                    variant="secondary"
                    onClick={() => setTarget({ kind })}
                    aria-label={t(create)}
                  >
                    <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                    {t('web.categories.new')}
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
                  <EmptyState title={t(empty)} />
                ) : (
                  <ul className={accountStyles.list}>
                    {items.map(({ category, name }: { category: Category; name: string }) => (
                      <li key={category.id}>
                        <button
                          type="button"
                          className={styles.row}
                          onClick={() => setTarget({ category })}
                          aria-label={t('web.categories.edit', { name })}
                        >
                          <IdentityMark color={category.color} icon={category.icon} />
                          <span className={accountStyles.name} title={name}>
                            {name}
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
