import type { Category, CsvImportPreview, CsvImportPreviewRow } from '@sobra/shared';
import { CircleAlert, Copy } from 'lucide-react';
import { signedMoney } from '../lib/format';
import { useWide } from '../lib/useWide';
import { formatShortDate } from '../transactions/display';
import type { Choices, RowChoice } from './previewState';
import styles from './ImportPage.module.css';

type Props = {
  preview: CsvImportPreview;
  categories: Category[];
  choices: Choices;
  onChange: (rowNumber: number, patch: Partial<RowChoice>) => void;
};

function Status({ row }: { row: CsvImportPreviewRow }) {
  if (row.error) {
    return (
      <span className={styles.error}>
        <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
        {row.error}
      </span>
    );
  }
  if (row.duplicate) {
    return (
      <span className={styles.duplicate}>
        <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
        Já existe na conta
      </span>
    );
  }
  return null;
}

function cellsOf({
  row,
  choice,
  categories,
  onChange,
}: {
  row: CsvImportPreviewRow;
  choice: RowChoice | undefined;
  categories: Category[];
  onChange: Props['onChange'];
}) {
  const mapped = row.mapped;
  const label = mapped?.description ?? (row.raw.description || `Linha ${row.rowNumber}`);
  const options = mapped ? categories.filter((c) => c.kind === mapped.type) : [];
  return {
    include: (
      <input
        type="checkbox"
        className={styles.check}
        checked={Boolean(choice?.include)}
        disabled={!mapped}
        aria-label={`Importar ${label}`}
        onChange={(event) => onChange(row.rowNumber, { include: event.target.checked })}
      />
    ),
    date: mapped ? formatShortDate(mapped.date) : row.raw.date || '—',
    description: label,
    amount: mapped ? (
      <span className={`${mapped.type === 'income' ? styles.income : ''} num`}>
        {signedMoney(mapped.type === 'income' ? mapped.amount : -mapped.amount)}
      </span>
    ) : (
      <span className="num">{row.raw.amount || '—'}</span>
    ),
    category: mapped ? (
      <select
        className={styles.categorySelect}
        aria-label={`Categoria de ${label}`}
        value={choice?.categoryId ?? ''}
        onChange={(event) => onChange(row.rowNumber, { categoryId: event.target.value })}
      >
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    ) : null,
  };
}

/** The preview: a table on wide screens, stacked rows on a phone. */
export function PreviewRows({ preview, categories, choices, onChange }: Props) {
  const wide = useWide();
  if (!wide) {
    return (
      <ul className={styles.cards}>
        {preview.rows.map((row) => {
          const cells = cellsOf({ row, choice: choices[row.rowNumber], categories, onChange });
          return (
            <li key={row.rowNumber} className={styles.card} data-invalid={!row.mapped || undefined}>
              <div className={styles.cardHead}>
                {cells.include}
                <span className={styles.cardTitle}>{cells.description}</span>
                <span className={styles.cardAmount}>{cells.amount}</span>
              </div>
              <span className={styles.cardMeta}>
                Linha {row.rowNumber} · {cells.date}
              </span>
              <Status row={row} />
              {cells.category}
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <table className={styles.table}>
      <caption className="visually-hidden">Prévia do arquivo, uma linha por lançamento</caption>
      <thead>
        <tr>
          <th scope="col" className={styles.colInclude}>
            <span className="visually-hidden">Importar</span>
          </th>
          <th scope="col" className={styles.colLine}>
            Linha
          </th>
          <th scope="col" className={styles.colDate}>
            Data
          </th>
          <th scope="col">Descrição</th>
          <th scope="col" className={`${styles.right} ${styles.colAmount}`}>
            Valor
          </th>
          <th scope="col" className={styles.colCategory}>
            Categoria
          </th>
        </tr>
      </thead>
      <tbody>
        {preview.rows.map((row) => {
          const cells = cellsOf({ row, choice: choices[row.rowNumber], categories, onChange });
          return (
            <tr key={row.rowNumber} data-invalid={!row.mapped || undefined}>
              <td>{cells.include}</td>
              <td className="num">{row.rowNumber}</td>
              <td className="num">{cells.date}</td>
              <td>
                <span className={styles.description}>{cells.description}</span>
                <Status row={row} />
              </td>
              <td className={styles.right}>{cells.amount}</td>
              <td>{cells.category}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
