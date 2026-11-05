import type { CsvImportPreview } from '@sobra/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileUp, Undo2 } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FormError } from '../auth/FormError';
import { Button } from '../components/Button';
import { ErrorLine } from '../components/ErrorLine';
import { EmptyState, Page, Panel } from '../components/Page';
import { SelectField } from '../components/SelectField';
import { useI18n } from '../i18n/i18nContext';
import { useServices } from '../lib/servicesContext';
import styles from './ImportPage.module.css';
import { commitRows, initialChoices, type Choices, type RowChoice } from './previewState';
import { PreviewRows } from './PreviewRows';

function History() {
  const { queries, mutations } = useServices();
  const imports = useQuery(queries.imports.list());
  const accounts = useQuery(queries.accounts.list({ includeArchived: true }));
  const undo = useMutation(mutations.imports.undo);
  const { t, fmt, errorText } = useI18n();
  const accountName = (id: string) =>
    accounts.data?.find((a) => a.id === id)?.name ?? t('web.imports.history.removedAccount');

  return (
    <Panel title={t('web.imports.history.title')} titleId="importacoes">
      {imports.isError ? (
        <ErrorLine
          what={t('web.imports.history.failed')}
          error={imports.error}
          onRetry={() => void imports.refetch()}
        />
      ) : !imports.data ? null : imports.data.length === 0 ? (
        <p className={styles.muted}>{t('web.imports.history.none')}</p>
      ) : (
        <ul className={styles.history}>
          {imports.data.map((batch) => (
            <li key={batch.id}>
              <span className={styles.batch}>
                <span className={styles.batchName}>
                  {batch.fileName ?? t('web.imports.history.unnamed')}
                </span>
                <span className={`${styles.muted} num`}>
                  {batch.skippedCount > 0
                    ? t('web.imports.history.lineWithSkipped', {
                        date: fmt.date(new Date(batch.createdAt)),
                        account: accountName(batch.accountId),
                        imported: t('web.imports.history.imported', {
                          count: batch.importedCount,
                        }),
                        skipped: t('web.imports.history.skipped', { count: batch.skippedCount }),
                      })
                    : t('web.imports.history.line', {
                        date: fmt.date(new Date(batch.createdAt)),
                        account: accountName(batch.accountId),
                        imported: t('web.imports.history.imported', {
                          count: batch.importedCount,
                        }),
                      })}
                </span>
              </span>
              <Button
                variant="ghost"
                loading={undo.isPending && undo.variables === batch.id}
                onClick={() =>
                  undo.mutate(batch.id, {
                    onSuccess: () =>
                      toast.success(
                        t('web.imports.history.undone', {
                          count: batch.importedCount,
                          file: batch.fileName ?? t('web.imports.history.fileFallback'),
                        }),
                      ),
                    onError: (error) =>
                      toast.error(
                        t('web.imports.history.undoFailed', { reason: errorText(error) }),
                      ),
                  })
                }
              >
                <Undo2 size={16} strokeWidth={1.75} aria-hidden="true" />
                {t('common.actions.undo')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function ImportPage() {
  const { queries, mutations } = useServices();
  const navigate = useNavigate();
  const accounts = useQuery(queries.accounts.list());
  const categories = useQuery(queries.categories.list());
  const previewMutation = useMutation(mutations.imports.preview);
  const commit = useMutation(mutations.imports.commit);
  const { t, errorText } = useI18n();
  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [choices, setChoices] = useState<Choices>({});
  const [error, setError] = useState<string | undefined>();
  const [dragging, setDragging] = useState(false);
  const account =
    accountId ||
    (accounts.data?.find((a) => a.type === 'checking') ?? accounts.data?.[0])?.id ||
    '';

  const load = async (picked: File | undefined) => {
    if (!picked) return;
    setError(undefined);
    setPreview(null);
    if (!/\.csv$/i.test(picked.name) && picked.type !== 'text/csv') {
      setError(t('web.imports.notCsv'));
      return;
    }
    setFile({ name: picked.name, text: await picked.text() });
  };

  const runPreview = () => {
    if (!file || !account) return;
    previewMutation.mutate(
      { accountId: account, csv: file.text, fileName: file.name },
      {
        onSuccess: (result) => {
          setPreview(result);
          setChoices(initialChoices(result, categories.data ?? []));
        },
        onError: (failure) => setError(errorText(failure)),
      },
    );
  };

  const confirm = () => {
    if (!preview) return;
    const { rows, force } = commitRows(preview, choices);
    if (rows.length === 0) {
      setError(t('web.imports.selectOne'));
      return;
    }
    commit.mutate(
      { accountId: preview.accountId, rows, force, ...(file ? { fileName: file.name } : {}) },
      {
        onSuccess: (result) => {
          const month = rows[0]?.date.slice(0, 7);
          toast.success(
            result.skipped > 0
              ? t('web.imports.importedWithSkipped', {
                  count: result.imported,
                  skipped: result.skipped,
                })
              : t('web.imports.imported', { count: result.imported }),
            {
              action: {
                label: t('web.imports.viewTransactions'),
                onClick: () => navigate(`/transacoes?mes=${month}&conta=${preview.accountId}`),
              },
            },
          );
          setPreview(null);
          setFile(null);
        },
        onError: (failure) => setError(errorText(failure)),
      },
    );
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void load(event.dataTransfer.files[0]);
  };

  const selected = preview ? commitRows(preview, choices).rows.length : 0;
  const update = (rowNumber: number, patch: Partial<RowChoice>) =>
    setChoices((current) => ({
      ...current,
      [rowNumber]: { ...(current[rowNumber] ?? { include: false, categoryId: '' }), ...patch },
    }));

  return (
    <Page title={t('nav.import')}>
      <Panel title={t('web.imports.step1')} titleId="importar-arquivo">
        {accounts.isError ? (
          <ErrorLine
            what={t('web.accounts.failed')}
            error={accounts.error}
            onRetry={() => void accounts.refetch()}
          />
        ) : (
          <div className={styles.pick}>
            <SelectField
              label={t('web.imports.account')}
              value={account}
              onChange={(event) => {
                setAccountId(event.target.value);
                setPreview(null);
              }}
              options={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
            />
            <label
              className={styles.drop}
              data-dragging={dragging || undefined}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <FileUp size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className={styles.dropTitle}>{file ? file.name : t('web.imports.drop')}</span>
              <span className={styles.muted}>{t('web.imports.dropHint')}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className={styles.file}
                aria-label={t('web.imports.file')}
                onChange={(event) => void load(event.target.files?.[0])}
              />
            </label>
            <div className={styles.pickActions}>
              <Button
                variant="primary"
                disabled={!file || !account}
                loading={previewMutation.isPending}
                onClick={runPreview}
              >
                {t('web.imports.preview')}
              </Button>
            </div>
          </div>
        )}
        {!preview ? <FormError message={error} /> : null}
      </Panel>

      {preview ? (
        <Panel
          title={t('web.imports.step2')}
          titleId="importar-previa"
          aside={
            <span className={`${styles.muted} num`}>
              {[
                t('web.imports.valid', { count: preview.validCount }),
                t('web.imports.invalid', { count: preview.invalidCount }),
                t('web.imports.duplicates', { count: preview.duplicateCount }),
              ].join(' · ')}
            </span>
          }
        >
          <p className={styles.muted}>{t('web.imports.previewNote')}</p>
          {preview.rows.length === 0 ? (
            <EmptyState title={t('web.imports.noRows')} />
          ) : (
            <PreviewRows
              preview={preview}
              categories={categories.data ?? []}
              choices={choices}
              onChange={update}
            />
          )}
          <FormError message={error} />
          <div className={styles.confirm}>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              variant="primary"
              loading={commit.isPending}
              disabled={selected === 0}
              onClick={confirm}
            >
              {t('web.imports.submit', { count: selected })}
            </Button>
          </div>
        </Panel>
      ) : null}
      <History />
    </Page>
  );
}
