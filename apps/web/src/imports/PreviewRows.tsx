import { categoryName, type Translator } from '@sobra/i18n';
import type { Category, CsvImportPreview, CsvImportPreviewRow } from '@sobra/shared';
import { CircleAlert, Copy } from 'lucide-react';
import type { Format } from '../i18n/format';
import { useI18n } from '../i18n/i18nContext';
import { useWide } from '../lib/useWide';
import type { Choices, RowChoice } from './previewState';
import styles from './ImportPage.module.css';
import { translateRowError } from './rowError';

type Props = {
  preview: CsvImportPreview;
  categories: Category[];
  choices: Choices;
  onChange: (rowNumber: number, patch: Partial<RowChoice>) => void;
};

function Status({ row }: { row: CsvImportPreviewRow }) {
  const { t } = useI18n();
  if (row.error) {
    return (
      <span className={styles.error}>
        <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
        {translateRowError(t, row.error)}
      </span>
    );
  }
  if (row.duplicate) {
    return (
      <span className={styles.duplicate}>
        <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
        {t('web.imports.rows.duplicate')}
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
  t,
  fmt,
}: {
  row: CsvImportPreviewRow;
  choice: RowChoice | undefined;
  categories: Category[];
  onChange: Props['onChange'];
  t: Translator;
  fmt: Format;
}) {
  const mapped = row.mapped;
  const label =
    mapped?.description ??
    (row.raw.description || t('web.imports.rows.lineLabel', { row: row.rowNumber }));
  const options = mapped ? categories.filter((c) => c.kind === mapped.type) : [];
  return {
    include: (
      <input
        type="checkbox"
        className={styles.check}
        checked={Boolean(choice?.include)}
        disabled={!mapped}
        aria-label={t('web.imports.rows.includeRow', { label })}
        onChange={(event) => onChange(row.rowNumber, { include: event.target.checked })}
      />
    ),
    date: mapped ? fmt.shortDate(mapped.date) : row.raw.date || t('common.labels.none'),
    description: label,
    amount: mapped ? (
      <span className={`${mapped.type === 'income' ? styles.income : ''} num`}>
        {fmt.signedMoney(mapped.type === 'income' ? mapped.amount : -mapped.amount)}
      </span>
    ) : (
      <span className="num">{row.raw.amount || t('common.labels.none')}</span>
    ),
    category: mapped ? (
      <select
        className={styles.categorySelect}
        aria-label={t('web.imports.rows.categoryOf', { label })}
        value={choice?.categoryId ?? ''}
        onChange={(event) => onChange(row.rowNumber, { categoryId: event.target.value })}
      >
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {categoryName(t, c)}
          </option>
        ))}
      </select>
    ) : null,
  };
}

/** The preview: a table on wide screens, stacked rows on a phone. */
export function PreviewRows({ preview, categories, choices, onChange }: Props) {
  const wide = useWide();
  const { t, fmt } = useI18n();
  if (!wide) {
    return (
      <ul className={styles.cards}>
        {preview.rows.map((row) => {
          const cells = cellsOf({
            row,
            choice: choices[row.rowNumber],
            categories,
            onChange,
            t,
            fmt,
          });
          return (
            <li key={row.rowNumber} className={styles.card} data-invalid={!row.mapped || undefined}>
              <div className={styles.cardHead}>
                {cells.include}
                <span className={styles.cardTitle}>{cells.description}</span>
                <span className={styles.cardAmount}>{cells.amount}</span>
              </div>
              <span className={styles.cardMeta}>
                {t('web.imports.rows.cardMeta', { row: row.rowNumber, date: cells.date })}
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
      <caption className="visually-hidden">{t('web.imports.rows.caption')}</caption>
      <thead>
        <tr>
          <th scope="col" className={styles.colInclude}>
            <span className="visually-hidden">{t('web.imports.rows.include')}</span>
          </th>
          <th scope="col" className={styles.colLine}>
            {t('web.imports.rows.line')}
          </th>
          <th scope="col" className={styles.colDate}>
            {t('web.imports.rows.date')}
          </th>
          <th scope="col">{t('web.imports.rows.description')}</th>
          <th scope="col" className={`${styles.right} ${styles.colAmount}`}>
            {t('web.imports.rows.amount')}
          </th>
          <th scope="col" className={styles.colCategory}>
            {t('web.imports.rows.category')}
          </th>
        </tr>
      </thead>
      <tbody>
        {preview.rows.map((row) => {
          const cells = cellsOf({
            row,
            choice: choices[row.rowNumber],
            categories,
            onChange,
            t,
            fmt,
          });
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
