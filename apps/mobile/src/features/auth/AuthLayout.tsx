import { APP_NAME } from '@financas/shared';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + styles.content.gap, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.brand}>
          <AppText variant="headline" accessibilityRole="header">
            {APP_NAME}
          </AppText>
          <AppText variant="body" tone="secondary">
            {subtitle}
          </AppText>
        </View>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Notice({ message, tone = 'info' }: { message: string; tone?: 'info' | 'danger' }) {
  const theme = useTheme();
  const styles = useStyles();
  const color = tone === 'danger' ? theme.colors.status.danger : theme.colors.text.primary;
  const background =
    tone === 'danger' ? theme.colors.status.dangerSurface : theme.colors.status.infoSurface;
  return (
    <View style={[styles.notice, { backgroundColor: background }]} accessibilityRole="alert">
      <AppText variant="bodySm" color={color}>
        {message}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.bg.canvas },
  content: { gap: t.space[6], paddingHorizontal: t.layout.phoneMargin },
  brand: { gap: t.space[1], paddingTop: t.space[8] },
  notice: { padding: t.space[3], borderRadius: t.radii.md },
}));
