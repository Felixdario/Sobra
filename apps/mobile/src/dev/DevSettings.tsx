import { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { useServices } from '../api/ServicesProvider';
import { useI18n } from '../i18n/I18nProvider';
import { storage } from '../lib/storage';
import { simulatedFontScale } from '../theme/fontScale';
import { makeStyles } from '../theme/makeStyles';
import { AppText } from '../ui/AppText';
import { Chip } from '../ui/Chip';
import { SCENARIOS, scenarioStore, type Scenario } from './scenarios';

const SCENARIO_KEY = 'sobra.dev.scenario';
const FONT_SCALE_KEY = 'sobra.dev.fontScale';
const FONT_SCALES = [1, 1.5, 2] as const;

/** Restores the last scenario and simulated text size after a reload (dev only). */
export async function restoreDevSettings() {
  const [scenario, scale] = await Promise.all([
    storage.get(SCENARIO_KEY),
    storage.get(FONT_SCALE_KEY),
  ]);
  if ((SCENARIOS as readonly string[]).includes(scenario ?? ''))
    scenarioStore.set(scenario as Scenario);
  const parsed = Number(scale);
  if ((FONT_SCALES as readonly number[]).includes(parsed)) simulatedFontScale.set(parsed);
}

/**
 * break-ui toggle: "Dados demo / Pior caso" plus empty, one item, server error and offline, and
 * the simulated system text size for Expo web. Rendered only under `__DEV__`.
 */
export function DevSettings() {
  const styles = useStyles();
  const { queryClient } = useServices();
  const i18n = useI18n();
  const { t } = i18n;
  const scenario = useSyncExternalStore(scenarioStore.subscribe, scenarioStore.get);
  const scale = useSyncExternalStore(simulatedFontScale.subscribe, simulatedFontScale.get);

  return (
    <View style={styles.card} testID="dev-settings">
      <AppText variant="label" tone="secondary">
        {t('mobile.dev.data')}
      </AppText>
      <View
        style={styles.chips}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('mobile.dev.scenario')}
      >
        {SCENARIOS.map((item) => (
          <Chip
            key={item}
            accessibilityRole="radio"
            testID={`scenario-${item}`}
            label={t(`mobile.dev.scenarios.${item}`)}
            selected={item === scenario}
            onPress={() => {
              scenarioStore.set(item);
              storage.set(SCENARIO_KEY, item).catch(() => {});
              queryClient.resetQueries().catch(() => {});
            }}
          />
        ))}
      </View>
      <AppText variant="label" tone="secondary">
        {t('mobile.dev.fontScale')}
      </AppText>
      <View
        style={styles.chips}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('mobile.dev.fontScaleLabel')}
      >
        {FONT_SCALES.map((value) => (
          <Chip
            key={value}
            accessibilityRole="radio"
            testID={`font-scale-${value}`}
            label={`${new Intl.NumberFormat(i18n.locale).format(value)}×`}
            selected={value === scale}
            onPress={() => {
              simulatedFontScale.set(value);
              storage.set(FONT_SCALE_KEY, String(value)).catch(() => {});
            }}
          />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: t.space[2],
    padding: t.space[4],
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.colors.border.strong,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
}));
