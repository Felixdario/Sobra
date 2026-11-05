import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useSyncExternalStore } from 'react';

/** Feeds the device's connectivity into TanStack Query, so queries pause and resume with it. */
export function connectOnlineManager() {
  onlineManager.setEventListener((setOnline) => {
    const subscription = Network.addNetworkStateListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => subscription.remove();
  });
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
  );
}
