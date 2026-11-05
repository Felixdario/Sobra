import type { TransactionSortField } from '@financas/client';
import type { Transaction } from '@financas/shared';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type Table,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Trash } from 'lucide-react';
import { Button } from '../components/Button';
import { IdentityMark } from '../components/IdentityMark';
import { accountLabel, amountOf, categoryLabel, formatShortDate } from './display';
import type { Sort } from './listState';
import styles from './TransactionTable.module.css';

type Props = {
  rows: Transaction[];
  sort: Sort;
  onSort: (field: TransactionSortField) => void;
  onEdit: (tx: Transaction) => void;
  onRemove: (tx: Transaction) => void;
  pendingIds: ReadonlySet<string>;
};

const column = createColumnHelper<Transaction>();
const SORTABLE: Record<string, TransactionSortField> = {
  date: 'date',
  description: 'description',
  amount: 'amount',
};

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;
  return <Icon size={16} strokeWidth={1.75} aria-hidden="true" />;
}

/**
 * Columns live at module scope so their cell renderers keep one identity: a new function per
 * render would remount every cell (and drop the focus a closing panel returns to its row).
 * Handlers and pending state come through the table's `meta`.
 */
type TableMeta = Pick<Props, 'onEdit' | 'onRemove' | 'pendingIds'>;
const metaOf = (table: Table<Transaction>) => table.options.meta as TableMeta;

const columns = [
  column.accessor('date', {
    header: 'Data',
    cell: (info) => <span className="num">{formatShortDate(info.getValue())}</span>,
  }),
  column.accessor('description', {
    header: 'Descrição',
    cell: ({ row, table }) => {
      const { onEdit, pendingIds } = metaOf(table);
      const tx = row.original;
      return (
        <button
          type="button"
          className={styles.describe}
          onClick={() => onEdit(tx)}
          disabled={pendingIds.has(tx.id)}
          aria-label={`Editar ${tx.description}`}
        >
          <IdentityMark
            color={tx.category?.color ?? null}
            icon={tx.type === 'transfer' ? null : (tx.category?.icon ?? 'sparkles')}
          />
          <span className={styles.text}>
            <span className={styles.title} title={tx.description}>
              {tx.description}
            </span>
            <span className={styles.meta} title={categoryLabel(tx)}>
              {categoryLabel(tx)}
            </span>
          </span>
        </button>
      );
    },
  }),
  column.display({
    id: 'account',
    header: 'Conta',
    cell: ({ row }) => (
      <span className={styles.account} title={accountLabel(row.original)}>
        {accountLabel(row.original)}
      </span>
    ),
  }),
  column.accessor('amount', {
    header: 'Valor',
    cell: ({ row }) => {
      const amount = amountOf(row.original);
      return (
        <span className={`${styles.amount} ${styles[amount.tone]} num`} aria-label={amount.spoken}>
          {amount.text}
        </span>
      );
    },
  }),
  column.display({
    id: 'actions',
    header: () => <span className="visually-hidden">Ações</span>,
    cell: ({ row, table }) => {
      const { onRemove, pendingIds } = metaOf(table);
      return (
        <Button
          variant="ghost"
          iconOnly
          aria-label={`Apagar ${row.original.description}`}
          title="Apagar"
          disabled={pendingIds.has(row.original.id)}
          onClick={() => onRemove(row.original)}
        >
          <Trash size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      );
    },
  }),
];

/**
 * TanStack Table in manual mode: the API sorts and paginates (the whole month may not be on
 * screen), the table owns columns and rendering. The description is the row's primary action.
 */
export function TransactionTable({ rows, sort, onSort, onEdit, onRemove, pendingIds }: Props) {
  const sorting: SortingState = [{ id: sort.field, desc: sort.direction === 'desc' }];
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    manualSorting: true,
    manualPagination: true,
    meta: { onEdit, onRemove, pendingIds } satisfies TableMeta,
    getRowId: (tx) => tx.id,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table className={styles.table}>
      <caption className="visually-hidden">Transações do período, uma por linha</caption>
      <thead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => {
              const field = SORTABLE[header.column.id];
              const direction = field && sort.field === field ? sort.direction : false;
              return (
                <th
                  key={header.id}
                  scope="col"
                  className={styles[`col-${header.column.id}`]}
                  aria-sort={
                    direction === 'asc'
                      ? 'ascending'
                      : direction === 'desc'
                        ? 'descending'
                        : undefined
                  }
                >
                  {field ? (
                    <button type="button" className={styles.sort} onClick={() => onSort(field)}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <SortIcon direction={direction} />
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} data-pending={pendingIds.has(row.id) || undefined}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className={styles[`col-${cell.column.id}`]}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
