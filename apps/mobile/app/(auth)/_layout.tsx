import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeProvider';

export const unstable_settings = { anchor: 'entrar' };

export default function AuthLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg.canvas },
      }}
    />
  );
}
