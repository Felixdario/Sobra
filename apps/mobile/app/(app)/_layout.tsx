import { Tabs } from 'expo-router/js-tabs';
import { LaunchSheetProvider, useLaunch } from '../../src/features/launch/LaunchSheetProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { TabBar } from '../../src/ui/TabBar';
import { ToastProvider } from '../../src/ui/Toast';

function AppTabs() {
  const theme = useTheme();
  const launch = useLaunch();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} onLaunch={() => launch.open()} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: theme.colors.bg.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Resumo' }} />
      <Tabs.Screen name="transacoes" options={{ title: 'Transações' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}

export default function AppLayout() {
  const theme = useTheme();
  return (
    <ToastProvider bottomOffset={theme.layout.rowTall}>
      <LaunchSheetProvider>
        <AppTabs />
      </LaunchSheetProvider>
    </ToastProvider>
  );
}
