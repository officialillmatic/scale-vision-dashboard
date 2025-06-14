export const debugEnabled = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

export function debugLog(...args: unknown[]) {
  if (debugEnabled) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}
