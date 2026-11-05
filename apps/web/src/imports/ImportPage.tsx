import { formatDate, type CsvImportPreview } from '@sobra/shared';
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
import { count } from '../lib/format';
import { useServices } from '../lib/servicesContext';
import styles from './ImportPage.module.css';
import { commitRows, initialChoices, type Choices, type RowChoice } from './previewState';
import { PreviewRows } from './PreviewRows';

function History() {
  const { queries, mutations } = useServices();
  const imports = useQuery(queries.imports.list());
  const accounts = useQuery(queries.accounts.list({ includeArchived: true }));
  const undo = useMutation(mutations.imports.undo);
  const accountName = (id: string) =>
    accounts.data?.find((a) => a.id === id)?.name ?? 'conta removida';

  return (
    <Panel title="Importações anteriores" titleId="importacoes">
      {imports.isError ? (
        <ErrorLine
          what="Não deu para carregar as importações"
          error={imports.error}
          onRetry={() => void imports.refetch()}
        />
      ) : !imports.data ? null : imports.data.length === 0 ? (
        <p className={styles.muted}>Nenhuma importação ainda.</p>
      ) : (
        <ul className={styles.history}>
          {imports.data.map((batch) => (
            <li key={batch.id}>
              <span className={styles.batch}>
                <span className={styles.batchName}>{batch.fileName ?? 'Arquivo sem nome'}</span>
                <span className={`${styles.muted} num`}>
                  {formatDate(new Date(batch.createdAt))} · {accountName(batch.accountId)} ·{' '}
                  {count(batch.importedCount)}{' '}
                  {batch.importedCount === 1 ? 'importado' : 'importados'}
                  {batch.skippedCount > 0
                    ? `, ${count(batch.skippedCount)} ${batch.skippedCount === 1 ? 'ignorado' : 'ignorados'}`
                    : ''}
                </span>
              </span>
              <Button
                variant="ghost"
                loading={undo.isPending && undo.variables === batch.id}
                onClick={() =>
                  undo.mutate(batch.id, {
                    onSuccess: () =>
                      toast.success(
                        `Importação desfeita: ${count(batch.importedCount)} ${batch.importedCount === 1 ? 'lançamento' : 'lançamentos'} de ${batch.fileName ?? 'arquivo'} removidos.`,
                      ),
                    onError: (error) => toast.error(`Não deu para desfazer: ${error.message}`),
                  })
                }
              >
                <Undo2 size={16} strokeWidth={1.75} aria-hidden="true" />
                Desfazer
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
      setError('Escolha um arquivo .csv exportado pelo banco.');
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
        onError: (failure) => setError(failure.message),
      },
    );
  };

  const confirm = () => {
    if (!preview) return;
    const { rows, force } = commitRows(preview, choices);
    if (rows.length === 0) {
      setError('Marque ao menos uma linha para importar.');
      return;
    }
    commit.mutate(
      { accountId: preview.accountId, rows, force, ...(file ? { fileName: file.name } : {}) },
      {
        onSuccess: (result) => {
          const month = rows[0]?.date.slice(0, 7);
          toast.success(
            `${result.imported} ${result.imported === 1 ? 'lançamento importado' : 'lançamentos importados'}${
              result.skipped > 0 ? `, ${result.skipped} já existiam e foram ignorados` : ''
            }.`,
            {
              action: {
                label: 'Ver transações',
                onClick: () => navigate(`/transacoes?mes=${month}&conta=${preview.accountId}`),
              },
            },
          );
          setPreview(null);
          setFile(null);
        },
        onError: (failure) => setError(failure.message),
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
    <Page title="Importar CSV">
      <Panel title="1. Arquivo e conta" titleId="importar-arquivo">
        {accounts.isError ? (
          <ErrorLine
            what="Não deu para carregar as contas"
            error={accounts.error}
            onRetry={() => void accounts.refetch()}
          />
        ) : (
          <div className={styles.pick}>
            <SelectField
              label="Conta do extrato"
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
              <span className={styles.dropTitle}>
                {file ? file.name : 'Arraste o CSV aqui ou escolha o arquivo'}
              </span>
              <span className={styles.muted}>
                Colunas de data, descrição e valor; separador e cabeçalho são detectados.
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className={styles.file}
                aria-label="Arquivo CSV"
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
                Ver prévia
              </Button>
            </div>
          </div>
        )}
        {!preview ? <FormError message={error} /> : null}
      </Panel>

      {preview ? (
        <Panel
          title="2. Prévia"
          titleId="importar-previa"
          aside={
            <span className={`${styles.muted} num`}>
              {count(preview.validCount)} {preview.validCount === 1 ? 'válida' : 'válidas'} ·{' '}
              {count(preview.invalidCount)} com erro · {count(preview.duplicateCount)}{' '}
              {preview.duplicateCount === 1 ? 'já existente' : 'já existentes'}
            </span>
          }
        >
          <p className={styles.muted}>
            Nada é gravado até você confirmar. Linhas que já existem na conta ficam desmarcadas;
            marque para importar mesmo assim.
          </p>
          {preview.rows.length === 0 ? (
            <EmptyState title="O arquivo não tem linhas para importar." />
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
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={commit.isPending}
              disabled={selected === 0}
              onClick={confirm}
            >
              Importar {selected} {selected === 1 ? 'lançamento' : 'lançamentos'}
            </Button>
          </div>
        </Panel>
      ) : null}
      <History />
    </Page>
  );
}
