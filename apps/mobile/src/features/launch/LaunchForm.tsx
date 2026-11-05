import { DESCRIPTION_MAX, NOTES_MAX, type Account, type Category } from '@financas/shared';
import { ArrowLeftRight, Calendar, Pencil, StickyNote, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { haptics } from '../../lib/haptics';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { ICON_SIZE, ICON_STROKE } from '../../ui/icons';
import { Segmented } from '../../ui/Segmented';
import { ErrorLine, Skeleton } from '../../ui/states';
import { AmountDisplay } from './AmountDisplay';
import { applyKey, type KeypadKey } from './centsKeypad';
import { CategoryGrid } from './CategoryGrid';
import { dayLabel, recentDays } from './dates';
import { Keypad } from './Keypad';
import type { LaunchDraft, LaunchType } from './launchModel';

type Panel = 'categories' | 'accounts' | 'date' | 'description' | 'notes';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
] as const;

const DAYS_BACK = 7;

type Props = {
  draft: LaunchDraft;
  onChange: (draft: LaunchDraft) => void;
  categories: readonly Category[];
  accounts: readonly Account[];
  categoriesState: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  canSave: boolean;
  onSave: () => void;
};

export function LaunchHeader({ draft, onChange }: Pick<Props, 'draft' | 'onChange'>) {
  const styles = useStyles();
  if (draft.editing?.type === 'transfer') {
    return (
      <View style={styles.header}>
        <AppText variant="titleSm" accessibilityRole="header">
          Editar transferência
        </AppText>
      </View>
    );
  }
  return (
    <View style={styles.header}>
      <Segmented
        label="Tipo do lançamento"
        options={TYPE_OPTIONS}
        value={draft.type}
        onChange={(type: LaunchType) => {
          haptics.selection();
          onChange({ ...draft, type, categoryId: null });
        }}
      />
    </View>
  );
}

export function LaunchForm({
  draft,
  onChange,
  categories,
  accounts,
  categoriesState,
  onRetry,
  canSave,
  onSave,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [panel, setPanel] = useState<Panel>('categories');
  const [rejections, setRejections] = useState(0);
  const account = accounts.find((item) => item.id === draft.accountId);
  const category = categories.find((item) => item.id === draft.categoryId);
  const iconColor = theme.colors.text.secondary;
  const editing = draft.editing;
  const transfer = editing?.type === 'transfer' ? editing : null;
  const days = recentDays(DAYS_BACK);
  if (!days.includes(draft.date)) days.push(draft.date);

  const toggle = (next: Panel) => setPanel((current) => (current === next ? 'categories' : next));

  const onKey = (key: KeypadKey) => {
    const result = applyKey(draft.amount, key);
    if (!result.accepted) {
      if (key !== 'backspace' && key !== 'clear') {
        haptics.warning();
        setRejections((count) => count + 1);
      }
      return;
    }
    onChange({ ...draft, amount: result.value });
  };

  return (
    <View style={styles.body}>
      <AmountDisplay value={draft.amount} type={draft.type} rejections={rejections} />

      <View style={styles.meta}>
        {transfer ? (
          <View style={styles.transfer}>
            <ArrowLeftRight size={ICON_SIZE.inline} color={iconColor} strokeWidth={ICON_STROKE} />
            <AppText variant="label" tone="secondary">
              {transfer.account.name} → {transfer.toAccount.name}
            </AppText>
          </View>
        ) : (
          <Chip
            testID="chip-account"
            label={account?.name ?? 'Conta'}
            accessibilityLabel={`Conta: ${account?.name ?? 'nenhuma'}. Trocar conta`}
            selected={panel === 'accounts'}
            onPress={() => toggle('accounts')}
            icon={<Wallet size={ICON_SIZE.inline} color={iconColor} strokeWidth={ICON_STROKE} />}
          />
        )}
        <Chip
          testID="chip-date"
          label={dayLabel(draft.date)}
          accessibilityLabel={`Data: ${dayLabel(draft.date)}. Trocar data`}
          selected={panel === 'date'}
          onPress={() => toggle('date')}
          icon={<Calendar size={ICON_SIZE.inline} color={iconColor} strokeWidth={ICON_STROKE} />}
        />
        <Chip
          testID="chip-description"
          label={draft.description.trim() || 'Descrição'}
          accessibilityLabel="Descrição (opcional)"
          selected={panel === 'description'}
          onPress={() => toggle('description')}
          icon={<Pencil size={ICON_SIZE.inline} color={iconColor} strokeWidth={ICON_STROKE} />}
        />
        {editing ? (
          <Chip
            testID="chip-notes"
            label={draft.notes.trim() || 'Observações'}
            accessibilityLabel="Observações (opcional)"
            selected={panel === 'notes'}
            onPress={() => toggle('notes')}
            icon={
              <StickyNote size={ICON_SIZE.inline} color={iconColor} strokeWidth={ICON_STROKE} />
            }
          />
        ) : null}
      </View>

      <View style={styles.panel}>
        {panel === 'categories' && transfer ? (
          <AppText variant="bodySm" tone="secondary">
            Transferência entre contas: não tem categoria e não entra em receitas nem despesas.
          </AppText>
        ) : null}
        {panel === 'categories' && !transfer && categoriesState === 'loading' ? (
          <CategoriesSkeleton />
        ) : null}
        {panel === 'categories' && !transfer && categoriesState === 'error' ? (
          <ErrorLine message="Não deu para carregar as categorias." onRetry={onRetry} />
        ) : null}
        {panel === 'categories' && !transfer && categoriesState === 'ready' ? (
          <CategoryGrid
            categories={categories}
            selectedId={draft.categoryId}
            onSelect={(categoryId) => onChange({ ...draft, categoryId })}
          />
        ) : null}
        {panel === 'accounts' ? (
          <Options
            label="Conta"
            items={accounts.map((item) => ({ id: item.id, label: item.name }))}
            selectedId={draft.accountId}
            onSelect={(accountId) => {
              onChange({ ...draft, accountId });
              setPanel('categories');
            }}
          />
        ) : null}
        {panel === 'date' ? (
          <Options
            label="Data"
            items={days.map((day) => ({ id: day, label: dayLabel(day) }))}
            selectedId={draft.date}
            onSelect={(date) => {
              onChange({ ...draft, date });
              setPanel('categories');
            }}
          />
        ) : null}
        {panel === 'description' ? (
          <TextInput
            autoFocus
            value={draft.description}
            onChangeText={(description) => onChange({ ...draft, description })}
            onSubmitEditing={() => setPanel('categories')}
            placeholder={category ? `Padrão: ${category.name}` : 'Padrão: nome da categoria'}
            placeholderTextColor={theme.colors.text.tertiary}
            returnKeyType="done"
            maxLength={DESCRIPTION_MAX}
            accessibilityLabel="Descrição"
            style={styles.input}
          />
        ) : null}
        {panel === 'notes' ? (
          <TextInput
            autoFocus
            multiline
            value={draft.notes}
            onChangeText={(notes) => onChange({ ...draft, notes })}
            placeholder="Observações"
            placeholderTextColor={theme.colors.text.tertiary}
            maxLength={NOTES_MAX}
            accessibilityLabel="Observações"
            style={[styles.input, styles.notes]}
          />
        ) : null}
      </View>

      <Keypad onKey={onKey} />

      <Button
        testID="save"
        label={
          editing
            ? 'Salvar alterações'
            : draft.type === 'expense'
              ? 'Salvar despesa'
              : 'Salvar receita'
        }
        disabled={!canSave}
        onPress={onSave}
        accessibilityHint={canSave ? undefined : 'Digite o valor e escolha a categoria'}
      />
      {!canSave && draft.amount > 0 && !draft.categoryId ? (
        <AppText variant="caption" tone="tertiary" style={styles.hint}>
          Escolha a categoria para salvar.
        </AppText>
      ) : null}
    </View>
  );
}

function CategoriesSkeleton() {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.options} accessibilityLabel="Carregando categorias">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} width="23%" height={theme.layout.rowTall + theme.space[2]} />
      ))}
    </View>
  );
}

function Options({
  label,
  items,
  selectedId,
  onSelect,
}: {
  label: string;
  items: readonly { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {items.map((item) => (
        <Chip
          key={item.id}
          label={item.label}
          selected={item.id === selectedId}
          onPress={() => onSelect(item.id)}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  header: { paddingBottom: t.space[2] },
  body: { gap: t.space[3] },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  panel: { minHeight: (t.layout.rowTall + t.space[2]) * 2 + t.space[2] },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  input: {
    ...t.text.body,
    color: t.colors.text.primary,
    minHeight: t.layout.controlHeightTouch,
    paddingHorizontal: t.space[3],
    borderWidth: 1,
    borderColor: t.colors.border.strong,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.bg.surface,
  },
  hint: { textAlign: 'center' },
  transfer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    minHeight: t.layout.controlHeight,
  },
  notes: { minHeight: t.layout.rowTall * 2, paddingTop: t.space[2], textAlignVertical: 'top' },
}));
