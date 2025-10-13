// src/utils/logger.ts
/**
 * Centralized logging utility for the application.
 *
 * Logging in production should be disabled or minimized to avoid
 * leaking sensitive information and to keep the bundle size small.
 *
 * This module exposes helper functions (`log`, `warn`, `error`) that
 * only emit messages when the `VITE_DEBUG_MODE` environment variable
 * is set to `'true'`. To enable verbose logging in your local
 * environment, set `VITE_DEBUG_MODE=true` in your `.env` file. In
 * production or staging environments, keep this flag `false` so that
 * logs are suppressed by default.
 */

const isDebugMode = import.meta.env.VITE_DEBUG_MODE === 'true';

/**
 * Write a standard log message to the console if debug mode is enabled.
 *
 * @param args - Arguments to pass to `console.log`.
 */
export function log(...args: unknown[]): void {
  if (isDebugMode) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

/**
 * Write a warning message to the console if debug mode is enabled.
 *
 * @param args - Arguments to pass to `console.warn`.
 */
export function warn(...args: unknown[]): void {
  if (isDebugMode) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

/**
 * Write an error message to the console if debug mode is enabled.
 *
 * @param args - Arguments to pass to `console.error`.
 */
export function error(...args: unknown[]): void {
  if (isDebugMode) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}
