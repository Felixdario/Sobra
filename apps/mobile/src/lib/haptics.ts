import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function fire(run: () => Promise<void>) {
  if (!enabled) return;
  run().catch(() => {
    // Haptics off system-wide or unsupported hardware: the visual already carries the feedback.
  });
}

/** One call per user action, fired on the same frame as the visual it accompanies. */
export const haptics = {
  /** A value ticked past a step: month changed, type toggled. */
  selection: () => fire(() => Haptics.selectionAsync()),
  /** Something snapped home: a dragged sheet settling back open. */
  impact: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** The launch was committed. */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** A key press was refused (amount at its limit). */
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** The save failed and was rolled back. */
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
