import { APP_NAME, cents, formatBRL } from '@financas/shared';
import { StyleSheet, Text, View } from 'react-native';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {APP_NAME}
      </Text>
      <Text>Saldo: {formatBRL(cents(0))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
