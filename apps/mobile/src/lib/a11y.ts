import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Says a message with VoiceOver/TalkBack without moving focus (toasts, saved, a refused key).
 * Android also gets live regions on the views; iOS only speaks what is announced.
 */
export function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

/** Whether a screen reader is on, kept current while the app runs. */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (active) setEnabled(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}
