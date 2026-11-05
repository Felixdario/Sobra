import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LayoutDashboard, List, Plus, Settings, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n/I18nProvider';
import { CONTROL_MAX_FONT_SCALE } from '../theme/fontScale';
import { makeStyles } from '../theme/makeStyles';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { ICON_SIZE, ICON_STROKE } from './icons';
import { PressableScale } from './PressableScale';

const TAB_ICONS: Record<string, LucideIcon> = {
  index: LayoutDashboard,
  transacoes: List,
  ajustes: Settings,
};

/** The launch button sits right after this tab, so it lands in the bar's middle. */
const LAUNCH_AFTER = 'transacoes';

/**
 * Tabs switch with no animation (peers, used all day); the launch button is the one primary
 * action of the bar and opens the sheet from any tab: the first of the three taps.
 */
export function TabBar({
  state,
  descriptors,
  navigateToTab,
  onLaunch,
}: BottomTabBarProps & { onLaunch: () => void }) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key]?.options.title ?? route.name;
        const Icon = TAB_ICONS[route.name] ?? LayoutDashboard;
        const color = focused ? theme.colors.text.link : theme.colors.text.secondary;
        return (
          <View
            key={route.key}
            style={[styles.slotGroup, { flex: route.name === LAUNCH_AFTER ? 2 : 1 }]}
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={styles.tab}
              onPress={() => {
                if (!focused) navigateToTab(route.key);
              }}
            >
              <Icon size={ICON_SIZE.row} color={color} strokeWidth={ICON_STROKE} />
              <AppText
                variant="caption"
                color={color}
                numberOfLines={1}
                maxFontSizeMultiplier={CONTROL_MAX_FONT_SCALE}
              >
                {label}
              </AppText>
            </Pressable>
            {route.name === LAUNCH_AFTER ? <LaunchButton onPress={onLaunch} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function LaunchButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const styles = useStyles();
  return (
    <View style={styles.tab}>
      <PressableScale
        testID="launch"
        accessibilityRole="button"
        accessibilityLabel={t('mobile.launch.title.expense')}
        onPress={onPress}
        style={styles.launch}
        pressedStyle={styles.launchPressed}
      >
        <Plus
          size={ICON_SIZE.row}
          color={theme.colors.action.onPrimary}
          strokeWidth={ICON_STROKE}
        />
        <AppText
          variant="caption"
          color={theme.colors.action.onPrimary}
          numberOfLines={1}
          maxFontSizeMultiplier={CONTROL_MAX_FONT_SCALE}
        >
          {t('mobile.tabs.launch')}
        </AppText>
      </PressableScale>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: t.colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border.subtle,
  },
  slotGroup: { flexDirection: 'row' },
  tab: {
    flex: 1,
    minHeight: t.layout.rowTall,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space[0.5],
  },
  launch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    minHeight: t.touchTarget.ios,
    paddingHorizontal: t.space[2],
    borderRadius: t.radii.md,
    backgroundColor: t.colors.action.primary,
  },
  launchPressed: { backgroundColor: t.colors.action.primaryPressed },
}));
