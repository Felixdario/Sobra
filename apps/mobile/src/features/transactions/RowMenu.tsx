import type { Transaction } from '@sobra/shared';
import { View } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
import { makeStyles } from '../../theme/makeStyles';
import { AppText } from '../../ui/AppText';
import { BottomSheet } from '../../ui/BottomSheet';
import { Button } from '../../ui/Button';

type Props = {
  open: boolean;
  tx: Transaction | null;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
};

/** The long-press menu: the same actions as the swipe, for whoever doesn't swipe. */
export function RowMenu({ open, tx, onClose, onEdit, onDelete }: Props) {
  const styles = useStyles();
  const { t } = useI18n();
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={t('mobile.transactions.row.menu')}
      header={
        <AppText
          variant="titleSm"
          numberOfLines={1}
          accessibilityRole="header"
          style={styles.title}
        >
          {tx?.description ?? ''}
        </AppText>
      }
    >
      <View style={styles.actions}>
        <Button
          testID="menu-edit"
          variant="secondary"
          label={t('common.actions.edit')}
          onPress={() => {
            if (tx) onEdit(tx);
            onClose();
          }}
        />
        <Button
          testID="menu-delete"
          variant="secondary"
          label={t('mobile.transactions.row.delete')}
          onPress={() => {
            if (tx) onDelete(tx);
            onClose();
          }}
        />
        <Button variant="ghost" label={t('common.actions.cancel')} onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  title: { paddingBottom: t.space[2] },
  actions: { gap: t.space[2] },
}));
