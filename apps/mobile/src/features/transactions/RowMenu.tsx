import type { Transaction } from '@sobra/shared';
import { View } from 'react-native';
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
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Ações da transação"
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
          label="Editar"
          onPress={() => {
            if (tx) onEdit(tx);
            onClose();
          }}
        />
        <Button
          testID="menu-delete"
          variant="secondary"
          label="Apagar"
          onPress={() => {
            if (tx) onDelete(tx);
            onClose();
          }}
        />
        <Button variant="ghost" label="Cancelar" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  title: { paddingBottom: t.space[2] },
  actions: { gap: t.space[2] },
}));
