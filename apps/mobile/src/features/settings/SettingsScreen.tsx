import { useMutation, useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../api/AuthProvider';
import { useServices } from '../../api/ServicesProvider';
import { makeStyles } from '../../theme/makeStyles';
import { useThemeContext, type ThemePreference } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Segmented } from '../../ui/Segmented';

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
] as const;

export function SettingsScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { queries, mutations } = useServices();
  const auth = useAuth();
  const { preference, setPreference } = useThemeContext();
  const me = useQuery(queries.me());
  const logout = useMutation(mutations.auth.logout);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <AppText variant="title" accessibilityRole="header">
          Ajustes
        </AppText>
        {me.data ? (
          <View style={styles.card}>
            <AppText variant="label">{me.data.name}</AppText>
            <AppText variant="bodySm" tone="secondary">
              {me.data.email}
            </AppText>
          </View>
        ) : null}
        <View style={styles.card}>
          <AppText variant="label" tone="secondary">
            Tema
          </AppText>
          <Segmented<ThemePreference>
            label="Tema"
            options={THEME_OPTIONS}
            value={preference}
            onChange={setPreference}
          />
        </View>
        <Button
          variant="secondary"
          label="Sair"
          loading={logout.isPending}
          onPress={() => logout.mutate(undefined, { onSettled: () => auth.markSignedOut() })}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.bg.canvas },
  content: { padding: t.layout.phoneMargin, gap: t.space[4] },
  card: {
    gap: t.space[2],
    padding: t.space[4],
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.bg.surface,
  },
}));
